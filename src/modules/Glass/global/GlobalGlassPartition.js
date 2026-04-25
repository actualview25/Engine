// =======================================
// GLOBAL GLASS PARTITION - نسخة المحرك الجديد (متوقع)
// =======================================

import * as THREE from 'three';

export class GlobalGlassPartition {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.partitionData = {
            length: options.length || 3.0,
            height: options.height || 2.4,
            glassType: options.glassType || 'clear',
            glassThickness: options.glassThickness || 0.01,
            frameColor: options.frameColor || 0xcccccc,
            frameMaterial: options.frameMaterial || 'aluminum'
        };
        
        this.id = `glass_partition_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.meshes = [];
        
        if (this.eventBus) {
            this.eventBus.on('glassPartition:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('glassPartition:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('glassPartition:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                partitionData: this.partitionData
            });
        }
        
        console.log(`🔲 Glass partition created with ID: ${this.id}`);
        return this.id;
    }

    addInstance(sceneId, position) {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const instanceData = {
            id: `partition_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            partitionData: { ...this.partitionData },
            createdAt: Date.now()
        };

        this.instances.push(instanceData);
        
        if (this.eventBus) {
            this.eventBus.emit('glassPartition:instanceAdded', instanceData);
        }
        
        console.log(`🔲 Glass partition instance added at (${position.x}, ${position.z}) in scene ${sceneId}`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const mesh = this.renderInstance(instance, threeScene);
            if (mesh) this.meshes.push(mesh);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('glassPartition:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const group = new THREE.Group();
        const pos = instance.position;
        const data = instance.partitionData;
        
        const frameMat = new THREE.MeshStandardMaterial({ 
            color: data.frameColor, 
            metalness: 0.7, 
            roughness: 0.3 
        });
        
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        
        // الإطار السفلي
        const base = new THREE.Mesh(new THREE.BoxGeometry(data.length, 0.05, 0.1), frameMat);
        base.position.y = 0.025;
        group.add(base);
        
        // الأعمدة الجانبية
        const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.05, data.height, 0.1), frameMat);
        leftPost.position.set(-data.length/2 + 0.025, data.height/2, 0);
        group.add(leftPost);
        
        const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.05, data.height, 0.1), frameMat);
        rightPost.position.set(data.length/2 - 0.025, data.height/2, 0);
        group.add(rightPost);
        
        // الإطار العلوي
        const top = new THREE.Mesh(new THREE.BoxGeometry(data.length, 0.05, 0.1), frameMat);
        top.position.y = data.height - 0.025;
        group.add(top);
        
        // الألواح الزجاجية
        const panelCount = Math.max(1, Math.floor(data.length / 1.0));
        const panelWidth = data.length / panelCount;
        
        for (let i = 0; i < panelCount; i++) {
            const x = (i + 0.5) * panelWidth - data.length/2;
            const panel = new THREE.Mesh(
                new THREE.BoxGeometry(panelWidth - 0.04, data.height - 0.04, data.glassThickness),
                glassMat
            );
            panel.position.set(x, data.height/2, 0);
            group.add(panel);
        }
        
        group.position.set(pos.x, pos.y, pos.z);
        group.userData = { type: 'glass_partition', partitionId: this.id };
        
        threeScene.add(group);
        return group;
    }
    
    updateDimensions(length, height) {
        this.partitionData.length = length;
        this.partitionData.height = height;
        
        for (const instance of this.instances) {
            instance.partitionData.length = length;
            instance.partitionData.height = height;
        }
        
        this.eventBus?.emit('glassPartition:dimensionsUpdated', { id: this.id, length, height });
        console.log(`🔲 Glass partition dimensions updated: ${length} x ${height}`);
    }
    
    updateGlassType(glassType) {
        this.partitionData.glassType = glassType;
        
        for (const instance of this.instances) {
            instance.partitionData.glassType = glassType;
        }
        
        this.eventBus?.emit('glassPartition:glassTypeUpdated', { id: this.id, glassType });
    }
    
    updateFrameColor(color) {
        this.partitionData.frameColor = color;
        
        for (const instance of this.instances) {
            instance.partitionData.frameColor = color;
        }
        
        for (const mesh of this.meshes) {
            mesh.traverse(child => {
                if (child.isMesh && child.material?.color) {
                    if (child.geometry.parameters?.depth === 0.1) {
                        child.material.color.setHex(color);
                    }
                }
            });
        }
        
        this.eventBus?.emit('glassPartition:frameColorUpdated', { id: this.id, color });
    }

    getTotalQuantities() {
        return {
            id: this.id,
            length: this.partitionData.length,
            height: this.partitionData.height,
            glassType: this.partitionData.glassType,
            totalArea: (this.partitionData.length * this.partitionData.height * this.instances.length).toFixed(2),
            totalInstances: this.instances.length,
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            createdAt: this.instances[0]?.createdAt || null
        };
    }
    
    generateReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير الفواصل الزجاجية العالمية
═══════════════════════════════════
🔲 المعرف: ${totals.id}
📏 الأبعاد: ${totals.length} × ${totals.height} م
🔍 نوع الزجاج: ${totals.glassType}
═══════════════════════════════════
📊 الإجماليات:
• المساحة الكلية: ${totals.totalArea} م²
• عدد الفواصل: ${totals.totalInstances}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            
            const meshIndex = this.meshes.findIndex(m => m.userData.instanceId === instanceId);
            if (meshIndex !== -1) {
                const mesh = this.meshes[meshIndex];
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('glassPartition:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Glass partition instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }
    
    dispose() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            mesh.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
        }
        this.meshes = [];
        this.instances = [];
        this.eventBus?.emit('glassPartition:disposed', { id: this.id });
        console.log(`♻️ GlobalGlassPartition disposed: ${this.id}`);
    }
}

export default GlobalGlassPartition;