// =======================================
// GLOBAL TREE - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalTree {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.treeData = {
            type: options.type || 'oak', // oak, pine, palm, cherry, apple
            height: options.height || 5.0,
            trunkDiameter: options.trunkDiameter || 0.3,
            canopySize: options.canopySize || 3.0,
            age: options.age || 5,
            leafColor: options.leafColor || 0x44aa44,
            trunkColor: options.trunkColor || 0x8B4513,
            hasFruits: options.hasFruits || false,
            fruitColor: options.fruitColor || 0xff4444
        };
        
        this.id = `tree_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.meshes = [];
        this.forestGroups = new Map();
        this.totalCount = 0;
        
        if (this.eventBus) {
            this.eventBus.on('tree:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('tree:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('tree:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                treeData: this.treeData
            });
        }
        
        console.log(`🌳 Tree created with ID: ${this.id}`);
        return this.id;
    }

    addInstance(sceneId, position) {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const instanceData = {
            id: `tree_instance_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            treeData: { ...this.treeData },
            growthStage: this.getGrowthStage(),
            plantedAt: Date.now(),
            createdAt: Date.now()
        };

        this.instances.push(instanceData);
        this.totalCount++;
        
        if (this.eventBus) {
            this.eventBus.emit('tree:instanceAdded', instanceData);
        }
        
        console.log(`🌳 Tree added at (${position.x}, ${position.z}) in scene ${sceneId}`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const mesh = this.renderInstance(instance, threeScene);
            if (mesh) this.meshes.push(mesh);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('tree:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const pos = instance.position;
        const data = instance.treeData;
        const group = new THREE.Group();
        
        const trunkMat = new THREE.MeshStandardMaterial({ color: data.trunkColor, roughness: 0.7 });
        const foliageMat = new THREE.MeshStandardMaterial({ color: data.leafColor, roughness: 0.5 });
        
        // الجذع
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(data.trunkDiameter / 1.5, data.trunkDiameter, data.height * 0.6, 8),
            trunkMat
        );
        trunk.position.y = data.height * 0.3;
        group.add(trunk);
        
        if (data.type === 'oak') {
            // تاج شجرة البلوط - كروي
            const foliage = new THREE.Mesh(
                new THREE.SphereGeometry(data.canopySize / 1.5, 16, 16),
                foliageMat
            );
            foliage.position.y = data.height * 0.7;
            group.add(foliage);
            
        } else if (data.type === 'pine') {
            // شجرة صنوبر - مخروطية
            const foliage1 = new THREE.Mesh(
                new THREE.ConeGeometry(data.canopySize / 1.2, data.height * 0.3, 8),
                foliageMat
            );
            foliage1.position.y = data.height * 0.5;
            group.add(foliage1);
            
            const foliage2 = new THREE.Mesh(
                new THREE.ConeGeometry(data.canopySize / 1.4, data.height * 0.25, 8),
                foliageMat
            );
            foliage2.position.y = data.height * 0.7;
            group.add(foliage2);
            
            const foliage3 = new THREE.Mesh(
                new THREE.ConeGeometry(data.canopySize / 1.6, data.height * 0.2, 8),
                foliageMat
            );
            foliage3.position.y = data.height * 0.85;
            group.add(foliage3);
            
        } else if (data.type === 'palm') {
            // نخلة
            const trunkPalm = new THREE.Mesh(
                new THREE.CylinderGeometry(data.trunkDiameter / 2, data.trunkDiameter, data.height * 0.8, 8),
                trunkMat
            );
            trunkPalm.position.y = data.height * 0.4;
            group.add(trunkPalm);
            
            // أوراق النخلة
            const leafCount = 8;
            for (let i = 0; i < leafCount; i++) {
                const angle = (i / leafCount) * Math.PI * 2;
                const leaf = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.05, 0.1, data.canopySize, 4),
                    foliageMat
                );
                leaf.position.y = data.height * 0.85;
                leaf.rotation.z = angle;
                leaf.rotation.x = Math.PI / 3;
                group.add(leaf);
            }
            
        } else if (data.type === 'cherry' || data.type === 'apple') {
            // شجرة فاكهة
            const foliage = new THREE.Mesh(
                new THREE.SphereGeometry(data.canopySize / 1.3, 16, 16),
                foliageMat
            );
            foliage.position.y = data.height * 0.65;
            group.add(foliage);
            
            // ثمار
            if (data.hasFruits) {
                const fruitMat = new THREE.MeshStandardMaterial({ color: data.fruitColor, roughness: 0.3 });
                const fruitCount = 12;
                for (let i = 0; i < fruitCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = data.canopySize / 2 * Math.random();
                    const fruit = new THREE.Mesh(
                        new THREE.SphereGeometry(0.1, 8, 8),
                        fruitMat
                    );
                    fruit.position.x = Math.cos(angle) * radius;
                    fruit.position.z = Math.sin(angle) * radius;
                    fruit.position.y = data.height * 0.5 + Math.random() * data.height * 0.3;
                    group.add(fruit);
                }
            }
        }
        
        group.position.set(pos.x, pos.y, pos.z);
        group.userData = { type: 'tree', treeId: this.id, instanceId: instance.id, treeType: data.type };
        
        threeScene.add(group);
        return group;
    }
    
    // إنشاء غابة (مجموعة أشجار)
    createForest(sceneId, center, radius, count, pattern = 'random') {
        const forestId = `forest_${Date.now()}`;
        const trees = [];

        for (let i = 0; i < count; i++) {
            let position;
            
            if (pattern === 'grid') {
                const gridSize = Math.ceil(Math.sqrt(count));
                const row = Math.floor(i / gridSize);
                const col = i % gridSize;
                const spacing = (radius * 2) / gridSize;
                position = {
                    x: center.x + (col - gridSize/2) * spacing,
                    y: center.y,
                    z: center.z + (row - gridSize/2) * spacing
                };
            } else {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * radius;
                position = {
                    x: center.x + Math.cos(angle) * distance,
                    y: center.y,
                    z: center.z + Math.sin(angle) * distance
                };
            }

            const tree = this.addInstance(sceneId, position);
            trees.push(tree);
        }

        const forestData = {
            id: forestId,
            sceneId,
            center,
            radius,
            count,
            pattern,
            trees,
            createdAt: Date.now()
        };
        
        this.forestGroups.set(forestId, forestData);
        
        this.eventBus?.emit('tree:forestCreated', forestData);
        
        console.log(`🌲 Forest created: ${forestId}, ${count} trees, pattern: ${pattern}`);
        return forestId;
    }
    
    // ربط الأشجار بمشاهد مختلفة
    connectTreesAcrossScenes(treeIds, connectionType = 'path') {
        const connections = [];
        
        for (let i = 0; i < treeIds.length - 1; i++) {
            const tree1 = this.instances.find(t => t.id === treeIds[i]);
            const tree2 = this.instances.find(t => t.id === treeIds[i + 1]);
            
            if (tree1 && tree2 && this.eventBus) {
                this.eventBus.emit('scene:link', {
                    fromSceneId: tree1.sceneId,
                    toSceneId: tree2.sceneId,
                    position: tree1.position,
                    type: connectionType
                });
                connections.push({ from: tree1.id, to: tree2.id });
            }
        }
        
        this.eventBus?.emit('tree:connectionsCreated', { treeIds, connections });
        return connections;
    }
    
    // نمو الأشجار عبر الزمن
    grow(years) {
        this.treeData.age += years;
        this.treeData.height += years * 0.25;
        this.treeData.trunkDiameter += years * 0.015;
        this.treeData.canopySize += years * 0.12;

        // تحديث كل النسخ
        for (const instance of this.instances) {
            instance.treeData = { ...this.treeData };
            instance.growthStage = this.getGrowthStage();
        }
        
        // إضافة ثمار بعد عمر معين
        if (this.treeData.age >= 3 && (this.treeData.type === 'apple' || this.treeData.type === 'cherry')) {
            this.treeData.hasFruits = true;
        }
        
        this.eventBus?.emit('tree:grown', { id: this.id, years, treeData: this.treeData });
        console.log(`🌳 Tree grew ${years} years, now age: ${this.treeData.age}`);
    }

    getGrowthStage() {
        if (this.treeData.age < 3) return 'young';
        if (this.treeData.age < 10) return 'growing';
        if (this.treeData.age < 30) return 'mature';
        return 'old';
    }
    
    // تغيير نوع الشجرة
    setType(type) {
        this.treeData.type = type;
        
        for (const instance of this.instances) {
            instance.treeData.type = type;
        }
        
        this.eventBus?.emit('tree:typeUpdated', { id: this.id, type });
        console.log(`🌳 Tree type updated to: ${type}`);
    }
    
    // تغيير حجم الشجرة
    setSize(height, canopySize) {
        this.treeData.height = height;
        this.treeData.canopySize = canopySize;
        
        for (const instance of this.instances) {
            instance.treeData.height = height;
            instance.treeData.canopySize = canopySize;
        }
        
        this.eventBus?.emit('tree:sizeUpdated', { id: this.id, height, canopySize });
    }

    getStats() {
        return {
            id: this.id,
            totalInstances: this.totalCount,
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            species: this.treeData.type,
            averageHeight: this.treeData.height,
            averageAge: this.treeData.age,
            forests: this.forestGroups.size,
            totalTreesInForests: Array.from(this.forestGroups.values()).reduce((sum, f) => sum + f.count, 0),
            distribution: this.instances.reduce((acc, i) => {
                acc[i.sceneId] = (acc[i.sceneId] || 0) + 1;
                return acc;
            }, {})
        };
    }
    
    getForestDetails(forestId) {
        return this.forestGroups.get(forestId) || null;
    }
    
    getAllForests() {
        return Array.from(this.forestGroups.values());
    }
    
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            this.totalCount--;
            
            const meshIndex = this.meshes.findIndex(m => m.userData.instanceId === instanceId);
            if (meshIndex !== -1) {
                const mesh = this.meshes[meshIndex];
                if (mesh.parent) mesh.parent.remove(mesh);
                mesh.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    }
                });
                this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('tree:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Tree instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }
    
    removeForest(forestId) {
        const forest = this.forestGroups.get(forestId);
        if (!forest) return false;
        
        for (const tree of forest.trees) {
            this.removeInstance(tree.id);
        }
        
        this.forestGroups.delete(forestId);
        this.eventBus?.emit('tree:forestRemoved', { forestId });
        console.log(`🌲 Forest removed: ${forestId}`);
        return true;
    }

    generateGlobalReport() {
        const stats = this.getStats();
        
        const typeNames = {
            oak: 'بلوط',
            pine: 'صنوبر',
            palm: 'نخلة',
            cherry: 'كرز',
            apple: 'تفاح'
        };
        
        let distributionText = '';
        for (const [sceneId, count] of Object.entries(stats.distribution)) {
            distributionText += `  • المشهد ${sceneId}: ${count} شجرة\n`;
        }
        
        return `
📋 تقرير الأشجار العالمية
═══════════════════════════════════
🌳 المعرف: ${this.id}
🌿 النوع: ${typeNames[this.treeData.type] || this.treeData.type}
📏 الارتفاع: ${this.treeData.height} م
📐 قطر الجذع: ${this.treeData.trunkDiameter} م
🎂 العمر: ${this.treeData.age} سنة
🍎 ثمار: ${this.treeData.hasFruits ? 'نعم' : 'لا'}
═══════════════════════════════════
📊 الإجماليات:
• عدد الأشجار: ${stats.totalInstances}
• الغابات: ${stats.forests}
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
        this.forestGroups.clear();
        this.totalCount = 0;
        this.eventBus?.emit('tree:disposed', { id: this.id });
        console.log(`♻️ GlobalTree disposed: ${this.id}`);
    }
}

export default GlobalTree;