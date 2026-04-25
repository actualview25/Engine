// ============================================
// ANALYTICS DEBUGGER - نظام تحليل وتصحيح الأداء
// يجمع بيانات التحليلات، الإحصائيات، وتقارير الأداء
// ============================================

export class AnalyticsDebugger {
    constructor(loader = null, realityBridge = null) {
        this.loader = loader;
        this.realityBridge = realityBridge;
        
        // بيانات التحليلات
        this.metrics = {
            performance: [],
            memory: [],
            network: [],
            userActions: [],
            errors: [],
            loadingTimes: []
        };
        
        // إعدادات التتبع
        this.trackingEnabled = true;
        this.samplingRate = 1.0; // 100%
        this.autoReportInterval = null;
        this.reportIntervalMs = 30000; // 30 seconds
        
        // الإحصائيات الجارية
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        
        // المستمعين
        this.listeners = new Map();
        
        // التقرير الأخير
        this.lastReport = null;
        
        console.log('📊 AnalyticsDebugger initialized');
        
        if (this.trackingEnabled) {
            this.startTracking();
        }
    }
    
    // ========== TRACKING CONTROL ==========
    
    startTracking() {
        // تتبع الأداء
        this.startPerformanceTracking();
        
        // تتبع الأخطاء
        this.startErrorTracking();
        
        // تتبع التفاعلات
        this.startUserTracking();
        
        // تقارير تلقائية
        if (this.autoReportInterval) {
            clearInterval(this.autoReportInterval);
        }
        
        this.autoReportInterval = setInterval(() => {
            if (this.trackingEnabled) {
                this.generateAutoReport();
            }
        }, this.reportIntervalMs);
        
        console.log('▶️ Analytics tracking started');
    }
    
    stopTracking() {
        this.trackingEnabled = false;
        
        if (this.autoReportInterval) {
            clearInterval(this.autoReportInterval);
            this.autoReportInterval = null;
        }
        
        console.log('⏹️ Analytics tracking stopped');
    }
    
    startPerformanceTracking() {
        // تتبع FPS
        let lastTime = performance.now();
        let frames = 0;
        
        const trackPerformance = () => {
            if (!this.trackingEnabled) return;
            
            frames++;
            const now = performance.now();
            const delta = now - lastTime;
            
            if (delta >= 1000) {
                this.fps = frames;
                this.addMetric('performance', {
                    timestamp: now,
                    fps: frames,
                    frameTime: delta / frames,
                    delta: delta
                });
                
                frames = 0;
                lastTime = now;
            }
            
            requestAnimationFrame(trackPerformance);
        };
        
        requestAnimationFrame(trackPerformance);
        
        // تتبع تحميل الصفحة
        window.addEventListener('load', () => {
            this.addMetric('performance', {
                type: 'page_load',
                timestamp: Date.now(),
                loadTime: performance.timing?.loadEventEnd - performance.timing?.navigationStart
            });
        });
    }
    
    startErrorTracking() {
        // تتبع أخطاء الجافاسكريبت
        window.addEventListener('error', (event) => {
            this.addMetric('errors', {
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });
        
        // تتبع الرفض (Promise rejections)
        window.addEventListener('unhandledrejection', (event) => {
            this.addMetric('errors', {
                type: 'promise_rejection',
                reason: event.reason,
                timestamp: Date.now()
            });
        });
        
        // تتبع أخطاء التحميل
        if (this.loader) {
            const originalOnError = this.loader.onError;
            this.loader.onError = (error) => {
                this.addMetric('errors', {
                    type: 'loader',
                    error: error,
                    timestamp: Date.now()
                });
                if (originalOnError) originalOnError(error);
            };
        }
    }
    
    startUserTracking() {
        // تتبع النقرات
        document.addEventListener('click', (event) => {
            this.addMetric('userActions', {
                type: 'click',
                target: this.getElementPath(event.target),
                position: { x: event.clientX, y: event.clientY },
                timestamp: Date.now()
            });
        });
        
        // تتبع ضغطات المفاتيح
        document.addEventListener('keydown', (event) => {
            this.addMetric('userActions', {
                type: 'keydown',
                key: event.key,
                ctrl: event.ctrlKey,
                shift: event.shiftKey,
                alt: event.altKey,
                timestamp: Date.now()
            });
        });
        
        // تتبع تغيير حجم النافذة
        window.addEventListener('resize', () => {
            this.addMetric('userActions', {
                type: 'resize',
                width: window.innerWidth,
                height: window.innerHeight,
                timestamp: Date.now()
            });
        });
        
        // تتبع التمرير
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.addMetric('userActions', {
                    type: 'scroll',
                    scrollX: window.scrollX,
                    scrollY: window.scrollY,
                    timestamp: Date.now()
                });
            }, 100);
        });
    }
    
    // ========== MEMORY TRACKING ==========
    
    trackMemory() {
        if (!performance.memory) {
            console.warn('performance.memory not available');
            return;
        }
        
        setInterval(() => {
            if (!this.trackingEnabled) return;
            
            const memory = performance.memory;
            this.addMetric('memory', {
                timestamp: Date.now(),
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
            });
        }, 5000);
    }
    
    trackLoadingTime(resource, duration) {
        this.addMetric('loadingTimes', {
            resource: resource,
            duration: duration,
            timestamp: Date.now()
        });
    }
    
    // ========== METRIC MANAGEMENT ==========
    
    addMetric(category, data) {
        if (!this.trackingEnabled) return;
        
        // تطبيق معدل العينة
        if (Math.random() > this.samplingRate) return;
        
        const metric = {
            id: `${category}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            category: category,
            data: data,
            sessionId: this.sessionId
        };
        
        this.metrics[category].push(metric);
        
        // الاحتفاظ بآخر 1000 قياس فقط
        const maxSize = 1000;
        if (this.metrics[category].length > maxSize) {
            this.metrics[category] = this.metrics[category].slice(-maxSize);
        }
        
        // إشعار المستمعين
        this.notifyListeners('metric', metric);
        
        return metric;
    }
    
    getMetrics(category = null, options = {}) {
        if (category) {
            return this.filterMetrics(this.metrics[category] || [], options);
        }
        
        const allMetrics = [];
        for (const cat of Object.keys(this.metrics)) {
            allMetrics.push(...this.metrics[cat]);
        }
        return this.filterMetrics(allMetrics, options);
    }
    
    filterMetrics(metrics, options) {
        let filtered = [...metrics];
        
        // فلترة حسب الوقت
        if (options.fromTime) {
            filtered = filtered.filter(m => m.data.timestamp >= options.fromTime);
        }
        if (options.toTime) {
            filtered = filtered.filter(m => m.data.timestamp <= options.toTime);
        }
        
        // فلترة حسب النوع
        if (options.type) {
            filtered = filtered.filter(m => m.data.type === options.type);
        }
        
        // الحد الأقصى للنتائج
        if (options.limit) {
            filtered = filtered.slice(-options.limit);
        }
        
        return filtered;
    }
    
    // ========== REPORTS ==========
    
    generateReport(options = {}) {
        const report = {
            session: {
                id: this.sessionId,
                startTime: this.sessionStart,
                duration: Date.now() - this.sessionStart,
                trackingEnabled: this.trackingEnabled
            },
            summary: this.generateSummary(),
            performance: this.generatePerformanceReport(),
            errors: this.generateErrorReport(),
            userActivity: this.generateUserActivityReport(),
            loadingTimes: this.generateLoadingReport(),
            recommendations: this.generateRecommendations(),
            timestamp: Date.now()
        };
        
        this.lastReport = report;
        
        return report;
    }
    
    generateSummary() {
        const totalMetrics = Object.values(this.metrics).reduce((a, b) => a + b.length, 0);
        
        return {
            totalMetrics: totalMetrics,
            errorCount: this.metrics.errors.length,
            avgFps: this.calculateAverageFps(),
            avgMemoryUsage: this.calculateAverageMemoryUsage(),
            sessionDuration: Date.now() - this.sessionStart
        };
    }
    
    generatePerformanceReport() {
        const perfMetrics = this.metrics.performance;
        if (perfMetrics.length === 0) return null;
        
        const fpsValues = perfMetrics.filter(m => m.data.fps).map(m => m.data.fps);
        const frameTimes = perfMetrics.filter(m => m.data.frameTime).map(m => m.data.frameTime);
        
        return {
            fps: {
                current: this.fps,
                average: this.average(fpsValues),
                min: Math.min(...fpsValues, Infinity),
                max: Math.max(...fpsValues, -Infinity),
                samples: fpsValues.length
            },
            frameTime: {
                average: this.average(frameTimes),
                min: Math.min(...frameTimes, Infinity),
                max: Math.max(...frameTimes, -Infinity)
            },
            pageLoadTime: this.getPageLoadTime()
        };
    }
    
    generateErrorReport() {
        const errors = this.metrics.errors;
        
        const byType = {};
        for (const error of errors) {
            const type = error.data.type;
            byType[type] = (byType[type] || 0) + 1;
        }
        
        return {
            totalErrors: errors.length,
            byType: byType,
            recentErrors: errors.slice(-10).map(e => ({
                type: e.data.type,
                message: e.data.message,
                timestamp: e.data.timestamp
            }))
        };
    }
    
    generateUserActivityReport() {
        const actions = this.metrics.userActions;
        
        const byType = {};
        for (const action of actions) {
            const type = action.data.type;
            byType[type] = (byType[type] || 0) + 1;
        }
        
        return {
            totalActions: actions.length,
            actionsPerMinute: actions.length / ((Date.now() - this.sessionStart) / 60000),
            byType: byType,
            recentActions: actions.slice(-20)
        };
    }
    
    generateLoadingReport() {
        const loads = this.metrics.loadingTimes;
        
        if (loads.length === 0) return null;
        
        const durations = loads.map(l => l.data.duration);
        
        return {
            totalLoads: loads.length,
            averageLoadTime: this.average(durations),
            minLoadTime: Math.min(...durations),
            maxLoadTime: Math.max(...durations),
            slowestLoads: loads.sort((a, b) => b.data.duration - a.data.duration).slice(0, 5)
        };
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        // توصيات الأداء
        const avgFps = this.calculateAverageFps();
        if (avgFps < 30) {
            recommendations.push({
                type: 'performance',
                severity: 'high',
                message: 'متوسط FPS منخفض (أقل من 30) - يوصى بتحسين الأداء'
            });
        } else if (avgFps < 50) {
            recommendations.push({
                type: 'performance',
                severity: 'medium',
                message: 'متوسط FPS متوسط (أقل من 50) - قد يكون هناك بعض التأتأة'
            });
        }
        
        // توصيات الذاكرة
        const avgMemory = this.calculateAverageMemoryUsage();
        if (avgMemory > 80) {
            recommendations.push({
                type: 'memory',
                severity: 'high',
                message: 'استخدام الذاكرة مرتفع جداً (>80%) - خطر تسريب ذاكرة'
            });
        } else if (avgMemory > 60) {
            recommendations.push({
                type: 'memory',
                severity: 'medium',
                message: 'استخدام الذاكرة مرتفع (>60%) - يوصى بمراجعة تسريبات الذاكرة'
            });
        }
        
        // توصيات الأخطاء
        const errorCount = this.metrics.errors.length;
        if (errorCount > 10) {
            recommendations.push({
                type: 'errors',
                severity: 'high',
                message: `عدد كبير من الأخطاء (${errorCount}) - يوصى بمراجعة السجلات`
            });
        }
        
        return recommendations;
    }
    
    // ========== UTILITY FUNCTIONS ==========
    
    calculateAverageFps() {
        const fpsMetrics = this.metrics.performance.filter(m => m.data.fps);
        if (fpsMetrics.length === 0) return 0;
        
        const sum = fpsMetrics.reduce((a, b) => a + b.data.fps, 0);
        return sum / fpsMetrics.length;
    }
    
    calculateAverageMemoryUsage() {
        const memoryMetrics = this.metrics.memory.filter(m => m.data.usagePercent);
        if (memoryMetrics.length === 0) return 0;
        
        const sum = memoryMetrics.reduce((a, b) => a + b.data.usagePercent, 0);
        return sum / memoryMetrics.length;
    }
    
    getPageLoadTime() {
        const loadMetric = this.metrics.performance.find(m => m.data.type === 'page_load');
        return loadMetric?.data.loadTime || null;
    }
    
    average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    
    getElementPath(element) {
        const path = [];
        let current = element;
        
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
                selector += `#${current.id}`;
            } else if (current.className) {
                selector += `.${current.className.split(' ').join('.')}`;
            }
            path.unshift(selector);
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }
    
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateAutoReport() {
        const report = this.generateReport();
        
        this.notifyListeners('autoReport', report);
        
        // حفظ للتسجيل
        if (typeof localStorage !== 'undefined') {
            const reports = JSON.parse(localStorage.getItem('analytics_reports') || '[]');
            reports.push({
                timestamp: report.timestamp,
                summary: report.summary
            });
            if (reports.length > 50) reports.shift();
            localStorage.setItem('analytics_reports', JSON.stringify(reports));
        }
        
        return report;
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
                    console.error('Analytics listener error:', error);
                }
            }
        }
    }
    
    // ========== EXPORT ==========
    
    exportData() {
        return {
            sessionId: this.sessionId,
            sessionStart: this.sessionStart,
            trackingEnabled: this.trackingEnabled,
            metrics: this.metrics,
            lastReport: this.lastReport,
            exportTime: Date.now()
        };
    }
    
    importData(data) {
        this.sessionId = data.sessionId;
        this.sessionStart = data.sessionStart;
        this.trackingEnabled = data.trackingEnabled;
        this.metrics = data.metrics;
        this.lastReport = data.lastReport;
        
        console.log('📥 Analytics data imported');
    }
    
    clear() {
        for (const category of Object.keys(this.metrics)) {
            this.metrics[category] = [];
        }
        
        this.frameCount = 0;
        this.lastFrameTime = 0;
        
        console.log('🗑️ Analytics data cleared');
    }
    
    dispose() {
        this.stopTracking();
        this.listeners.clear();
        console.log('♻️ AnalyticsDebugger disposed');
    }
}

export default AnalyticsDebugger;