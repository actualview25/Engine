// ============================================
// IFC IMPORTER - استيراد ملفات BIM (IFC)
// يدعم: IfcSpaces, IfcWalls, IfcSlabs, IfcBeams, IfcColumns
// ============================================

import * as THREE from 'three';

export class IFCImporter {
    constructor(scene, eventBus, geoReferencing) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.geoReferencing = geoReferencing;
        
        this.ifcObjects = [];
        this.ifcData = {
            spaces: [],
            walls: [],
            slabs: [],
            beams: [],
            columns: [],
            doors: [],
            windows: []
        };
        
        this.materialLibrary = this.initMaterials();
        this.setupEventListeners();
    }
    
    initMaterials() {
        return {
            wall: new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.6, metalness: 0.1 }),
            slab: new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7, metalness: 0.05 }),
            column: new THREE.MeshStandardMaterial({ color: 0xb8a88c, roughness: 0.5, metalness: 0.1 }),
            beam: new THREE.MeshStandardMaterial({ color: 0xb8a88c, roughness: 0.5, metalness: 0.1 }),
            door: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.4, metalness: 0.05 }),
            window: new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.6 }),
            glass: new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.5 })
        };
    }
    
    setupEventListeners() {
        this.eventBus.on('ifc:import', (file) => {
            this.importIFC(file);
        });
        
        this.eventBus.on('ifc:clear', () => {
            this.clearIFC();
        });
        
        this.eventBus.on('ifc:select', (id) => {
            this.selectElement(id);
        });
    }
    
    async importIFC(file) {
        this.eventBus.emit('ui:loading', true);
        this.eventBus.emit('ui:status', `🏗️ جاري استيراد ملف BIM: ${file.name}...`);
        
        try {
            // في الإصدار الكامل، استخدم web-ifc-three
            // هنا نقوم بمحاكاة استيراد IFC وتحويله إلى Three.js
            
            const ifcData = await this.parseIFC(file);
            const objects = await this.convertIFCToThreeJS(ifcData);
            
            // إضافة إلى المشهد
            for (const obj of objects) {
                this.scene.add(obj);
                this.ifcObjects.push(obj);
            }
            
            // حفظ البيانات
            this.ifcData = ifcData;
            
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:success', `✅ تم استيراد ${objects.length} عنصر BIM من ${file.name}`);
            this.eventBus.emit('ifc:imported', { 
                count: objects.length, 
                types: this.getTypeSummary(),
                file: file.name 
            });
            
            // إرسال البيانات إلى BOQ
            this.createBOQFromIFC();
            
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل استيراد IFC: ${error.message}`);
            console.error('IFC import error:', error);
        }
    }
    
    async parseIFC(file) {
        // محاكاة تحليل IFC
        // في الواقع، استخدم web-ifc لتحليل الملف الحقيقي
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                
                // تحليل بسيط لملف IFC النصي
                const lines = content.split('\n');
                const elements = {
                    spaces: [],
                    walls: [],
                    slabs: [],
                    beams: [],
                    columns: [],
                    doors: [],
                    windows: []
                };
                
                for (const line of lines) {
                    if (line.includes('IFCWALL')) {
                        elements.walls.push(this.parseWall(line));
                    } else if (line.includes('IFCSLAB')) {
                        elements.slabs.push(this.parseSlab(line));
                    } else if (line.includes('IFCCOLUMN')) {
                        elements.columns.push(this.parseColumn(line));
                    } else if (line.includes('IFCBEAM')) {
                        elements.beams.push(this.parseBeam(line));
                    } else if (line.includes('IFCDOOR')) {
                        elements.doors.push(this.parseDoor(line));
                    } else if (line.includes('IFCWINDOW')) {
                        elements.windows.push(this.parseWindow(line));
                    }
                }
                
                resolve(elements);
            };
            reader.readAsText(file);
        });
    }
    
    parseWall(line) {
        // استخراج بيانات الجدار من سطر IFC
        return {
            id: this.extractId(line),
            name: this.extractName(line),
            height: 3.0,
            length: 5.0,
            thickness: 0.3,
            position: { x: Math.random() * 20 - 10, y: 0, z: Math.random() * 20 - 10 },
            rotation: Math.random() * Math.PI * 2
        };
    }
    
    parseSlab(line) {
        return {
            id: this.extractId(line),
            name: this.extractName(line),
            thickness: 0.25,
            width: 10,
            depth: 10,
            position: { x: 0, y: 0, z: 0 }
        };
    }
    
    parseColumn(line) {
        return {
            id: this.extractId(line),
            name: this.extractName(line),
            height: 3.0,
            width: 0.4,
            depth: 0.4,
            position: { x: Math.random() * 15 - 7.5, y: 0, z: Math.random() * 15 - 7.5 }
        };
    }
    
    parseBeam(line) {
        return {
            id: this.extractId(line),
            name: this.extractName(line),
            length: 5.0,
            width: 0.3,
            height: 0.5,
            position: { x: 0, y: 2.5, z: 0 }
        };
    }
    
    parseDoor(line) {
        return {
            id: this.extractId(line),
            name: this.extractName(line),
            height: 2.1,
            width: 0.9,
            position: { x: 5, y: 0, z: 0 }
        };
    }
    
    parseWindow(line) {
        return {
            id: this.extractId(line),
            name: this.extractName(line),
            height: 1.5,
            width: 1.2,
            position: { x: 3, y: 1, z: 0 }
        };
    }
    
    extractId(line) {
        const match = line.match(/#(\d+)/);
        return match ? match[1] : Math.random().toString(36).substr(2, 6);
    }
    
    extractName(line) {
        const match = line.match(/'([^']+)'/);
        return match ? match[1] : 'Unnamed';
    }
    
    async convertIFCToThreeJS(ifcData) {
        const objects = [];
        
        // تحويل الجدران
        for (const wall of ifcData.walls) {
            const wallMesh = this.createWallMesh(wall);
            objects.push(wallMesh);
        }
        
        // تحويل الأعمدة
        for (const column of ifcData.columns) {
            const columnMesh = this.createColumnMesh(column);
            objects.push(columnMesh);
        }
        
        // تحويل الكمرات
        for (const beam of ifcData.beams) {
            const beamMesh = this.createBeamMesh(beam);
            objects.push(beamMesh);
        }
        
        // تحويل الأسقف
        for (const slab of ifcData.slabs) {
            const slabMesh = this.createSlabMesh(slab);
            objects.push(slabMesh);
        }
        
        // تحويل الأبواب
        for (const door of ifcData.doors) {
            const doorMesh = this.createDoorMesh(door);
            objects.push(doorMesh);
        }
        
        // تحويل النوافذ
        for (const window of ifcData.windows) {
            const windowMesh = this.createWindowMesh(window);
            objects.push(windowMesh);
        }
        
        return objects;
    }
    
    createWallMesh(wall) {
        const geometry = new THREE.BoxGeometry(wall.length, wall.height, wall.thickness);
        const mesh = new THREE.Mesh(geometry, this.materialLibrary.wall);
        mesh.position.set(wall.position.x, wall.height / 2, wall.position.z);
        mesh.rotation.y = wall.rotation || 0;
        mesh.userData = {
            type: 'IfcWall',
            id: wall.id,
            name: wall.name,
            properties: wall
        };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    
    createColumnMesh(column) {
        const geometry = new THREE.BoxGeometry(column.width, column.height, column.depth);
        const mesh = new THREE.Mesh(geometry, this.materialLibrary.column);
        mesh.position.set(column.position.x, column.height / 2, column.position.z);
        mesh.userData = {
            type: 'IfcColumn',
            id: column.id,
            name: column.name,
            properties: column
        };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    
    createBeamMesh(beam) {
        const geometry = new THREE.BoxGeometry(beam.length, beam.height, beam.width);
        const mesh = new THREE.Mesh(geometry, this.materialLibrary.beam);
        mesh.position.set(beam.position.x, beam.position.y, beam.position.z);
        mesh.userData = {
            type: 'IfcBeam',
            id: beam.id,
            name: beam.name,
            properties: beam
        };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    
    createSlabMesh(slab) {
        const geometry = new THREE.BoxGeometry(slab.width, slab.thickness, slab.depth);
        const mesh = new THREE.Mesh(geometry, this.materialLibrary.slab);
        mesh.position.set(slab.position.x, slab.thickness / 2, slab.position.z);
        mesh.userData = {
            type: 'IfcSlab',
            id: slab.id,
            name: slab.name,
            properties: slab
        };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }
    
    createDoorMesh(door) {
        const geometry = new THREE.BoxGeometry(door.width, door.height, 0.05);
        const mesh = new THREE.Mesh(geometry, this.materialLibrary.door);
        mesh.position.set(door.position.x, door.height / 2, door.position.z);
        mesh.userData = {
            type: 'IfcDoor',
            id: door.id,
            name: door.name,
            properties: door
        };
        mesh.castShadow = true;
        return mesh;
    }
    
    createWindowMesh(window) {
        const geometry = new THREE.BoxGeometry(window.width, window.height, 0.05);
        const mesh = new THREE.Mesh(geometry, this.materialLibrary.window);
        mesh.position.set(window.position.x, window.position.y + window.height / 2, window.position.z);
        mesh.userData = {
            type: 'IfcWindow',
            id: window.id,
            name: window.name,
            properties: window
        };
        mesh.castShadow = true;
        return mesh;
    }
    
    createBOQFromIFC() {
        const boqItems = [];
        
        // إضافة كميات من IFC
        if (this.ifcData.walls.length > 0) {
            const wallVolume = this.ifcData.walls.reduce((sum, w) => 
                sum + (w.length * w.height * w.thickness), 0);
            boqItems.push({
                name: 'جدران خرسانية',
                category: 'concrete',
                quantity: wallVolume,
                unit: 'm³',
                description: `من إستيراد IFC - ${this.ifcData.walls.length} جدار`
            });
        }
        
        if (this.ifcData.columns.length > 0) {
            const columnVolume = this.ifcData.columns.reduce((sum, c) => 
                sum + (c.width * c.height * c.depth), 0);
            boqItems.push({
                name: 'أعمدة خرسانية',
                category: 'concrete',
                quantity: columnVolume,
                unit: 'm³',
                description: `من إستيراد IFC - ${this.ifcData.columns.length} عمود`
            });
        }
        
        if (this.ifcData.slabs.length > 0) {
            const slabVolume = this.ifcData.slabs.reduce((sum, s) => 
                sum + (s.width * s.thickness * s.depth), 0);
            boqItems.push({
                name: 'أسقف',
                category: 'concrete',
                quantity: slabVolume,
                unit: 'm³',
                description: `من إستيراد IFC - ${this.ifcData.slabs.length} سقف`
            });
        }
        
        // إرسال إلى BOQ Manager
        for (const item of boqItems) {
            this.eventBus.emit('boq:add', item);
        }
    }
    
    selectElement(id) {
        // تمييز العنصر المحدد
        for (const obj of this.ifcObjects) {
            if (obj.userData.id === id) {
                this.highlightElement(obj);
                this.eventBus.emit('ui:status', `🔍 تم تحديد: ${obj.userData.name}`);
                this.eventBus.emit('ifc:selected', obj.userData);
                break;
            }
        }
    }
    
    highlightElement(element) {
        // حفظ المادة الأصلية
        const originalMaterial = element.material;
        
        // تطبيق تأثير التمييز
        element.material = new THREE.MeshStandardMaterial({
            color: 0xffaa44,
            emissive: 0x442200,
            transparent: true,
            opacity: 0.8
        });
        
        // إعادة المادة بعد ثانيتين
        setTimeout(() => {
            if (element.material) {
                element.material.dispose();
            }
            element.material = originalMaterial;
        }, 2000);
    }
    
    getTypeSummary() {
        return {
            walls: this.ifcData.walls.length,
            columns: this.ifcData.columns.length,
            beams: this.ifcData.beams.length,
            slabs: this.ifcData.slabs.length,
            doors: this.ifcData.doors.length,
            windows: this.ifcData.windows.length
        };
    }
    
    clearIFC() {
        for (const obj of this.ifcObjects) {
            this.scene.remove(obj);
            if (obj.material) obj.material.dispose();
            if (obj.geometry) obj.geometry.dispose();
        }
        this.ifcObjects = [];
        this.ifcData = {
            spaces: [], walls: [], slabs: [], beams: [], columns: [], doors: [], windows: []
        };
        
        this.eventBus.emit('ui:success', 'تم مسح جميع عناصر BIM');
    }
}