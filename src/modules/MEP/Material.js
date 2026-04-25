// modules/MEP/Material.js

export class MEPMaterial {
    constructor(type, options = {}) {
        this.type = type;
        this.category = this.getCategory(type);
        this.name = this.getName(type);
        this.color = this.getColor(type);
        this.diameter = options.diameter || 0; // مم
        this.thickness = options.thickness || 0; // مم
        this.pressure = options.pressure || 0; // بار
    }
    
    getCategory(type) {
        const categories = {
            // كهرباء
            'cable_cu': 'electrical',
            'cable_al': 'electrical',
            'conduit_pvc': 'electrical',
            'conduit_metal': 'electrical',
            
            // مياه
            'pipe_pvc': 'plumbing',
            'pipe_ppr': 'plumbing',
            'pipe_pe': 'plumbing',
            'pipe_steel': 'plumbing',
            'pipe_copper': 'plumbing',
            
            // تكييف
            'duct_galv': 'hvac',
            'duct_flex': 'hvac',
            'pipe_chilled': 'hvac',
            
            // صرف
            'pipe_sewer': 'drainage',
            'pipe_storm': 'drainage'
        };
        return categories[type] || 'other';
    }
    
    getName(type) {
        const names = {
            'cable_cu': 'كابل نحاس',
            'cable_al': 'كابل ألمنيوم',
            'conduit_pvc': 'قناة PVC',
            'conduit_metal': 'قناة معدنية',
            'pipe_pvc': 'ماسورة PVC',
            'pipe_ppr': 'ماسورة PPR',
            'pipe_pe': 'ماسورة PE',
            'pipe_steel': 'ماسورة حديد',
            'pipe_copper': 'ماسورة نحاس',
            'duct_galv': 'مجرى هواء مجلفن',
            'duct_flex': 'مجرى هواء مرن',
            'pipe_chilled': 'ماسورة تبريد',
            'pipe_sewer': 'ماسورة صرف صحي',
            'pipe_storm': 'ماسورة مطر'
        };
        return names[type] || type;
    }
    
    getColor(type) {
        const colors = {
            // كهرباء
            'cable_cu': 0xB87333,
            'cable_al': 0xC0C0C0,
            'conduit_pvc': 0x808080,
            'conduit_metal': 0x4A4A4A,
            
            // مياه (أزرق)
            'pipe_pvc': 0x4682B4,
            'pipe_ppr': 0x4169E1,
            'pipe_pe': 0x1E90FF,
            'pipe_steel': 0x708090,
            'pipe_copper': 0xB87333,
            
            // تكييف
            'duct_galv': 0xA9A9A9,
            'duct_flex': 0xD3D3D3,
            'pipe_chilled': 0x00CED1,
            
            // صرف (بني)
            'pipe_sewer': 0x8B4513,
            'pipe_storm': 0x2F4F4F
        };
        return colors[type] || 0xCCCCCC;
    }
}