// ============================================
// EVENT BUS - نظام التواصل بين المكونات
// ============================================

export class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
        return () => this.off(event, wrapper);
    }
    
    emit(event, data = null) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event "${event}":`, error);
                }
            }
        }
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
    
    clear() {
        this.listeners.clear();
    }
    
    getListeners(event) {
        return this.listeners.get(event) || [];
    }
    
    hasListeners(event) {
        return this.listeners.has(event) && this.listeners.get(event).length > 0;
    }
}

export default EventBus;
