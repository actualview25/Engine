// =======================================
// GLOBAL CLADDING - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalCladding {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.claddingData = {
            material: options.material || 'stone', // stone, brick, wood, metal, glass
            materialType: options.materialType || 'limestone',
            pattern: options.pattern || 'random', // random, grid, staggered, herringbone
            thickness: options.thickness || 0.03,
            color: options.color || 0xccaa88,
            panelWidth: options.panelWidth || 0.4,
            panelHeight: options.panelHeight || 0.2,
            jointColor: options.jointColor || 0xaaaaaa,
            jointWidth: options.jointWidth || 0.005
        };
        
        this.id = `cladding_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.totalArea = 0;
        this.totalPanels = 0;
        
        if (this.eventBus) {
            this.eventBus.on('cladding:create', (data) => this.create(data.facadeId, data.sceneId));
            this.eventBus.on('cladding:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(facadeId = null, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, facadeId);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('cladding:created', {
                id: this.id,
                facadeId: facadeId,
                sceneId: sceneId,
                claddingData: this.claddingData
            });
        }
        
        console.log(`🧱 Cladding created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, facadeId = null) {
        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            facadeId: facadeId,
            panels: [],
            walls: [],
            createdAt: Date.now()
        };

        this.segments.push(segmentData);
        
        if (this.eventBus) {
            this.eventBus.emit('cladding:segmentAdded', segmentData);
        }
        
        return segmentData;
    }

    // تكسية جدار يمتد عبر مشاهد متعددة
    coverContinuousWall(sceneIds, wallPath, options = {}) {
        const claddingId = `cladding_wall_${Date.now()}`;
        const sections = [];
        let totalPanels = 0;

        for (let i = 0; i < sceneIds.length; i++) {
            const sceneId = sceneIds[i];
            const startPoint = wallPath[i];
            const endPoint = wallPath[i + 1] || wallPath[i];
            
            const height = options.height || 3.0;
            const panelWidth = options.panelWidth || this.claddingData.panelWidth;
            const panelHeight = options.panelHeight || this.claddingData.panelHeight;
            const pattern = options.pattern || this.claddingData.pattern;
            
            const length = this.calculateDistance(startPoint, endPoint);
            const angle = Math.atan2(endPoint.z - startPoint.z, endPoint.x - startPoint.x);
            
            const panelsCount = Math.floor(length / panelWidth);
            const rows = Math.floor(height / panelHeight);
            
            const sectionPanels = [];
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < panelsCount; col++) {
                    let offset = 0;
                    if (pattern === 'staggered' && row % 2 === 1) {
                        offset = panelWidth / 2;
                    }
                    
                    const t = (col * panelWidth + offset) / length;
                    const baseX = startPoint.x + (endPoint.x - startPoint.x) * t;
                    const baseZ = startPoint.z + (endPoint.z - startPoint.z) * t;
                    
                    // تدوير حسب زاوية الجدار
                    const rotatedX = startPoint.x + Math.cos(angle) * (baseX - startPoint.x) - Math.sin(angle) * (baseZ - startPoint.z);
                    const rotatedZ = startPoint.z + Math.sin(angle) * (baseX - startPoint.x) + Math.cos(angle) * (baseZ - startPoint.z);
                    
                    const pos = {
                        x: rotatedX,
                        y: startPoint.y + (row + 0.5) * panelHeight,
                        z: rotatedZ
                    };
                    
                    const panel = this.addPanel(sceneId, pos, {
                        width: panelWidth,
                        height: panelHeight,
                        row: row,
                        col: col,
                        angle: angle
                    });
                    
                    sectionPanels.push(panel);
                    totalPanels++;
                }
            }
            
            // ربط الأقسام المتجاورة
            if (i < sceneIds.length - 1 && this.eventBus) {
                this.eventBus.emit('scene:link', {
                    fromSceneId: sceneId,
                    toSceneId: sceneIds[i + 1],
                    position: endPoint,
                    type: 'cladding_connection'
                });
            }
            
            sections.push({
                sceneId,
                startPoint,
                endPoint,
                height,
                panels: sectionPanels,
                panelsCount: sectionPanels.length
            });
        }
        
        const wallData = {
            id: claddingId,
            sections,
            totalPanels: totalPanels,
            createdAt: Date.now()
        };
        
        // تخزين في أول قطعة
        if (this.segments.length > 0) {
            this.segments[0].walls.push(wallData);
        }
        
        this.totalPanels += totalPanels;
        this.totalArea += totalPanels * this.claddingData.panelWidth * this.claddingData.panelHeight;
        
        this.eventBus?.emit('cladding:continuousWallCreated', wallData);
        
        console.log(`🧱 Continuous cladding wall created: ${totalPanels} panels, length: ${length.toFixed(2)}m, height: ${height}m`);
        return claddingId;
    }
    
    // تكسية واجهة كاملة
    coverFacade(sceneId, facadePoints, height, options = {}) {
        const facadeId = `facade_${Date.now()}`;
        const panels = [];
        
        const panelWidth = options.panelWidth || this.claddingData.panelWidth;
        const panelHeight = options.panelHeight || this.claddingData.panelHeight;
        const pattern = options.pattern || this.claddingData.pattern;
        
        // حساب طول الواجهة
        let totalLength = 0;
        for (let i = 0; i < facadePoints.length - 1; i++) {
            totalLength += this.calculateDistance(facadePoints[i], facadePoints[i + 1]);
        }
        
        const panelsCount = Math.floor(totalLength / panelWidth);
        const rows = Math.floor(height / panelHeight);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < panelsCount; col++) {
                let offset = 0;
                if (pattern === 'staggered' && row % 2 === 1) {
                    offset = panelWidth / 2;
                }
                
                // إيجاد النقطة على طول الواجهة
                const t = (col * panelWidth + offset) / totalLength;
                const point = this.getPointOnPath(facadePoints, t);
                const angle = this.getPathAngle(facadePoints, t);
                
                const pos = {
                    x: point.x,
                    y: options.baseHeight + (row + 0.5) * panelHeight,
                    z: point.z
                };
                
                const panel = this.addPanel(sceneId, pos, {
                    width: panelWidth,
                    height: panelHeight,
                    row: row,
                    col: col,
                    angle: angle
                });
                
                panels.push(panel);
            }
        }
        
        const facadeData = {
            id: facadeId,
            panels,
            panelsCount: panels.length,
            totalArea: panels.length * panelWidth * panelHeight,
            createdAt: Date.now()
        };
        
        if (this.segments.length > 0) {
            this.segments[0].facadeId = facadeId;
        }
        
        this.totalPanels += panels.length;
        this.totalArea += facadeData.totalArea;
        
        this.eventBus?.emit('cladding:facadeCovered', facadeData);
        
        console.log(`🧱 Facade covered: ${panels.length} panels, area: ${facadeData.totalArea.toFixed(2)}m²`);
        return facadeId;
    }
    
    addPanel(sceneId, position, panelOptions) {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const panelData = {
            id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            position: globalPos,
            localPosition: position,
            width: panelOptions.width,
            height: panelOptions.height,
            row: panelOptions.row,
            col: panelOptions.col,
            angle: panelOptions.angle || 0,
            createdAt: Date.now()
        };
        
        // تخزين في أول قطعة
        if (this.segments.length > 0) {
            this.segments[0].panels.push(panelData);
        } else {
            const newSegment = {
                id: `segment_${Date.now()}_0`,
                sceneId: sceneId,
                panels: [panelData],
                walls: [],
                createdAt: Date.now()
            };
            this.segments.push(newSegment);
        }
        
        return panelData;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('cladding:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        
        const materialColors = {
            stone: 0xccaa88,
            brick: 0xcc8866,
            wood: 0x8B5A2B,
            metal: 0xaaaaaa,
            glass: 0x88aaff
        };
        
        const panelMat = new THREE.MeshStandardMaterial({
            color: materialColors[this.claddingData.material] || this.claddingData.color,
            roughness: this.claddingData.material === 'glass' ? 0.1 : 0.6,
            metalness: this.claddingData.material === 'metal' ? 0.8 : 0.05,
            transparent: this.claddingData.material === 'glass',
            opacity: this.claddingData.material === 'glass' ? 0.7 : 1
        });
        
        const jointMat = new THREE.MeshStandardMaterial({
            color: this.claddingData.jointColor,
            roughness: 0.5
        });
        
        for (const panel of segment.panels) {
            const geometry = new THREE.BoxGeometry(
                panel.width,
                panel.height,
                this.claddingData.thickness
            );
            
            const panelMesh = new THREE.Mesh(geometry, panelMat);
            panelMesh.position.set(panel.position.x, panel.position.y, panel.position.z);
            
            if (panel.angle !== 0) {
                panelMesh.rotation.y = panel.angle;
            }
            
            panelMesh.userData = { type: 'cladding_panel', panelId: panel.id };
            threeScene.add(panelMesh);
            meshes.push(panelMesh);
            
            // إضافة فاصل بين الألواح (joint)
            if (this.claddingData.jointWidth > 0 && (panel.row !== undefined && panel.col !== undefined)) {
                const jointGeometry = new THREE.BoxGeometry(
                    panel.width + 0.01,
                    this.claddingData.jointWidth,
                    this.claddingData.thickness + 0.005
                );
                const joint = new THREE.Mesh(jointGeometry, jointMat);
                joint.position.set(panel.position.x, panel.position.y - panel.height / 2 + this.claddingData.jointWidth / 2, panel.position.z + 0.002);
                if (panel.angle !== 0) joint.rotation.y = panel.angle;
                threeScene.add(joint);
                meshes.push(joint);
            }
        }
        
        return meshes;
    }
    
    // تحديث نمط التكسية
    updatePattern(newPattern) {
        this.claddingData.pattern = newPattern;
        this.eventBus?.emit('cladding:patternUpdated', { id: this.id, pattern: newPattern });
        console.log(`🧱 Cladding pattern updated to: ${newPattern}`);
    }
    
    // تحديث مادة التكسية
    updateMaterial(material) {
        this.claddingData.material = material;
        
        const materialColors = {
            stone: 0xccaa88,
            brick: 0xcc8866,
            wood: 0x8B5A2B,
            metal: 0xaaaaaa,
            glass: 0x88aaff
        };
        
        this.updateColor(materialColors[material] || this.claddingData.color);
        
        this.eventBus?.emit('cladding:materialUpdated', { id: this.id, material });
        console.log(`🧱 Cladding material updated to: ${material}`);
    }
    
    // تحديث اللون
    updateColor(color) {
        this.claddingData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'cladding_panel') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('cladding:colorUpdated', { id: this.id, color });
    }

    calculateDistance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
    }
    
    getPointOnPath(points, t) {
        if (points.length === 1) return points[0];
        
        let totalLength = 0;
        const lengths = [];
        for (let i = 0; i < points.length - 1; i++) {
            const length = this.calculateDistance(points[i], points[i + 1]);
            lengths.push(length);
            totalLength += length;
        }
        
        const targetDistance = t * totalLength;
        let accumulated = 0;
        
        for (let i = 0; i < lengths.length; i++) {
            if (targetDistance <= accumulated + lengths[i]) {
                const localT = (targetDistance - accumulated) / lengths[i];
                return {
                    x: points[i].x + (points[i + 1].x - points[i].x) * localT,
                    y: points[i].y + (points[i + 1].y - points[i].y) * localT,
                    z: points[i].z + (points[i + 1].z - points[i].z) * localT
                };
            }
            accumulated += lengths[i];
        }
        
        return points[points.length - 1];
    }
    
    getPathAngle(points, t) {
        if (points.length === 1) return 0;
        
        let totalLength = 0;
        const lengths = [];
        for (let i = 0; i < points.length - 1; i++) {
            const length = this.calculateDistance(points[i], points[i + 1]);
            lengths.push(length);
            totalLength += length;
        }
        
        const targetDistance = t * totalLength;
        let accumulated = 0;
        
        for (let i = 0; i < lengths.length; i++) {
            if (targetDistance <= accumulated + lengths[i]) {
                const dx = points[i + 1].x - points[i].x;
                const dz = points[i + 1].z - points[i].z;
                return Math.atan2(dz, dx);
            }
            accumulated += lengths[i];
        }
        
        const dx = points[points.length - 1].x - points[points.length - 2].x;
        const dz = points[points.length - 1].z - points[points.length - 2].z;
        return Math.atan2(dz, dx);
    }

    getTotalQuantities() {
        return {
            id: this.id,
            material: this.claddingData.material,
            materialType: this.claddingData.materialType,
            pattern: this.claddingData.pattern,
            thickness: this.claddingData.thickness,
            totalArea: this.totalArea.toFixed(2),
            totalPanels: this.totalPanels,
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            continuousWalls: this.segments.reduce((sum, s) => sum + s.walls.length, 0),
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            
            // تحديث الإجماليات
            this.totalPanels -= removed.panels.length;
            this.totalArea -= removed.panels.length * this.claddingData.panelWidth * this.claddingData.panelHeight;
            
            this.eventBus?.emit('cladding:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ Cladding segment removed: ${segmentId}`);
            return true;
        }
        return false;
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        const materialNames = {
            stone: 'حجر',
            brick: 'طوب',
            wood: 'خشب',
            metal: 'معدن',
            glass: 'زجاج'
        };
        
        const patternNames = {
            random: 'عشوائي',
            grid: 'شبكي',
            staggered: 'متعاكس',
            herringbone: 'سمكة'
        };
        
        return `
📋 تقرير التكسية العالمية (Cladding)
═══════════════════════════════════
🧱 المعرف: ${totals.id}
🪨 المادة: ${materialNames[totals.material] || totals.material}
🔍 النوع: ${totals.materialType}
📐 النمط: ${patternNames[totals.pattern] || totals.pattern}
📏 السمك: ${totals.thickness} م
═══════════════════════════════════
📊 الإجماليات:
• المساحة الكلية: ${totals.totalArea} م²
• عدد الألواح: ${totals.totalPanels}
• الجدران المستمرة: ${totals.continuousWalls}
• الأجزاء: ${totals.segments}
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
        this.totalPanels = 0;
        this.eventBus?.emit('cladding:disposed', { id: this.id });
        console.log(`♻️ GlobalCladding disposed: ${this.id}`);
    }
}

export default GlobalCladding;