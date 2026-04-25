// =======================================
// ACTUAL VIEW CONSTRUCTION OS - LANDSCAPING MATERIAL
// =======================================

export class LandscapingMaterial {
    constructor(type, options = {}) {
        this.type = type;
        this.category = this.getCategory(type);
        this.name = this.getName(type);
        this.color = this.getColor(type);
        this.density = options.density || 1.0;
        this.waterRequirement = options.waterRequirement || 0.5;  // كمية ماء
        this.sunRequirement = options.sunRequirement || 0.5;  // كمية شمس
        this.growthRate = options.growthRate || 0.1;  // معدل نمو
    }

    getCategory(type) {
        const categories = {
            // نباتات
            'oak': 'tree',
            'pine': 'tree',
            'palm': 'palm',
            'date_palm': 'palm',
            'rose': 'flower',
            'lavender': 'flower',
            'grass': 'ground_cover',
            'shrub': 'shrub',
            
            // مواد تنسيق
            'stone': 'hardscape',
            'gravel': 'hardscape',
            'bark': 'mulch',
            'soil': 'soil'
        };
        return categories[type] || 'plant';
    }

    getName(type) {
        const names = {
            // أشجار
            'oak': 'بلوط',
            'pine': 'صنوبر',
            'palm': 'نخيل',
            'date_palm': 'نخيل تمر',
            
            // زهور وشجيرات
            'rose': 'ورد',
            'lavender': 'خزامى',
            'shrub': 'شجيرة',
            'grass': 'نجيل',
            
            // مواد تنسيق
            'stone': 'حجر طبيعي',
            'gravel': 'حصى',
            'bark': 'لحاء أشجار',
            'soil': 'تربة زراعية'
        };
        return names[type] || type;
    }

    getColor(type) {
        const colors = {
            'oak': 0x44aa44,
            'pine': 0x226622,
            'palm': 0x88aa44,
            'rose': 0xff4444,
            'lavender': 0xaa88ff,
            'grass': 0x44ff44,
            'stone': 0x888888,
            'gravel': 0xcccccc,
            'soil': 0x8B4513
        };
        return colors[type] || 0x44aa44;
    }
}