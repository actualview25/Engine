// ============================================
// BOQ MANAGER - نظام كميات المواد
// مستخلص من Construction OS
// ============================================

export class BOQManager {
    constructor(eventBus, nodeSystem) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        
        this.items = []; // قائمة بنود الكميات
        this.categories = {
            excavation: { name: 'الحفريات', unit: 'm³', rate: 50 },
            concrete: { name: 'الخرسانة', unit: 'm³', rate: 400 },
            reinforcement: { name: 'حديد التسليح', unit: 'ton', rate: 3500 },
            blockWork: { name: 'طوب', unit: 'm²', rate: 120 },
            plastering: { name: 'لياسة', unit: 'm²', rate: 25 },
            tiling: { name: 'تبليط', unit: 'm²', rate: 80 },
            painting: { name: 'دهان', unit: 'm²', rate: 15 },
            mep: { name: 'الكهرباء والسباكة', unit: 'm²', rate: 200 }
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('boq:add', (item) => {
            this.addItem(item);
        });
        
        this.eventBus.on('boq:remove', (id) => {
            this.removeItem(id);
        });
        
        this.eventBus.on('boq:calculate', () => {
            this.calculateAll();
        });
        
        this.eventBus.on('boq:export', () => {
            this.exportToExcel();
        });
        
        this.eventBus.on('measurement:area', (data) => {
            // إضافة تلقائي لكمية المساحة المقاسة
            this.addItem({
                name: 'مساحة مقاسة',
                category: 'tiling',
                quantity: data.area,
                unit: 'm²',
                description: 'تم القياس بواسطة الأداة'
            });
        });
        
        this.eventBus.on('measurement:volume', (data) => {
            // إضافة تلقائي للحجم المقاس
            this.addItem({
                name: 'حجم مقاس',
                category: 'concrete',
                quantity: data.volume,
                unit: 'm³',
                description: 'تم القياس بواسطة الأداة'
            });
        });
    }
    
    addItem(item) {
        const newItem = {
            id: `boq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit || this.getUnitForCategory(item.category),
            rate: item.rate || this.categories[item.category]?.rate || 0,
            description: item.description || '',
            createdAt: new Date().toISOString()
        };
        
        newItem.total = newItem.quantity * newItem.rate;
        
        this.items.push(newItem);
        
        this.eventBus.emit('boq:itemAdded', newItem);
        this.eventBus.emit('ui:success', `تم إضافة ${newItem.name}: ${newItem.quantity} ${newItem.unit}`);
        
        return newItem.id;
    }
    
    removeItem(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            const removed = this.items.splice(index, 1)[0];
            this.eventBus.emit('boq:itemRemoved', removed);
            return true;
        }
        return false;
    }
    
    updateItem(id, updates) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            Object.assign(item, updates);
            item.total = item.quantity * item.rate;
            this.eventBus.emit('boq:itemUpdated', item);
            return true;
        }
        return false;
    }
    
    calculateAll() {
        const summary = {
            items: [...this.items],
            totalQuantity: 0,
            totalCost: 0,
            byCategory: {}
        };
        
        for (const item of this.items) {
            summary.totalQuantity += item.quantity;
            summary.totalCost += item.total;
            
            if (!summary.byCategory[item.category]) {
                summary.byCategory[item.category] = {
                    name: this.categories[item.category]?.name || item.category,
                    quantity: 0,
                    cost: 0,
                    items: []
                };
            }
            
            summary.byCategory[item.category].quantity += item.quantity;
            summary.byCategory[item.category].cost += item.total;
            summary.byCategory[item.category].items.push(item);
        }
        
        this.eventBus.emit('boq:calculated', summary);
        
        return summary;
    }
    
    getUnitForCategory(category) {
        return this.categories[category]?.unit || 'unit';
    }
    
    getCategories() {
        return Object.entries(this.categories).map(([key, value]) => ({
            id: key,
            name: value.name,
            unit: value.unit,
            rate: value.rate
        }));
    }
    
    exportToExcel() {
        const summary = this.calculateAll();
        
        // إنشاء CSV
        let csv = 'ID,الاسم,الفئة,الكمية,الوحدة,السعر/وحدة,الإجمالي,الوصف\n';
        
        for (const item of this.items) {
            csv += `"${item.id}","${item.name}","${this.categories[item.category]?.name || item.category}",${item.quantity},"${item.unit}",${item.rate},${item.total},"${item.description}"\n`;
        }
        
        csv += '\n,,,,,,,\n';
        csv += `الإجمالي,,,,,,"${summary.totalCost.toFixed(2)}",\n`;
        
        // تحميل الملف
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `BOQ_${new Date().toISOString().slice(0, 19)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.eventBus.emit('ui:success', 'تم تصدير BOQ بنجاح');
        
        return csv;
    }
    
    exportToJSON() {
        const data = {
            exportedAt: new Date().toISOString(),
            items: this.items,
            categories: this.categories,
            summary: this.calculateAll()
        };
        
        return data;
    }
    
    importFromJSON(data) {
        if (data.items && Array.isArray(data.items)) {
            this.items = data.items;
            this.eventBus.emit('boq:imported', { itemCount: this.items.length });
            return true;
        }
        return false;
    }
    
    clear() {
        this.items = [];
        this.eventBus.emit('boq:cleared');
    }
    
    getItems() {
        return [...this.items];
    }
    
    getTotal() {
        return this.items.reduce((sum, item) => sum + item.total, 0);
    }
}