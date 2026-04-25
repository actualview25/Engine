// =======================================
// GLOBAL BEAM - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalBeam {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.beamData = {
            width: options.width || 0.2,
            depth: options.depth || 0.5,
            grade: options.grade || 'C30',
            rebar: options.rebar || {
                mainBars: 4,
                stirrups: 8,
                spacing: 150
            },
            color: options.color || 0x888888
        };
        
        this.id = `beam_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.totalLength = 0;
        this.totalVolume = 0;
        this.totalRebar = 0;
        
        if (this.eventBus) {
            this.eventBus.on('beam:create', (data) => this.create(data.startPoint, data.endPoint, data.sceneId));
            this.eventBus.on('beam:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(startPoint, endPoint, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, startPoint, endPoint);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('beam:created', {
                id: this.id,
                startPoint: startPoint,
                endPoint: endPoint,
                sceneId: sceneId,
                length: this.totalLength
            });
        }
        
        console.log(`🏗️ Beam created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, startPoint, endPoint) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalStart = { ...startPoint };
        let globalEnd = { ...endPoint };
        
        if (this.geoReferencing) {
            globalStart = this.geoReferencing.localToWorld(startPoint);
            globalEnd = this.geoReferencing.localToWorld(endPoint);
        }
        
        const length = this.calculateLength(globalStart, globalEnd);
        const volume = length * this.beamData.width * this.beamData.depth;
        const rebarWeight = this.calculateRebarWeight(length);

        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            start: globalStart,
            end: globalEnd,
            localStart: startPoint,
            localEnd: endPoint,
            length: length,
            volume: volume,
            rebarWeight: rebarWeight,
            createdAt: Date.now()
        };

        this.totalLength += length;
        this.totalVolume += volume;
        this.totalRebar += rebarWeight;
        this.segments.push(segmentData);
        
        if (this.eventBus) {
            this.eventBus.emit('beam:segmentAdded', segmentData);
        }
        
        console.log(`🏗️ Beam segment added: length ${length.toFixed(2)}m, scene: ${sceneId}`);
        return segmentData;
    }

    calculateLength(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) +
            Math.pow(point2.y - point1.y, 2) +
            Math.pow(point2.z - point1.z, 2)
        );
    }

    calculateRebarWeight(length) {
        // وزن تقريبي للحديد: 100 كجم/م³
        const volume = length * this.beamData.width * this.beamData.depth;
        return volume * 100;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('beam:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        
        const start = new THREE.Vector3(segment.start.x, segment.start.y, segment.start.z);
        const end = new THREE.Vector3(segment.end.x, segment.end.y, segment.end.z);
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        
        if (length < 0.1) return meshes;
        
        const geometry = new THREE.BoxGeometry(length, this.beamData.depth, this.beamData.width);
        const material = new THREE.MeshStandardMaterial({
            color: this.beamData.color,
            roughness: 0.4,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        mesh.position.copy(center);
        
        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(1, 0, 0),
            direction.clone().normalize()
        );
        
        mesh.userData = { type: 'beam', beamId: this.id, segmentId: segment.id };
        threeScene.add(mesh);
        meshes.push(mesh);
        
        return meshes;
    }
    
    // تحديث الخصائص
    updateDimensions(width, depth) {
        this.beamData.width = width;
        this.beamData.depth = depth;
        
        // إعادة حساب الحجم والحديد
        this.totalVolume = 0;
        this.totalRebar = 0;
        
        for (const segment of this.segments) {
            const volume = segment.length * width * depth;
            const rebarWeight = volume * 100;
            segment.volume = volume;
            segment.rebarWeight = rebarWeight;
            this.totalVolume += volume;
            this.totalRebar += rebarWeight;
        }
        
        this.eventBus?.emit('beam:dimensionsUpdated', {
            id: this.id,
            width,
            depth,
            totalVolume: this.totalVolume,
            totalRebar: this.totalRebar
        });
    }
    
    updateGrade(grade) {
        this.beamData.grade = grade;
        this.eventBus?.emit('beam:gradeUpdated', { id: this.id, grade });
    }
    
    updateColor(color) {
        this.beamData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'beam') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('beam:colorUpdated', { id: this.id, color });
    }

    getTotalQuantities() {
        return {
            id: this.id,
            grade: this.beamData.grade,
            dimensions: `${this.beamData.width} × ${this.beamData.depth}`,
            totalLength: this.totalLength.toFixed(2),
            totalVolume: this.totalVolume.toFixed(2),
            totalRebar: this.totalRebar.toFixed(2),
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            rebarDetails: this.beamData.rebar,
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    generateReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير الكمرة العالمية
═══════════════════════════════════
🏗️ المعرف: ${totals.id}
📏 الأبعاد: ${totals.dimensions} م
🏷️ الدرجة: ${totals.grade}
═══════════════════════════════════
📊 الإجماليات:
• الطول: ${totals.totalLength} م
• الحجم: ${totals.totalVolume} م³
• الحديد: ${totals.totalRebar} كجم
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
        this.eventBus?.emit('beam:disposed', { id: this.id });
    }
}

export default GlobalBeam;