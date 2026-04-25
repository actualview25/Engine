// ============================================
// BOQ CALCULATOR - حساب كميات المواد
// يحسب: الحجم، المساحة، الطول، الوزن، التكلفة
// ============================================

export class BOQCalculator {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.items = [];
        this.categories = {};
        this.units = {
            m3: { name: 'متر مكعب', factor: 1 },
            m2: { name: 'متر مربع', factor: 1 },
            m: { name: 'متر طولي', factor: 1 },
            ton: { name: 'طن', factor: 1000 },
            kg: { name: 'كيلوجرام', factor: 1 },
            unit: { name: 'قطعة', factor: 1 }
        };
    }
    
    // حساب حجم خرسانة
    calculateConcreteVolume(length, width, height, quantity = 1) {
        const volume = length * width * height * quantity;
        return {
            volume: volume,
            unit: 'm3',
            formula: `${length} × ${width} × ${height} × ${quantity}`,
            description: 'حجم خرسانة'
        };
    }
    
    // حساب وزن حديد التسليح
    calculateRebarWeight(diameter, length, quantity = 1) {
        // وزن المتر الطولي للحديد (kg/m)
        const weightPerMeter = this.getRebarWeightPerMeter(diameter);
        const totalWeight = weightPerMeter * length * quantity;
        
        return {
            weight: totalWeight,
            weightPerMeter: weightPerMeter,
            unit: 'kg',
            ton: totalWeight / 1000,
            formula: `${weightPerMeter} × ${length} × ${quantity}`,
            description: `حديد قطر ${diameter} مم`
        };
    }
    
    // وزن المتر الطولي للحديد حسب القطر
    getRebarWeightPerMeter(diameter) {
        const weights = {
            6: 0.222, 8: 0.395, 10: 0.617, 12: 0.888,
            14: 1.209, 16: 1.579, 18: 1.999, 20: 2.466,
            22: 2.984, 25: 3.854, 28: 4.834, 32: 6.313
        };
        return weights[diameter] || (diameter * diameter / 162);
    }
    
    // حساب مساحة اللياسة
    calculatePlasterArea(walls) {
        let totalArea = 0;
        
        for (const wall of walls) {
            const wallArea = wall.length * wall.height;
            const openingsArea = this.calculateOpeningsArea(wall.openings || []);
            totalArea += (wallArea - openingsArea) * (wall.sides || 2);
        }
        
        return {
            area: totalArea,
            unit: 'm2',
            description: 'مساحة اللياسة'
        };
    }
    
    // حساب مساحة الفتحات (أبواب، نوافذ)
    calculateOpeningsArea(openings) {
        let area = 0;
        for (const opening of openings) {
            area += opening.width * opening.height;
        }
        return area;
    }
    
    // حساب كمية الطوب
    calculateBrickQuantity(area, brickSize = { length: 0.2, height: 0.1, width: 0.1 }) {
        const brickArea = brickSize.length * brickSize.height;
        const bricksPerM2 = 1 / brickArea;
        const totalBricks = Math.ceil(area * bricksPerM2 * 1.05); // 5% هالك
        
        return {
            quantity: totalBricks,
            unit: 'قطعة',
            perM2: bricksPerM2,
            description: `طوب ${brickSize.length}×${brickSize.height}×${brickSize.width}`
        };
    }
    
    // حساب كمية الدهان
    calculatePaintQuantity(area, coverage = 10, coats = 2) {
        // coverage: متر مربع لكل لتر
        const litersPerCoat = area / coverage;
        const totalLiters = litersPerCoat * coats;
        
        return {
            liters: totalLiters,
            gallons: totalLiters / 3.785,
            unit: 'لتر',
            coats: coats,
            coverage: coverage,
            description: 'دهان'
        };
    }
    
    // حساب كمية البلاط
    calculateTilesQuantity(area, tileSize = { width: 0.4, height: 0.4 }) {
        const tileArea = tileSize.width * tileSize.height;
        const tilesPerM2 = 1 / tileArea;
        const totalTiles = Math.ceil(area * tilesPerM2 * 1.1); // 10% هالك
        
        return {
            quantity: totalTiles,
            unit: 'قطعة',
            perM2: tilesPerM2,
            area: area,
            description: `بلاط ${tileSize.width}×${tileSize.height}`
        };
    }
    
    // حساب كمية الحفر
    calculateExcavationVolume(length, width, depth, slope = 0) {
        // مع مراعاة الميل (slope)
        const topLength = length + (depth * slope * 2);
        const topWidth = width + (depth * slope * 2);
        const volume = (depth / 6) * (
            (length * width) +
            ((length + topLength) * (width + topWidth)) +
            (topLength * topWidth)
        );
        
        return {
            volume: volume,
            unit: 'm3',
            topDimensions: { length: topLength, width: topWidth },
            formula: 'حفر مع مراعاة الميل',
            description: 'حفر أساسات'
        };
    }
    
    // حساب كمية الردم
    calculateBackfillVolume(excavationVolume, concreteVolume, structureVolume) {
        const backfillVolume = excavationVolume - concreteVolume - structureVolume;
        
        return {
            volume: Math.max(0, backfillVolume),
            unit: 'm3',
            description: 'ردم حول الأساسات'
        };
    }
    
    // حساب كمية الخرسانة للميدات (Footings)
    calculateFootingConcrete(footings) {
        let totalVolume = 0;
        const details = [];
        
        for (const footing of footings) {
            const volume = footing.length * footing.width * footing.height;
            totalVolume += volume;
            details.push({
                name: footing.name,
                volume: volume,
                dimensions: { length: footing.length, width: footing.width, height: footing.height }
            });
        }
        
        return {
            volume: totalVolume,
            unit: 'm3',
            details: details,
            description: 'خرسانة ميدات'
        };
    }
    
    // حساب كمية الخرسانة للأعمدة
    calculateColumnsConcrete(columns) {
        let totalVolume = 0;
        const details = [];
        
        for (const column of columns) {
            const volume = column.width * column.depth * column.height;
            totalVolume += volume;
            details.push({
                name: column.name,
                volume: volume,
                dimensions: { width: column.width, depth: column.depth, height: column.height }
            });
        }
        
        return {
            volume: totalVolume,
            unit: 'm3',
            details: details,
            description: 'خرسانة أعمدة'
        };
    }
    
    // حساب كمية الخرسانة للسقف
    calculateSlabConcrete(area, thickness) {
        const volume = area * thickness;
        
        return {
            volume: volume,
            unit: 'm3',
            area: area,
            thickness: thickness,
            description: 'خرسانة سقف'
        };
    }
    
    // حساب تكلفة المواد
    calculateCost(quantity, unitPrice, waste = 0.05) {
        const quantityWithWaste = quantity * (1 + waste);
        const totalCost = quantityWithWaste * unitPrice;
        
        return {
            quantity: quantity,
            quantityWithWaste: quantityWithWaste,
            unitPrice: unitPrice,
            totalCost: totalCost,
            waste: waste,
            description: 'حساب التكلفة'
        };
    }
    
    // إضافة عنصر إلى القائمة
    addItem(item) {
        const newItem = {
            id: `boq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            ...item,
            createdAt: new Date().toISOString()
        };
        
        this.items.push(newItem);
        
        this.eventBus.emit('boq:itemAdded', newItem);
        
        return newItem.id;
    }
    
    // إزالة عنصر
    removeItem(id) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            const removed = this.items.splice(index, 1)[0];
            this.eventBus.emit('boq:itemRemoved', removed);
            return true;
        }
        return false;
    }
    
    // تحديث عنصر
    updateItem(id, updates) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            Object.assign(item, updates);
            item.updatedAt = new Date().toISOString();
            this.eventBus.emit('boq:itemUpdated', item);
            return true;
        }
        return false;
    }
    
    // حساب الإجمالي
    calculateTotal() {
        let totalQuantity = 0;
        let totalCost = 0;
        const byCategory = {};
        
        for (const item of this.items) {
            totalQuantity += item.quantity || 0;
            totalCost += item.totalCost || (item.quantity * item.unitPrice || 0);
            
            const category = item.category || 'other';
            if (!byCategory[category]) {
                byCategory[category] = {
                    items: [],
                    quantity: 0,
                    cost: 0
                };
            }
            
            byCategory[category].items.push(item);
            byCategory[category].quantity += item.quantity || 0;
            byCategory[category].cost += item.totalCost || (item.quantity * item.unitPrice || 0);
        }
        
        return {
            items: this.items,
            totalQuantity: totalQuantity,
            totalCost: totalCost,
            byCategory: byCategory,
            itemCount: this.items.length,
            calculatedAt: new Date().toISOString()
        };
    }
    
    // تصدير البيانات
    exportData() {
        return {
            items: this.items,
            summary: this.calculateTotal(),
            units: this.units,
            exportedAt: new Date().toISOString()
        };
    }
    
    // استيراد البيانات
    importData(data) {
        if (data.items && Array.isArray(data.items)) {
            this.items = data.items;
            this.eventBus.emit('boq:imported', { itemCount: this.items.length });
            return true;
        }
        return false;
    }
    
    // مسح جميع العناصر
    clear() {
        this.items = [];
        this.eventBus.emit('boq:cleared');
    }
    
    // الحصول على عنصر
    getItem(id) {
        return this.items.find(item => item.id === id);
    }
    
    // الحصول على جميع العناصر
    getAllItems() {
        return [...this.items];
    }
    
    // الحصول على العناصر حسب الفئة
    getItemsByCategory(category) {
        return this.items.filter(item => item.category === category);
    }
    
    // الحصول على ملخص سريع
    getQuickSummary() {
        const total = this.calculateTotal();
        return {
            totalItems: this.items.length,
            totalCost: total.totalCost,
            totalQuantity: total.totalQuantity,
            categoriesCount: Object.keys(total.byCategory).length
        };
    }
}