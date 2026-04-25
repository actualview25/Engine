// =======================================
// GLOBAL SLAB - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalSlab {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.slabData = {
            type: options.type || 'solid',
            thickness: options.thickness || 0.15,
            grade: options.grade || 'C30',
            rebar: options.rebar || {
                main: 12,
                spacing: 150
            },
            color: options.color || 0x999999
        };
        
        this.id = `slab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.totalArea = 0;
        this.totalVolume = 0;
        this.totalRebar = 0;
        
        if (this.eventBus) {
            this.eventBus.on('slab:create', (data) => this.create(data.points, data.sceneId));
            this.eventBus.on('slab:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(points, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, points);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('slab:created', {
                id: this.id,
                points: points,
                sceneId: sceneId,
                area: this.totalArea
            });
        }
        
        console.log(`🏢 Slab created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, points, elevation = 0) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPoints = points.map(p => ({ ...p }));
        if (this.geoReferencing) {
            globalPoints = points.map(p => this.geoReferencing.localToWorld(p));
        }
        
        // رفع النقاط حسب elevation
        globalPoints = globalPoints.map(p => ({
            x: p.x,
            y: p.y + elevation,
            z: p.z
        }));

        const area = this.calculateArea(points);
        const volume = area * this.slabData.thickness;
        const rebarWeight = this.calculateRebarWeight(area);

        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            boundary: globalPoints,
            localBoundary: points,
            elevation: elevation,
            area: area,
            volume: volume,
            rebarWeight: rebarWeight,
            thickness: this.slabData.thickness,
            createdAt: Date.now()
        };

        this.totalArea += area;
        this.totalVolume += volume;
        this.totalRebar += rebarWeight;
        this.segments.push(segmentData);
        
        if (this.eventBus) {
            this.eventBus.emit('slab:segmentAdded', segmentData);
        }

        console.log(`🏢 Slab segment added: area ${area.toFixed(2)} m², scene: ${sceneId}`);
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

    calculateRebarWeight(area) {
        // وزن تقريبي: 80 كجم/م²
        return area * 80;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('slab:rendered', { sceneId, segments: segmentsForScene.length });
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
            depth: this.slabData.thickness,
            bevelEnabled: false
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            color: this.slabData.color,
            roughness: 0.6,
            metalness: 0.05,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = segment.elevation;
        mesh.userData = { type: 'slab', slabId: this.id, segmentId: segment.id };
        
        threeScene.add(mesh);
        meshes.push(mesh);
        
        return meshes;
    }
    
    // تحديث الخصائص
    updateThickness(thickness) {
        this.slabData.thickness = thickness;
        
        // إعادة حساب الحجم والحديد
        this.totalVolume = 0;
        this.totalRebar = 0;
        
        for (const segment of this.segments) {
            const volume = segment.area * thickness;
            const rebarWeight = this.calculateRebarWeight(segment.area);
            segment.volume = volume;
            segment.rebarWeight = rebarWeight;
            segment.thickness = thickness;
            this.totalVolume += volume;
            this.totalRebar += rebarWeight;
        }
        
        this.eventBus?.emit('slab:thicknessUpdated', {
            id: this.id,
            thickness,
            totalVolume: this.totalVolume,
            totalRebar: this.totalRebar
        });
    }
    
    updateGrade(grade) {
        this.slabData.grade = grade;
        this.eventBus?.emit('slab:gradeUpdated', { id: this.id, grade });
    }
    
    updateColor(color) {
        this.slabData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'slab') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('slab:colorUpdated', { id: this.id, color });
    }
    
    updateType(type) {
        this.slabData.type = type;
        this.eventBus?.emit('slab:typeUpdated', { id: this.id, type });
    }

    getTotalQuantities() {
        return {
            id: this.id,
            type: this.slabData.type,
            thickness: this.slabData.thickness,
            grade: this.slabData.grade,
            totalArea: this.totalArea.toFixed(2),
            totalVolume: this.totalVolume.toFixed(2),
            totalRebar: this.totalRebar.toFixed(2),
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            rebarDetails: this.slabData.rebar,
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    generateReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير السقف/البلاطة العالمي
═══════════════════════════════════
🏗️ المعرف: ${totals.id}
📏 النوع: ${totals.type === 'solid' ? 'مصمت' : totals.type}
📐 السمك: ${totals.thickness} م
🏷️ الدرجة: ${totals.grade}
═══════════════════════════════════
📊 الإجماليات:
• المساحة: ${totals.totalArea} م²
• الحجم: ${totals.totalVolume} م³
• الحديد: ${totals.totalRebar} كجم
• الأجزاء: ${totals.segments}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    // حذف قطعة معينة
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            
            // حذف المesh المرتبط
            if (this.meshes[index] && this.meshes[index].parent) {
                this.meshes[index].parent.remove(this.meshes[index]);
                if (this.meshes[index].geometry) this.meshes[index].geometry.dispose();
                if (this.meshes[index].material) this.meshes[index].material.dispose();
            }
            this.meshes.splice(index, 1);
            
            // تحديث الإجماليات
            this.totalArea -= removed.area;
            this.totalVolume -= removed.volume;
            this.totalRebar -= removed.rebarWeight;
            
            this.eventBus?.emit('slab:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ Slab segment removed from scene ${removed.sceneId}`);
            return true;
        }
        return false;
    }
    
    dispose() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        this.segments = [];
        this.eventBus?.emit('slab:disposed', { id: this.id });
    }
}

export default GlobalSlab;