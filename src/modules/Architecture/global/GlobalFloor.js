// =======================================
// GLOBAL FLOOR - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalFloor {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.floorData = {
            material: options.material || 'tile_ceramic',
            thickness: options.thickness || 0.02,
            finish: options.finish || 'standard',
            color: options.color || 0xd2b48c
        };
        
        this.id = `floor_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.totalArea = 0;
        this.meshes = [];
        
        if (this.eventBus) {
            this.eventBus.on('floor:create', (data) => this.create(data.points, data.sceneId));
            this.eventBus.on('floor:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(points, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, points);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('floor:created', {
                id: this.id,
                points: points,
                sceneId: sceneId,
                area: this.totalArea
            });
        }
        
        console.log(`🏢 Floor created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, points) {
        // استخدام geoReferencing إذا كان متاحاً
        let globalPoints = points;
        if (this.geoReferencing) {
            globalPoints = points.map(p => this.geoReferencing.localToWorld(p));
        }
        
        // حساب المساحة
        const area = this.calculateArea(globalPoints);
        
        const segmentData = {
            sceneId: sceneId,
            boundary: globalPoints,
            localBoundary: points,
            area: area,
            thickness: this.floorData.thickness,
            volume: area * this.floorData.thickness,
            createdAt: Date.now()
        };
        
        this.totalArea += area;
        this.segments.push(segmentData);
        
        if (this.eventBus) {
            this.eventBus.emit('floor:segmentAdded', segmentData);
        }
        
        console.log(`🏢 Floor segment added: ${area.toFixed(2)} m² in scene ${sceneId}`);
        return segmentData;
    }

    calculateArea(points) {
        if (points.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].z;
            area -= points[j].x * points[i].z;
        }
        return Math.abs(area) / 2;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const mesh = this.renderSegment(segment, threeScene);
            if (mesh) this.meshes.push(mesh);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('floor:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const shape = new THREE.Shape();
        const boundary = segment.localBoundary;
        
        for (let i = 0; i < boundary.length; i++) {
            const p = boundary[i];
            if (i === 0) shape.moveTo(p.x, p.z);
            else shape.lineTo(p.x, p.z);
        }
        shape.closePath();
        
        const extrudeSettings = {
            steps: 1,
            depth: this.floorData.thickness,
            bevelEnabled: false
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            color: this.floorData.color,
            roughness: 0.7,
            metalness: 0.05,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0;
        mesh.userData = { type: 'floor', floorId: this.id };
        
        threeScene.add(mesh);
        
        return mesh;
    }
    
    updateMaterial(material) {
        this.floorData.material = material;
        this.eventBus?.emit('floor:materialUpdated', { id: this.id, material });
    }
    
    updateColor(color) {
        this.floorData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material) mesh.material.color.setHex(color);
        }
        this.eventBus?.emit('floor:colorUpdated', { id: this.id, color });
    }

    getTotalQuantities() {
        return {
            id: this.id,
            material: this.floorData.material,
            thickness: this.floorData.thickness,
            totalArea: this.totalArea.toFixed(2),
            totalVolume: (this.totalArea * this.floorData.thickness).toFixed(2),
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    dispose() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        this.segments = [];
        this.eventBus?.emit('floor:disposed', { id: this.id });
    }
}

export default GlobalFloor;