// ============================================
// TILE LOD MANAGER - إدارة مستويات التفاصيل للبلاطات
// يدعم: LOD ديناميكي، تحميل تدريجي، تحسين الأداء
// ============================================

export class TileLODManager {
    constructor(camera = null, options = {}) {
        this.camera = camera;
        
        // إعدادات LOD
        this.settings = {
            maxLOD: options.maxLOD || 5, // 0 = highest, 5 = lowest
            distanceFactors: options.distanceFactors || [10, 30, 60, 100, 150],
            screenSizeThreshold: options.screenSizeThreshold || 0.1,
            updateInterval: options.updateInterval || 250, // ms
            enableDynamicLOD: options.enableDynamicLOD !== false,
            enablePreloading: options.enablePreloading !== false
        };
        
        // البلاطات
        this.tiles = new Map(); // tileId -> tileData
        self.activeTiles = new Set();
        self.loadedTiles = new Map(); // tileId -> { lod, objects }
        
        // إحصائيات
        this.stats = {
            totalTiles: 0,
            activeTiles: 0,
            loadedLODs: 0,
            memoryUsage: 0
        };
        
        // قائمة الانتظار
        self.loadQueue = [];
        self.isProcessing = false;
        
        // أحداث
        this.listeners = new Map();
        
        // حلقة التحديث
        self.updateInterval = null;
        self.isActive = false;
        
        console.log('🗺️ TileLODManager initialized');
    }
    
    // ========== TILE REGISTRATION ==========
    
    registerTile(tileId, tileData) {
        this.tiles.set(tileId, {
            id: tileId,
            bounds: tileData.bounds,
            center: tileData.center,
            lodLevels: tileData.lodLevels || [],
            currentLOD: null,
            loadedLODs: new Map(),
            priority: tileData.priority || 0,
            metadata: tileData.metadata || {}
        });
        
        this.stats.totalTiles = this.tiles.size;
        this.notifyListeners('tileRegistered', { tileId, tileData });
        
        return tileId;
    }
    
    registerTiles(tiles) {
        for (const [id, data] of Object.entries(tiles)) {
            this.registerTile(id, data);
        }
    }
    
    // ========== LOD MANAGEMENT ==========
    
    calculateLOD(distance) {
        for (let lod = 0; lod < this.settings.distanceFactors.length; lod++) {
            if (distance <= this.settings.distanceFactors[lod]) {
                return lod;
            }
        }
        return this.settings.maxLOD;
    }
    
    calculateScreenSize(tile) {
        if (!this.camera) return 1;
        
        // حساب الحجم الظاهر على الشاشة
        const distance = this.camera.position.distanceTo(tile.center);
        const size = (tile.bounds.max.x - tile.bounds.min.x) / distance;
        
        return Math.min(1, size);
    }
    
    updateTileLOD(tileId) {
        const tile = this.tiles.get(tileId);
        if (!tile) return;
        
        const distance = this.camera ? this.camera.position.distanceTo(tile.center) : 0;
        let targetLOD = this.calculateLOD(distance);
        
        // تعديل بناءً على حجم الشاشة
        if (this.settings.enableDynamicLOD) {
            const screenSize = this.calculateScreenSize(tile);
            if (screenSize < this.settings.screenSizeThreshold) {
                targetLOD = Math.min(targetLOD + 1, this.settings.maxLOD);
            }
        }
        
        // تحميل مستوى LOD المناسب
        if (targetLOD !== tile.currentLOD) {
            this.loadLOD(tileId, targetLOD);
        }
        
        // إلغاء تحميل مستويات LOD الأعلى (الأقل تفصيلاً)
        for (const [lod, data] of tile.loadedLODs) {
            if (lod !== tile.currentLOD && this.shouldUnloadLOD(lod, targetLOD, distance)) {
                this.unloadLOD(tileId, lod);
            }
        }
    }
    
    shouldUnloadLOD(lod, targetLOD, distance) {
        // إلغاء تحميل المستويات البعيدة عن الهدف
        if (Math.abs(lod - targetLOD) > 1) return true;
        
        // إلغاء تحميل المستويات البعيدة جداً
        if (distance > this.settings.distanceFactors[this.settings.maxLOD] * 1.5) return true;
        
        return false;
    }
    
    // ========== LOD LOADING ==========
    
    async loadLOD(tileId, lod) {
        const tile = this.tiles.get(tileId);
        if (!tile) return false;
        
        // إذا كان المستوى محملاً بالفعل
        if (tile.loadedLODs.has(lod)) {
            tile.currentLOD = lod;
            this.notifyListeners('lodChanged', { tileId, lod });
            return true;
        }
        
        // إضافة إلى قائمة الانتظار
        this.loadQueue.push({
            tileId,
            lod,
            priority: this.calculateLoadPriority(tile, lod),
            timestamp: Date.now()
        });
        
        // ترتيب قائمة الانتظار حسب الأولوية
        this.loadQueue.sort((a, b) => b.priority - a.priority);
        
        this.processLoadQueue();
    }
    
    calculateLoadPriority(tile, lod) {
        // أولوية أعلى للمستويات القريبة والعالية الجودة
        let priority = tile.priority;
        
        // كلما كان LOD أقل (أعلى جودة) زادت الأولوية
        priority += (this.settings.maxLOD - lod) * 10;
        
        // كلما كانت المسافة أقرب زادت الأولوية
        if (this.camera) {
            const distance = this.camera.position.distanceTo(tile.center);
            priority += Math.max(0, 100 - distance);
        }
        
        return priority;
    }
    
    async processLoadQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        while (this.loadQueue.length > 0) {
            const item = this.loadQueue.shift();
            const tile = this.tiles.get(item.tileId);
            
            if (!tile || tile.loadedLODs.has(item.lod)) continue;
            
            try {
                const data = await this.fetchLODData(item.tileId, item.lod);
                const objects = this.createLODObjects(tile, item.lod, data);
                
                tile.loadedLODs.set(item.lod, {
                    data,
                    objects,
                    loadedAt: Date.now(),
                    memorySize: this.estimateMemorySize(objects)
                });
                
                tile.currentLOD = item.lod;
                this.stats.loadedLODs++;
                this.stats.memoryUsage += tile.loadedLODs.get(item.lod).memorySize;
                
                this.notifyListeners('lodLoaded', { tileId: item.tileId, lod: item.lod, objects });
                
            } catch (error) {
                console.error(`Failed to load LOD ${item.lod} for tile ${item.tileId}:`, error);
                this.notifyListeners('lodError', { tileId: item.tileId, lod: item.lod, error });
            }
        }
        
        this.isProcessing = false;
    }
    
    async fetchLODData(tileId, lod) {
        // يمكن توسيعها لجلب البيانات من خادم
        return {
            tileId,
            lod,
            elements: [],
            timestamp: Date.now()
        };
    }
    
    createLODObjects(tile, lod, data) {
        const objects = [];
        
        // إضافة كائنات حسب مستوى التفاصيل
        if (data.elements) {
            for (const element of data.elements) {
                const obj = this.createElementWithLOD(element, lod);
                if (obj) objects.push(obj);
            }
        }
        
        return objects;
    }
    
    createElementWithLOD(element, lod) {
        // تبسيط الهندسة حسب مستوى LOD
        let geometry;
        
        if (lod === 0) {
            // أعلى جودة
            geometry = element.highGeometry;
        } else if (lod <= 2) {
            // جودة متوسطة
            geometry = element.mediumGeometry;
        } else {
            // جودة منخفضة
            geometry = element.lowGeometry;
        }
        
        // إنشاء كائن Three.js
        const material = new THREE.MeshStandardMaterial({ color: element.color });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.copy(element.position);
        mesh.userData = { lod, originalElement: element };
        
        return mesh;
    }
    
    unloadLOD(tileId, lod) {
        const tile = this.tiles.get(tileId);
        if (!tile) return false;
        
        const lodData = tile.loadedLODs.get(lod);
        if (!lodData) return false;
        
        // إزالة الكائنات من المشهد
        for (const obj of lodData.objects) {
            if (obj.parent) {
                obj.parent.remove(obj);
            }
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }
        
        this.stats.memoryUsage -= lodData.memorySize;
        tile.loadedLODs.delete(lod);
        
        if (tile.currentLOD === lod) {
            tile.currentLOD = null;
        }
        
        this.notifyListeners('lodUnloaded', { tileId, lod });
        
        return true;
    }
    
    // ========== UPDATE LOOP ==========
    
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.updateInterval = setInterval(() => {
            if (this.isActive && this.camera) {
                this.update();
            }
        }, this.settings.updateInterval);
        
        console.log('▶️ TileLODManager started');
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('⏹️ TileLODManager stopped');
    }
    
    update() {
        if (!this.camera) return;
        
        let activeCount = 0;
        
        for (const [tileId, tile] of this.tiles) {
            const distance = this.camera.position.distanceTo(tile.center);
            const isVisible = distance < this.settings.distanceFactors[this.settings.maxLOD] * 1.2;
            
            if (isVisible) {
                this.updateTileLOD(tileId);
                activeCount++;
            } else if (this.activeTiles.has(tileId)) {
                // إلغاء تحميل البلاطات غير المرئية
                for (const [lod] of tile.loadedLODs) {
                    this.unloadLOD(tileId, lod);
                }
                this.activeTiles.delete(tileId);
            }
        }
        
        this.stats.activeTiles = activeCount;
        this.notifyListeners('update', {
            activeTiles: activeCount,
            totalTiles: this.tiles.size,
            memoryUsage: this.stats.memoryUsage
        });
    }
    
    // ========== QUERIES ==========
    
    getTileLOD(tileId) {
        const tile = this.tiles.get(tileId);
        return tile ? tile.currentLOD : null;
    }
    
    getLoadedLODs(tileId) {
        const tile = this.tiles.get(tileId);
        return tile ? Array.from(tile.loadedLODs.keys()) : [];
    }
    
    getTilesInRadius(position, radius) {
        const result = [];
        
        for (const [id, tile] of this.tiles) {
            const distance = this.camera ? this.camera.position.distanceTo(tile.center) : 0;
            if (distance <= radius) {
                result.push({ id, tile, distance });
            }
        }
        
        return result.sort((a, b) => a.distance - b.distance);
    }
    
    // ========== UTILITY ==========
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    estimateMemorySize(objects) {
        let size = 0;
        
        for (const obj of objects) {
            if (obj.geometry) {
                const attr = obj.geometry.attributes.position;
                if (attr) {
                    size += attr.count * 3 * 4; // floats: x,y,z
                }
            }
        }
        
        return size;
    }
    
    getStatistics() {
        return {
            ...this.stats,
            active: this.isActive,
            queueSize: this.loadQueue.length,
            maxLOD: this.settings.maxLOD,
            distanceFactors: this.settings.distanceFactors
        };
    }
    
    // ========== EVENT SYSTEM ==========
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const filtered = this.listeners.get(event).filter(cb => cb !== callback);
            if (filtered.length === 0) {
                this.listeners.delete(event);
            } else {
                this.listeners.set(event, filtered);
            }
        }
    }
    
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('TileLODManager listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.stop();
        
        // إلغاء تحميل جميع البلاطات
        for (const [tileId, tile] of this.tiles) {
            for (const [lod] of tile.loadedLODs) {
                this.unloadLOD(tileId, lod);
            }
        }
        
        this.tiles.clear();
        this.activeTiles.clear();
        this.loadedTiles.clear();
        this.loadQueue = [];
        this.listeners.clear();
        
        console.log('♻️ TileLODManager disposed');
    }
}

export default TileLODManager;