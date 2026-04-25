// ============================================
// MATH UTILS - أدوات حسابية متقدمة
// دوال رياضية، إحصائيات، تحويلات، وتنسيق الأرقام
// ============================================

export class MathUtils {
    constructor() {
        console.log('🧮 MathUtils initialized');
    }
    
    // ========== BASIC MATH ==========
    
    static clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    
    static lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }
    
    static map(value, fromMin, fromMax, toMin, toMax) {
        const t = (value - fromMin) / (fromMax - fromMin);
        return toMin + t * (toMax - toMin);
    }
    
    static roundTo(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
    
    static floorTo(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.floor(value * factor) / factor;
    }
    
    static ceilTo(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.ceil(value * factor) / factor;
    }
    
    // ========== STATISTICS ==========
    
    static mean(values) {
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    
    static median(values) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        return sorted[mid];
    }
    
    static mode(values) {
        if (values.length === 0) return null;
        const freq = new Map();
        for (const v of values) {
            freq.set(v, (freq.get(v) || 0) + 1);
        }
        let maxFreq = 0;
        let mode = values[0];
        for (const [v, f] of freq) {
            if (f > maxFreq) {
                maxFreq = f;
                mode = v;
            }
        }
        return mode;
    }
    
    static variance(values) {
        if (values.length < 2) return 0;
        const avg = this.mean(values);
        return values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (values.length - 1);
    }
    
    static standardDeviation(values) {
        return Math.sqrt(this.variance(values));
    }
    
    static percentile(values, p) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) return sorted[lower];
        return this.lerp(sorted[lower], sorted[upper], index - lower);
    }
    
    // ========== RANDOM NUMBERS ==========
    
    static random(min = 0, max = 1) {
        return Math.random() * (max - min) + min;
    }
    
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static randomChoice(array) {
        if (array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }
    
    static randomShuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    static randomGaussian(mean = 0, stdev = 1) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdev + mean;
    }
    
    // ========== INTERPOLATION ==========
    
    static linearInterpolation(points, t) {
        if (points.length === 0) return 0;
        if (points.length === 1) return points[0].y;
        if (t <= points[0].x) return points[0].y;
        if (t >= points[points.length - 1].x) return points[points.length - 1].y;
        
        for (let i = 0; i < points.length - 1; i++) {
            if (t >= points[i].x && t <= points[i + 1].x) {
                const localT = (t - points[i].x) / (points[i + 1].x - points[i].x);
                return this.lerp(points[i].y, points[i + 1].y, localT);
            }
        }
        return points[0].y;
    }
    
    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    
    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    static easeInOutExpo(t) {
        return t === 0 ? 0 : t === 1 ? 1 :
            t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 :
            (2 - Math.pow(2, -20 * t + 10)) / 2;
    }
    
    static easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
    
    // ========== ANGLE CONVERSION ==========
    
    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
    
    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }
    
    static normalizeAngle(angle) {
        angle = angle % 360;
        if (angle < 0) angle += 360;
        return angle;
    }
    
    static angleDifference(a1, a2) {
        let diff = Math.abs(a1 - a2) % 360;
        if (diff > 180) diff = 360 - diff;
        return diff;
    }
    
    // ========== NUMBER FORMATTING ==========
    
    static formatNumber(num, decimals = 2) {
        return num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    
    static formatCurrency(num, currency = 'USD', decimals = 2) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }
    
    static formatPercentage(num, decimals = 1) {
        return num.toFixed(decimals) + '%';
    }
    
    static formatFileSize(bytes, decimals = 1) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }
    
    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }
    
    // ========== SIGNIFICANT FIGURES ==========
    
    static toPrecision(num, sigFigs = 3) {
        if (num === 0) return 0;
        const magnitude = Math.floor(Math.log10(Math.abs(num)));
        const factor = Math.pow(10, sigFigs - magnitude - 1);
        return Math.round(num * factor) / factor;
    }
    
    // ========== UTILITY ==========
    
    static isNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
    
    static isInteger(value) {
        return Number.isInteger(value);
    }
    
    static sign(value) {
        return value > 0 ? 1 : value < 0 ? -1 : 0;
    }
}

export default MathUtils;