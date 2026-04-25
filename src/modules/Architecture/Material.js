// modules/Architecture/Material.js

export class BuildingMaterial {
    constructor(type, options = {}) {
        this.type = type;
        this.category = this.getCategory(type);
        this.name = this.getName(type);
        this.color = this.getColor(type);
        this.texture = options.texture || null;
        this.cost = options.cost || 0;
        this.unit = options.unit || 'م²';
    }
    
    getCategory(type) {
        const categories = {
            // جدران
            'brick_red': 'masonry',
            'brick_white': 'masonry',
            'concrete_block': 'masonry',
            'gypsum': 'masonry',
            
            // تشطيبات
            'paint_white': 'finish',
            'paint_cream': 'finish',
            'ceramic': 'finish',
            'porcelain': 'finish',
            'marble': 'finish',
            'wood': 'finish',
            
            // أرضيات
            'tile_ceramic': 'floor',
            'tile_porcelain': 'floor',
            'parquet': 'floor',
            'carpet': 'floor'
        };
        return categories[type] || 'other';
    }
    
    getName(type) {
        const names = {
            'brick_red': 'طوب أحمر',
            'brick_white': 'طوب أبيض',
            'concrete_block': 'بلوك اسمنتي',
            'gypsum': 'جبس',
            'paint_white': 'دهان أبيض',
            'paint_cream': 'دهان كريمي',
            'ceramic': 'سيراميك',
            'porcelain': 'بورسلين',
            'marble': 'رخام',
            'wood': 'خشب',
            'tile_ceramic': 'بلاط سيراميك',
            'tile_porcelain': 'بلاط بورسلين',
            'parquet': 'باركيه',
            'carpet': 'سجاد'
        };
        return names[type] || type;
    }
    
    getColor(type) {
        const colors = {
            'brick_red': 0xB22222,
            'brick_white': 0xF5F5F5,
            'concrete_block': 0x808080,
            'gypsum': 0xFFFFFF,
            'paint_white': 0xFFFFFF,
            'paint_cream': 0xFFFDD0,
            'ceramic': 0xDEB887,
            'porcelain': 0xE8E8E8,
            'marble': 0xF0F0F0,
            'wood': 0x8B4513,
            'tile_ceramic': 0xD2B48C,
            'tile_porcelain': 0xC0C0C0,
            'parquet': 0xCD853F,
            'carpet': 0x4682B4
        };
        return colors[type] || 0xCCCCCC;
    }
}