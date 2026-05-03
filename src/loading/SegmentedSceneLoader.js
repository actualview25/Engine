// ============================================
// SEGMENTED SCENE LOADER - تحميل المشاهد المجزأة
// يقسم المشهد الكبير إلى أجزاء ويحمّلها بشكل تدريجي
// ============================================

export class SegmentedSceneLoader {
    constructor(options = {}) {
        this.segments = new Map();
        this.loadedSegments = new Set();
        this.loadingSegments = new Set();
        
        this.settings = {
            segmentSize: options.segmentSize || 50, // متر
            maxConcurrent: options.maxConcurrent || 4,
            preloadRadius: options.preloadRadius || 100,
            unloadRadius: options.unloadRadius || 150
        };
        
        this.currentPosition = { x: 0, y: 0, z: 0 };
        self.activeSegments = new Set();
        self.segmentGrid = new Map();
        
        this.stats = {
            totalSegments: 0,
            loadedSegments: 0,
            loadingSegments: 0,
            unloadedSegments: 0
        };
        
        this.listeners = new Map();
        
        console.log('🧩 SegmentedSceneLoader initialized');
    }
    
    // ========== SEGMENT GENERATION ==========
    
    generateSegments(bounds, options = {}) {
        const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
        const segmentSize = options.segmentSize || this.settings.segmentSize;
        
        const startX = Math.floor(minX / segmentSize) * segmentSize;
        const startY = Math.floor(minY / segmentSize) * segmentSize;
        const startZ = Math.floor(minZ / segmentSize) * segmentSize;
        
        const endX = Math.ceil(maxX / segmentSize) * segmentSize;
        const endY = Math.ceil(maxY / segmentSize) * segmentSize;
        const endZ = Math.ceil(maxZ / segmentSize) * segmentSize;
        
        for (let x = startX; x <= endX; x += segmentSize) {
            for (let y = startY; y <= endY; y += segmentSize) {
                for (let z = startZ; z <= endZ; z += segmentSize) {
                    const segmentId = this.getSegmentId(x, y, z);
                    const segment = {
                        id: segmentId,
                        bounds: {
                            min: { x, y, z },
                            max: { x + segmentSize, y + segmentSize, z + segmentSize }
                        },
                        center: {
                            x: x + segmentSize / 2,
                            y: y + segmentSize / 2,
                            z: z + segmentSize / 2
                        },
                        status: 'unloaded',
                        data: null
                    };
                    
                    this.segments.set(segmentId, segment);
                    this.segmentGrid.set(segmentId, segment);
                }
            }
        }
        
        this.stats.totalSegments = this.segments.size;
        this.notifyListeners('segmentsGenerated', { count: this.segments.size });
        
        console.log(`📐 Generated ${this.segments.size} segments`);
        
        return this.segments;
    }
    
    getSegmentId(x, y, z) {
        const segmentSize = this.settings.segmentSize;
        const segX = Math.floor(x / segmentSize);
        const segY = Math.floor(y / segmentSize);
        const segZ = Math.floor(z / segmentSize);
        return `${segX},${segY},${segZ}`;
    }
    
    getSegmentAtPosition(position) {
        const segmentId = this.getSegmentId(position.x, position.y, position.z);
        return this.segments.get(segmentId);
    }
    
    // ========== LOADING CONTROL ==========
    
    start(position = null) {
        if (this.isActive) return;
        
        this.isActive = true;
        if (position) this.currentPosition = position;
        
        this.checkAndLoadSegments();
        
        this.intervalId = setInterval(() => {
            if (this.isActive) {
                this.checkAndLoadSegments();
            }
        }, 500);
        
        console.log('▶️ SegmentedSceneLoader started');
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('⏹️ SegmentedSceneLoader stopped');
    }
    
    updatePosition(position) {
        this.currentPosition = { ...position };
        this.checkAndLoadSegments();
    }
    
    checkAndLoadSegments() {
        const segmentsToLoad = [];
        const segmentsToUnload = [];
        
        for (const [id, segment] of this.segments) {
            const distance = this.calculateDistance(this.currentPosition, segment.center);
            const isLoaded = this.loadedSegments.has(id);
            const isLoading = this.loadingSegments.has(id);
            
            if (!isLoaded && !isLoading && distance < this.settings.preloadRadius) {
                segmentsToLoad.push({ id, segment, distance });
            }
            
            if (isLoaded && distance > this.settings.unloadRadius) {
                segmentsToUnload.push({ id, segment });
            }
        }
        
        // ترتيب حسب المسافة
        segmentsToLoad.sort((a, b) => a.distance - b.distance);
        
        // تحميل الأجزاء
        let loadingCount = this.loadingSegments.size;
        for (const item of segmentsToLoad) {
            if (loadingCount >= this.settings.maxConcurrent) break;
            this.loadSegment(item.id);
            loadingCount++;
        }
        
        // إلغاء تحميل الأجزاء البعيدة
        for (const item of segmentsToUnload) {
            this.unloadSegment(item.id);
        }
    }
    
    async loadSegment(segmentId) {
        const segment = this.segments.get(segmentId);
        if (!segment) return false;
        if (this.loadedSegments.has(segmentId)) return true;
        if (this.loadingSegments.has(segmentId)) return false;
        
        this.loadingSegments.add(segmentId);
        this.stats.loadingSegments++;
        
        this.notifyListeners('segmentLoadStart', { segmentId, segment });
        
        try {
            // تحميل بيانات الجزء
            const data = await this.fetchSegmentData(segmentId, segment);
            
            // إنشاء كائنات Three.js للجزء
            const objects = this.createSegmentObjects(segment, data);
            
            segment.data = data;
            segment.objects = objects;
            segment.status = 'loaded';
            
            this.loadedSegments.add(segmentId);
            this.stats.loadedSegments++;
            
            this.notifyListeners('segmentLoadComplete', { segmentId, segment, objects });
            
            return true;
            
        } catch (error) {
            console.error(`Failed to load segment ${segmentId}:`, error);
            segment.status = 'error';
            
            this.notifyListeners('segmentLoadError', { segmentId, segment, error });
            
            return false;
            
        } finally {
            this.loadingSegments.delete(segmentId);
            this.stats.loadingSegments--;
        }
    }
    
    unloadSegment(segmentId) {
        const segment = this.segments.get(segmentId);
        if (!segment) return false;
        if (!this.loadedSegments.has(segmentId)) return false;
        
        this.notifyListeners('segmentUnloadStart', { segmentId, segment });
        
        // إزالة الكائنات من المشهد
        if (segment.objects) {
            for (const obj of segment.objects) {
                if (obj.parent) {
                    obj.parent.remove(obj);
                }
            }
        }
        
        segment.data = null;
        segment.objects = null;
        segment.status = 'unloaded';
        
        this.loadedSegments.delete(segmentId);
        this.stats.unloadedSegments++;
        
        this.notifyListeners('segmentUnloadComplete', { segmentId, segment });
        
        return true;
    }
    
    // ========== DATA FETCHING ==========
    
    async fetchSegmentData(segmentId, segment) {
        // يمكن توسيعها لجلب البيانات من خادم أو ملف
        return {
            id: segmentId,
            bounds: segment.bounds,
            elements: [],
            timestamp: Date.now()
        };
    }
    
    createSegmentObjects(segment, data) {
        const objects = [];
        
        // إضافة كائنات Three.js بناءً على البيانات
        if (data.elements) {
            for (const element of data.elements) {
                const obj = this.createElement(element);
                if (obj) objects.push(obj);
            }
        }
        
        // إضافة شبكة مرجعية للجزء (اختياري)
        if (this.settings.showDebugGrid) {
            const grid = this.createDebugGrid(segment);
            if (grid) objects.push(grid);
        }
        
        return objects;
    }
    
    createElement(data) {
        // يمكن توسيعها حسب الحاجة
        return null;
    }
    
    createDebugGrid(segment) {
        const size = this.settings.segmentSize;
        const center = segment.center;
        
        const gridHelper = new THREE.GridHelper(size, 10, 0xff00ff, 0x880088);
        gridHelper.position.set(center.x, center.y, center.z);
        gridHelper.userData = { type: 'debug_grid', segmentId: segment.id };
        
        return gridHelper;
    }
    
    // ========== QUERIES ==========
    
    getActiveSegments() {
        return Array.from(this.loadedSegments).map(id => this.segments.get(id));
    }
    
    getSegmentStatus(segmentId) {
        if (this.loadedSegments.has(segmentId)) return 'loaded';
        if (this.loadingSegments.has(segmentId)) return 'loading';
        if (this.segments.has(segmentId)) return 'unloaded';
        return 'unknown';
    }
    
    getSegmentsInRadius(position, radius) {
        const result = [];
        
        for (const [id, segment] of this.segments) {
            const distance = this.calculateDistance(position, segment.center);
            if (distance <= radius) {
                result.push({ id, segment, distance });
            }
        }
        
        return result.sort((a, b) => a.distance - b.distance);
    }
    
    // ========== UTILITY ==========
    
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    setSegmentSize(size) {
        this.settings.segmentSize = size;
        // إعادة إنشاء الأجزاء
        // needs bounds to regenerate
    }
    
    getStatistics() {
        return {
            ...this.stats,
            active: this.isActive,
            segmentSize: this.settings.segmentSize,
            preloadRadius: this.settings.preloadRadius,
            unloadRadius: this.settings.unloadRadius,
            currentPosition: this.currentPosition
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
                    console.error('SegmentedSceneLoader listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.stop();
        
        // إلغاء تحميل جميع الأجزاء
        for (const segmentId of this.loadedSegments) {
            this.unloadSegment(segmentId);
        }
        
        this.segments.clear();
        this.loadedSegments.clear();
        this.loadingSegments.clear();
        this.segmentGrid.clear();
        this.listeners.clear();
        
        console.log('♻️ SegmentedSceneLoader disposed');
    }
}

export default SegmentedSceneLoader;
