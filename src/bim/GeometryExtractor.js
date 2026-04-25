// ============================================
// GEOMETRY EXTRACTOR - استخراج الهندسة من ملفات IFC
// يستخرج: الوجوه، الحواف، القمم، المواد، الإحداثيات
// ============================================

export class GeometryExtractor {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.extractedData = {
            vertices: [],
            indices: [],
            normals: [],
            materials: [],
            boundingBox: null
        };
    }
    
    // استخراج الهندسة من بيانات IFC
    extractGeometry(ifcData) {
        this.eventBus.emit('ui:status', '🔧 جاري استخراج الهندسة من IFC...');
        
        try {
            // إعادة تعيين البيانات
            this.reset();
            
            // استخراج القمم والوجوه من كل عنصر
            if (ifcData.walls) {
                for (const wall of ifcData.walls) {
                    this.extractWallGeometry(wall);
                }
            }
            
            if (ifcData.columns) {
                for (const column of ifcData.columns) {
                    this.extractColumnGeometry(column);
                }
            }
            
            if (ifcData.slabs) {
                for (const slab of ifcData.slabs) {
                    this.extractSlabGeometry(slab);
                }
            }
            
            if (ifcData.beams) {
                for (const beam of ifcData.beams) {
                    this.extractBeamGeometry(beam);
                }
            }
            
            // حساب الـ bounding box
            this.calculateBoundingBox();
            
            this.eventBus.emit('ui:success', `✅ تم استخراج الهندسة: ${this.extractedData.vertices.length / 3} نقطة`);
            this.eventBus.emit('geometry:extracted', this.getSummary());
            
            return this.extractedData;
            
        } catch (error) {
            console.error('Geometry extraction error:', error);
            this.eventBus.emit('ui:error', `❌ فشل استخراج الهندسة: ${error.message}`);
            return null;
        }
    }
    
    // استخراج هندسة الجدار
    extractWallGeometry(wall) {
        const x = wall.position?.x || 0;
        const y = wall.position?.y || 0;
        const z = wall.position?.z || 0;
        const w = wall.length || 5;
        const h = wall.height || 3;
        const d = wall.thickness || 0.3;
        
        this.addBoxGeometry(x, y, z, w, h, d, 'wall');
    }
    
    // استخراج هندسة العمود
    extractColumnGeometry(column) {
        const x = column.position?.x || 0;
        const y = column.position?.y || 0;
        const z = column.position?.z || 0;
        const w = column.width || 0.4;
        const h = column.height || 3;
        const d = column.depth || 0.4;
        
        this.addBoxGeometry(x, y, z, w, h, d, 'column');
    }
    
    // استخراج هندسة السقف
    extractSlabGeometry(slab) {
        const x = slab.position?.x || 0;
        const y = slab.position?.y || 0;
        const z = slab.position?.z || 0;
        const w = slab.width || 10;
        const d = slab.depth || 10;
        const h = slab.thickness || 0.25;
        
        this.addBoxGeometry(x, y, z, w, h, d, 'slab');
    }
    
    // استخراج هندسة الكمرة
    extractBeamGeometry(beam) {
        const x = beam.position?.x || 0;
        const y = beam.position?.y || 0;
        const z = beam.position?.z || 0;
        const l = beam.length || 5;
        const w = beam.width || 0.3;
        const h = beam.height || 0.5;
        
        this.addBoxGeometry(x, y, z, l, h, w, 'beam');
    }
    
    // إضافة هندسة صندوق (Box)
    addBoxGeometry(x, y, z, width, height, depth, type) {
        const halfW = width / 2;
        const halfH = height / 2;
        const halfD = depth / 2;
        
        // القمم (8 رؤوس للمكعب)
        const vertices = [
            -halfW, -halfH, -halfD,  // 0
             halfW, -halfH, -halfD,  // 1
             halfW, -halfH,  halfD,  // 2
            -halfW, -halfH,  halfD,  // 3
            -halfW,  halfH, -halfD,  // 4
             halfW,  halfH, -halfD,  // 5
             halfW,  halfH,  halfD,  // 6
            -halfW,  halfH,  halfD   // 7
        ];
        
        // إزاحة الإحداثيات
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i] += x;
            vertices[i + 1] += y;
            vertices[i + 2] += z;
        }
        
        // الوجوه (12 مثلث = 6 وجوه × 2 مثلث)
        const indices = [
            0, 1, 2, 0, 2, 3,  // قاع
            4, 6, 5, 4, 7, 6,  // قمة
            0, 4, 1, 1, 4, 5,  // أمام
            1, 5, 2, 2, 5, 6,  // يمين
            2, 6, 3, 3, 6, 7,  // خلف
            3, 7, 0, 0, 7, 4   // يسار
        ];
        
        // إضافة القمم مع إزاحة المصفوفة الحالية
        const vertexOffset = this.extractedData.vertices.length / 3;
        
        for (const v of vertices) {
            this.extractedData.vertices.push(v);
        }
        
        for (const i of indices) {
            this.extractedData.indices.push(vertexOffset + i);
        }
        
        // إضافة معلومات المادة
        for (let i = 0; i < indices.length / 3; i++) {
            this.extractedData.materials.push({
                type: type,
                faceIndex: i,
                vertices: indices.slice(i * 3, i * 3 + 3).map(idx => vertexOffset + idx)
            });
        }
    }
    
    // إضافة هندسة السطح المائل (للأسطح المعقدة)
    addFaceGeometry(verticesArray, indicesArray, type) {
        const vertexOffset = this.extractedData.vertices.length / 3;
        
        for (const v of verticesArray) {
            this.extractedData.vertices.push(v[0], v[1], v[2]);
        }
        
        for (const i of indicesArray) {
            this.extractedData.indices.push(vertexOffset + i);
            this.extractedData.materials.push({
                type: type,
                faceIndex: this.extractedData.materials.length
            });
        }
    }
    
    // حساب الـ normal vectors لكل وجه
    calculateNormals() {
        const normals = [];
        
        for (let i = 0; i < this.extractedData.indices.length; i += 3) {
            const i1 = this.extractedData.indices[i];
            const i2 = this.extractedData.indices[i + 1];
            const i3 = this.extractedData.indices[i + 2];
            
            const v1x = this.extractedData.vertices[i1 * 3];
            const v1y = this.extractedData.vertices[i1 * 3 + 1];
            const v1z = this.extractedData.vertices[i1 * 3 + 2];
            
            const v2x = this.extractedData.vertices[i2 * 3];
            const v2y = this.extractedData.vertices[i2 * 3 + 1];
            const v2z = this.extractedData.vertices[i2 * 3 + 2];
            
            const v3x = this.extractedData.vertices[i3 * 3];
            const v3y = this.extractedData.vertices[i3 * 3 + 1];
            const v3z = this.extractedData.vertices[i3 * 3 + 2];
            
            // حساب المتجهات
            const ux = v2x - v1x;
            const uy = v2y - v1y;
            const uz = v2z - v1z;
            
            const vx = v3x - v1x;
            const vy = v3y - v1y;
            const vz = v3z - v1z;
            
            // الضرب الاتجاهي
            let nx = uy * vz - uz * vy;
            let ny = uz * vx - ux * vz;
            let nz = ux * vy - uy * vx;
            
            // التسوية
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (len > 0) {
                nx /= len;
                ny /= len;
                nz /= len;
            }
            
            // إضافة normal لكل رأس في الوجه
            for (let j = 0; j < 3; j++) {
                normals.push(nx, ny, nz);
            }
        }
        
        this.extractedData.normals = normals;
        return normals;
    }
    
    // حساب الـ bounding box
    calculateBoundingBox() {
        if (this.extractedData.vertices.length === 0) {
            this.extractedData.boundingBox = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
            return;
        }
        
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (let i = 0; i < this.extractedData.vertices.length; i += 3) {
            const x = this.extractedData.vertices[i];
            const y = this.extractedData.vertices[i + 1];
            const z = this.extractedData.vertices[i + 2];
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }
        
        this.extractedData.boundingBox = {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ },
            center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
            size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
        };
    }
    
    // تحويل البيانات إلى صيغة Three.js
    toThreeJSGeometry() {
        this.calculateNormals();
        
        return {
            vertices: this.extractedData.vertices,
            indices: this.extractedData.indices,
            normals: this.extractedData.normals,
            boundingBox: this.extractedData.boundingBox
        };
    }
    
    // تصدير البيانات كـ JSON
    toJSON() {
        return {
            vertices: this.extractedData.vertices,
            indices: this.extractedData.indices,
            normals: this.extractedData.normals,
            materials: this.extractedData.materials,
            boundingBox: this.extractedData.boundingBox,
            metadata: {
                vertexCount: this.extractedData.vertices.length / 3,
                faceCount: this.extractedData.indices.length / 3,
                exportedAt: new Date().toISOString()
            }
        };
    }
    
    // الحصول على ملخص
    getSummary() {
        return {
            vertexCount: this.extractedData.vertices.length / 3,
            faceCount: this.extractedData.indices.length / 3,
            materialCount: this.extractedData.materials.length,
            boundingBox: this.extractedData.boundingBox
        };
    }
    
    // إعادة تعيين البيانات
    reset() {
        this.extractedData = {
            vertices: [],
            indices: [],
            normals: [],
            materials: [],
            boundingBox: null
        };
    }
}