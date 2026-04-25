// =======================================
// ACTUAL VIEW CONSTRUCTION OS - STONE & BRICK MATERIAL
// =======================================

export class StoneBrickMaterial {
    constructor(type, options = {}) {
        this.type = type;
        this.category = this.getCategory(type);
        this.name = this.getName(type);
        this.color = this.getColor(type);
        this.density = this.getDensity(type);
        this.hardness = this.getHardness(type);
        this.porosity = this.getPorosity(type);
        this.thermalConductivity = this.getThermalConductivity(type);
        this.costPerUnit = options.costPerUnit || this.getCost(type);
    }

    getCategory(type) {
        const categories = {
            // أحجار طبيعية
            'limestone': 'natural_stone',
            'sandstone': 'natural_stone',
            'granite': 'natural_stone',
            'slate': 'natural_stone',
            'basalt': 'natural_stone',
            'marble': 'natural_stone',
            'travertine': 'natural_stone',
            
            // طوب
            'clay': 'brick',
            'concrete': 'brick',
            'fire': 'brick',
            'glass': 'brick',
            
            // بلاط
            'ceramic': 'tile',
            'porcelain': 'tile',
            'wood': 'tile'
        };
        return categories[type] || 'other';
    }

    getName(type) {
        const names = {
            // أحجار
            'limestone': 'حجر جيري',
            'sandstone': 'حجر رملي',
            'granite': 'جرانيت',
            'slate': 'حجر أردواز',
            'basalt': 'بازلت',
            'marble': 'رخام',
            'travertine': 'ترافيرتين',
            
            // طوب
            'clay': 'طوب أحمر',
            'concrete': 'طوب خرساني',
            'fire': 'طوب ناري',
            'glass': 'طوب زجاجي',
            
            // بلاط
            'ceramic': 'سيراميك',
            'porcelain': 'بورسلين',
            'wood': 'باركيه'
        };
        return names[type] || type;
    }

    getColor(type) {
        const colors = {
            'limestone': 0xeeeeee,
            'sandstone': 0xdeaa87,
            'granite': 0x888888,
            'slate': 0x444444,
            'basalt': 0x222222,
            'marble': 0xffffff,
            'travertine': 0xdeb887,
            'clay': 0xcc8866,
            'concrete': 0xaaaaaa,
            'fire': 0xaa6644,
            'glass': 0x88aacc,
            'ceramic': 0xffffff,
            'porcelain': 0xeeeeee,
            'wood': 0xdeaa87
        };
        return colors[type] || 0xcccccc;
    }

    getDensity(type) {
        const densities = {
            'limestone': 2.3,
            'sandstone': 2.2,
            'granite': 2.7,
            'slate': 2.6,
            'basalt': 2.9,
            'marble': 2.6,
            'travertine': 2.4,
            'clay': 1.8,
            'concrete': 2.4,
            'fire': 2.0,
            'glass': 2.5,
            'ceramic': 2.3,
            'porcelain': 2.4,
            'wood': 0.7
        };
        return densities[type] || 2.0;
    }

    getHardness(type) {
        const hardness = {
            'limestone': 3,
            'sandstone': 2,
            'granite': 7,
            'slate': 4,
            'basalt': 6,
            'marble': 3,
            'travertine': 3,
            'clay': 2,
            'concrete': 4,
            'fire': 5,
            'glass': 5,
            'ceramic': 5,
            'porcelain': 6,
            'wood': 2
        };
        return hardness[type] || 3;
    }

    getPorosity(type) {
        const porosity = {
            'limestone': 0.2,
            'sandstone': 0.25,
            'granite': 0.05,
            'slate': 0.1,
            'basalt': 0.03,
            'marble': 0.1,
            'travertine': 0.3,
            'clay': 0.3,
            'concrete': 0.15,
            'fire': 0.2,
            'glass': 0.0,
            'ceramic': 0.1,
            'porcelain': 0.05,
            'wood': 0.5
        };
        return porosity[type] || 0.1;
    }

    getThermalConductivity(type) {
        const conductivity = {
            'limestone': 1.5,
            'sandstone': 1.3,
            'granite': 2.5,
            'slate': 2.0,
            'basalt': 2.2,
            'marble': 2.0,
            'travertine': 1.2,
            'clay': 0.8,
            'concrete': 1.2,
            'fire': 1.0,
            'glass': 1.0,
            'ceramic': 1.1,
            'porcelain': 1.2,
            'wood': 0.2
        };
        return conductivity[type] || 1.0;
    }

    getCost(type) {
        const costs = {
            'limestone': 300,
            'sandstone': 250,
            'granite': 500,
            'slate': 400,
            'basalt': 450,
            'marble': 800,
            'travertine': 350,
            'clay': 150,
            'concrete': 120,
            'fire': 200,
            'glass': 300,
            'ceramic': 80,
            'porcelain': 120,
            'wood': 200
        };
        return costs[type] || 200;
    }
}