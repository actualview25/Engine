// ============================================
// IFC PARSER - محلل ملفات IFC
// يستخرج: العناصر، الخصائص، العلاقات، الإحداثيات
// ============================================

export class IfcParser {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.ifcData = null;
        this.elements = {
            walls: [],
            columns: [],
            beams: [],
            slabs: [],
            doors: [],
            windows: [],
            stairs: [],
            roofs: [],
            furniture: []
        };
        this.relationships = [];
        this.properties = new Map();
    }
    
    // تحليل ملف IFC
    async parse(file) {
        this.eventBus.emit('ui:status', '📄 جاري تحليل ملف IFC...');
        this.eventBus.emit('ui:loading', true);
        
        try {
            const text = await this.readFile(file);
            const lines = text.split('\n');
            
            // المرحلة 1: استخراج جميع الكيانات
            const entities = this.extractEntities(lines);
            
            // المرحلة 2: تحليل الكيانات حسب النوع
            this.parseEntities(entities);
            
            // المرحلة 3: بناء العلاقات
            this.buildRelationships();
            
            // المرحلة 4: استخراج الخصائص
            this.extractProperties(entities);
            
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:success', `✅ تم تحليل IFC: ${this.getSummary().totalElements} عنصر`);
            this.eventBus.emit('ifc:parsed', this.getSummary());
            
            return {
                elements: this.elements,
                relationships: this.relationships,
                properties: Object.fromEntries(this.properties)
            };
            
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل تحليل IFC: ${error.message}`);
            console.error('IFC parse error:', error);
            return null;
        }
    }
    
    // قراءة الملف كنص
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.error);
            reader.readAsText(file);
        });
    }
    
    // استخراج الكيانات من السطور
    extractEntities(lines) {
        const entities = [];
        const entityRegex = /#(\d+)=([\w]+)\((.*)\)/;
        
        for (const line of lines) {
            const match = line.match(entityRegex);
            if (match) {
                entities.push({
                    id: parseInt(match[1]),
                    type: match[2],
                    raw: match[3],
                    attributes: this.parseAttributes(match[3])
                });
            }
        }
        
        return entities;
    }
    
    // تحليل السمات من النص الخام
    parseAttributes(raw) {
        const attributes = [];
        let current = '';
        let depth = 0;
        let inString = false;
        
        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];
            
            if (char === '"' && raw[i - 1] !== '\\') {
                inString = !inString;
                current += char;
            } else if (!inString && char === '(') {
                depth++;
                current += char;
            } else if (!inString && char === ')') {
                depth--;
                current += char;
            } else if (!inString && char === ',' && depth === 0) {
                attributes.push(this.cleanAttribute(current.trim()));
                current = '';
            } else {
                current += char;
            }
        }
        
        if (current.trim()) {
            attributes.push(this.cleanAttribute(current.trim()));
        }
        
        return attributes;
    }
    
    // تنظيف قيمة السمة
    cleanAttribute(attr) {
        // إزالة علامات الاقتباس
        if (attr.startsWith('"') && attr.endsWith('"')) {
            return attr.slice(1, -1);
        }
        
        // تحويل الأرقام
        if (!isNaN(parseFloat(attr))) {
            return parseFloat(attr);
        }
        
        // تحويل القيم المنطقية
        if (attr === '.T.') return true;
        if (attr === '.F.') return false;
        
        // تحويل المراجع
        if (attr.startsWith('#')) {
            return parseInt(attr.slice(1));
        }
        
        // تحويل المصفوفات
        if (attr.startsWith('(') && attr.endsWith(')')) {
            const inner = attr.slice(1, -1);
            if (inner.includes(',')) {
                return inner.split(',').map(a => this.cleanAttribute(a.trim()));
            }
        }
        
        return attr;
    }
    
    // تحليل الكيانات حسب النوع
    parseEntities(entities) {
        for (const entity of entities) {
            switch (entity.type) {
                case 'IFCWALL':
                case 'IFCWALLSTANDARDCASE':
                    this.parseWall(entity);
                    break;
                case 'IFCCOLUMN':
                    this.parseColumn(entity);
                    break;
                case 'IFCBEAM':
                    this.parseBeam(entity);
                    break;
                case 'IFCSLAB':
                    this.parseSlab(entity);
                    break;
                case 'IFCDOOR':
                    this.parseDoor(entity);
                    break;
                case 'IFCWINDOW':
                    this.parseWindow(entity);
                    break;
                case 'IFCSTAIR':
                    this.parseStair(entity);
                    break;
                case 'IFCROOF':
                    this.parseRoof(entity);
                    break;
                case 'IFCFURNITURE':
                    this.parseFurniture(entity);
                    break;
                default:
                    // تجاهل الأنواع الأخرى
                    break;
            }
        }
    }
    
    // تحليل الجدار
    parseWall(entity) {
        const wall = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Wall'),
            description: this.getAttributeValue(entity, 1, ''),
            objectType: this.getAttributeValue(entity, 2, ''),
            placement: this.getAttributeReference(entity, 3),
            representation: this.getAttributeReference(entity, 4),
            tag: this.getAttributeValue(entity, 5, '')
        };
        
        // استخراج الأبعاد من التمثيل الهندسي
        this.extractDimensions(wall, entity);
        
        // إضافة إحداثيات افتراضية (في الإصدار الكامل، تستخرج من الـ placement)
        wall.position = { x: 0, y: 0, z: 0 };
        wall.length = 5;
        wall.height = 3;
        wall.thickness = 0.3;
        
        this.elements.walls.push(wall);
    }
    
    // تحليل العمود
    parseColumn(entity) {
        const column = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Column'),
            description: this.getAttributeValue(entity, 1, ''),
            objectType: this.getAttributeValue(entity, 2, ''),
            placement: this.getAttributeReference(entity, 3),
            representation: this.getAttributeReference(entity, 4),
            tag: this.getAttributeValue(entity, 5, '')
        };
        
        this.extractDimensions(column, entity);
        
        column.position = { x: 0, y: 0, z: 0 };
        column.width = 0.4;
        column.height = 3;
        column.depth = 0.4;
        
        this.elements.columns.push(column);
    }
    
    // تحليل الكمرة
    parseBeam(entity) {
        const beam = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Beam'),
            description: this.getAttributeValue(entity, 1, ''),
            objectType: this.getAttributeValue(entity, 2, ''),
            placement: this.getAttributeReference(entity, 3),
            representation: this.getAttributeReference(entity, 4),
            tag: this.getAttributeValue(entity, 5, '')
        };
        
        this.extractDimensions(beam, entity);
        
        beam.position = { x: 0, y: 2.5, z: 0 };
        beam.length = 5;
        beam.width = 0.3;
        beam.height = 0.5;
        
        this.elements.beams.push(beam);
    }
    
    // تحليل السقف
    parseSlab(entity) {
        const slab = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Slab'),
            description: this.getAttributeValue(entity, 1, ''),
            objectType: this.getAttributeValue(entity, 2, ''),
            placement: this.getAttributeReference(entity, 3),
            representation: this.getAttributeReference(entity, 4),
            tag: this.getAttributeValue(entity, 5, '')
        };
        
        this.extractDimensions(slab, entity);
        
        slab.position = { x: 0, y: 0, z: 0 };
        slab.width = 10;
        slab.depth = 10;
        slab.thickness = 0.25;
        
        this.elements.slabs.push(slab);
    }
    
    // تحليل الباب
    parseDoor(entity) {
        const door = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Door'),
            description: this.getAttributeValue(entity, 1, ''),
            objectType: this.getAttributeValue(entity, 2, ''),
            placement: this.getAttributeReference(entity, 3),
            representation: this.getAttributeReference(entity, 4),
            tag: this.getAttributeValue(entity, 5, ''),
            width: 0.9,
            height: 2.1
        };
        
        this.elements.doors.push(door);
    }
    
    // تحليل النافذة
    parseWindow(entity) {
        const window = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Window'),
            description: this.getAttributeValue(entity, 1, ''),
            objectType: this.getAttributeValue(entity, 2, ''),
            placement: this.getAttributeReference(entity, 3),
            representation: this.getAttributeReference(entity, 4),
            tag: this.getAttributeValue(entity, 5, ''),
            width: 1.2,
            height: 1.5
        };
        
        this.elements.windows.push(window);
    }
    
    // تحليل الدرج
    parseStair(entity) {
        const stair = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Stair'),
            description: this.getAttributeValue(entity, 1, '')
        };
        
        this.elements.stairs.push(stair);
    }
    
    // تحليل السقف
    parseRoof(entity) {
        const roof = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Roof'),
            description: this.getAttributeValue(entity, 1, '')
        };
        
        this.elements.roofs.push(roof);
    }
    
    // تحليل الأثاث
    parseFurniture(entity) {
        const furniture = {
            id: entity.id,
            type: entity.type,
            name: this.getAttributeValue(entity, 0, 'Unnamed Furniture'),
            description: this.getAttributeValue(entity, 1, '')
        };
        
        this.elements.furniture.push(furniture);
    }
    
    // الحصول على قيمة السمة
    getAttributeValue(entity, index, defaultValue = '') {
        if (index < entity.attributes.length) {
            const value = entity.attributes[index];
            if (typeof value === 'string' || typeof value === 'number') {
                return value;
            }
        }
        return defaultValue;
    }
    
    // الحصول على مرجع السمة
    getAttributeReference(entity, index) {
        if (index < entity.attributes.length) {
            const value = entity.attributes[index];
            if (typeof value === 'number') {
                return value;
            }
        }
        return null;
    }
    
    // استخراج الأبعاد من الكيان
    extractDimensions(element, entity) {
        // في الإصدار الكامل، يتم استخراج الأبعاد من الـ representation
        // هنا نضيف قيم افتراضية
        element.dimensions = {
            width: 1,
            height: 1,
            depth: 1
        };
    }
    
    // بناء العلاقات بين العناصر
    buildRelationships() {
        // في الإصدار الكامل، يتم بناء العلاقات من كيانات IfcRelAggregates, IfcRelContainedInSpatialStructure
        this.relationships = [];
    }
    
    // استخراج الخصائص
    extractProperties(entities) {
        for (const entity of entities) {
            if (entity.type === 'IFCPROPERTYSINGLEVALUE') {
                const name = this.getAttributeValue(entity, 0, '');
                const value = this.getAttributeValue(entity, 1, '');
                if (name) {
                    this.properties.set(name, value);
                }
            }
        }
    }
    
    // الحصول على ملخص
    getSummary() {
        return {
            totalElements: this.elements.walls.length + this.elements.columns.length +
                          this.elements.beams.length + this.elements.slabs.length +
                          this.elements.doors.length + this.elements.windows.length,
            walls: this.elements.walls.length,
            columns: this.elements.columns.length,
            beams: this.elements.beams.length,
            slabs: this.elements.slabs.length,
            doors: this.elements.doors.length,
            windows: this.elements.windows.length,
            stairs: this.elements.stairs.length,
            roofs: this.elements.roofs.length,
            furniture: this.elements.furniture.length,
            propertiesCount: this.properties.size
        };
    }
    
    // تصدير البيانات
    exportData() {
        return {
            elements: this.elements,
            relationships: this.relationships,
            properties: Object.fromEntries(this.properties),
            metadata: {
                parsedAt: new Date().toISOString(),
                version: '1.0'
            }
        };
    }
    
    // إعادة تعيين
    reset() {
        this.ifcData = null;
        this.elements = {
            walls: [], columns: [], beams: [], slabs: [],
            doors: [], windows: [], stairs: [], roofs: [], furniture: []
        };
        this.relationships = [];
        this.properties.clear();
    }
}