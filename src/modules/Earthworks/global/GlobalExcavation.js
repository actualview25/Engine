// =======================================
// GLOBAL EXCAVATION - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';
import { SoilMaterial } from '../Modules/Earthworks/SoilMaterial.js';

export class GlobalExcavation {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.excavationData = {
            soilType: options.soilType || 'topsoil',
            depth: options.depth || 2.0,
            slope: options.slope || 45,
            material: new SoilMaterial(options.soilType),
            color: options.color || 0x8B4513
        };
        
        this.id = `excavation_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.volumes = [];
        this.totalVolume = 0;
        
        if (this.eventBus) {
            this.eventBus.on('excavation:create', (data) => this.create(data.boundaryPoints, data.sceneId));
            this.eventBus.on('excavation:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(boundaryPoints, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, boundaryPoints);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('excavation:created', {
                id: this.id,
                boundaryPoints: boundaryPoints,
                sceneId: sceneId,
                volume: this.totalVolume
            });
        }
        
        console.log(`⛏️ Excavation created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, boundaryPoints) {
        // تحويل النقاط إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPoints = boundaryPoints.map(p => ({ ...p }));
        if (this.geoReferencing) {
            globalPoints = boundaryPoints.map(p => this.geoReferencing.localToWorld(p));
        }

        const area = this.calculateArea(globalPoints);
        const volume = area * this.excavationData.depth;

        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            boundary: globalPoints,
            localBoundary: boundaryPoints,
            area: area,
            volume: volume,
            depth: this.excavationData.depth,
            soilType: this.excavationData.soilType,
            slope: this.excavationData.slope,
            createdAt: Date.now()
        };

        this.segments.push(segmentData);
        this.volumes.push(volume);
        this.totalVolume += volume;
        
        if (this.eventBus) {
            this.eventBus.emit('excavation:segmentAdded', segmentData);
        }

        console.log(`⛏️ Excavation segment added: area ${area.toFixed(2)} m², volume ${volume.toFixed(2)} m³, scene: ${sceneId}`);
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
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('excavation:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        
        const shape = new THREE.Shape();
        segment.localBoundary.forEach((p, i) => {
            if (i === 0) shape.moveTo(p.x, p.z);
            else shape.lineTo(p.x, p.z);
        });
        shape.closePath();

        const extrudeSettings = {
            steps: 1,
            depth: this.excavationData.depth,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: this.excavationData.color,
            roughness: 0.8,
            metalness: 0.05,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = -this.excavationData.depth;
        mesh.userData = { type: 'excavation', excavationId: this.id, segmentId: segment.id };
        
        threeScene.add(mesh);
        meshes.push(mesh);
        
        // إضافة خطوط الكنتور للعرض (اختياري)
        if (this.excavationData.slope) {
            const contourMeshes = this.addContourLines(segment, threeScene);
            meshes.push(...contourMeshes);
        }
        
        return meshes;
    }
    
    // إضافة خطوط كنتور للحفرية
    addContourLines(segment, threeScene) {
        const meshes = [];
        const levels = 3; // عدد مستويات الكنتور
        
        for (let i = 1; i <= levels; i++) {
            const depthLevel = -this.excavationData.depth * (i / levels);
            
            const shape = new THREE.Shape();
            const scale = 1 - (i * 0.15); // تصغير تدريجي للمنحنيات
            segment.localBoundary.forEach((p, idx) => {
                const x = p.x * scale;
                const z = p.z * scale;
                if (idx === 0) shape.moveTo(x, z);
                else shape.lineTo(x, z);
            });
            shape.closePath();
            
            const lineGeometry = new THREE.ShapeGeometry(shape);
            const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa44, wireframe: true, transparent: true, opacity: 0.4 });
            const contourMesh = new THREE.Mesh(lineGeometry, lineMaterial);
            contourMesh.position.y = depthLevel;
            contourMesh.userData = { type: 'excavation_contour', depth: depthLevel };
            
            threeScene.add(contourMesh);
            meshes.push(contourMesh);
        }
        
        return meshes;
    }
    
    // تحديث العمق
    updateDepth(depth) {
        this.excavationData.depth = depth;
        
        // إعادة حساب الأحجام
        this.totalVolume = 0;
        this.volumes = [];
        
        for (const segment of this.segments) {
            const volume = segment.area * depth;
            segment.volume = volume;
            segment.depth = depth;
            this.volumes.push(volume);
            this.totalVolume += volume;
        }
        
        // تحديث المشاهدات
        for (const mesh of this.meshes) {
            if (mesh.userData.type === 'excavation') {
                mesh.position.y = -depth;
            }
        }
        
        this.eventBus?.emit('excavation:depthUpdated', {
            id: this.id,
            depth: depth,
            totalVolume: this.totalVolume
        });
        
        console.log(`📏 Excavation depth updated to: ${depth}m`);
    }
    
    // تحديث نوع التربة
    updateSoilType(soilType) {
        this.excavationData.soilType = soilType;
        this.excavationData.material = new SoilMaterial(soilType);
        
        for (const segment of this.segments) {
            segment.soilType = soilType;
        }
        
        this.eventBus?.emit('excavation:soilTypeUpdated', {
            id: this.id,
            soilType: soilType
        });
        
        console.log(`🟫 Soil type updated to: ${soilType}`);
    }
    
    // تحديث لون العرض
    updateColor(color) {
        this.excavationData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'excavation') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('excavation:colorUpdated', { id: this.id, color });
    }
    
    // تحديث الميل
    updateSlope(slope) {
        this.excavationData.slope = slope;
        this.eventBus?.emit('excavation:slopeUpdated', { id: this.id, slope });
    }

    getTotalQuantities() {
        const estimatedWeight = this.totalVolume * 1.6; // 1.6 طن/م³ للتربة
        
        return {
            id: this.id,
            soilType: this.excavationData.soilType,
            depth: this.excavationData.depth,
            slope: this.excavationData.slope,
            totalVolume: this.totalVolume.toFixed(2),
            averageDepth: this.excavationData.depth,
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            estimatedWeight: estimatedWeight.toFixed(2),
            estimatedWeightUnit: 'tons',
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    getSegmentDetails(segmentId) {
        const segment = this.segments.find(s => s.id === segmentId);
        if (!segment) return null;
        
        return {
            id: segment.id,
            sceneId: segment.sceneId,
            area: segment.area.toFixed(2),
            volume: segment.volume.toFixed(2),
            depth: segment.depth,
            soilType: segment.soilType,
            points: segment.localBoundary.length,
            createdAt: segment.createdAt
        };
    }
    
    generateReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير الحفريات (Excavation)
═══════════════════════════════════
⛏️ المعرف: ${totals.id}
🟫 نوع التربة: ${totals.soilType}
📏 العمق: ${totals.depth} م
📐 الميل: ${totals.slope}°
═══════════════════════════════════
📊 الكميات:
• الحجم الكلي: ${totals.totalVolume} م³
• الوزن التقديري: ${totals.estimatedWeight} طن
• عدد الأجزاء: ${totals.segments}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    // حذف قطعة معينة
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            const removedVolume = this.volumes.splice(index, 1)[0];
            this.totalVolume -= removedVolume;
            
            // حذف الـ meshes المرتبطة
            const meshesToRemove = this.meshes.filter(m => m.userData.segmentId === segmentId);
            for (const mesh of meshesToRemove) {
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                const meshIndex = this.meshes.findIndex(m => m === mesh);
                if (meshIndex !== -1) this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('excavation:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ Excavation segment removed from scene ${removed.sceneId}`);
            return true;
        }
        return false;
    }
    
    // إعادة تعيين الحفريات بالكامل
    reset() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        this.segments = [];
        this.volumes = [];
        this.totalVolume = 0;
        
        this.eventBus?.emit('excavation:reset', { id: this.id });
        console.log(`🔄 Excavation reset: ${this.id}`);
    }
    
    dispose() {
        this.reset();
        this.eventBus?.emit('excavation:disposed', { id: this.id });
        console.log(`♻️ GlobalExcavation disposed: ${this.id}`);
    }
}

export default GlobalExcavation;