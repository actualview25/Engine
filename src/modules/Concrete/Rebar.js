// modules/Concrete/Rebar.js

export class Rebar {
    constructor(diameter, grade = 420) {
        this.diameter = diameter; // مم
        this.grade = grade; // MPa
        this.area = Math.PI * Math.pow(diameter/2, 2) / 100; // سم²
        this.weight = this.calculateWeight();
    }
    
    calculateWeight() {
        // وزن المتر الطولي (كجم)
        return Math.pow(this.diameter/10, 2) * 0.617;
    }
    
    static getStandardSizes() {
        return [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32];
    }
}

export class RebarLayout {
    constructor(options = {}) {
        this.mainBars = options.mainBars || []; // حديد رئيسي
        this.stirrups = options.stirrups || []; // كانات
        this.cover = options.cover || 25; // غطاء خرساني (مم)
        this.spacing = options.spacing || 200; // مسافات (مم)
    }
    
    calculateWeight(length) {
        let totalWeight = 0;
        
        // حديد رئيسي
        this.mainBars.forEach(bar => {
            totalWeight += bar.weight * length;
        });
        
        // كانات
        this.stirrups.forEach(stirrup => {
            const stirrupCount = Math.floor(length * 1000 / this.spacing) + 1;
            const stirrupLength = this.calculateStirrupLength();
            totalWeight += stirrup.weight * stirrupLength * stirrupCount;
        });
        
        return totalWeight;
    }
    
    calculateStirrupLength() {
        // طول الكانة الواحدة (تقريبي)
        return 2 * (500 + 300) / 1000; // مثال لأبعاد 50×30 سم
    }
}