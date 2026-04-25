// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GLASS MATERIAL
// =======================================

export class GlassMaterial {
    constructor(type, options = {}) {
        this.type = type;
        this.category = 'glass';
        this.name = this.getName(type);
        this.color = this.getColor(type);
        this.density = 2.5;  // g/cm³
        this.transparency = this.getTransparency(type);
        this.reflectivity = this.getReflectivity(type);
        this.thermalConductivity = this.getThermalConductivity(type);
        this.uValue = this.getUValue(type);
        self.shgc = this.getSHGC(type);
        self.vt = this.getVT(type);
        self.costPerUnit = options.costPerUnit || this.getCost(type);
    }

    getName(type) {
        const names = {
            'clear': 'زجاج شفاف',
            'tinted': 'زجاج ملون',
            'reflective': 'زجاج عاكس',
            'frosted': 'زجاج مطفي',
            'laminated': 'زجاج مُصفّح',
            'tempered': 'زجاج مُقسّى',
            'insulated': 'زجاج عازل',
            'electrochromic': 'زجاج إلكتروكروميك',
            'PDLC': 'زجاج بلوري سائل',
            'stained': 'زجاج معشق',
            'patterned': 'زجاج منقوش',
            'sandblasted': 'زجاج رمل',
            'etched': 'زجاج محفور',
            'beveled': 'زجاج مشطوف',
            'curved': 'زجاج منحني'
        };
        return names[type] || 'زجاج';
    }

    getColor(type) {
        const colors = {
            'clear': 0xffffff,
            'tinted': 0xaaccff,
            'reflective': 0x88aadd,
            'frosted': 0xeeeeee,
            'laminated': 0xccddff,
            'tempered': 0xffffff,
            'insulated': 0xffffff,
            'electrochromic': 0x88aacc,
            'PDLC': 0xffffff,
            'stained': 0xffaa44,
            'patterned': 0xffffff,
            'sandblasted': 0xeeeeee,
            'etched': 0xffffff,
            'beveled': 0xffffff,
            'curved': 0xffffff
        };
        return colors[type] || 0xffffff;
    }

    getTransparency(type) {
        const trans = {
            'clear': 0.9,
            'tinted': 0.7,
            'reflective': 0.5,
            'frosted': 0.4,
            'laminated': 0.8,
            'tempered': 0.9,
            'insulated': 0.8,
            'electrochromic': 0.9,
            'PDLC': 0.8,
            'stained': 0.6,
            'patterned': 0.7,
            'sandblasted': 0.3,
            'etched': 0.5,
            'beveled': 0.8,
            'curved': 0.9
        };
        return trans[type] || 0.8;
    }

    getReflectivity(type) {
        const reflect = {
            'clear': 0.1,
            'tinted': 0.2,
            'reflective': 0.7,
            'frosted': 0.1,
            'laminated': 0.2,
            'tempered': 0.1,
            'insulated': 0.3,
            'electrochromic': 0.3,
            'PDLC': 0.1,
            'stained': 0.3,
            'patterned': 0.2,
            'sandblasted': 0.1,
            'etched': 0.1,
            'beveled': 0.2,
            'curved': 0.2
        };
        return reflect[type] || 0.2;
    }

    getThermalConductivity(type) {
        // W/mK
        const conductivity = {
            'clear': 1.0,
            'insulated': 0.3,
            'laminated': 0.8,
            'tempered': 1.0,
            'electrochromic': 0.9
        };
        return conductivity[type] || 1.0;
    }

    getUValue(type) {
        // W/m²K
        const uValues = {
            'clear': 5.7,
            'insulated': 2.5,
            'laminated': 5.5,
            'tempered': 5.7,
            'electrochromic': 5.0
        };
        return uValues[type] || 5.7;
    }

    getSHGC(type) {
        // Solar Heat Gain Coefficient
        const shgc = {
            'clear': 0.87,
            'tinted': 0.62,
            'reflective': 0.35,
            'insulated': 0.60
        };
        return shgc[type] || 0.80;
    }

    getVT(type) {
        // Visible Transmittance
        const vt = {
            'clear': 0.88,
            'tinted': 0.55,
            'reflective': 0.30,
            'insulated': 0.70
        };
        return vt[type] || 0.80;
    }

    getCost(type) {
        // ريال للمتر المربع
        const costs = {
            'clear': 200,
            'tinted': 250,
            'reflective': 350,
            'frosted': 280,
            'laminated': 400,
            'tempered': 350,
            'insulated': 500,
            'electrochromic': 1500,
            'PDLC': 2000,
            'stained': 800,
            'patterned': 300,
            'sandblasted': 350,
            'etched': 400,
            'beveled': 450,
            'curved': 600
        };
        return costs[type] || 300;
    }
}