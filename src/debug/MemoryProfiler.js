// ============================================
// MEMORY PROFILER - نظام تتبع وتحليل الذاكرة
// يكتشف تسريبات الذاكرة، يحلل الاستخدام، ويقدم تقارير
// ============================================

export class MemoryProfiler {
    constructor(options = {}) {
        // إعدادات
        this.samplingInterval = options.interval || 5000; // 5 seconds
        this.maxSnapshots = options.maxSnapshots || 50;
        this.autoDetectLeaks = options.autoDetectLeaks !== false;
        this.leakThreshold = options.leakThreshold || 0.2; // 20% increase
        
        // البيانات
        this.snapshots = [];
        this.currentSnapshot = null;
        this.leaks = [];
        this.objectTracking = new Map();
        
        // حالة التتبع
        this.isProfiling = false;
        this.profilerInterval = null;
        
        // إحصائيات
        this.statistics = {
            peakMemory: 0,
            averageMemory: 0,
            minMemory: Infinity,
            totalSnapshots: 0,
            detectedLeaks: 0
        };
        
        // معالج الأحداث
        this.listeners = new Map();
        
        console.log('💾 MemoryProfiler initialized');
    }
    
    // ========== PROFILING CONTROL ==========
    
    startProfiling() {
        if (this.isProfiling) return;
        
        this.isProfiling = true;
        
        // أخذ لقطة أولية
        this.takeSnapshot('initial');
        
        // بدء التتبع الدوري
        this.profilerInterval = setInterval(() => {
            if (this.isProfiling) {
                this.takeSnapshot('auto');
            }
        }, this.samplingInterval);
        
        console.log('▶️ Memory profiling started');
        this.notifyListeners('started', { interval: this.samplingInterval });
    }
    
    stopProfiling() {
        if (!this.isProfiling) return;
        
        this.isProfiling = false;
        
        if (this.profilerInterval) {
            clearInterval(this.profilerInterval);
            this.profilerInterval = null;
        }
        
        // أخذ لقطة أخيرة
        this.takeSnapshot('final');
        
        // تحليل التسريبات
        if (this.autoDetectLeaks) {
            this.detectLeaks();
        }
        
        console.log('⏹️ Memory profiling stopped');
        this.notifyListeners('stopped', this.generateReport());
    }
    
    // ========== SNAPSHOTS ==========
    
    takeSnapshot(label = 'manual') {
        const snapshot = {
            id: `snapshot_${Date.now()}_${this.snapshots.length}`,
            label: label,
            timestamp: Date.now(),
            memory: this.getMemoryInfo(),
            objects: this.trackObjects(),
            references: this.trackReferences(),
            stats: this.calculateStats()
        };
        
        this.snapshots.push(snapshot);
        this.currentSnapshot = snapshot;
        
        // الاحتفاظ بآخر N لقطات فقط
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }
        
        // تحديث الإحصائيات
        this.updateStatistics(snapshot);
        
        this.notifyListeners('snapshot', snapshot);
        
        return snapshot;
    }
    
    getMemoryInfo() {
        const info = {
            timestamp: Date.now(),
            heapSize: null,
            heapLimit: null,
            usagePercent: null
        };
        
        if (performance.memory) {
            info.heapSize = performance.memory.usedJSHeapSize;
            info.totalHeapSize = performance.memory.totalJSHeapSize;
            info.heapLimit = performance.memory.jsHeapSizeLimit;
            info.usagePercent = (info.heapSize / info.heapLimit) * 100;
        } else {
            // تقدير تقريبي
            info.heapSize = this.estimateMemoryUsage();
            info.usagePercent = 0;
        }
        
        return info;
    }
    
    estimateMemoryUsage() {
        // تقدير تقريبي للذاكرة المستخدمة
        let estimated = 0;
        
        for (const [key, value] of this.objectTracking) {
            estimated += this.sizeOf(value);
        }
        
        return estimated;
    }
    
    sizeOf(obj) {
        if (obj === null) return 0;
        
        let bytes = 0;
        
        if (typeof obj === 'number') bytes = 8;
        else if (typeof obj === 'string') bytes = obj.length * 2;
        else if (typeof obj === 'boolean') bytes = 4;
        else if (Array.isArray(obj)) {
            for (const item of obj) {
                bytes += this.sizeOf(item);
            }
        } else if (typeof obj === 'object') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    bytes += key.length * 2;
                    bytes += this.sizeOf(obj[key]);
                }
            }
        }
        
        return bytes;
    }
    
    trackObjects() {
        const objects = {
            total: 0,
            byType: {},
            byCategory: {}
        };
        
        // تتبع الكائنات العالمية
        for (const key in window) {
            if (window.hasOwnProperty(key)) {
                objects.total++;
                const type = typeof window[key];
                objects.byType[type] = (objects.byType[type] || 0) + 1;
            }
        }
        
        // تتبع كائنات Three.js إذا وجدت
        if (window.THREE) {
            objects.threeJS = {
                meshes: this.countThreeJSObjects('Mesh'),
                geometries: this.countThreeJSObjects('Geometry'),
                materials: this.countThreeJSObjects('Material'),
                textures: this.countThreeJSObjects('Texture')
            };
        }
        
        return objects;
    }
    
    countThreeJSObjects(type) {
        // تقدير تقريبي
        return 0;
    }
    
    trackReferences() {
        const references = {
            strong: [],
            weak: [],
            potentialLeaks: []
        };
        
        // تتبع المراجع القوية
        for (const [key, value] of Object.entries(window)) {
            if (value && typeof value === 'object') {
                references.strong.push(key);
            }
        }
        
        return references;
    }
    
    calculateStats() {
        if (this.snapshots.length === 0) return null;
        
        const lastSnapshot = this.snapshots[this.snapshots.length - 1];
        const firstSnapshot = this.snapshots[0];
        
        return {
            duration: lastSnapshot.timestamp - firstSnapshot.timestamp,
            memoryChange: lastSnapshot.memory.heapSize - firstSnapshot.memory.heapSize,
            memoryChangePercent: ((lastSnapshot.memory.heapSize - firstSnapshot.memory.heapSize) / firstSnapshot.memory.heapSize) * 100,
            snapshotCount: this.snapshots.length
        };
    }
    
    updateStatistics(snapshot) {
        const memory = snapshot.memory.heapSize;
        
        this.statistics.peakMemory = Math.max(this.statistics.peakMemory, memory);
        this.statistics.minMemory = Math.min(this.statistics.minMemory, memory);
        this.statistics.totalSnapshots++;
        
        // حساب المتوسط
        const totalMemory = this.snapshots.reduce((sum, s) => sum + s.memory.heapSize, 0);
        this.statistics.averageMemory = totalMemory / this.snapshots.length;
    }
    
    // ========== LEAK DETECTION ==========
    
    detectLeaks() {
        this.leaks = [];
        
        if (this.snapshots.length < 2) return;
        
        const initial = this.snapshots[0];
        
        for (let i = 1; i < this.snapshots.length; i++) {
            const snapshot = this.snapshots[i];
            const memoryIncrease = (snapshot.memory.heapSize - initial.memory.heapSize) / initial.memory.heapSize;
            
            if (memoryIncrease > this.leakThreshold) {
                this.leaks.push({
                    detectedAt: snapshot.timestamp,
                    memoryIncrease: memoryIncrease,
                    memoryDelta: snapshot.memory.heapSize - initial.memory.heapSize,
                    snapshotLabel: snapshot.label,
                    severity: this.calculateLeakSeverity(memoryIncrease)
                });
            }
        }
        
        this.statistics.detectedLeaks = this.leaks.length;
        
        if (this.leaks.length > 0) {
            console.warn(`⚠️ Detected ${this.leaks.length} potential memory leaks`);
        }
        
        return this.leaks;
    }
    
    calculateLeakSeverity(increase) {
        if (increase > 0.5) return 'critical';
        if (increase > 0.3) return 'high';
        if (increase > 0.2) return 'medium';
        return 'low';
    }
    
    // ========== OBJECT TRACKING ==========
    
    trackObject(id, object, metadata = {}) {
        this.objectTracking.set(id, {
            object: object,
            metadata: metadata,
            createdAt: Date.now(),
            size: this.sizeOf(object)
        });
        
        return id;
    }
    
    untrackObject(id) {
        this.objectTracking.delete(id);
    }
    
    getTrackedObject(id) {
        return this.objectTracking.get(id);
    }
    
    getTrackedObjects() {
        return Array.from(this.objectTracking.entries()).map(([id, data]) => ({
            id: id,
            ...data,
            age: Date.now() - data.createdAt
        }));
    }
    
    // ========== REPORTS ==========
    
    generateReport() {
        const report = {
            timestamp: Date.now(),
            profilingActive: this.isProfiling,
            statistics: { ...this.statistics },
            snapshots: {
                count: this.snapshots.length,
                first: this.snapshots[0],
                last: this.currentSnapshot,
                recent: this.snapshots.slice(-10)
            },
            leaks: this.leaks,
            recommendations: this.generateRecommendations(),
            trackedObjects: this.getTrackedObjects().length
        };
        
        return report;
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        // توصيات بناءً على التسريبات
        if (this.leaks.length > 0) {
            recommendations.push({
                type: 'memory_leak',
                severity: 'high',
                message: `تم اكتشاف ${this.leaks.length} تسريبات ذاكرة محتملة`,
                details: this.leaks
            });
        }
        
        // توصيات بناءً على الاستخدام
        const peakUsage = this.statistics.peakMemory;
        if (peakUsage > 500 * 1024 * 1024) { // 500MB
            recommendations.push({
                type: 'high_memory',
                severity: 'high',
                message: `استخدام ذاكرة مرتفع جداً (${(peakUsage / 1024 / 1024).toFixed(1)} MB)`,
                details: 'يوصى بتحسين إدارة الذاكرة وتقليل تحميل الموارد'
            });
        } else if (peakUsage > 200 * 1024 * 1024) { // 200MB
            recommendations.push({
                type: 'high_memory',
                severity: 'medium',
                message: `استخدام ذاكرة مرتفع (${(peakUsage / 1024 / 1024).toFixed(1)} MB)`,
                details: 'يوصى بمراجعة الكائنات المخزنة مؤقتاً'
            });
        }
        
        // توصيات بناءً على مدة التشغيل
        const firstSnapshot = this.snapshots[0];
        const lastSnapshot = this.currentSnapshot;
        
        if (firstSnapshot && lastSnapshot) {
            const duration = lastSnapshot.timestamp - firstSnapshot.timestamp;
            if (duration > 60000) { // أكثر من دقيقة
                const memoryGrowth = ((lastSnapshot.memory.heapSize - firstSnapshot.memory.heapSize) / firstSnapshot.memory.heapSize) * 100;
                
                if (memoryGrowth > 20) {
                    recommendations.push({
                        type: 'memory_growth',
                        severity: 'medium',
                        message: `نمو الذاكرة بنسبة ${memoryGrowth.toFixed(1)}% خلال الجلسة`,
                        details: 'قد يكون هناك تسريب تدريجي للذاكرة'
                    });
                }
            }
        }
        
        return recommendations;
    }
    
    exportData() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            statistics: this.statistics,
            snapshots: this.snapshots,
            leaks: this.leaks,
            trackedObjects: this.getTrackedObjects()
        };
    }
    
    importData(data) {
        this.statistics = data.statistics;
        this.snapshots = data.snapshots;
        this.leaks = data.leaks;
        
        if (data.trackedObjects) {
            for (const obj of data.trackedObjects) {
                this.objectTracking.set(obj.id, obj);
            }
        }
        
        console.log('📥 Memory profiler data imported');
    }
    
    // ========== RESET ==========
    
    reset() {
        this.snapshots = [];
        this.currentSnapshot = null;
        this.leaks = [];
        this.objectTracking.clear();
        
        this.statistics = {
            peakMemory: 0,
            averageMemory: 0,
            minMemory: Infinity,
            totalSnapshots: 0,
            detectedLeaks: 0
        };
        
        console.log('🔄 MemoryProfiler reset');
    }
    
    // ========== EVENT LISTENERS ==========
    
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
                    console.error('MemoryProfiler listener error:', error);
                }
            }
        }
    }
    
    dispose() {
        this.stopProfiling();
        this.reset();
        this.listeners.clear();
        console.log('♻️ MemoryProfiler disposed');
    }
}

export default MemoryProfiler;