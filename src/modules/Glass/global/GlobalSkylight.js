// =======================================
// GLOBAL SKYLIGHT - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalSkylight {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.skylightData = {
            shape: options.shape || 'rectangular', // rectangular, circular, dome
            width: options.width || 2.0,
            length: options.length || 3.0,
            radius: options.radius || 1.5,
            glassType: options.glassType || 'clear',
            glassThickness: options.glassThickness || 0.01,
            frameColor: options.frameColor || 0xcccccc,
            glassColor: options.glassColor || 0xffffff,
            transparency: options.transparency || 0.85,
            height: options.height || 0.5 // for dome skylight
        };
        
        this.id = `skylight_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.meshes = [];
        
        if (this.eventBus) {
            this.eventBus.on('skylight:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('skylight:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('skylight:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                skylightData: this.skylightData
            });
        }
        
        console.log(`☀️ Skylight created with ID: ${this.id}`);
        return this.id;
    }

    addInstance(sceneId, position) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const instanceData = {
            id: `skylight_instance_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            skylightData: { ...this.skylightData },
            createdAt: Date.now()
        };

        this.instances.push(instanceData);
        
        if (this.eventBus) {
            this.eventBus.emit('skylight:instanceAdded', instanceData);
        }
        
        console.log(`☀️ Skylight instance added at (${position.x}, ${position.z}) in scene ${sceneId}`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const meshes = this.renderInstance(instance, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('skylight:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const meshes = [];
        const pos = instance.position;
        const data = instance.skylightData;
        
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: data.glassColor,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: data.transparency,
            clearcoat: 1,
            side: THREE.DoubleSide
        });
        
        const frameMat = new THREE.MeshStandardMaterial({
            color: data.frameColor,
            metalness: 0.7,
            roughness: 0.3
        });
        
        if (data.shape === 'rectangular') {
            const width = data.width;
            const length = data.length;
            const glassThickness = data.glassThickness;
            const frameThickness = 0.05;
            
            // الإطار الخارجي
            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(width + frameThickness * 2, 0.02, length + frameThickness * 2),
                frameMat
            );
            frame.position.set(pos.x, pos.y, pos.z);
            threeScene.add(frame);
            meshes.push(frame);
            
            // الزجاج
            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(width, glassThickness, length),
                glassMat
            );
            glass.position.set(pos.x, pos.y + 0.02, pos.z);
            threeScene.add(glass);
            meshes.push(glass);
            
        } else if (data.shape === 'circular') {
            const radius = data.radius;
            const glassThickness = data.glassThickness;
            const frameThickness = 0.05;
            
            // الإطار الدائري
            const frameRing = new THREE.Mesh(
                new THREE.TorusGeometry(radius + frameThickness, 0.05, 32, 64),
                frameMat
            );
            frameRing.rotation.x = Math.PI / 2;
            frameRing.position.set(pos.x, pos.y, pos.z);
            threeScene.add(frameRing);
            meshes.push(frameRing);
            
            // الزجاج الدائري
            const glassCircle = new THREE.Mesh(
                new THREE.CylinderGeometry(radius, radius, glassThickness, 32, 1),
                glassMat
            );
            glassCircle.position.set(pos.x, pos.y + 0.02, pos.z);
            threeScene.add(glassCircle);
            meshes.push(glassCircle);
            
        } else if (data.shape === 'dome') {
            const radius = data.radius;
            const height = data.height;
            
            // القبة الزجاجية
            const domeGeometry = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3);
            const dome = new THREE.Mesh(domeGeometry, glassMat);
            dome.position.set(pos.x, pos.y + height / 2, pos.z);
            threeScene.add(dome);
            meshes.push(dome);
            
            // القاعدة
            const base = new THREE.Mesh(
                new THREE.TorusGeometry(radius, 0.08, 16, 64),
                frameMat
            );
            base.rotation.x = Math.PI / 2;
            base.position.set(pos.x, pos.y, pos.z);
            threeScene.add(base);
            meshes.push(base);
        }
        
        return meshes;
    }
    
    // تحديث نوع الزجاج
    updateGlassType(glassType) {
        this.skylightData.glassType = glassType;
        
        let glassColor = 0xffffff;
        let transparency = 0.85;
        
        switch(glassType) {
            case 'clear':
                glassColor = 0xffffff;
                transparency = 0.9;
                break;
            case 'tinted':
                glassColor = 0x88aaff;
                transparency = 0.8;
                break;
            case 'reflective':
                glassColor = 0xaaccff;
                transparency = 0.7;
                break;
            case 'frosted':
                glassColor = 0xeeeeff;
                transparency = 0.6;
                break;
        }
        
        this.skylightData.glassColor = glassColor;
        this.skylightData.transparency = transparency;
        
        for (const instance of this.instances) {
            instance.skylightData.glassType = glassType;
            instance.skylightData.glassColor = glassColor;
            instance.skylightData.transparency = transparency;
        }
        
        // تحديث المشاهدات
        for (const mesh of this.meshes) {
            if (mesh.material && (mesh.userData?.type === 'skylight_glass' || mesh.geometry?.type === 'BoxGeometry')) {
                mesh.material.color.setHex(glassColor);
                mesh.material.opacity = transparency;
            }
        }
        
        this.eventBus?.emit('skylight:glassTypeUpdated', { id: this.id, glassType });
        console.log(`☀️ Skylight glass type updated to: ${glassType}`);
    }
    
    // تحديث الأبعاد
    updateDimensions(width, length = null) {
        this.skylightData.width = width;
        if (length !== null) this.skylightData.length = length;
        
        for (const instance of this.instances) {
            instance.skylightData.width = width;
            if (length !== null) instance.skylightData.length = length;
        }
        
        this.eventBus?.emit('skylight:dimensionsUpdated', {
            id: this.id,
            width,
            length: this.skylightData.length
        });
        
        console.log(`☀️ Skylight dimensions updated: ${width} x ${this.skylightData.length}`);
    }
    
    // تحديث لون الإطار
    updateFrameColor(color) {
        this.skylightData.frameColor = color;
        
        for (const instance of this.instances) {
            instance.skylightData.frameColor = color;
        }
        
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData?.type !== 'skylight_glass') {
                mesh.material.color.setHex(color);
            }
        }
        
        this.eventBus?.emit('skylight:frameColorUpdated', { id: this.id, color });
    }
    
    // حذف نسخة معينة
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            
            // حذف الـ meshes المرتبطة (تبسيط)
            for (const mesh of this.meshes) {
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            }
            this.meshes = [];
            
            // إعادة بناء المتبقي
            const remainingScenes = [...new Set(this.instances.map(i => i.sceneId))];
            for (const sceneId of remainingScenes) {
                // سيتم إعادة العرض عند استدعاء render مرة أخرى
            }
            
            this.eventBus?.emit('skylight:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Skylight instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }

    getTotalQuantities() {
        return {
            id: this.id,
            shape: this.skylightData.shape,
            glassType: this.skylightData.glassType,
            width: this.skylightData.width,
            length: this.skylightData.length,
            radius: this.skylightData.radius,
            totalInstances: this.instances.length,
            totalArea: this.calculateTotalArea(),
            distribution: this.instances.reduce((acc, i) => {
                acc[i.sceneId] = (acc[i.sceneId] || 0) + 1;
                return acc;
            }, {}),
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            createdAt: this.instances[0]?.createdAt || null
        };
    }
    
    calculateTotalArea() {
        let total = 0;
        for (const instance of this.instances) {
            if (this.skylightData.shape === 'rectangular') {
                total += this.skylightData.width * this.skylightData.length;
            } else if (this.skylightData.shape === 'circular') {
                total += Math.PI * Math.pow(this.skylightData.radius, 2);
            }
        }
        return total.toFixed(2);
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        let shapeText = '';
        if (totals.shape === 'rectangular') {
            shapeText = `مستطيل (${totals.width} × ${totals.length} م)`;
        } else if (totals.shape === 'circular') {
            shapeText = `دائري (قطر ${totals.radius * 2} م)`;
        } else if (totals.shape === 'dome') {
            shapeText = `قبة (ارتفاع ${this.skylightData.height} م)`;
        }
        
        let distributionText = '';
        for (const [sceneId, count] of Object.entries(totals.distribution)) {
            distributionText += `  • المشهد ${sceneId}: ${count} منور\n`;
        }
        
        return `
📋 تقرير المناور العالمية (Skylight)
═══════════════════════════════════
☀️ المعرف: ${totals.id}
📐 الشكل: ${shapeText}
🔍 نوع الزجاج: ${totals.glassType}
═══════════════════════════════════
📊 الإجماليات:
• عدد المناور: ${totals.totalInstances}
• المساحة الكلية: ${totals.totalArea} م²
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
📍 التوزيع:
${distributionText}
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
        this.instances = [];
        this.eventBus?.emit('skylight:disposed', { id: this.id });
        console.log(`♻️ GlobalSkylight disposed: ${this.id}`);
    }
}

export default GlobalSkylight;