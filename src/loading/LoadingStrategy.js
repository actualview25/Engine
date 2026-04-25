// ============================================
// LOADING STRATEGY - استراتيجيات تحميل مختلفة
// يدعم: Sequential, Parallel, Priority, Adaptive, Progressive
// ============================================

export class LoadingStrategy {
    constructor(sceneGraph = null) {
        this.sceneGraph = sceneGraph;
        
        // الاستراتيجية الحالية
        this.currentStrategy = 'adaptive';
        
        // الاستراتيجيات المتاحة
        this.strategies = {
            sequential: new SequentialStrategy(),
            parallel: new ParallelStrategy(),
            priority: new PriorityStrategy(),
            adaptive: new AdaptiveStrategy(),
            progressive: new ProgressiveStrategy()
        };
        
        // الإعدادات
        this.settings = {
            maxParallel: 4,
            priorityThreshold: 10,
            adaptiveSampleSize: 10,
            progressiveSteps: 3
        };
        
        // إحصائيات
        this.stats = {
            loadsCompleted: 0,
            loadsFailed: 0,
            totalTime: 0,
            strategyUsed: this.currentStrategy
        };
        
        // أحداث
        this.listeners = new Map();
        
        console.log('🎯 LoadingStrategy initialized');
    }
    
    // ========== STRATEGY SELECTION ==========
    
    setStrategy(strategyName) {
        if (this.strategies[strategyName]) {
            this.currentStrategy = strategyName;
            this.stats.strategyUsed = strategyName;
            this.notifyListeners('strategyChanged', { strategy: strategyName });
            console.log(`📋 Loading strategy set to: ${strategyName}`);
            return true;
        }
        return false;
    }
    
    getCurrentStrategy() {
        return this.currentStrategy;
    }
    
    getAvailableStrategies() {
        return Object.keys(this.strategies);
    }
    
    // ========== LOADING EXECUTION ==========
    
    async load(items, options = {}) {
        const startTime = performance.now();
        const strategy = this.strategies[this.currentStrategy];
        
        if (!strategy) {
            throw new Error(`Strategy ${this.currentStrategy} not found`);
        }
        
        // تطبيق الإعدادات
        strategy.setSettings({ ...this.settings, ...options });
        
        // مراقبة التقدم
        const onProgress = (progress) => {
            this.notifyListeners('progress', progress);
        };
        
        try {
            const result = await strategy.execute(items, onProgress);
            
            const duration = performance.now() - startTime;
            this.stats.loadsCompleted += result.completed;
            this.stats.loadsFailed += result.failed;
            this.stats.totalTime += duration;
            
            this.notifyListeners('complete', {
                ...result,
                duration,
                strategy: this.currentStrategy
            });
            
            return result;
            
        } catch (error) {
            this.notifyListeners('error', { error, strategy: this.currentStrategy });
            throw error;
        }
    }
    
    // ========== STRATEGY IMPLEMENTATIONS ==========
}

// ========== SEQUENTIAL STRATEGY ==========
class SequentialStrategy {
    constructor() {
        this.settings = {};
    }
    
    setSettings(settings) {
        this.settings = settings;
    }
    
    async execute(items, onProgress) {
        const results = [];
        let completed = 0;
        let failed = 0;
        
        for (let i = 0; i < items.length; i++) {
            try {
                const result = await items[i].load();
                results.push({ item: items[i], result, success: true });
                completed++;
            } catch (error) {
                results.push({ item: items[i], error, success: false });
                failed++;
            }
            
            const progress = (i + 1) / items.length;
            onProgress?.(progress);
        }
        
        return { results, completed, failed, total: items.length };
    }
}

// ========== PARALLEL STRATEGY ==========
class ParallelStrategy {
    constructor() {
        this.settings = { maxParallel: 4 };
    }
    
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
    
    async execute(items, onProgress) {
        const results = [];
        let completed = 0;
        let failed = 0;
        
        // تجميع العناصر في مجموعات متوازية
        const chunks = this.chunkArray(items, this.settings.maxParallel);
        
        for (const chunk of chunks) {
            const promises = chunk.map(item => 
                item.load().then(result => ({ item, result, success: true }))
                    .catch(error => ({ item, error, success: false }))
            );
            
            const chunkResults = await Promise.all(promises);
            
            for (const result of chunkResults) {
                results.push(result);
                if (result.success) completed++;
                else failed++;
            }
            
            const progress = results.length / items.length;
            onProgress?.(progress);
        }
        
        return { results, completed, failed, total: items.length };
    }
    
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

// ========== PRIORITY STRATEGY ==========
class PriorityStrategy {
    constructor() {
        this.settings = { priorityThreshold: 10 };
    }
    
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
    
    async execute(items, onProgress) {
        // ترتيب حسب الأولوية
        const sorted = [...items].sort((a, b) => {
            const priorityA = a.priority || 0;
            const priorityB = b.priority || 0;
            return priorityB - priorityA;
        });
        
        const results = [];
        let completed = 0;
        let failed = 0;
        
        for (let i = 0; i < sorted.length; i++) {
            try {
                const result = await sorted[i].load();
                results.push({ item: sorted[i], result, success: true });
                completed++;
            } catch (error) {
                results.push({ item: sorted[i], error, success: false });
                failed++;
            }
            
            const progress = (i + 1) / sorted.length;
            onProgress?.(progress);
        }
        
        return { results, completed, failed, total: items.length };
    }
}

// ========== ADAPTIVE STRATEGY ==========
class AdaptiveStrategy {
    constructor() {
        this.settings = { 
            maxParallel: 4,
            adaptiveSampleSize: 10,
            minParallel: 1,
            maxParallel: 8
        };
        this.performanceHistory = [];
    }
    
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
    
    async execute(items, onProgress) {
        const startTime = performance.now();
        let adaptiveParallel = this.calculateOptimalParallel();
        
        const results = [];
        let completed = 0;
        let failed = 0;
        
        // استخدام خوارزمية ADAPTIVE
        const chunks = this.chunkArray(items, adaptiveParallel);
        
        for (let i = 0; i < chunks.length; i++) {
            const chunkStart = performance.now();
            const promises = chunks[i].map(item => 
                item.load().then(result => ({ item, result, success: true }))
                    .catch(error => ({ item, error, success: false }))
            );
            
            const chunkResults = await Promise.all(promises);
            
            const chunkDuration = performance.now() - chunkStart;
            
            // تحديث الأداء
            this.updatePerformance(adaptiveParallel, chunkDuration);
            
            // إعادة حساب العدد الأمثل
            adaptiveParallel = this.calculateOptimalParallel();
            
            for (const result of chunkResults) {
                results.push(result);
                if (result.success) completed++;
                else failed++;
            }
            
            const progress = results.length / items.length;
            onProgress?.(progress);
        }
        
        const totalDuration = performance.now() - startTime;
        
        return { results, completed, failed, total: items.length, adaptiveParallel };
    }
    
    calculateOptimalParallel() {
        if (this.performanceHistory.length < this.settings.adaptiveSampleSize) {
            return this.settings.maxParallel;
        }
        
        // تحليل الأداء السابق
        const avgTime = this.performanceHistory.reduce((a, b) => a + b.time, 0) / this.performanceHistory.length;
        const optimal = Math.max(this.settings.minParallel, 
            Math.min(this.settings.maxParallel, 
                Math.floor(this.settings.maxParallel * (avgTime / 100))));
        
        return optimal;
    }
    
    updatePerformance(parallel, duration) {
        this.performanceHistory.push({ parallel, time: duration, timestamp: Date.now() });
        
        // الاحتفاظ بآخر 100 قياس فقط
        if (this.performanceHistory.length > 100) {
            this.performanceHistory.shift();
        }
    }
    
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}

// ========== PROGRESSIVE STRATEGY ==========
class ProgressiveStrategy {
    constructor() {
        this.settings = { 
            progressiveSteps: 3,
            progressiveFactors: [0.3, 0.6, 1.0]
        };
    }
    
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
    
    async execute(items, onProgress) {
        const results = [];
        let completed = 0;
        let failed = 0;
        
        // تحميل تدريجي - أولاً العناصر الصغيرة
        const sorted = [...items].sort((a, b) => (a.size || 0) - (b.size || 0));
        
        for (let i = 0; i < sorted.length; i++) {
            try {
                // تحميل بنسخة منخفضة الجودة أولاً (إذا كان متاحاً)
                if (sorted[i].loadProgressive) {
                    const progressiveResult = await sorted[i].loadProgressive(
                        this.settings.progressiveFactors
                    );
                    results.push({ item: sorted[i], result: progressiveResult, success: true });
                } else {
                    const result = await sorted[i].load();
                    results.push({ item: sorted[i], result, success: true });
                }
                completed++;
            } catch (error) {
                results.push({ item: sorted[i], error, success: false });
                failed++;
            }
            
            const progress = (i + 1) / sorted.length;
            onProgress?.(progress);
        }
        
        return { results, completed, failed, total: items.length };
    }
}

// تصدير الاستراتيجيات
export { SequentialStrategy, ParallelStrategy, PriorityStrategy, AdaptiveStrategy, ProgressiveStrategy };
export default LoadingStrategy;