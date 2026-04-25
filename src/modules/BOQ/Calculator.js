// modules/BOQ/Calculator.js

export class BOQCalculator {
    constructor(project) {
        this.project = project;
        this.categories = {
            earthworks: [],
            concrete: [],
            architecture: [],
            mep: []
        };
        
        this.totals = {
            volume: 0,
            weight: 0,
            area: 0,
            length: 0,
            cost: 0
        };
    }
    
    // إضافة عنصر للحساب
    addItem(item, category) {
        this.categories[category].push(item);
        this.calculateItem(item);
    }
    
    // حساب عنصر فردي
    calculateItem(item) {
        const boq = item.getBOQ ? item.getBOQ() : {};
        
        // استخراج الأرقام من النصوص
        Object.keys(boq).forEach(key => {
            const value = boq[key];
            if (typeof value === 'string') {
                // استخراج الأرقام (مثال: "45.3 m³" → 45.3)
                const match = value.match(/[\d.]+/);
                if (match) {
                    const num = parseFloat(match[0]);
                    
                    if (key.includes('حجم') || key.includes('volume')) {
                        this.totals.volume += num;
                    } else if (key.includes('وزن') || key.includes('weight')) {
                        this.totals.weight += num;
                    } else if (key.includes('مساحة') || key.includes('area')) {
                        this.totals.area += num;
                    } else if (key.includes('طول') || key.includes('length')) {
                        this.totals.length += num;
                    }
                }
            }
        });
        
        return boq;
    }
    
    // حساب جميع العناصر
    calculateAll() {
        // إعادة تعيين المجاميع
        this.totals = { volume: 0, weight: 0, area: 0, length: 0, cost: 0 };
        
        // حساب كل فئة
        Object.keys(this.categories).forEach(category => {
            this.categories[category].forEach(item => {
                this.calculateItem(item);
            });
        });
        
        return this.getSummary();
    }
    
    // الحصول على ملخص
    getSummary() {
        return {
            إجمالي_الخرسانة: this.totals.volume.toFixed(2) + ' م³',
            إجمالي_الحديد: this.totals.weight.toFixed(2) + ' كجم',
            إجمالي_المساحات: this.totals.area.toFixed(2) + ' م²',
            إجمالي_الأطوال: this.totals.length.toFixed(2) + ' م',
            عدد_العناصر: this.getTotalItems()
        };
    }
    
    getTotalItems() {
        let total = 0;
        Object.keys(this.categories).forEach(cat => {
            total += this.categories[cat].length;
        });
        return total;
    }
    
    // تصدير بصيغة JSON
    toJSON() {
        return {
            categories: this.categories,
            totals: this.totals,
            summary: this.getSummary()
        };
    }
}