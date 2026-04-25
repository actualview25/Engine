// ============================================
// INTEGRATED LOADER - محمّل متكامل للموارد
// يدعم: النماذج ثلاثية الأبعاد، الصور، الأصوات، والملفات
// ============================================

import * as THREE from 'three';

export class IntegratedLoader {
    constructor(sceneGraph = null, storageManager = null, camera = null) {
        this.sceneGraph = sceneGraph;
        this.storageManager = storageManager;
        this.camera = camera;
        
        // المحملات
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = null;
        this.objLoader = null;
        this.fontLoader = null;
        
        // قوائم الانتظار
        this.activeLoads = new Map();
        this.loadQueue = [];
        this.completedLoads = [];
        this.failedLoads = [];
        
        // إحصائيات
        this.stats = {
            totalLoads: 0,
            completedLoads: 0,
            failedLoads: 0,
            totalSize: 0,
            loadedSize: 0,
            startTime: null
        };
        
        // إعدادات
        this.maxConcurrent = 4;
        this.timeout = 30000; // 30 seconds
        self.retryCount = 3;
        self.retryDelay = 1000;
        
        // أحداث
        this.listeners = new Map();
        
        // ذاكرة التخزين المؤقت
        this.cache = new Map();
        self.useCache = true;
        
        console.log('📦 IntegratedLoader initialized');
        
        // تهيئة المحملات الإضافية (سيتم تحميلها عند الحاجة)
        this.initLoaders();
    }
    
    // ========== INITIALIZATION ==========
    
    initLoaders() {
        // تحميل GLTFLoader ديناميكياً
        import('three/addons/loaders/GLTFLoader.js').then((module) => {
            this.gltfLoader = new module.GLTFLoader();
            console.log('✅ GLTFLoader loaded');
        }).catch(err => console.warn('GLTFLoader not available:', err));
        
        // تحميل OBJLoader
        import('three/addons/loaders/OBJLoader.js').then((module) => {
            this.objLoader = new module.OBJLoader();
            console.log('✅ OBJLoader loaded');
        }).catch(err => console.warn('OBJLoader not available:', err));
        
        // تحميل FontLoader
        import('three/addons/loaders/FontLoader.js').then((module) => {
            this.fontLoader = new module.FontLoader();
            console.log('✅ FontLoader loaded');
        }).catch(err => console.warn('FontLoader not available:', err));
    }
    
    // ========== MAIN LOAD METHODS ==========
    
    async load(url, options = {}) {
        const loadId = `load_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        // التحقق من الكاش
        if (this.useCache && this.cache.has(url)) {
            console.log(`📦 Cache hit: ${url}`);
            return this.cache.get(url);
        }
        
        const loadItem = {
            id: loadId,
            url: url,
            options: options,
            status: 'pending',
            progress: 0,
            startTime: Date.now(),
            retries: 0
        };
        
        this.activeLoads.set(loadId, loadItem);
        this.stats.totalLoads++;
        
        this.notifyListeners('loadStart', loadItem);
        
        try {
            const result = await this.executeLoad(loadItem);
            
            loadItem.status = 'completed';
            loadItem.endTime = Date.now();
            loadItem.duration = loadItem.endTime - loadItem.startTime;
            
            this.completedLoads.push(loadItem);
            this.stats.completedLoads++;
            
            // تخزين في الكاش
            if (this.useCache && options.cache !== false) {
                this.cache.set(url, result);
            }
            
            this.activeLoads.delete(loadId);
            this.notifyListeners('loadComplete', { loadItem, result });
            
            return result;
            
        } catch (error) {
            loadItem.status = 'failed';
            loadItem.error = error.message;
            loadItem.endTime = Date.now();
            
            this.failedLoads.push(loadItem);
            this.stats.failedLoads++;
            this.activeLoads.delete(loadId);
            
            this.notifyListeners('loadError', { loadItem, error });
            
            throw error;
        }
    }
    
    async executeLoad(loadItem) {
        const { url, options } = loadItem;
        const fileExtension = this.getFileExtension(url);
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Load timeout: ${url}`));
            }, this.timeout);
            
            const handleSuccess = (result) => {
                clearTimeout(timeoutId);
                resolve(result);
            };
            
            const handleError = (error) => {
                clearTimeout(timeoutId);
                reject(error);
            };
            
            // اختيار المحمل المناسب حسب نوع الملف
            switch(fileExtension) {
                case 'gltf':
                case 'glb':
                    this.loadGLTF(url, options, handleSuccess, handleError);
                    break;
                case 'obj':
                    this.loadOBJ(url, options, handleSuccess, handleError);
                    break;
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'webp':
                    this.loadTexture(url, options, handleSuccess, handleError);
                    break;
                case 'json':
                    this.loadJSON(url, options, handleSuccess, handleError);
                    break;
                case 'mp3':
                case 'wav':
                case 'ogg':
                    this.loadAudio(url, options, handleSuccess, handleError);
                    break;
                default:
                    this.loadGeneric(url, options, handleSuccess, handleError);
            }
        });
    }
    
    // ========== SPECIFIC LOADERS ==========
    
    loadGLTF(url, options, onSuccess, onError) {
        if (!this.gltfLoader) {
            onError(new Error('GLTFLoader not initialized'));
            return;
        }
        
        this.gltfLoader.load(
            url,
            (gltf) => {
                // معالجة النموذج
                const model = gltf.scene;
                
                // تطبيق التحويلات
                if (options.position) model.position.copy(options.position);
                if (options.rotation) model.rotation.copy(options.rotation);
                if (options.scale) model.scale.copy(options.scale);
                
                // إضافة إلى المشهد
                if (options.addToScene && this.sceneGraph?.root) {
                    this.sceneGraph.root.add(model);
                }
                
                // حفظ البيانات الإضافية
                model.userData = {
                    ...model.userData,
                    sourceUrl: url,
                    loadedAt: Date.now(),
                    ...options.metadata
                };
                
                onSuccess(model);
            },
            (progress) => {
                this.updateProgress(url, progress.loaded / progress.total);
            },
            onError
        );
    }
    
    loadOBJ(url, options, onSuccess, onError) {
        if (!this.objLoader) {
            onError(new Error('OBJLoader not initialized'));
            return;
        }
        
        this.objLoader.load(
            url,
            (object) => {
                if (options.position) object.position.copy(options.position);
                if (options.rotation) object.rotation.copy(options.rotation);
                if (options.scale) object.scale.copy(options.scale);
                
                if (options.addToScene && this.sceneGraph?.root) {
                    this.sceneGraph.root.add(object);
                }
                
                object.userData = {
                    ...object.userData,
                    sourceUrl: url,
                    loadedAt: Date.now()
                };
                
                onSuccess(object);
            },
            (progress) => {
                this.updateProgress(url, progress.loaded / progress.total);
            },
            onError
        );
    }
    
    loadTexture(url, options, onSuccess, onError) {
        this.textureLoader.load(
            url,
            (texture) => {
                texture.userData = {
                    sourceUrl: url,
                    loadedAt: Date.now()
                };
                onSuccess(texture);
            },
            (progress) => {
                this.updateProgress(url, progress.loaded / progress.total);
            },
            onError
        );
    }
    
    loadJSON(url, options, onSuccess, onError) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                this.updateProgress(url, 1);
                onSuccess(data);
            })
            .catch(onError);
    }
    
    loadAudio(url, options, onSuccess, onError) {
        const audio = new Audio();
        audio.src = url;
        
        audio.addEventListener('canplaythrough', () => {
            this.updateProgress(url, 1);
            onSuccess(audio);
        });
        
        audio.addEventListener('error', onError);
        audio.load();
    }
    
    loadGeneric(url, options, onSuccess, onError) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.blob();
            })
            .then(blob => {
                this.updateProgress(url, 1);
                onSuccess(blob);
            })
            .catch(onError);
    }
    
    // ========== BATCH LOADING ==========
    
    async loadMultiple(urls, options = {}) {
        const results = [];
        const errors = [];
        
        // التحكم في التزامن
        const chunks = this.chunkArray(urls, this.maxConcurrent);
        
        for (const chunk of chunks) {
            const promises = chunk.map(url => 
                this.load(url, options).catch(err => {
                    errors.push({ url, error: err });
                    return null;
                })
            );
            
            const chunkResults = await Promise.all(promises);
            results.push(...chunkResults.filter(r => r !== null));
        }
        
        return {
            success: results,
            errors: errors,
            total: urls.length,
            completed: results.length,
            failed: errors.length
        };
    }
    
    loadQueueProcess() {
        // معالجة قائمة الانتظار
        while (this.loadQueue.length > 0 && this.activeLoads.size < this.maxConcurrent) {
            const nextItem = this.loadQueue.shift();
            this.load(nextItem.url, nextItem.options);
        }
    }
    
    addToQueue(url, options = {}) {
        this.loadQueue.push({ url, options });
        this.loadQueueProcess();
    }
    
    // ========== PROGRESS TRACKING ==========
    
    updateProgress(url, progress) {
        for (const [id, loadItem] of this.activeLoads) {
            if (loadItem.url === url) {
                loadItem.progress = progress;
                this.notifyListeners('loadProgress', { loadItem, progress });
                break;
            }
        }
    }
    
    getOverallProgress() {
        if (this.stats.totalLoads === 0) return 0;
        
        let totalProgress = 0;
        for (const [_, loadItem] of this.activeLoads) {
            totalProgress += loadItem.progress;
        }
        
        const completedProgress = this.stats.completedLoads;
        return (completedProgress + totalProgress) / this.stats.totalLoads;
    }
    
    // ========== CACHE MANAGEMENT ==========
    
    setCacheEnabled(enabled) {
        this.useCache = enabled;
    }
    
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Loader cache cleared');
    }
    
    getCacheSize() {
        return this.cache.size;
    }
    
    // ========== SCENE INTEGRATION ==========
    
    async loadScene(sceneData, options = {}) {
        const scene = {
            nodes: [],
            elements: [],
            textures: []
        };
        
        // تحميل العقد
        if (sceneData.nodes) {
            for (const node of sceneData.nodes) {
                const loaded = await this.load(node.url, { ...options, ...node.options });
                scene.nodes.push(loaded);
            }
        }
        
        // تحميل العناصر
        if (sceneData.elements) {
            for (const element of sceneData.elements) {
                const loaded = await this.load(element.url, options);
                scene.elements.push(loaded);
            }
        }
        
        return scene;
    }
    
    // ========== UTILITY ==========
    
    getFileExtension(url) {
        return url.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
    }
    
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    getStatistics() {
        return {
            ...this.stats,
            activeLoads: this.activeLoads.size,
            queueSize: this.loadQueue.length,
            cacheSize: this.cache.size,
            uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0
        };
    }
    
    getActiveLoads() {
        return Array.from(this.activeLoads.values());
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
                    console.error('Loader listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.activeLoads.clear();
        this.loadQueue = [];
        this.completedLoads = [];
        this.failedLoads = [];
        this.cache.clear();
        this.listeners.clear();
        
        console.log('♻️ IntegratedLoader disposed');
    }
}

export default IntegratedLoader;