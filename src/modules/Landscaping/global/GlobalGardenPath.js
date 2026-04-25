// =======================================
// GLOBAL GARDEN PATH - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalGardenPath {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.pathData = {
            width: options.width || 1.0,
            material: options.material || 'stone', // stone, gravel, wood, brick
            thickness: options.thickness || 0.05,
            color: options.color || 0xccaa88,
            borderColor: options.borderColor || 0x886644,
            hasBorder: options.hasBorder !== false,
            texture: options.texture || 'default'
        };
        
        this.id = `garden_path_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.totalLength = 0;
        
        if (this.eventBus) {
            this.eventBus.on('gardenPath:create', (data) => this.create(data.points, data.sceneId));
            this.eventBus.on('gardenPath:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(points, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, points);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('gardenPath:created', {
                id: this.id,
                points: points,
                sceneId: sceneId,
                pathData: this.pathData
            });
        }
        
        console.log(`🛤️ Garden path created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, points) {
        // تحويل النقاط إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPoints = points.map(p => ({ ...p }));
        if (this.geoReferencing) {
            globalPoints = points.map(p => this.geoReferencing.localToWorld(p));
        }
        
        const length = this.calculatePathLength(globalPoints);
        
        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            points: globalPoints,
            localPoints: points,
            pathData: { ...this.pathData },
            length: length,
            createdAt: Date.now()
        };

        this.segments.push(segmentData);
        this.totalLength += length;
        
        if (this.eventBus) {
            this.eventBus.emit('gardenPath:segmentAdded', segmentData);
        }
        
        console.log(`🛤️ Garden path segment added: length ${length.toFixed(2)}m, points: ${points.length}, scene: ${sceneId}`);
        return segmentData;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('gardenPath:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        const points = segment.localPoints;
        const data = segment.pathData;
        
        if (points.length < 2) return meshes;
        
        // إنشاء مسار باستخدام TubeGeometry أو سلسلة من BoxGeometry
        const material = this.getPathMaterial(data);
        const borderMat = new THREE.MeshStandardMaterial({ color: data.borderColor, roughness: 0.4 });
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);
            
            // قطعة المسار
            const pathPiece = new THREE.Mesh(
                new THREE.BoxGeometry(length, data.thickness, data.width),
                material
            );
            pathPiece.position.set(
                p1.x + dx / 2,
                p1.y + data.thickness / 2,
                p1.z + dz / 2
            );
            pathPiece.rotation.y = angle;
            threeScene.add(pathPiece);
            meshes.push(pathPiece);
            
            // إطار جانبي (اختياري)
            if (data.hasBorder) {
                // الإطار الأيسر
                const leftBorder = new THREE.Mesh(
                    new THREE.BoxGeometry(length, 0.05, 0.1),
                    borderMat
                );
                leftBorder.position.set(
                    p1.x + dx / 2 - Math.sin(angle) * (data.width / 2 + 0.05),
                    p1.y + 0.025,
                    p1.z + dz / 2 + Math.cos(angle) * (data.width / 2 + 0.05)
                );
                leftBorder.rotation.y = angle;
                threeScene.add(leftBorder);
                meshes.push(leftBorder);
                
                // الإطار الأيمن
                const rightBorder = new THREE.Mesh(
                    new THREE.BoxGeometry(length, 0.05, 0.1),
                    borderMat
                );
                rightBorder.position.set(
                    p1.x + dx / 2 + Math.sin(angle) * (data.width / 2 + 0.05),
                    p1.y + 0.025,
                    p1.z + dz / 2 - Math.cos(angle) * (data.width / 2 + 0.05)
                );
                rightBorder.rotation.y = angle;
                threeScene.add(rightBorder);
                meshes.push(rightBorder);
            }
        }
        
        // إضافة أحجار زخرفية (للمسارات الحجرية)
        if (data.material === 'stone' && points.length > 0) {
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, roughness: 0.8 });
            
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                // إضافة حجر زخرفي عند كل نقطة
                const stone = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08, 8, 8),
                    stoneMat
                );
                stone.position.set(p.x, p.y + 0.02, p.z);
                threeScene.add(stone);
                meshes.push(stone);
            }
        }
        
        return meshes;
    }
    
    getPathMaterial(data) {
        const materialMap = {
            stone: { color: 0xccaa88, roughness: 0.8, metalness: 0.05 },
            gravel: { color: 0xaa8866, roughness: 0.9, metalness: 0.02 },
            wood: { color: 0x8B5A2B, roughness: 0.7, metalness: 0.03 },
            brick: { color: 0xaa5533, roughness: 0.6, metalness: 0.04 }
        };
        
        const props = materialMap[data.material] || materialMap.stone;
        
        return new THREE.MeshStandardMaterial({
            color: data.color || props.color,
            roughness: props.roughness,
            metalness: props.metalness
        });
    }
    
    calculatePathLength(points) {
        let length = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dz = points[i + 1].z - points[i].z;
            length += Math.sqrt(dx * dx + dz * dz);
        }
        return length;
    }
    
    // تحديث عرض المسار
    updateWidth(width) {
        this.pathData.width = width;
        
        for (const segment of this.segments) {
            segment.pathData.width = width;
        }
        
        this.eventBus?.emit('gardenPath:widthUpdated', { id: this.id, width });
        console.log(`🛤️ Garden path width updated to: ${width}m`);
    }
    
    // تحديث مادة المسار
    updateMaterial(material) {
        this.pathData.material = material;
        
        for (const segment of this.segments) {
            segment.pathData.material = material;
        }
        
        this.eventBus?.emit('gardenPath:materialUpdated', { id: this.id, material });
        console.log(`🛤️ Garden path material updated to: ${material}`);
    }
    
    // تحديث لون المسار
    updateColor(color) {
        this.pathData.color = color;
        
        for (const segment of this.segments) {
            segment.pathData.color = color;
        }
        
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.geometry.parameters?.width === this.pathData.width) {
                mesh.material.color.setHex(color);
            }
        }
        
        this.eventBus?.emit('gardenPath:colorUpdated', { id: this.id, color });
    }

    getTotalQuantities() {
        return {
            id: this.id,
            width: this.pathData.width,
            material: this.pathData.material,
            hasBorder: this.pathData.hasBorder,
            totalLength: this.totalLength.toFixed(2),
            totalSegments: this.segments.length,
            totalArea: (this.totalLength * this.pathData.width).toFixed(2),
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    getSegmentDetails(segmentId) {
        const segment = this.segments.find(s => s.id === segmentId);
        if (!segment) return null;
        
        return {
            id: segment.id,
            sceneId: segment.sceneId,
            points: segment.localPoints.length,
            length: segment.length.toFixed(2),
            width: segment.pathData.width,
            material: segment.pathData.material,
            createdAt: segment.createdAt
        };
    }
    
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            this.totalLength -= removed.length;
            
            // حذف الـ meshes المرتبطة (تبسيط)
            for (const mesh of this.meshes) {
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            }
            this.meshes = [];
            
            this.eventBus?.emit('gardenPath:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ Garden path segment removed: ${segmentId}`);
            return true;
        }
        return false;
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        const materialNames = {
            stone: 'حجر',
            gravel: 'حصى',
            wood: 'خشب',
            brick: 'طوب'
        };
        
        return `
📋 تقرير الممرات العالمية (Garden Path)
═══════════════════════════════════
🛤️ المعرف: ${totals.id}
📐 العرض: ${totals.width} م
🪨 المادة: ${materialNames[totals.material] || totals.material}
🔲 إطار جانبي: ${totals.hasBorder ? 'نعم' : 'لا'}
═══════════════════════════════════
📊 الإجماليات:
• الطول الكلي: ${totals.totalLength} م
• المساحة الكلية: ${totals.totalArea} م²
• عدد الأجزاء: ${totals.totalSegments}
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
        this.eventBus?.emit('gardenPath:disposed', { id: this.id });
        console.log(`♻️ GlobalGardenPath disposed: ${this.id}`);
    }
}

export default GlobalGardenPath;