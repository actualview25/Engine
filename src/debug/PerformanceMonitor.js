// ============================================
// PERFORMANCE MONITOR - نظام مراقبة الأداء
// يراقب FPS، زمن الإطارات، تأخير التحميل، ويقدم تحليلات
// ============================================

export class PerformanceMonitor {
    constructor(options = {}) {
        // إعدادات
        this.targetFPS = options.targetFPS || 60;
        this.warningThreshold = options.warningThreshold || 0.8; // 80% of target
        this.criticalThreshold = options.criticalThreshold || 0.5; // 50% of target
        this.historySize = options.historySize || 300; // 5 seconds at 60fps
        
        // بيانات الأداء
        this.history = [];
        this.currentFrame = {
            fps: 0,
            frameTime: 0,
            timestamp: 0
        };
        
        // إحصائيات
        this.statistics = {
            minFPS: Infinity,
            maxFPS: 0,
            avgFPS: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0,
            avgFrameTime: 0,
            droppedFrames: 0,
            totalFrames: 0
        };
        
        // المقاييس المخصصة
        this.customMetrics = new Map();
        
        // حالة المراقبة
        this.isMonitoring = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.lastSecondTime = 0;
        
        // التنبيهات
        this.alerts = [];
        this.alertThresholds = {
            fps: {
                warning: 30,
                critical: 20
            },
            frameTime: {
                warning: 33, // ms (30 fps)
                critical: 50  // ms (20 fps)
            },
            memory: {
                warning: 500, // MB
                critical: 800  // MB
            }
        };
        
        // معالج الأحداث
        this.listeners = new Map();
        
        // مؤقت التقرير
        this.reportInterval = null;
        
        console.log('📈 PerformanceMonitor initialized');
    }
    
    // ========== MONITORING CONTROL ==========
    
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.lastFrameTime = performance.now();
        this.lastSecondTime = this.lastFrameTime;
        this.frameCount = 0;
        
        // بدء حلقة المراقبة
        this.monitorLoop();
        
        // تقارير دورية (كل 30 ثانية)
        this.reportInterval = setInterval(() => {
            if (this.isMonitoring) {
                this.generatePeriodicReport();
            }
        }, 30000);
        
        console.log('▶️ Performance monitoring started');
        this.notifyListeners('started');
    }
    
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
        }
        
        console.log('⏹️ Performance monitoring stopped');
        this.notifyListeners('stopped', this.getSummary());
    }
    
    monitorLoop() {
        if (!this.isMonitoring) return;
        
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        
        // تحديث الإحصائيات
        this.frameCount++;
        
        if (frameTime > 0) {
            const fps = 1000 / frameTime;
            
            this.currentFrame = {
                fps: fps,
                frameTime: frameTime,
                timestamp: now
            };
            
            // إضافة إلى السجل
            this.addToHistory(this.currentFrame);
            
            // تحديث الإحصائيات التراكمية
            this.updateStatistics(fps, frameTime);
            
            // التحقق من التنبيهات
            this.checkAlerts(fps, frameTime);
            
            // إشعار المستمعين
            this.notifyListeners('frame', this.currentFrame);
        }
        
        this.lastFrameTime = now;
        
        // حساب FPS لكل ثانية
        if (now - this.lastSecondTime >= 1000) {
            this.notifyListeners('second', {
                fps: this.frameCount,
                timestamp: now,
                avgFrameTime: (now - this.lastSecondTime) / this.frameCount
            });
            
            this.frameCount = 0;
            this.lastSecondTime = now;
        }
        
        requestAnimationFrame(() => this.monitorLoop());
    }
    
    addToHistory(frame) {
        this.history.push({ ...frame });
        
        // الاحتفاظ بالحجم المحدد فقط
        if (this.history.length > this.historySize) {
            this.history.shift();
        }
    }
    
    updateStatistics(fps, frameTime) {
        this.statistics.totalFrames++;
        
        // تحديث القيم القصوى والدنيا
        if (fps < this.statistics.minFPS) this.statistics.minFPS = fps;
        if (fps > this.statistics.maxFPS) this.statistics.maxFPS = fps;
        if (frameTime < this.statistics.minFrameTime) this.statistics.minFrameTime = frameTime;
        if (frameTime > this.statistics.maxFrameTime) this.statistics.maxFrameTime = frameTime;
        
        // تحديث القيم المتوسطة
        const totalFrames = this.statistics.totalFrames;
        this.statistics.avgFPS = ((this.statistics.avgFPS * (totalFrames - 1)) + fps) / totalFrames;
        this.statistics.avgFrameTime = ((this.statistics.avgFrameTime * (totalFrames - 1)) + frameTime) / totalFrames;
        
        // تتبع الإطارات المتساقطة (frame time > 33ms)
        if (frameTime > 33) {
            this.statistics.droppedFrames++;
        }
    }
    
    // ========== ALERTS ==========
    
    checkAlerts(fps, frameTime) {
        // تنبيه FPS منخفض
        if (fps < this.alertThresholds.fps.critical) {
            this.addAlert('critical', 'fps', `FPS منخفض جداً: ${fps.toFixed(1)}`, { fps, frameTime });
        } else if (fps < this.alertThresholds.fps.warning) {
            this.addAlert('warning', 'fps', `FPS منخفض: ${fps.toFixed(1)}`, { fps, frameTime });
        }
        
        // تنبيه زمن الإطار مرتفع
        if (frameTime > this.alertThresholds.frameTime.critical) {
            this.addAlert('critical', 'frameTime', `زمن الإطار مرتفع جداً: ${frameTime.toFixed(1)}ms`, { fps, frameTime });
        } else if (frameTime > this.alertThresholds.frameTime.warning) {
            this.addAlert('warning', 'frameTime', `زمن الإطار مرتفع: ${frameTime.toFixed(1)}ms`, { fps, frameTime });
        }
        
        // تنبيه الذاكرة (إذا كان متاحاً)
        if (performance.memory) {
            const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
            if (memoryMB > this.alertThresholds.memory.critical) {
                this.addAlert('critical', 'memory', `ذاكرة مرتفعة جداً: ${memoryMB.toFixed(1)} MB`, { memory: memoryMB });
            } else if (memoryMB > this.alertThresholds.memory.warning) {
                this.addAlert('warning', 'memory', `ذاكرة مرتفعة: ${memoryMB.toFixed(1)} MB`, { memory: memoryMB });
            }
        }
    }
    
    addAlert(severity, type, message, data) {
        const alert = {
            id: `alert_${Date.now()}_${this.alerts.length}`,
            severity: severity,
            type: type,
            message: message,
            data: data,
            timestamp: Date.now(),
            acknowledged: false
        };
        
        this.alerts.push(alert);
        
        // الاحتفاظ بآخر 100 تنبيه
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }
        
        this.notifyListeners('alert', alert);
        
        // تسجيل في console
        const prefix = severity === 'critical' ? '🔴' : '🟡';
        console.warn(`${prefix} Performance Alert: ${message}`);
    }
    
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            this.notifyListeners('alertAcknowledged', alert);
        }
    }
    
    // ========== CUSTOM METRICS ==========
    
    startMetric(name) {
        this.customMetrics.set(name, {
            name: name,
            startTime: performance.now(),
            endTime: null,
            duration: null
        });
    }
    
    endMetric(name) {
        const metric = this.customMetrics.get(name);
        if (metric) {
            metric.endTime = performance.now();
            metric.duration = metric.endTime - metric.startTime;
            
            this.notifyListeners('metric', metric);
            
            return metric.duration;
        }
        return null;
    }
    
    measureAsync(name, fn) {
        const start = performance.now();
        
        return Promise.resolve(fn()).then(result => {
            const duration = performance.now() - start;
            this.customMetrics.set(name, {
                name: name,
                startTime: start,
                endTime: performance.now(),
                duration: duration
            });
            this.notifyListeners('metric', { name, duration });
            return result;
        });
    }
    
    // ========== REPORTS ==========
    
    getSummary() {
        const recentFrames = this.history.slice(-60); // آخر ثانية
        const recentFPS = recentFrames.map(f => f.fps);
        
        return {
            timestamp: Date.now(),
            monitoring: this.isMonitoring,
            statistics: { ...this.statistics },
            currentPerformance: { ...this.currentFrame },
            recentAverageFPS: this.average(recentFPS),
            alertCount: this.alerts.length,
            unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length,
            uptime: Date.now() - (this.history[0]?.timestamp || Date.now())
        };
    }
    
    generateDetailedReport() {
        const fpsValues = this.history.map(f => f.fps);
        const frameTimes = this.history.map(f => f.frameTime);
        
        const fpsPercentiles = this.calculatePercentiles(fpsValues);
        const frameTimePercentiles = this.calculatePercentiles(frameTimes);
        
        return {
            ...this.getSummary(),
            detailed: {
                fps: {
                    values: fpsValues.slice(-100),
                    percentiles: fpsPercentiles,
                    histogram: this.createHistogram(fpsValues, 20, 60)
                },
                frameTime: {
                    values: frameTimes.slice(-100),
                    percentiles: frameTimePercentiles,
                    histogram: this.createHistogram(frameTimes, 0, 100)
                },
                alerts: this.alerts.slice(-20),
                customMetrics: Array.from(this.customMetrics.values())
            }
        };
    }
    
    generatePeriodicReport() {
        const report = this.generateDetailedReport();
        
        this.notifyListeners('periodicReport', report);
        
        // حفظ للتسجيل
        if (typeof localStorage !== 'undefined') {
            const reports = JSON.parse(localStorage.getItem('performance_reports') || '[]');
            reports.push({
                timestamp: report.timestamp,
                statistics: report.statistics,
                alertCount: report.alertCount
            });
            if (reports.length > 20) reports.shift();
            localStorage.setItem('performance_reports', JSON.stringify(reports));
        }
        
        return report;
    }
    
    calculatePercentiles(values) {
        if (values.length === 0) return {};
        
        const sorted = [...values].sort((a, b) => a - b);
        
        return {
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p75: sorted[Math.floor(sorted.length * 0.75)],
            p90: sorted[Math.floor(sorted.length * 0.9)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }
    
    createHistogram(values, min, max, bins = 10) {
        if (values.length === 0) return [];
        
        const binSize = (max - min) / bins;
        const histogram = Array(bins).fill(0);
        
        for (const value of values) {
            if (value >= min && value <= max) {
                const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
                histogram[binIndex]++;
            }
        }
        
        return histogram.map((count, i) => ({
            range: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
            count: count,
            percentage: (count / values.length) * 100
        }));
    }
    
    average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    
    // ========== UTILITY ==========
    
    getStatus() {
        const status = this.getSummary();
        
        // تحديد الحالة العامة
        if (this.currentFrame.fps < this.alertThresholds.fps.critical) {
            status.status = 'critical';
        } else if (this.currentFrame.fps < this.alertThresholds.fps.warning) {
            status.status = 'warning';
        } else {
            status.status = 'good';
        }
        
        return status;
    }
    
    exportData() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            statistics: this.statistics,
            alerts: this.alerts,
            customMetrics: Array.from(this.customMetrics.values()),
            history: this.history.slice(-100) // آخر 100 إطار فقط
        };
    }
    
    importData(data) {
        this.statistics = data.statistics;
        this.alerts = data.alerts;
        this.history = data.history;
        
        for (const metric of data.customMetrics) {
            this.customMetrics.set(metric.name, metric);
        }
        
        console.log('📥 Performance monitor data imported');
    }
    
    reset() {
        this.history = [];
        this.alerts = [];
        this.customMetrics.clear();
        
        this.statistics = {
            minFPS: Infinity,
            maxFPS: 0,
            avgFPS: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0,
            avgFrameTime: 0,
            droppedFrames: 0,
            totalFrames: 0
        };
        
        this.frameCount = 0;
        
        console.log('🔄 PerformanceMonitor reset');
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
                    console.error('PerformanceMonitor listener error:', error);
                }
            }
        }
    }
    
    dispose() {
        this.stopMonitoring();
        this.reset();
        this.listeners.clear();
        console.log('♻️ PerformanceMonitor disposed');
    }
}

export default PerformanceMonitor;