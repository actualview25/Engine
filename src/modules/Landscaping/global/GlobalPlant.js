// =======================================
// GLOBAL PLANT - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalPlant {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.plantData = {
            type: options.type || 'shrub', // shrub, tree, flower, grass
            species: options.species || 'generic',
            height: options.height || 0.5,
            width: options.width || 0.4,
            color: options.color || 0x44aa44,
            density: options.density || 0.8,
            leafColor: options.leafColor || 0x44aa44,
            trunkColor: options.trunkColor || 0x8B4513,
            flowerColor: options.flowerColor || 0xff88aa,
            seasonal: options.seasonal || false,
            currentSeason: options.currentSeason || 'summer'
        };
        
        this.id = `plant_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.meshes = [];
        this.totalCount = 0;
        
        if (this.eventBus) {
            this.eventBus.on('plant:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('plant:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('plant:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                plantData: this.plantData
            });
        }
        
        console.log(`🌱 Plant created with ID: ${this.id}`);
        return this.id;
    }

    addInstance(sceneId, position) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const instanceData = {
            id: `plant_instance_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            plantData: { ...this.plantData },
            createdAt: Date.now()
        };

        this.instances.push(instanceData);
        this.totalCount++;
        
        if (this.eventBus) {
            this.eventBus.emit('plant:instanceAdded', instanceData);
        }
        
        console.log(`🌱 Plant added at (${position.x}, ${position.z}) in scene ${sceneId}`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const mesh = this.renderInstance(instance, threeScene);
            if (mesh) this.meshes.push(mesh);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('plant:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const pos = instance.position;
        const data = instance.plantData;
        
        const group = new THREE.Group();
        
        if (data.type === 'shrub') {
            // شجيرة - كرة خضراء
            const foliageMat = new THREE.MeshStandardMaterial({ color: data.leafColor, roughness: 0.6 });
            const foliage = new THREE.Mesh(new THREE.SphereGeometry(data.width / 2, 8, 8), foliageMat);
            foliage.position.y = data.height / 2;
            group.add(foliage);
            
        } else if (data.type === 'tree') {
            // شجرة - جذع + تاج
            const trunkMat = new THREE.MeshStandardMaterial({ color: data.trunkColor, roughness: 0.7 });
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(data.width / 4, data.width / 3, data.height * 0.6, 6), trunkMat);
            trunk.position.y = data.height * 0.3;
            group.add(trunk);
            
            const foliageMat = new THREE.MeshStandardMaterial({ color: data.leafColor, roughness: 0.5 });
            const foliage = new THREE.Mesh(new THREE.ConeGeometry(data.width / 1.5, data.height * 0.5, 8), foliageMat);
            foliage.position.y = data.height * 0.6;
            group.add(foliage);
            
        } else if (data.type === 'flower') {
            // زهرة
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.5 });
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, data.height, 4), stemMat);
            stem.position.y = data.height / 2;
            group.add(stem);
            
            const flowerMat = new THREE.MeshStandardMaterial({ color: data.flowerColor, roughness: 0.3 });
            const flower = new THREE.Mesh(new THREE.SphereGeometry(data.width / 2, 8, 8), flowerMat);
            flower.position.y = data.height;
            group.add(flower);
            
        } else if (data.type === 'grass') {
            // عشب - مجموعة من المستطيلات الرفيعة
            const grassMat = new THREE.MeshStandardMaterial({ color: data.leafColor, roughness: 0.8 });
            const bladeCount = 5;
            for (let i = 0; i < bladeCount; i++) {
                const angle = (i / bladeCount) * Math.PI * 2;
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, data.height, 0.02), grassMat);
                blade.position.x = Math.cos(angle) * data.width / 2;
                blade.position.z = Math.sin(angle) * data.width / 2;
                blade.position.y = data.height / 2;
                blade.rotation.z = angle;
                group.add(blade);
            }
        }
        
        group.position.set(pos.x, pos.y, pos.z);
        group.userData = { type: 'plant', plantId: this.id, instanceId: instance.id };
        
        threeScene.add(group);
        return group;
    }
    
    // نقل النبات بين المشاهد
    moveToScene(instanceId, targetSceneId, newPosition) {
        const instance = this.instances.find(i => i.id === instanceId);
        if (!instance) return false;

        // إزالة من المشهد القديم
        const oldSceneId = instance.sceneId;
        instance.sceneId = targetSceneId;
        
        // تحديث الموقع
        let newGlobalPos = { ...newPosition };
        if (this.geoReferencing) {
            newGlobalPos = this.geoReferencing.localToWorld(newPosition);
        }
        instance.position = newGlobalPos;
        instance.localPosition = newPosition;
        
        if (this.eventBus) {
            this.eventBus.emit('plant:moved', {
                id: this.id,
                instanceId,
                fromScene: oldSceneId,
                toScene: targetSceneId,
                newPosition
            });
        }
        
        console.log(`🌱 Plant moved from scene ${oldSceneId} to ${targetSceneId}`);
        return true;
    }
    
    // تكرار النبات في مشاهد متعددة
    duplicateToScenes(sceneIds, basePosition, spacing = 2.0) {
        const duplicates = [];
        
        sceneIds.forEach((sceneId, index) => {
            const offset = {
                x: basePosition.x + (index * spacing),
                y: basePosition.y,
                z: basePosition.z
            };
            
            const dup = this.addInstance(sceneId, offset);
            duplicates.push(dup);
        });
        
        console.log(`🌱 Plant duplicated to ${duplicates.length} scenes`);
        return duplicates;
    }
    
    // تحديث خصائص النبات
    updateProperties(newData) {
        this.plantData = { ...this.plantData, ...newData };
        
        // تحديث كل النسخ
        for (const instance of this.instances) {
            instance.plantData = { ...this.plantData };
        }
        
        // تحديث المشاهدات
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        
        this.eventBus?.emit('plant:propertiesUpdated', { id: this.id, plantData: this.plantData });
        console.log(`🌱 Plant properties updated`);
    }
    
    // تحديث حسب الفصل
    updateSeason(season) {
        this.plantData.currentSeason = season;
        
        let leafColor = this.plantData.leafColor;
        let height = this.plantData.height;
        
        switch(season) {
            case 'spring':
                leafColor = 0x88ff88;
                break;
            case 'summer':
                leafColor = 0x44aa44;
                break;
            case 'autumn':
                leafColor = 0xffaa44;
                height = this.plantData.height * 0.9;
                break;
            case 'winter':
                leafColor = 0x886666;
                height = this.plantData.height * 0.7;
                break;
        }
        
        this.updateProperties({ leafColor, height });
        
        this.eventBus?.emit('plant:seasonUpdated', { id: this.id, season });
        console.log(`🌱 Plant season updated to: ${season}`);
    }
    
    // حذف نسخة معينة
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            this.totalCount--;
            
            // حذف الـ mesh المرتبط
            const meshIndex = this.meshes.findIndex(m => m.userData.instanceId === instanceId);
            if (meshIndex !== -1) {
                const mesh = this.meshes[meshIndex];
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('plant:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Plant instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }

    getStats() {
        return {
            id: this.id,
            totalInstances: this.totalCount,
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            species: this.plantData.species,
            type: this.plantData.type,
            averageHeight: this.plantData.height,
            distribution: this.instances.reduce((acc, i) => {
                acc[i.sceneId] = (acc[i.sceneId] || 0) + 1;
                return acc;
            }, {})
        };
    }

    generateGlobalReport() {
        const stats = this.getStats();
        
        const typeNames = {
            shrub: 'شجيرة',
            tree: 'شجرة',
            flower: 'زهرة',
            grass: 'عشب'
        };
        
        let distributionText = '';
        for (const [sceneId, count] of Object.entries(stats.distribution)) {
            distributionText += `  • المشهد ${sceneId}: ${count} نبتة\n`;
        }
        
        return `
📋 تقرير النباتات العالمية
═══════════════════════════════════
🌱 المعرف: ${this.id}
🌿 النوع: ${typeNames[this.plantData.type] || this.plantData.type}
🌻 النوع النباتي: ${this.plantData.species}
📏 الارتفاع: ${this.plantData.height} م
🎨 اللون: #${this.plantData.leafColor.toString(16)}
═══════════════════════════════════
📊 الإجماليات:
• عدد النباتات: ${stats.totalInstances}
• المشاهد: ${stats.scenes.length}
═══════════════════════════════════
📍 التوزيع:
${distributionText}
═══════════════════════════════════
        `;
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
        this.totalCount = 0;
        this.eventBus?.emit('plant:disposed', { id: this.id });
        console.log(`♻️ GlobalPlant disposed: ${this.id}`);
    }
}

export default GlobalPlant;