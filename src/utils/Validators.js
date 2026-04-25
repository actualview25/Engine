// ============================================
// VALIDATORS - أدوات التحقق من صحة البيانات
// التحقق من المدخلات، الحقول، التنسيقات
// ============================================

export class Validators {
    constructor() {
        console.log('✅ Validators initialized');
    }
    
    // ========== GENERAL VALIDATION ==========
    
    static isNotEmpty(str) {
        return str !== null && str !== undefined && str.trim().length > 0;
    }
    
    static isNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }
    
    static isInteger(value) {
        return this.isNumber(value) && parseInt(value) === parseFloat(value);
    }
    
    static isPositive(value) {
        return this.isNumber(value) && value > 0;
    }
    
    static isNonNegative(value) {
        return this.isNumber(value) && value >= 0;
    }
    
    static isInRange(value, min, max) {
        return this.isNumber(value) && value >= min && value <= max;
    }
    
    static isBetween(value, min, max) {
        return this.isInRange(value, min, max);
    }
    
    // ========== STRING VALIDATION ==========
    
    static isEmail(email) {
        const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return re.test(email);
    }
    
    static isPhone(phone) {
        const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/;
        return re.test(phone);
    }
    
    static isURL(url) {
        const re = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return re.test(url);
    }
    
    static isAlpha(str) {
        return /^[A-Za-z]+$/.test(str);
    }
    
    static isAlphanumeric(str) {
        return /^[A-Za-z0-9]+$/.test(str);
    }
    
    static isAlphaSpace(str) {
        return /^[A-Za-z\s]+$/.test(str);
    }
    
    static isAlphanumericSpace(str) {
        return /^[A-Za-z0-9\s]+$/.test(str);
    }
    
    static minLength(str, min) {
        return str && str.length >= min;
    }
    
    static maxLength(str, max) {
        return str && str.length <= max;
    }
    
    static lengthBetween(str, min, max) {
        return str && str.length >= min && str.length <= max;
    }
    
    static matchesRegex(str, regex) {
        return regex.test(str);
    }
    
    // ========== COORDINATE VALIDATION ==========
    
    static isLatitude(lat) {
        return this.isNumber(lat) && lat >= -90 && lat <= 90;
    }
    
    static isLongitude(lng) {
        return this.isNumber(lng) && lng >= -180 && lng <= 180;
    }
    
    static isGeoCoordinate(lat, lng) {
        return this.isLatitude(lat) && this.isLongitude(lng);
    }
    
    static isUTM(easting, northing) {
        return this.isNonNegative(easting) && this.isNonNegative(northing);
    }
    
    // ========== PROJECT VALIDATION ==========
    
    static isValidProjectName(name) {
        return this.isNotEmpty(name) && this.maxLength(name, 100);
    }
    
    static isValidSceneName(name) {
        return this.isNotEmpty(name) && this.maxLength(name, 50);
    }
    
    static validElementsCount(elements, min = 0, max = Infinity) {
        return elements && elements.length >= min && elements.length <= max;
    }
    
    // ========== CAD VALIDATION ==========
    
    static isValidDWGBuffer(buffer) {
        if (!buffer || buffer.length < 10) return false;
        
        // التحقق من توقيع ملف DWG
        const bytes = new Uint8Array(buffer);
        const signature = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);
        
        return signature === 'AC1018' || signature === 'AC1021' || signature === 'AC1024';
    }
    
    static isValidDXFContent(content) {
        if (!content) return false;
        const str = typeof content === 'string' ? content : new TextDecoder().decode(content);
        return str.includes('SECTION') && str.includes('ENTITIES') && str.includes('EOF');
    }
    
    static isValidSVGContent(content) {
        if (!content) return false;
        const str = typeof content === 'string' ? content : new TextDecoder().decode(content);
        return str.includes('<svg') && str.includes('</svg>');
    }
    
    static isValidJSON(content) {
        try {
            JSON.parse(content);
            return true;
        } catch {
            return false;
        }
    }
    
    // ========== IMAGE VALIDATION ==========
    
    static isValidImageURL(url) {
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i;
        return this.isURL(url) && imageExtensions.test(url);
    }
    
    static isValidImageType(type) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        return validTypes.includes(type);
    }
    
    static isValidImageDimensions(width, height, minWidth = 1, minHeight = 1) {
        return width >= minWidth && height >= minHeight;
    }
    
    // ========== MODEL VALIDATION ==========
    
    static isValidModelFormat(filename) {
        const validExtensions = ['.gltf', '.glb', '.obj', '.stl', '.fbx', '.3ds'];
        const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
        return validExtensions.includes(ext);
    }
    
    static isValidModelSize(size, maxSize = 100 * 1024 * 1024) { // 100MB default
        return size > 0 && size <= maxSize;
    }
    
    // ========== MATERIAL VALIDATION ==========
    
    static isValidColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }
    
    static isValidOpacity(opacity) {
        return this.isInRange(opacity, 0, 1);
    }
    
    static isValidRoughness(roughness) {
        return this.isInRange(roughness, 0, 1);
    }
    
    static isValidMetalness(metalness) {
        return this.isInRange(metalness, 0, 1);
    }
    
    // ========== MEASUREMENT VALIDATION ==========
    
    static isValidDistance(distance, min = 0, max = Infinity) {
        return this.isNumber(distance) && distance >= min && distance <= max;
    }
    
    static isValidArea(area, min = 0) {
        return this.isNumber(area) && area >= min;
    }
    
    static isValidVolume(volume, min = 0) {
        return this.isNumber(volume) && volume >= min;
    }
    
    static isValidAngle(angle, min = 0, max = 360) {
        return this.isNumber(angle) && angle >= min && angle <= max;
    }
    
    // ========== OBJECT VALIDATION ==========
    
    static isEmptyObject(obj) {
        return obj && Object.keys(obj).length === 0;
    }
    
    static hasRequiredFields(obj, fields) {
        return fields.every(field => obj.hasOwnProperty(field) && obj[field] !== null && obj[field] !== undefined);
    }
    
    static isInstanceOf(obj, className) {
        return obj && obj.constructor && obj.constructor.name === className;
    }
    
    // ========== ARRAY VALIDATION ==========
    
    static isValidArray(arr, minLength = 0, maxLength = Infinity) {
        return Array.isArray(arr) && arr.length >= minLength && arr.length <= maxLength;
    }
    
    static arrayContainsUniqueValues(arr) {
        return arr.length === new Set(arr).size;
    }
    
    static arrayContainsOnly(arr, type) {
        return arr.every(item => typeof item === type);
    }
    
    // ========== DATE VALIDATION ==========
    
    static isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }
    
    static isPastDate(date) {
        return this.isValidDate(date) && date < new Date();
    }
    
    static isFutureDate(date) {
        return this.isValidDate(date) && date > new Date();
    }
    
    static isDateBetween(date, start, end) {
        return this.isValidDate(date) && date >= start && date <= end;
    }
    
    // ========== COMBINED VALIDATION ==========
    
    static validateAll(obj, validations) {
        const errors = [];
        for (const [field, rules] of Object.entries(validations)) {
            const value = obj[field];
            for (const rule of rules) {
                const isValid = rule.validator(value);
                if (!isValid) {
                    errors.push({
                        field: field,
                        message: rule.message || `Invalid value for ${field}`,
                        value: value
                    });
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // ========== SANITIZATION ==========
    
    static sanitizeString(str) {
        if (!str) return '';
        return str.replace(/[<>]/g, '').trim();
    }
    
    static sanitizeEmail(email) {
        if (!email) return '';
        return email.toLowerCase().trim();
    }
    
    static sanitizeNumber(num, defaultValue = 0) {
        const parsed = parseFloat(num);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    
    static sanitizeInt(num, defaultValue = 0) {
        const parsed = parseInt(num);
        return isNaN(parsed) ? defaultValue : parsed;
    }
}

export default Validators;