// ============================================
// EVENT BUS - نظام اتصال نظيف بين المكونات
// بديل كامل عن window globals
// ============================================

export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }
    
    on(event, callback, priority = 0) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event).push({ callback, priority });
        
        // ترتيب حسب الأولوية
        this.listeners.get(event).sort((a, b) => b.priority - a.priority);
        
        return () => this.off(event, callback);
    }
    
    once(event, callback) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        this.onceListeners.get(event).push(callback);
        
        return () => this.offOnce(event, callback);
    }
    
    emit(event, data = null) {
        // التنفيذ للمستمعين الدائمين
        if (this.listeners.has(event)) {
            for (const { callback } of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event ${event}:`, error);
                }
            }
        }
        
        // التنفيذ للمستمعين لمرة واحدة
        if (this.onceListeners.has(event)) {
            const onceCallbacks = [...this.onceListeners.get(event)];
            this.onceListeners.delete(event);
            
            for (const callback of onceCallbacks) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in once event ${event}:`, error);
                }
            }
        }
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const filtered = this.listeners.get(event).filter(l => l.callback !== callback);
            if (filtered.length === 0) {
                this.listeners.delete(event);
            } else {
                this.listeners.set(event, filtered);
            }
        }
    }
    
    offOnce(event, callback) {
        if (this.onceListeners.has(event)) {
            const filtered = this.onceListeners.get(event).filter(cb => cb !== callback);
            if (filtered.length === 0) {
                this.onceListeners.delete(event);
            } else {
                this.onceListeners.set(event, filtered);
            }
        }
    }
    
    clear() {
        this.listeners.clear();
        this.onceListeners.clear();
    }
    
    // للتصحيح - عرض جميع الأحداث المسجلة
    debug() {
        const events = Array.from(this.listeners.keys());
        console.log(`📡 EventBus: ${events.length} active events`, events);
        return events;
    }
}