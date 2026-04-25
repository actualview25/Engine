// ============================================
// PRIORITY QUEUE - قائمة انتظار ذات أولويات
// يدعم: أولويات ديناميكية، تغيير الأولوية، مراقبة الحالة
// ============================================

export class PriorityQueue {
    constructor(options = {}) {
        this.heap = [];
        this.priorityMap = new Map();
        this.itemMap = new Map();
        
        this.settings = {
            maxSize: options.maxSize || Infinity,
            defaultPriority: options.defaultPriority || 0,
            uniqueItems: options.uniqueItems !== false,
            autoSort: options.autoSort !== false
        };
        
        this.stats = {
            enqueued: 0,
            dequeued: 0,
            peeked: 0,
            cleared: 0
        };
        
        this.listeners = new Map();
        
        console.log('📊 PriorityQueue initialized');
    }
    
    // ========== CORE OPERATIONS ==========
    
    enqueue(item, priority = null) {
        if (this.settings.uniqueItems && this.itemMap.has(item.id || item)) {
            this.updatePriority(item, priority);
            return false;
        }
        
        if (this.heap.length >= this.settings.maxSize) {
            this.notifyListeners('queueFull', { item, priority });
            return false;
        }
        
        const itemPriority = priority !== null ? priority : this.settings.defaultPriority;
        const element = {
            item: item,
            priority: itemPriority,
            timestamp: Date.now(),
            id: item.id || `item_${Date.now()}_${Math.random()}`
        };
        
        this.heap.push(element);
        this.priorityMap.set(element.id, itemPriority);
        this.itemMap.set(element.id, item);
        
        if (this.settings.autoSort) {
            this.bubbleUp(this.heap.length - 1);
        }
        
        this.stats.enqueued++;
        this.notifyListeners('enqueued', element);
        
        return true;
    }
    
    dequeue() {
        if (this.heap.length === 0) return null;
        
        if (this.settings.autoSort) {
            this.heapify();
        }
        
        const max = this.heap[0];
        const last = this.heap.pop();
        
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.sinkDown(0);
        }
        
        this.priorityMap.delete(max.id);
        this.itemMap.delete(max.id);
        
        this.stats.dequeued++;
        this.notifyListeners('dequeued', max);
        
        return max.item;
    }
    
    peek() {
        if (this.heap.length === 0) return null;
        
        if (this.settings.autoSort) {
            this.heapify();
        }
        
        this.stats.peeked++;
        return this.heap[0].item;
    }
    
    // ========== HEAP OPERATIONS ==========
    
    bubbleUp(index) {
        const element = this.heap[index];
        
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex];
            
            if (element.priority <= parent.priority) break;
            
            this.heap[parentIndex] = element;
            this.heap[index] = parent;
            index = parentIndex;
        }
    }
    
    sinkDown(index) {
        const length = this.heap.length;
        const element = this.heap[index];
        
        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let swap = null;
            let leftChild, rightChild;
            
            if (leftChildIndex < length) {
                leftChild = this.heap[leftChildIndex];
                if (leftChild.priority > element.priority) {
                    swap = leftChildIndex;
                }
            }
            
            if (rightChildIndex < length) {
                rightChild = this.heap[rightChildIndex];
                if ((swap === null && rightChild.priority > element.priority) ||
                    (swap !== null && rightChild.priority > leftChild.priority)) {
                    swap = rightChildIndex;
                }
            }
            
            if (swap === null) break;
            
            this.heap[index] = this.heap[swap];
            this.heap[swap] = element;
            index = swap;
        }
    }
    
    heapify() {
        for (let i = Math.floor(this.heap.length / 2); i >= 0; i--) {
            this.sinkDown(i);
        }
    }
    
    // ========== PRIORITY MANAGEMENT ==========
    
    updatePriority(item, newPriority) {
        const id = item.id || item;
        const index = this.findIndexById(id);
        
        if (index !== -1) {
            const oldPriority = this.heap[index].priority;
            this.heap[index].priority = newPriority;
            this.priorityMap.set(id, newPriority);
            
            if (newPriority > oldPriority) {
                this.bubbleUp(index);
            } else {
                this.sinkDown(index);
            }
            
            this.notifyListeners('priorityUpdated', { id, oldPriority, newPriority });
            return true;
        }
        
        return false;
    }
    
    getPriority(item) {
        const id = item.id || item;
        return this.priorityMap.get(id) || null;
    }
    
    // ========== ITEM MANAGEMENT ==========
    
    remove(item) {
        const id = item.id || item;
        const index = this.findIndexById(id);
        
        if (index !== -1) {
            const removed = this.heap.splice(index, 1)[0];
            this.priorityMap.delete(id);
            this.itemMap.delete(id);
            this.heapify();
            
            this.notifyListeners('removed', removed);
            return removed.item;
        }
        
        return null;
    }
    
    contains(item) {
        const id = item.id || item;
        return this.itemMap.has(id);
    }
    
    clear() {
        this.heap = [];
        this.priorityMap.clear();
        this.itemMap.clear();
        this.stats.cleared++;
        
        this.notifyListeners('cleared');
    }
    
    findIndexById(id) {
        for (let i = 0; i < this.heap.length; i++) {
            if (this.heap[i].id === id) {
                return i;
            }
        }
        return -1;
    }
    
    // ========== QUERIES ==========
    
    size() {
        return this.heap.length;
    }
    
    isEmpty() {
        return this.heap.length === 0;
    }
    
    getAll() {
        return this.heap.map(element => ({
            item: element.item,
            priority: element.priority,
            timestamp: element.timestamp
        }));
    }
    
    getItemsByPriority(minPriority) {
        return this.heap
            .filter(element => element.priority >= minPriority)
            .map(element => element.item);
    }
    
    getHighestPriority() {
        if (this.heap.length === 0) return null;
        this.heapify();
        return this.heap[0].priority;
    }
    
    getLowestPriority() {
        if (this.heap.length === 0) return null;
        return Math.min(...this.heap.map(e => e.priority));
    }
    
    // ========== UTILITY ==========
    
    setMaxSize(size) {
        this.settings.maxSize = size;
        
        while (this.heap.length > size) {
            this.dequeue();
        }
    }
    
    getStatistics() {
        return {
            ...this.stats,
            size: this.size(),
            maxSize: this.settings.maxSize,
            highestPriority: this.getHighestPriority(),
            lowestPriority: this.getLowestPriority()
        };
    }
    
    toArray() {
        return [...this.heap].sort((a, b) => b.priority - a.priority);
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
                    console.error('PriorityQueue listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.clear();
        this.listeners.clear();
        console.log('♻️ PriorityQueue disposed');
    }
}

export default PriorityQueue;