// =======================================
// GLOBAL WALL - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalWall {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.wallData = {
            material: options.material || 'concrete_block',
            thickness: options.thickness || 0.2,
            height: options.height || 3.0,
            finish: options.finish || null,
            color: options.color || 0x808080
        };
        
        this.id = `wall_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.totalLength = 0;
        this.totalVolume = 0;
        this.totalArea = 0;
        
        if (this.eventBus) {
            this.eventBus.on('wall:create', (data) => this.create(data.startPoint, data.endPoint, data.sceneId));
            this.eventBus.on('wall:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(startPoint, endPoint, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, startPoint, endPoint);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('wall:created', {
                id: this.id,
                startPoint: startPoint,
                endPoint: endPoint,
                sceneId: sceneId,
                length: this.totalLength
            });
        }
        
        console.log(`🧱 Wall created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, startPoint, endPoint, openings = []) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalStart = { ...startPoint };
        let globalEnd = { ...endPoint };
        
        if (this.geoReferencing) {
            globalStart = this.geoReferencing.localToWorld(startPoint);
            globalEnd = this.geoReferencing.localToWorld(endPoint);
        }
        
        const length = this.calculateLength(globalStart, globalEnd);
        const area = length * this.wallData.height;
        const volume = area * this.wallData.thickness;

        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            start: globalStart,
            end: globalEnd,
            localStart: startPoint,
            localEnd: endPoint,
            length: length,
            area: area,
            volume: volume,
            openings: openings.map(op => ({
                ...op,
                globalPosition: this.geoReferencing ? 
                    this.geoReferencing.localToWorld(op.position) : 
                    op.position
            })),
            createdAt: Date.now()
        };

        this.totalLength += length;
        this.totalArea += area;
        this.totalVolume += volume;
        this.segments.push(segmentData);
        
        if (this.eventBus) {
            this.eventBus.emit('wall:segmentAdded', segmentData);
        }
        
        console.log(`🧱 Wall segment added: length ${length.toFixed(2)}m, scene: ${sceneId}`);
        return segmentData;
    }

    calculateLength(point1, point2) {
        const dx = point2.x - point1.x;
        const dz = point2.z - point1.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    addOpening(sceneId, position, width, height, type = 'door') {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const opening = {
            id: `opening_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            position: globalPos,
            localPosition: position,
            width: width,
            height: height,
            type: type,
            area: width * height,
            createdAt: Date.now()
        };

        // البحث عن الجزء المناسب (أقرب جدار)
        const segment = this.findNearestSegment(globalPos);
        if (segment) {
            segment.openings.push(opening);
            if (this.eventBus) {
                this.eventBus.emit('wall:openingAdded', { wallId: this.id, segmentId: segment.id, opening });
            }
        }

        return opening;
    }
    
    findNearestSegment(position) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (const segment of this.segments) {
            // حساب منتصف الجدار
            const midPoint = {
                x: (segment.start.x + segment.end.x) / 2,
                z: (segment.start.z + segment.end.z) / 2
            };
            const distance = Math.sqrt(
                Math.pow(position.x - midPoint.x, 2) +
                Math.pow(position.z - midPoint.z, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = segment;
            }
        }
        
        return nearest;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('wall:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        
        const start = new THREE.Vector3(segment.start.x, 0, segment.start.z);
        const end = new THREE.Vector3(segment.end.x, 0, segment.end.z);
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        if (length < 0.1) return meshes;

        // جسم الجدار الرئيسي
        const wallGeometry = new THREE.BoxGeometry(length, this.wallData.height, this.wallData.thickness);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: this.wallData.color,
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            opacity: 0.95
        });
        
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        wallMesh.position.copy(center);
        wallMesh.position.y = this.wallData.height / 2;
        
        wallMesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(1, 0, 0),
            direction.clone().normalize()
        );
        
        wallMesh.userData = { type: 'wall', wallId: this.id, segmentId: segment.id };
        threeScene.add(wallMesh);
        meshes.push(wallMesh);

        // رسم الفتحات
        if (segment.openings) {
            segment.openings.forEach(opening => {
                const openingMesh = this.renderOpening(opening, threeScene);
                if (openingMesh) meshes.push(openingMesh);
            });
        }
        
        return meshes;
    }

    renderOpening(opening, threeScene) {
        const geometry = new THREE.BoxGeometry(opening.width, opening.height, 0.15);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.4,
            metalness: 0.1
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(opening.position);
        mesh.position.y = opening.height / 2;
        mesh.userData = { type: 'opening', openingId: opening.id, type: opening.type };
        
        threeScene.add(mesh);
        return mesh;
    }

    getTotalQuantities() {
        return {
            id: this.id,
            material: this.wallData.material,
            thickness: this.wallData.thickness,
            height: this.wallData.height,
            totalLength: this.totalLength.toFixed(2),
            totalArea: this.totalArea.toFixed(2),
            totalVolume: this.totalVolume.toFixed(2),
            segments: this.segments.length,
            openings: this.segments.reduce((sum, s) => sum + (s.openings?.length || 0), 0),
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            createdAt: this.segments[0]?.createdAt || null
        };
    }

    generateReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير الجدار العالمي
══════════════════════════════
🏗️ المعرف: ${totals.id}
🧱 المادة: ${totals.material}
📏 السمك: ${totals.thickness} م
📐 الارتفاع: ${totals.height} م
══════════════════════════════
📊 الإجماليات:
• الطول: ${totals.totalLength} م
• المساحة: ${totals.totalArea} م²
• الحجم: ${totals.totalVolume} م³
• الأجزاء: ${totals.segments}
• الفتحات: ${totals.openings}
• المشاهد: ${totals.scenes.length}
══════════════════════════════
        `;
    }
    
    updateMaterial(material) {
        this.wallData.material = material;
        this.eventBus?.emit('wall:materialUpdated', { id: this.id, material });
    }
    
    updateColor(color) {
        this.wallData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'wall') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('wall:colorUpdated', { id: this.id, color });
    }
    
    updateHeight(height) {
        this.wallData.height = height;
        // إعادة حساب المساحة والحجم
        this.totalArea = 0;
        this.totalVolume = 0;
        for (const segment of this.segments) {
            segment.area = segment.length * height;
            segment.volume = segment.area * this.wallData.thickness;
            this.totalArea += segment.area;
            this.totalVolume += segment.volume;
        }
        this.eventBus?.emit('wall:heightUpdated', { id: this.id, height });
    }
    
    dispose() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        this.segments = [];
        this.eventBus?.emit('wall:disposed', { id: this.id });
    }
}

export default GlobalWall;