// =======================================
// GLOBAL PAVEMENT - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalPavement {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.pavementData = {
            material: options.material || 'stone', // stone, concrete, asphalt, brick, gravel
            pattern: options.pattern || 'grid', // grid, herringbone, random, seamless
            thickness: options.thickness || 0.1,
            color: options.color || 0xccaa88,
            jointColor: options.jointColor || 0xaaaaaa,
            tileSize: options.tileSize || 0.4,
            subbase: options.subbase || 'gravel',
            subbaseThickness: options.subbaseThickness || 0.15
        };
        
        this.id = `pavement_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.totalArea = 0;
        this.totalVolume = 0;
        
        if (this.eventBus) {
            this.eventBus.on('pavement:create', (data) => this.create(data.area, data.sceneId));
            this.eventBus.on('pavement:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(area, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addArea(sceneId, area);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('pavement:created', {
                id: this.id,
                area: area,
                sceneId: sceneId,
                pavementData: this.pavementData
            });
        }
        
        console.log(`🛣️ Pavement created with ID: ${this.id}`);
        return this.id;
    }

    addArea(sceneId, area) {
        let globalPos = { ...area.position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(area.position || { x: 0, y: 0, z: 0 });
        }
        
        const width = area.width;
        const length = area.length;
        const areaSurface = width * length;
        const volume = areaSurface * this.pavementData.thickness;
        const subbaseVolume = areaSurface * this.pavementData.subbaseThickness;
        
        const areaData = {
            id: `pavement_area_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: area.position || { x: 0, y: 0, z: 0 },
            width: width,
            length: length,
            area: areaSurface,
            volume: volume,
            subbaseVolume: subbaseVolume,
            pavementData: { ...this.pavementData },
            createdAt: Date.now()
        };

        this.segments.push(areaData);
        this.totalArea += areaSurface;
        this.totalVolume += volume;
        
        if (this.eventBus) {
            this.eventBus.emit('pavement:areaAdded', areaData);
        }
        
        console.log(`🛣️ Pavement area added: ${areaSurface.toFixed(2)}m², width: ${width}m, length: ${length}m`);
        return areaData;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('pavement:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        const matColors = {
            stone: 0xccaa88,
            concrete: 0xaaaaaa,
            asphalt: 0x333333,
            brick: 0xcc8866,
            gravel: 0xaaaabb
        };
        
        const material = new THREE.MeshStandardMaterial({
            color: this.pavementData.color || matColors[this.pavementData.material],
            roughness: this.pavementData.material === 'asphalt' ? 0.8 : 0.6,
            metalness: 0.05
        });
        
        const geometry = new THREE.PlaneGeometry(segment.width, segment.length);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(segment.position.x, segment.position.y, segment.position.z);
        mesh.userData = { type: 'pavement', pavementId: this.id, areaId: segment.id };
        
        threeScene.add(mesh);
        meshes.push(mesh);
        
        // إضافة طبقة الأساس (subbase)
        if (this.pavementData.subbase && this.pavementData.subbase !== 'none') {
            const subbaseMat = new THREE.MeshStandardMaterial({
                color: 0xaa9966,
                roughness: 0.9
            });
            const subbaseGeo = new THREE.PlaneGeometry(segment.width, segment.length);
            const subbase = new THREE.Mesh(subbaseGeo, subbaseMat);
            subbase.rotation.x = -Math.PI / 2;
            subbase.position.set(segment.position.x, segment.position.y - this.pavementData.thickness, segment.position.z);
            subbase.userData = { type: 'pavement_subbase', areaId: segment.id };
            threeScene.add(subbase);
            meshes.push(subbase);
        }
        
        return meshes;
    }
    
    // إنشاء رصف ببلاطات
    createTiledPavement(sceneId, area, options = {}) {
        const tileSize = options.tileSize || this.pavementData.tileSize;
        const tilesX = Math.ceil(area.width / tileSize);
        const tilesZ = Math.ceil(area.length / tileSize);
        const pattern = options.pattern || this.pavementData.pattern;
        
        const tiles = [];
        const jointMat = new THREE.MeshStandardMaterial({ color: this.pavementData.jointColor });
        
        for (let i = 0; i < tilesX; i++) {
            for (let j = 0; j < tilesZ; j++) {
                let x = area.position.x + i * tileSize - area.width / 2 + tileSize / 2;
                let z = area.position.z + j * tileSize - area.length / 2 + tileSize / 2;
                
                let rotation = 0;
                if (pattern === 'herringbone') {
                    rotation = ((i + j) % 2 === 0) ? Math.PI / 4 : -Math.PI / 4;
                }
                
                const matColors = {
                    stone: 0xccaa88,
                    concrete: 0xaaaaaa,
                    brick: 0xcc8866
                };
                
                const tileMat = new THREE.MeshStandardMaterial({
                    color: matColors[this.pavementData.material] || this.pavementData.color,
                    roughness: 0.6
                });
                
                const tileGeo = new THREE.BoxGeometry(tileSize - 0.005, this.pavementData.thickness, tileSize - 0.005);
                const tileMesh = new THREE.Mesh(tileGeo, tileMat);
                tileMesh.position.set(x, area.position.y + this.pavementData.thickness / 2, z);
                
                if (rotation !== 0) {
                    tileMesh.rotation.y = rotation;
                }
                
                tileMesh.userData = { type: 'pavement_tile', tileX: i, tileZ: j };
                threeScene.add(tileMesh);
                tiles.push(tileMesh);
                
                // إضافة فواصل بين البلاطات
                if (i < tilesX - 1) {
                    const jointGeo = new THREE.BoxGeometry(0.01, this.pavementData.thickness, tileSize);
                    const joint = new THREE.Mesh(jointGeo, jointMat);
                    joint.position.set(x + tileSize / 2, area.position.y + this.pavementData.thickness / 2, z);
                    threeScene.add(joint);
                    tiles.push(joint);
                }
                
                if (j < tilesZ - 1) {
                    const jointGeo = new THREE.BoxGeometry(tileSize, this.pavementData.thickness, 0.01);
                    const joint = new THREE.Mesh(jointGeo, jointMat);
                    joint.position.set(x, area.position.y + this.pavementData.thickness / 2, z + tileSize / 2);
                    threeScene.add(joint);
                    tiles.push(joint);
                }
            }
        }
        
        console.log(`🛣️ Tiled pavement created: ${tilesX * tilesZ} tiles`);
        return {
            pavementId: this.id,
            tilesCount: tilesX * tilesZ,
            tilesX,
            tilesZ,
            tileSize,
            pattern
        };
    }
    
    // إنشاء رصف على مسار منحني
    createCurvedPavement(sceneId, points, width, options = {}) {
        const segments = [];
        let totalLength = 0;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const length = Math.sqrt(
                Math.pow(p2.x - p1.x, 2) +
                Math.pow(p2.z - p1.z, 2)
            );
            totalLength += length;
            
            const angle = Math.atan2(p2.z - p1.z, p2.x - p1.x);
            const midX = (p1.x + p2.x) / 2;
            const midZ = (p1.z + p2.z) / 2;
            
            const matColors = {
                stone: 0xccaa88,
                concrete: 0xaaaaaa,
                asphalt: 0x333333,
                gravel: 0xaaaabb
            };
            
            const material = new THREE.MeshStandardMaterial({
                color: matColors[this.pavementData.material] || this.pavementData.color,
                roughness: this.pavementData.material === 'asphalt' ? 0.8 : 0.6
            });
            
            const geometry = new THREE.PlaneGeometry(length, width);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = angle;
            mesh.position.set(midX, p1.y + this.pavementData.thickness / 2, midZ);
            mesh.userData = { type: 'curved_pavement', segment: i };
            
            threeScene.add(mesh);
            segments.push(mesh);
        }
        
        console.log(`🛣️ Curved pavement created: ${segments.length} segments, total length: ${totalLength.toFixed(2)}m`);
        
        return {
            pavementId: this.id,
            segments: segments.length,
            totalLength: totalLength,
            width: width
        };
    }
    
    // تحديث مادة الرصف
    updateMaterial(material) {
        this.pavementData.material = material;
        
        const matColors = {
            stone: 0xccaa88,
            concrete: 0xaaaaaa,
            asphalt: 0x333333,
            brick: 0xcc8866,
            gravel: 0xaaaabb
        };
        
        this.updateColor(matColors[material] || this.pavementData.color);
        
        this.eventBus?.emit('pavement:materialUpdated', { id: this.id, material });
        console.log(`🛣️ Pavement material updated to: ${material}`);
    }
    
    // تحديث اللون
    updateColor(color) {
        this.pavementData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'pavement') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('pavement:colorUpdated', { id: this.id, color });
    }
    
    // تحديث النمط
    updatePattern(pattern) {
        this.pavementData.pattern = pattern;
        this.eventBus?.emit('pavement:patternUpdated', { id: this.id, pattern });
        console.log(`🛣️ Pavement pattern updated to: ${pattern}`);
    }

    getTotalQuantities() {
        return {
            id: this.id,
            material: this.pavementData.material,
            pattern: this.pavementData.pattern,
            thickness: this.pavementData.thickness,
            subbase: this.pavementData.subbase,
            subbaseThickness: this.pavementData.subbaseThickness,
            totalArea: this.totalArea.toFixed(2),
            totalVolume: this.totalVolume.toFixed(3),
            totalSubbaseVolume: (this.totalArea * this.pavementData.subbaseThickness).toFixed(3),
            totalWeight: (this.totalVolume * 2.4).toFixed(2), // 2.4 طن/م³ للخرسانة
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    removeArea(areaId) {
        const index = this.segments.findIndex(s => s.id === areaId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            this.totalArea -= removed.area;
            this.totalVolume -= removed.volume;
            
            const meshIndex = this.meshes.findIndex(m => m.userData.areaId === areaId);
            if (meshIndex !== -1) {
                const mesh = this.meshes[meshIndex];
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('pavement:areaRemoved', { id: this.id, areaId });
            console.log(`🗑️ Pavement area removed: ${areaId}`);
            return true;
        }
        return false;
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        const materialNames = {
            stone: 'حجر',
            concrete: 'خرسانة',
            asphalt: 'أسفلت',
            brick: 'طوب',
            gravel: 'حصى'
        };
        
        const patternNames = {
            grid: 'شبكي',
            herringbone: 'سمكة',
            random: 'عشوائي',
            seamless: 'مستمر'
        };
        
        const subbaseNames = {
            gravel: 'حصى',
            sand: 'رمل',
            crushedStone: 'بحص',
            none: 'بدون'
        };
        
        return `
📋 تقرير الرصف العالمي (Pavement)
═══════════════════════════════════
🛣️ المعرف: ${totals.id}
🪨 المادة: ${materialNames[totals.material] || totals.material}
📐 النمط: ${patternNames[totals.pattern] || totals.pattern}
📏 السمك: ${totals.thickness} م
═══════════════════════════════════
🛠️ طبقة الأساس:
• المادة: ${subbaseNames[totals.subbase] || totals.subbase}
• السمك: ${totals.subbaseThickness} م
═══════════════════════════════════
📊 الإجماليات:
• المساحة الكلية: ${totals.totalArea} م²
• الحجم الكلي: ${totals.totalVolume} م³
• حجم الأساس: ${totals.totalSubbaseVolume} م³
• الوزن التقريبي: ${totals.totalWeight} طن
• عدد الأجزاء: ${totals.segments}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    dispose() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        this.segments = [];
        this.totalArea = 0;
        this.totalVolume = 0;
        this.eventBus?.emit('pavement:disposed', { id: this.id });
        console.log(`♻️ GlobalPavement disposed: ${this.id}`);
    }
}

export default GlobalPavement;