// ============================================
// DWG PARSER - محلل ملفات DWG (AutoCAD)
// يستخرج الكيانات الأساسية: الخطوط، الدوائر، النصوص، الطبقات
// ============================================

export class DWGParser {
    constructor() {
        this.version = '1.0';
        this.supportedVersions = ['AC1018', 'AC1021', 'AC1024', 'AC1027'];
        
        // البيانات المستخرجة
        this.entities = [];
        this.layers = new Map();
        this.blocks = new Map();
        this.header = {};
        
        // إعدادات التحويل
        this.globalScale = 1.0;
        this.unitConversion = {
            'millimeters': 0.001,
            'centimeters': 0.01,
            'meters': 1.0,
            'inches': 0.0254,
            'feet': 0.3048
        };
        
        console.log('📄 DWGParser initialized');
    }
    
    // ========== MAIN PARSING ==========
    
    async parse(file, options = {}) {
        return new Promise((resolve, reject) => {
            // DWG files require server-side processing or external library
            // This parser provides the structure; actual parsing requires:
            // - LibreDSA (C++ compiled to WASM)
            // - Or server-side API
            // - Or conversion to DXF first
            
            console.warn('⚠️ DWG parsing requires server-side processing or external library');
            console.warn('💡 For client-side parsing, consider converting to DXF first');
            
            // Fallback: treat as binary and extract basic info
            this.extractBasicInfo(file).then(resolve).catch(reject);
        });
    }
    
    async extractBasicInfo(file) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // قراءة header (ACXXXX version)
        const headerStr = this.readASCII(bytes, 0, 6);
        const version = this.extractVersion(headerStr);
        
        this.header = {
            fileName: file.name,
            fileSize: file.size,
            version: version,
            isSupported: this.supportedVersions.includes(version),
            binarySize: buffer.byteLength
        };
        
        // محاولة استخراج الكيانات الأساسية من البيانات الثنائية
        this.entities = this.extractEntitiesFromBinary(bytes);
        
        return {
            success: true,
            header: this.header,
            entities: this.entities,
            entityCount: this.entities.length,
            warning: 'Limited parsing. For full DWG support, use server-side conversion.'
        };
    }
    
    readASCII(bytes, start, length) {
        let str = '';
        for (let i = start; i < start + length && i < bytes.length; i++) {
            if (bytes[i] >= 32 && bytes[i] <= 126) {
                str += String.fromCharCode(bytes[i]);
            }
        }
        return str;
    }
    
    extractVersion(headerStr) {
        // DWG versions: AC1018 = AutoCAD 2004, AC1021 = AutoCAD 2007, etc.
        const match = headerStr.match(/AC[0-9]{4}/);
        return match ? match[0] : 'unknown';
    }
    
    extractEntitiesFromBinary(bytes) {
        // Simplified extraction - real implementation would parse DWG structure
        const entities = [];
        
        // البحث عن أنماط الكيانات في البيانات الثنائية
        // هذا مجرد مثال - في الواقع تحتاج إلى محلل DWG كامل
        
        // Example: search for LINE patterns
        let i = 0;
        while (i < bytes.length - 20) {
            // Look for potential entity markers
            if (bytes[i] === 0x00 && bytes[i+1] === 0x01) {
                // Potential entity found
                const type = this.detectEntityType(bytes, i);
                if (type) {
                    entities.push({
                        type: type,
                        position: i,
                        guessed: true
                    });
                }
                i += 10;
            } else {
                i++;
            }
        }
        
        return entities;
    }
    
    detectEntityType(bytes, offset) {
        // Simplified detection based on byte patterns
        const typeCode = bytes[offset + 2];
        
        switch(typeCode) {
            case 0x01: return 'LINE';
            case 0x02: return 'CIRCLE';
            case 0x03: return 'ARC';
            case 0x04: return 'TEXT';
            case 0x05: return 'POLYLINE';
            default: return null;
        }
    }
    
    // ========== CONVERSION TO THREE.JS ==========
    
    convertToThreeJS(entities = null, options = {}) {
        const target = entities || this.entities;
        const threeObjects = [];
        
        for (const entity of target) {
            const obj = this.entityToThreeObject(entity, options);
            if (obj) {
                threeObjects.push(obj);
            }
        }
        
        return threeObjects;
    }
    
    entityToThreeObject(entity, options) {
        const scale = options.scale || this.globalScale;
        
        switch(entity.type?.toUpperCase()) {
            case 'LINE':
                return this.createLineFromEntity(entity, scale);
            case 'CIRCLE':
                return this.createCircleFromEntity(entity, scale);
            case 'ARC':
                return this.createArcFromEntity(entity, scale);
            case 'POLYLINE':
                return this.createPolylineFromEntity(entity, scale);
            case 'TEXT':
                return this.createTextFromEntity(entity, scale);
            default:
                return null;
        }
    }
    
    createLineFromEntity(entity, scale) {
        // إذا كان الكيان يحتوي على إحداثيات
        if (entity.startPoint && entity.endPoint) {
            const points = [
                new THREE.Vector3(entity.startPoint.x * scale, entity.startPoint.y * scale, 0),
                new THREE.Vector3(entity.endPoint.x * scale, entity.endPoint.y * scale, 0)
            ];
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: entity.color || 0xffffff });
            return new THREE.Line(geometry, material);
        }
        
        return null;
    }
    
    createCircleFromEntity(entity, scale) {
        if (entity.center && entity.radius) {
            const geometry = new THREE.RingGeometry(
                entity.radius * scale - 0.02,
                entity.radius * scale,
                32
            );
            const material = new THREE.MeshBasicMaterial({ 
                color: entity.color || 0xffffff,
                side: THREE.DoubleSide
            });
            
            const circle = new THREE.Mesh(geometry, material);
            circle.position.set(entity.center.x * scale, entity.center.y * scale, 0);
            return circle;
        }
        
        return null;
    }
    
    createArcFromEntity(entity, scale) {
        // Arc to LineSegments conversion
        if (entity.center && entity.radius && entity.startAngle !== undefined && entity.endAngle !== undefined) {
            const segments = 32;
            const points = [];
            const startRad = entity.startAngle * Math.PI / 180;
            const endRad = entity.endAngle * Math.PI / 180;
            
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const angle = startRad + t * (endRad - startRad);
                const x = entity.center.x + entity.radius * Math.cos(angle);
                const y = entity.center.y + entity.radius * Math.sin(angle);
                points.push(new THREE.Vector3(x * scale, y * scale, 0));
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: entity.color || 0xffffff });
            return new THREE.Line(geometry, material);
        }
        
        return null;
    }
    
    createPolylineFromEntity(entity, scale) {
        if (entity.vertices && entity.vertices.length >= 2) {
            const points = entity.vertices.map(v => 
                new THREE.Vector3(v.x * scale, v.y * scale, 0)
            );
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: entity.color || 0xffffff });
            return new THREE.Line(geometry, material);
        }
        
        return null;
    }
    
    createTextFromEntity(entity, scale) {
        // نص SVG بدلاً من CSS2D (للبقاء في WebGL)
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = `#${(entity.color || 0xffffff).toString(16).padStart(6, '0')}`;
        context.font = `${entity.height || 16}px Arial`;
        context.fillText(entity.text || '', 10, 30);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(entity.position.x * scale, entity.position.y * scale, 0);
        sprite.scale.set(canvas.width / 100, canvas.height / 100, 1);
        
        return sprite;
    }
    
    // ========== UTILITY ==========
    
    setScale(scale) {
        this.globalScale = scale;
    }
    
    setUnit(unit) {
        if (this.unitConversion[unit]) {
            this.globalScale = this.unitConversion[unit];
        }
    }
    
    getEntitySummary() {
        const summary = {};
        for (const entity of this.entities) {
            const type = entity.type || 'unknown';
            summary[type] = (summary[type] || 0) + 1;
        }
        return summary;
    }
    
    // ========== DXF CONVERSION HELPER ==========
    
    convertToDXF() {
        // Generate DXF format from parsed entities
        let dxf = "999\nGenerated by DWGParser\n0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";
        
        for (const entity of this.entities) {
            dxf += this.entityToDXF(entity);
        }
        
        dxf += "0\nENDSEC\n0\nEOF\n";
        
        return dxf;
    }
    
    entityToDXF(entity) {
        switch(entity.type?.toUpperCase()) {
            case 'LINE':
                return `0\nLINE\n8\n${entity.layer || '0'}\n10\n${entity.startPoint?.x || 0}\n20\n${entity.startPoint?.y || 0}\n11\n${entity.endPoint?.x || 0}\n21\n${entity.endPoint?.y || 0}\n`;
            case 'CIRCLE':
                return `0\nCIRCLE\n8\n${entity.layer || '0'}\n10\n${entity.center?.x || 0}\n20\n${entity.center?.y || 0}\n40\n${entity.radius || 0}\n`;
            default:
                return '';
        }
    }
}

export default DWGParser;