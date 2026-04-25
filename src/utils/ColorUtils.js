// ============================================
// COLOR UTILS - أدوات معالجة الألوان
// تحويل، مزج، توليد، وتنسيق الألوان
// ============================================

export class ColorUtils {
    constructor() {
        console.log('🎨 ColorUtils initialized');
    }
    
    // ========== CONVERSION ==========
    
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    static rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    static rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }
    
    static hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    static hexToHsl(hex) {
        const rgb = this.hexToRgb(hex);
        return this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    }
    
    static hslToHex(h, s, l) {
        const rgb = this.hslToRgb(h, s, l);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }
    
    // ========== COLOR MANIPULATION ==========
    
    static lighten(color, percent) {
        const hsl = typeof color === 'string' ? this.hexToHsl(color) : color;
        const l = Math.min(100, hsl.l + percent);
        return this.hslToHex(hsl.h, hsl.s, l);
    }
    
    static darken(color, percent) {
        const hsl = typeof color === 'string' ? this.hexToHsl(color) : color;
        const l = Math.max(0, hsl.l - percent);
        return this.hslToHex(hsl.h, hsl.s, l);
    }
    
    static saturate(color, percent) {
        const hsl = typeof color === 'string' ? this.hexToHsl(color) : color;
        const s = Math.min(100, hsl.s + percent);
        return this.hslToHex(hsl.h, s, hsl.l);
    }
    
    static desaturate(color, percent) {
        const hsl = typeof color === 'string' ? this.hexToHsl(color) : color;
        const s = Math.max(0, hsl.s - percent);
        return this.hslToHex(hsl.h, s, hsl.l);
    }
    
    static mix(color1, color2, weight = 0.5) {
        const rgb1 = typeof color1 === 'string' ? this.hexToRgb(color1) : color1;
        const rgb2 = typeof color2 === 'string' ? this.hexToRgb(color2) : color2;
        
        const r = Math.round(rgb1.r * (1 - weight) + rgb2.r * weight);
        const g = Math.round(rgb1.g * (1 - weight) + rgb2.g * weight);
        const b = Math.round(rgb1.b * (1 - weight) + rgb2.b * weight);
        
        return this.rgbToHex(r, g, b);
    }
    
    static complement(color) {
        const hsl = typeof color === 'string' ? this.hexToHsl(color) : color;
        let h = (hsl.h + 180) % 360;
        return this.hslToHex(h, hsl.s, hsl.l);
    }
    
    static triadic(color) {
        const hsl = typeof color === 'string' ? this.hexToHsl(color) : color;
        return [
            this.hslToHex(hsl.h, hsl.s, hsl.l),
            this.hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
            this.hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)
        ];
    }
    
    static analogous(color, count = 3, angle = 30) {
        const hsl = typeof color === 'string' ? this.hexToHsl(color) : color;
        const colors = [];
        const start = hsl.h - (angle * Math.floor(count / 2));
        
        for (let i = 0; i < count; i++) {
            let h = (start + i * angle + 360) % 360;
            colors.push(this.hslToHex(h, hsl.s, hsl.l));
        }
        
        return colors;
    }
    
    // ========== GENERATION ==========
    
    static random() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }
    
    static randomPalette(count = 5) {
        const palette = [];
        const hue = Math.random() * 360;
        
        for (let i = 0; i < count; i++) {
            const sat = 50 + Math.random() * 40;
            const light = 40 + Math.random() * 40;
            palette.push(this.hslToHex(hue, sat, light));
        }
        
        return palette;
    }
    
    static gradient(color1, color2, steps = 10) {
        const rgb1 = typeof color1 === 'string' ? this.hexToRgb(color1) : color1;
        const rgb2 = typeof color2 === 'string' ? this.hexToRgb(color2) : color2;
        
        const gradient = [];
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const r = Math.round(rgb1.r * (1 - t) + rgb2.r * t);
            const g = Math.round(rgb1.g * (1 - t) + rgb2.g * t);
            const b = Math.round(rgb1.b * (1 - t) + rgb2.b * t);
            gradient.push(this.rgbToHex(r, g, b));
        }
        
        return gradient;
    }
    
    // ========== VALIDATION ==========
    
    static isValidHex(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }
    
    static isValidRgb(r, g, b) {
        return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
    }
    
    static isLight(color) {
        const rgb = typeof color === 'string' ? this.hexToRgb(color) : color;
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128;
    }
    
    static isDark(color) {
        return !this.isLight(color);
    }
    
    static getContrast(color) {
        return this.isLight(color) ? '#000000' : '#ffffff';
    }
    
    // ========== THREE.JS INTEGRATION ==========
    
    static toThreeColor(color) {
        if (typeof color === 'number') return color;
        if (typeof color === 'string') return parseInt(color.slice(1), 16);
        if (typeof color === 'object' && color.r !== undefined) {
            return (color.r << 16) | (color.g << 8) | color.b;
        }
        return 0xffffff;
    }
    
    static fromThreeColor(color) {
        return '#' + color.toString(16).padStart(6, '0');
    }
}

export default ColorUtils;