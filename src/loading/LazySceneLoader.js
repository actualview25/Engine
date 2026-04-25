// ============================================
// LAZY SCENE LOADER - تحميل المشاهد بتكاسل
// يقوم بتحميل المشاهد عند الاقتراب منها فقط
// ============================================

export class LazySceneLoader {
    constructor(sceneGraph = null, storageManager = null) {
        this.sceneGraph = sceneGraph;
        this.storageManager = storageManager;
        
        // المشاهد المسجلة
        this.scenes = new Map(); // sceneId -> sceneData
        this.loadedScenes = new Set();
        self.loadingScenes = new Set();
        
        // إعدادات
        self.loadRadius = 50; // متر
        self.unloadRadius = 80; // متر
        self.checkInterval = 1000; // 1 second
        self.maxConcurrentLoads = 2;
        
        // الحالة
        self.isActive = false;
        self.currentPosition = { x: 0, y: 0, z: 0 };
        self.intervalId = null;
        
        // إحصائيات
        this.stats = {
            totalScenes: 0,
            loadedScenes: 0,
            loadingScenes: 0,
            unloadedScenes: 0
        };
        
        // أحداث
        this.listeners = new Map();
        
        console.log('🦥 LazySceneLoader initialized');
    }
    
    // ========== SCENE REGISTRATION ==========
    
    registerScene(sceneId, sceneData) {
        this.scenes.set(sceneId, {
            id: sceneId,
            name: sceneData.name || sceneId,
            position: sceneData.position || { x: 0, y: 0, z: 0 },
            url: sceneData.url,
            priority: sceneData.priority || 0,
            dependencies: sceneData.dependencies || [],
            metadata: sceneData.metadata || {},
            registeredAt: Date.now()
        });
        
        this.stats.totalScenes = this.scenes.size;
        this.notifyListeners('sceneRegistered', { sceneId, sceneData });
        
        return sceneId;
    }
    
    registerScenes(scenes) {
        for (const [id, data] of Object.entries(scenes)) {
            this.registerScene(id, data);
        }
    }
    
    unregisterScene(sceneId) {
        if (this.scenes.has(sceneId)) {
            this.scenes.delete(sceneId);
            this.unloadScene(sceneId);
            this.stats.totalScenes = this.scenes.size;
            this.notifyListeners('sceneUnregistered', { sceneId });
        }
    }
    
    // ========== LOADING CONTROL ==========
    
    start(position = null) {
        if (this.isActive) return;
        
        this.isActive = true;
        if (position) this.currentPosition = position;
        
        this.intervalId = setInterval(() => {
            if (this.isActive) {
                this.checkAndLoadScenes();
            }
        }, this.checkInterval);
        
        console.log('▶️ LazySceneLoader started');
        this.notifyListeners('started');
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('⏹️ LazySceneLoader stopped');
        this.notifyListeners('stopped');
    }
    
    updatePosition(position) {
        this.currentPosition = { ...position };
        this.checkAndLoadScenes();
    }
    
    // ========== SCENE CHECKING ==========
    
    checkAndLoadScenes() {
        const scenesToLoad = [];
        const scenesToUnload = [];
        
        for (const [sceneId, scene] of this.scenes) {
            const distance = this.calculateDistance(this.currentPosition, scene.position);
            const isLoaded = this.loadedScenes.has(sceneId);
            const isLoading = this.loadingScenes.has(sceneId);
            
            if (!isLoaded && !isLoading && distance < this.loadRadius) {
                scenesToLoad.push({ sceneId, scene, distance });
            }
            
            if (isLoaded && distance > this.unloadRadius) {
                scenesToUnload.push({ sceneId, scene });
            }
        }
        
        // ترتيب حسب الأولوية والمسافة
        scenesToLoad.sort((a, b) => {
            if (a.scene.priority !== b.scene.priority) {
                return b.scene.priority - a.scene.priority;
            }
            return a.distance - b.distance;
        });
        
        // تحميل المشاهد (مع حدود التزامن)
        let loadingCount = this.loadingScenes.size;
        for (const item of scenesToLoad) {
            if (loadingCount >= this.maxConcurrentLoads) break;
            this.loadScene(item.sceneId);
            loadingCount++;
        }
        
        // إلغاء تحميل المشاهد البعيدة
        for (const item of scenesToUnload) {
            this.unloadScene(item.sceneId);
        }
    }
    
    async loadScene(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (!scene) return false;
        if (this.loadedScenes.has(sceneId)) return true;
        if (this.loadingScenes.has(sceneId)) return false;
        
        this.loadingScenes.add(sceneId);
        this.stats.loadingScenes++;
        
        this.notifyListeners('sceneLoadStart', { sceneId, scene });
        
        try {
            // تحميل التبعيات أولاً
            for (const depId of scene.dependencies) {
                await this.loadScene(depId);
            }
            
            // تحميل المشهد الفعلي
            const sceneData = await this.fetchScene(scene.url);
            
            // إضافة إلى SceneGraph
            if (this.sceneGraph) {
                const node = this.createSceneNode(sceneId, scene, sceneData);
                this.sceneGraph.root.add(node);
            }
            
            this.loadedScenes.add(sceneId);
            this.stats.loadedScenes++;
            
            this.notifyListeners('sceneLoadComplete', { sceneId, scene, data: sceneData });
            
            return true;
            
        } catch (error) {
            console.error(`Failed to load scene ${sceneId}:`, error);
            this.notifyListeners('sceneLoadError', { sceneId, scene, error });
            return false;
            
        } finally {
            this.loadingScenes.delete(sceneId);
            this.stats.loadingScenes--;
        }
    }
    
    unloadScene(sceneId) {
        if (!this.loadedScenes.has(sceneId)) return false;
        
        const scene = this.scenes.get(sceneId);
        
        this.notifyListeners('sceneUnloadStart', { sceneId, scene });
        
        // إزالة من SceneGraph
        if (this.sceneGraph) {
            const node = this.findSceneNode(sceneId);
            if (node && node.parent) {
                node.parent.remove(node);
            }
        }
        
        this.loadedScenes.delete(sceneId);
        this.stats.loadedScenes--;
        
        this.notifyListeners('sceneUnloadComplete', { sceneId, scene });
        
        return true;
    }
    
    // ========== SCENE DATA ==========
    
    async fetchScene(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }
    
    createSceneNode(sceneId, scene, sceneData) {
        // إنشاء مجموعة للمشهد
        const group = new THREE.Group();
        group.name = scene.name;
        group.userData = {
            id: sceneId,
            type: 'lazyScene',
            loadedAt: Date.now(),
            position: scene.position
        };
        
        group.position.set(scene.position.x, scene.position.y, scene.position.z);
        
        // إضافة العناصر من البيانات
        if (sceneData.elements) {
            for (const element of sceneData.elements) {
                // إضافة العنصر (يتم تفصيله حسب النوع)
                const obj = this.createElement(element);
                if (obj) group.add(obj);
            }
        }
        
        return group;
    }
    
    createElement(data) {
        // يمكن توسيعها حسب الحاجة
        return null;
    }
    
    findSceneNode(sceneId) {
        if (!this.sceneGraph) return null;
        
        let found = null;
        this.sceneGraph.root.traverse((node) => {
            if (node.userData?.id === sceneId && node.userData?.type === 'lazyScene') {
                found = node;
            }
        });
        
        return found;
    }
    
    // ========== UTILITY ==========
    
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    setLoadRadius(radius) {
        this.loadRadius = radius;
        this.checkAndLoadScenes();
    }
    
    setUnloadRadius(radius) {
        this.unloadRadius = radius;
        this.checkAndLoadScenes();
    }
    
    getLoadedScenes() {
        return Array.from(this.loadedScenes);
    }
    
    getLoadingScenes() {
        return Array.from(this.loadingScenes);
    }
    
    getSceneStatus(sceneId) {
        if (this.loadedScenes.has(sceneId)) return 'loaded';
        if (this.loadingScenes.has(sceneId)) return 'loading';
        if (this.scenes.has(sceneId)) return 'unloaded';
        return 'unknown';
    }
    
    getStatistics() {
        return {
            ...this.stats,
            active: this.isActive,
            loadRadius: this.loadRadius,
            unloadRadius: this.unloadRadius,
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
                    console.error('LazySceneLoader listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.stop();
        
        // إلغاء تحميل جميع المشاهد
        for (const sceneId of this.loadedScenes) {
            this.unloadScene(sceneId);
        }
        
        this.scenes.clear();
        this.loadedScenes.clear();
        this.loadingScenes.clear();
        this.listeners.clear();
        
        console.log('♻️ LazySceneLoader disposed');
    }
}

export default LazySceneLoader;