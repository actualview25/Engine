// =======================================
// GLOBAL CURTAIN WALL - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalCurtainWall {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.wallData = {
            width: options.width || 10.0,
            height: options.height || 20.0,
            glassType: options.glassType || 'clear',
            frameColor: options.frameColor || 0xcccccc,
            glassColor: options.glassColor || 0x88aaff,
            mullionSpacing: options.mullionSpacing || 1.2,
            transomSpacing: options.transomSpacing || 2.0
        };
        
        this.id = `curtain_wall_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        
        if (this.eventBus) {
            this.eventBus.on('curtainWall:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('curtainWall:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('curtainWall:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                wallData: this.wallData
            });
        }
        
        console.log(`🏢 Curtain wall created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, position) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const segment = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            wallData: { ...this.wallData },
            createdAt: Date.now()
        };
        
        this.segments.push(segment);
        
        if (this.eventBus) {
            this.eventBus.emit('curtainWall:segmentAdded', segment);
        }
        
        console.log(`🏢 Curtain wall segment added at position (${position.x}, ${position.z}) in scene ${sceneId}`);
        return segment;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('curtainWall:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        const x = segment.position.x;
        const z = segment.position.z;
        const width = this.wallData.width;
        const height = this.wallData.height;
        
        const frameMat = new THREE.MeshStandardMaterial({ color: this.wallData.frameColor, metalness: 0.7, roughness: 0.3 });
        const glassMat = new THREE.MeshStandardMaterial({
            color: this.wallData.glassColor,
            transparent: true,
            opacity: 0.85,
            metalness: 0.9,
            roughness: 0.1,
            side: THREE.DoubleSide
        });
        
        // الإطار الخارجي
        const frameThickness = 0.1;
        
        // العمود الأيسر
        const leftPost = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameThickness), frameMat);
        leftPost.position.set(x - width/2 + frameThickness/2, height/2, z);
        threeScene.add(leftPost);
        meshes.push(leftPost);
        
        // العمود الأيمن
        const rightPost = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, height, frameThickness), frameMat);
        rightPost.position.set(x + width/2 - frameThickness/2, height/2, z);
        threeScene.add(rightPost);
        meshes.push(rightPost);
        
        // العارض العلوي
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(width, frameThickness, frameThickness), frameMat);
        topBeam.position.set(x, height - frameThickness/2, z);
        threeScene.add(topBeam);
        meshes.push(topBeam);
        
        // العارض السفلي
        const bottomBeam = new THREE.Mesh(new THREE.BoxGeometry(width, frameThickness, frameThickness), frameMat);
        bottomBeam.position.set(x, frameThickness/2, z);
        threeScene.add(bottomBeam);
        meshes.push(bottomBeam);
        
        // الألواح الزجاجية
        const glassWidth = width - frameThickness * 2;
        const glassHeight = height - frameThickness * 2;
        const glassPanel = new THREE.Mesh(new THREE.BoxGeometry(glassWidth, glassHeight, 0.02), glassMat);
        glassPanel.position.set(x, height/2, z);
        threeScene.add(glassPanel);
        meshes.push(glassPanel);
        
        // المباني العمودية (Mullions)
        const mullionCount = Math.floor(width / this.wallData.mullionSpacing);
        for (let i = 1; i <= mullionCount; i++) {
            const mullionX = x - width/2 + (i * this.wallData.mullionSpacing);
            const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, 0.08), frameMat);
            mullion.position.set(mullionX, height/2, z);
            threeScene.add(mullion);
            meshes.push(mullion);
        }
        
        // المباني الأفقية (Transoms)
        const transomCount = Math.floor(height / this.wallData.transomSpacing);
        for (let i = 1; i <= transomCount; i++) {
            const transomY = i * this.wallData.transomSpacing;
            const transom = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.08), frameMat);
            transom.position.set(x, transomY, z);
            threeScene.add(transom);
            meshes.push(transom);
        }
        
        return meshes;
    }
    
    // تحديث الأبعاد
    updateDimensions(width, height) {
        this.wallData.width = width;
        this.wallData.height = height;
        
        // إعادة بناء المشاهدات
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        
        // إعادة العرض (سيتم عند استدعاء render مرة أخرى)
        this.eventBus?.emit('curtainWall:dimensionsUpdated', {
            id: this.id,
            width,
            height
        });
    }
    
    // تحديث لون الإطار
    updateFrameColor(color) {
        this.wallData.frameColor = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData?.type !== 'glass') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('curtainWall:frameColorUpdated', { id: this.id, color });
    }
    
    // تحديث نوع الزجاج
    updateGlassType(glassType) {
        this.wallData.glassType = glassType;
        
        let glassColor = 0x88aaff;
        let opacity = 0.85;
        
        switch(glassType) {
            case 'clear':
                glassColor = 0xffffff;
                opacity = 0.9;
                break;
            case 'tinted':
                glassColor = 0x88aaff;
                opacity = 0.8;
                break;
            case 'reflective':
                glassColor = 0xaaccff;
                opacity = 0.7;
                break;
            case 'frosted':
                glassColor = 0xeeeeff;
                opacity = 0.6;
                break;
        }
        
        this.wallData.glassColor = glassColor;
        
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.geometry?.parameters?.depth === 0.02) {
                mesh.material.color.setHex(glassColor);
                mesh.material.opacity = opacity;
            }
        }
        
        this.eventBus?.emit('curtainWall:glassTypeUpdated', { id: this.id, glassType });
    }

    getTotalQuantities() {
        const totalArea = this.wallData.width * this.wallData.height * this.segments.length;
        
        return {
            id: this.id,
            type: 'واجهة زجاجية عالمية',
            width: this.wallData.width,
            height: this.wallData.height,
            glassType: this.wallData.glassType,
            totalSegments: this.segments.length,
            totalArea: totalArea.toFixed(2) + ' m²',
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير الواجهة الزجاجية العالمية
═══════════════════════════════════
🏢 المعرف: ${totals.id}
📏 العرض: ${totals.width} م
📐 الارتفاع: ${totals.height} م
🔍 نوع الزجاج: ${totals.glassType}
═══════════════════════════════════
📊 الإجماليات:
• المساحة الكلية: ${totals.totalArea}
• عدد الأجزاء: ${totals.totalSegments}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            
            // حذف الـ meshes المرتبطة (تبسيط: سيتم إعادة بناء الكل)
            for (const mesh of this.meshes) {
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            }
            this.meshes = [];
            
            this.eventBus?.emit('curtainWall:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ Curtain wall segment removed from scene ${removed.sceneId}`);
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
        this.eventBus?.emit('curtainWall:disposed', { id: this.id });
        console.log(`♻️ GlobalCurtainWall disposed: ${this.id}`);
    }
}

export default GlobalCurtainWall;