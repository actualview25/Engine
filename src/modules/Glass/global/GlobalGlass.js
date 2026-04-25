// =======================================
// GLOBAL GLASS - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalGlass {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.glassData = {
            type: options.type || 'clear',
            thickness: options.thickness || 0.01,
            transparency: options.transparency || 0.8,
            reflectivity: options.reflectivity || 0.2,
            tint: options.tint || 0xffffff,
            color: options.color || 0xffffff,
            metalness: 0.9,
            roughness: 0.1
        };
        
        this.id = `glass_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.windows = [];
        this.curtainWalls = [];
        this.meshes = [];
        
        if (this.eventBus) {
            this.eventBus.on('glass:create', (data) => this.create(data.position, data.sceneId, data.dimensions));
            this.eventBus.on('glass:render', (data) => this.renderInScene(data.sceneId, data.scene));
            this.eventBus.on('glass:setTransparency', (data) => this.setGlobalTransparency(data.value));
        }
    }

    create(position, sceneId = null, dimensions = { width: 1.0, height: 1.0 }) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position, dimensions);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('glass:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                dimensions: dimensions,
                glassData: this.glassData
            });
        }
        
        console.log(`🔮 Glass created with ID: ${this.id}`);
        return this.id;
    }

    addInstance(sceneId, position, dimensions) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const instanceData = {
            id: `glass_instance_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            dimensions: { ...dimensions },
            glassData: { ...this.glassData },
            createdAt: Date.now()
        };

        this.instances.push(instanceData);
        
        if (this.eventBus) {
            this.eventBus.emit('glass:instanceAdded', instanceData);
        }
        
        console.log(`🔮 Glass instance added at (${position.x}, ${position.z}) in scene ${sceneId}`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const mesh = this.renderInstance(instance, threeScene);
            if (mesh) this.meshes.push(mesh);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('glass:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const material = new THREE.MeshPhysicalMaterial({
            color: instance.glassData.tint || instance.glassData.color,
            metalness: instance.glassData.metalness,
            roughness: instance.glassData.roughness,
            transparent: true,
            opacity: instance.glassData.transparency,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            reflectivity: instance.glassData.reflectivity,
            side: THREE.DoubleSide
        });
        
        const geometry = new THREE.BoxGeometry(
            instance.dimensions.width,
            instance.dimensions.height,
            instance.glassData.thickness
        );
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(instance.position.x, instance.position.y, instance.position.z);
        mesh.userData = { 
            type: 'glass', 
            glassId: this.id, 
            instanceId: instance.id,
            glassType: instance.glassData.type
        };
        
        threeScene.add(mesh);
        return mesh;
    }

    // إنشاء واجهة زجاجية متصلة عبر مشاهد
    createConnectedCurtainWall(sceneIds, path, options = {}) {
        if (!this.nodeSystem) {
            console.warn('NodeSystem required for connected curtain wall');
            return null;
        }
        
        const wallId = `curtain_${Date.now()}`;
        const segments = [];

        for (let i = 0; i < sceneIds.length; i++) {
            const sceneId = sceneIds[i];
            const startPoint = path[i];
            const endPoint = path[i + 1] || path[i];
            
            const length = this.calculateDistance(startPoint, endPoint);
            const panelWidth = options.panelWidth || 1.5;
            const panelCount = Math.max(1, Math.floor(length / panelWidth));

            const segment = {
                id: `segment_${Date.now()}_${segments.length}`,
                sceneId,
                startPoint,
                endPoint,
                panelCount,
                panels: []
            };

            for (let j = 0; j < panelCount; j++) {
                const t = (j + 0.5) / panelCount;
                const pos = {
                    x: startPoint.x + (endPoint.x - startPoint.x) * t,
                    y: (startPoint.y + options.height || 3.0) / 2,
                    z: startPoint.z + (endPoint.z - startPoint.z) * t
                };

                const panel = this.addInstance(sceneId, pos, {
                    width: panelWidth,
                    height: options.height || 3.0
                });
                segment.panels.push(panel);
            }

            // ربط مع المشهد التالي
            if (i < sceneIds.length - 1 && this.eventBus) {
                this.eventBus.emit('scene:link', {
                    fromSceneId: sceneId,
                    toSceneId: sceneIds[i + 1],
                    position: endPoint,
                    type: 'glass_connection'
                });
            }

            segments.push(segment);
        }

        const curtainWall = {
            id: wallId,
            segments,
            totalPanels: segments.reduce((sum, s) => sum + s.panelCount, 0),
            createdAt: Date.now()
        };
        
        this.curtainWalls.push(curtainWall);
        
        this.eventBus?.emit('glass:curtainWallCreated', curtainWall);
        
        console.log(`🏢 Connected curtain wall created: ${wallId}, total panels: ${curtainWall.totalPanels}`);
        return wallId;
    }

    // إنشاء نافذة تربط مشهدين
    createConnectingWindow(sceneId1, sceneId2, position, size) {
        const windowId = `window_${Date.now()}`;
        
        // إنشاء النافذة في كلا المشهدين
        const window1 = this.addInstance(sceneId1, position, size);
        const window2 = this.addInstance(sceneId2, position, size);

        // ربط المشهدين عبر النافذة
        this.eventBus?.emit('scene:link', {
            fromSceneId: sceneId1,
            toSceneId: sceneId2,
            position: position,
            type: 'window',
            windowId: windowId
        });

        const windowData = {
            id: windowId,
            scenes: [sceneId1, sceneId2],
            position,
            size,
            instances: [window1, window2],
            createdAt: Date.now()
        };
        
        this.windows.push(windowData);
        
        this.eventBus?.emit('glass:connectingWindowCreated', windowData);
        
        console.log(`🪟 Connecting window created between scenes ${sceneId1} and ${sceneId2}`);
        return windowId;
    }

    calculateDistance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
    }

    // تغيير شفافية الزجاج عبر جميع النسخ
    setGlobalTransparency(value) {
        this.glassData.transparency = Math.min(1, Math.max(0, value));
        
        for (const instance of this.instances) {
            instance.glassData.transparency = this.glassData.transparency;
        }
        
        // تحديث المشاهدات
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'glass') {
                mesh.material.opacity = this.glassData.transparency;
            }
        }
        
        this.eventBus?.emit('glass:transparencyUpdated', {
            id: this.id,
            transparency: this.glassData.transparency
        });
        
        console.log(`🔮 Global glass transparency set to: ${this.glassData.transparency}`);
    }
    
    // تغيير نوع الزجاج
    setGlassType(type) {
        this.glassData.type = type;
        
        let tint = 0xffffff;
        let transparency = 0.8;
        let reflectivity = 0.2;
        
        switch(type) {
            case 'clear':
                tint = 0xffffff;
                transparency = 0.9;
                reflectivity = 0.1;
                break;
            case 'tinted':
                tint = 0x88aaff;
                transparency = 0.8;
                reflectivity = 0.2;
                break;
            case 'reflective':
                tint = 0xaaccff;
                transparency = 0.7;
                reflectivity = 0.5;
                break;
            case 'frosted':
                tint = 0xeeeeff;
                transparency = 0.6;
                reflectivity = 0.15;
                break;
            case 'smart':
                tint = 0xffffaa;
                transparency = 0.5;
                reflectivity = 0.3;
                break;
        }
        
        this.glassData.tint = tint;
        this.glassData.transparency = transparency;
        this.glassData.reflectivity = reflectivity;
        
        for (const instance of this.instances) {
            instance.glassData.type = type;
            instance.glassData.tint = tint;
            instance.glassData.transparency = transparency;
            instance.glassData.reflectivity = reflectivity;
        }
        
        // تحديث المشاهدات
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'glass') {
                mesh.material.color.setHex(tint);
                mesh.material.opacity = transparency;
                mesh.material.reflectivity = reflectivity;
            }
        }
        
        this.eventBus?.emit('glass:typeUpdated', { id: this.id, type });
        console.log(`🔮 Glass type updated to: ${type}`);
    }

    // حذف نسخة معينة
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            
            // حذف الـ mesh المرتبط
            const meshIndex = this.meshes.findIndex(m => m.userData.instanceId === instanceId);
            if (meshIndex !== -1) {
                const mesh = this.meshes[meshIndex];
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('glass:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Glass instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }

    getTotalQuantities() {
        return {
            id: this.id,
            glassType: this.glassData.type,
            thickness: this.glassData.thickness,
            transparency: this.glassData.transparency,
            totalInstances: this.instances.length,
            windows: this.windows.length,
            curtainWalls: this.curtainWalls.length,
            totalArea: this.calculateTotalArea(),
            distribution: this.instances.reduce((acc, i) => {
                acc[i.sceneId] = (acc[i.sceneId] || 0) + 1;
                return acc;
            }, {}),
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            specifications: this.glassData,
            createdAt: this.instances[0]?.createdAt || null
        };
    }
    
    calculateTotalArea() {
        let total = 0;
        for (const instance of this.instances) {
            total += instance.dimensions.width * instance.dimensions.height;
        }
        return total.toFixed(2);
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        let distributionText = '';
        for (const [sceneId, count] of Object.entries(totals.distribution)) {
            distributionText += `  • المشهد ${sceneId}: ${count} قطعة\n`;
        }
        
        return `
📋 تقرير الزجاج العالمي
═══════════════════════════════════
🔮 المعرف: ${totals.id}
🔍 نوع الزجاج: ${totals.glassType}
📏 السمك: ${totals.thickness} م
🔆 الشفافية: ${(totals.transparency * 100)}%
═══════════════════════════════════
📊 الإجماليات:
• عدد القطع: ${totals.totalInstances}
• المساحة الكلية: ${totals.totalArea} م²
• النوافذ الرابطة: ${totals.windows}
• الواجهات المتصلة: ${totals.curtainWalls}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
📍 التوزيع:
${distributionText}
═══════════════════════════════════
        `;
    }
    
    dispose() {
        // تنظيف جميع الـ meshes
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        this.instances = [];
        this.windows = [];
        this.curtainWalls = [];
        
        this.eventBus?.emit('glass:disposed', { id: this.id });
        console.log(`♻️ GlobalGlass disposed: ${this.id}`);
    }
}

export default GlobalGlass;