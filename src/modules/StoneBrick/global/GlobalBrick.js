// =======================================
// GLOBAL BRICK - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalBrick {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.brickData = {
            type: options.type || 'clay', // clay, concrete, sandlime, fire
            color: options.color || 0xcc8866,
            size: options.size || { width: 0.2, height: 0.1, depth: 0.1 },
            texture: options.texture || 'smooth',
            strength: options.strength || 'M10',
            density: options.density || 1800 // kg/m³
        };
        
        this.id = `brick_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.meshes = [];
        this.totalVolume = 0;
        this.totalWeight = 0;
        
        if (this.eventBus) {
            this.eventBus.on('brick:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('brick:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('brick:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                brickData: this.brickData
            });
        }
        
        console.log(`🧱 Brick created with ID: ${this.id}`);
        return this.id;
    }

    addInstance(sceneId, position) {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const volume = this.brickData.size.width * this.brickData.size.height * this.brickData.size.depth;
        const weight = volume * this.brickData.density;
        
        const instanceData = {
            id: `brick_instance_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            brickData: { ...this.brickData },
            volume: volume,
            weight: weight,
            createdAt: Date.now()
        };

        this.instances.push(instanceData);
        this.totalVolume += volume;
        this.totalWeight += weight;
        
        if (this.eventBus) {
            this.eventBus.emit('brick:instanceAdded', instanceData);
        }
        
        console.log(`🧱 Brick added at (${position.x}, ${position.z}) in scene ${sceneId}`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const mesh = this.renderInstance(instance, threeScene);
            if (mesh) this.meshes.push(mesh);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('brick:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const pos = instance.position;
        const data = instance.brickData;
        
        const material = new THREE.MeshStandardMaterial({
            color: data.color,
            roughness: 0.7,
            metalness: 0.05
        });
        
        const geometry = new THREE.BoxGeometry(
            data.size.width,
            data.size.height,
            data.size.depth
        );
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.userData = { 
            type: 'brick', 
            brickId: this.id, 
            instanceId: instance.id,
            brickType: data.type
        };
        
        threeScene.add(mesh);
        return mesh;
    }
    
    // إنشاء جدار من الطوب
    createWall(sceneId, startPoint, endPoint, height, options = {}) {
        const wallId = `brick_wall_${Date.now()}`;
        const bricks = [];
        
        const length = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) +
            Math.pow(endPoint.z - startPoint.z, 2)
        );
        
        const angle = Math.atan2(endPoint.z - startPoint.z, endPoint.x - startPoint.x);
        const brickSize = this.brickData.size;
        
        const bricksAlong = Math.ceil(length / brickSize.width);
        const bricksHigh = Math.ceil(height / brickSize.height);
        
        for (let i = 0; i < bricksAlong; i++) {
            for (let j = 0; j < bricksHigh; j++) {
                const offset = (j % 2 === 0) ? 0 : brickSize.width / 2;
                const x = startPoint.x + (i + 0.5) * brickSize.width + offset;
                const z = startPoint.z + (i + 0.5) * brickSize.width + offset;
                const y = startPoint.y + (j + 0.5) * brickSize.height;
                
                const pos = { x, y, z };
                
                // تدوير حسب زاوية الجدار
                const rotatedX = startPoint.x + Math.cos(angle) * (x - startPoint.x) - Math.sin(angle) * (z - startPoint.z);
                const rotatedZ = startPoint.z + Math.sin(angle) * (x - startPoint.x) + Math.cos(angle) * (z - startPoint.z);
                
                const brick = this.addInstance(sceneId, { x: rotatedX, y, z: rotatedZ });
                bricks.push(brick);
            }
        }
        
        console.log(`🧱 Brick wall created: ${bricks.length} bricks, length: ${length.toFixed(2)}m, height: ${height}m`);
        
        return {
            wallId,
            bricksCount: bricks.length,
            bricks,
            length,
            height
        };
    }
    
    // إنشاء عمود من الطوب
    createPillar(sceneId, position, width, height, depth = null) {
        const pillarId = `brick_pillar_${Date.now()}`;
        const bricks = [];
        
        const brickSize = this.brickData.size;
        const pillarDepth = depth || width;
        
        const bricksHorizontal = Math.ceil(width / brickSize.width);
        const bricksVertical = Math.ceil(height / brickSize.height);
        const bricksDepth = Math.ceil(pillarDepth / brickSize.depth);
        
        for (let i = 0; i < bricksHorizontal; i++) {
            for (let j = 0; j < bricksVertical; j++) {
                for (let k = 0; k < bricksDepth; k++) {
                    const x = position.x + (i + 0.5) * brickSize.width - width / 2;
                    const y = position.y + (j + 0.5) * brickSize.height;
                    const z = position.z + (k + 0.5) * brickSize.depth - pillarDepth / 2;
                    
                    const brick = this.addInstance(sceneId, { x, y, z });
                    bricks.push(brick);
                }
            }
        }
        
        console.log(`🧱 Brick pillar created: ${bricks.length} bricks, width: ${width}m, height: ${height}m`);
        
        return {
            pillarId,
            bricksCount: bricks.length,
            bricks,
            width,
            height,
            depth: pillarDepth
        };
    }
    
    // تحديث لون الطوب
    updateColor(color) {
        this.brickData.color = color;
        
        for (const instance of this.instances) {
            instance.brickData.color = color;
        }
        
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'brick') {
                mesh.material.color.setHex(color);
            }
        }
        
        this.eventBus?.emit('brick:colorUpdated', { id: this.id, color });
        console.log(`🧱 Brick color updated to: #${color.toString(16)}`);
    }
    
    // تحديث نوع الطوب
    updateType(type) {
        const typeColors = {
            clay: 0xcc8866,
            concrete: 0xaaaaaa,
            sandlime: 0xddccaa,
            fire: 0xaa6644
        };
        
        this.brickData.type = type;
        this.updateColor(typeColors[type] || this.brickData.color);
        
        this.eventBus?.emit('brick:typeUpdated', { id: this.id, type });
        console.log(`🧱 Brick type updated to: ${type}`);
    }

    getTotalQuantities() {
        return {
            id: this.id,
            type: this.brickData.type,
            color: this.brickData.color,
            size: this.brickData.size,
            strength: this.brickData.strength,
            density: this.brickData.density,
            totalInstances: this.instances.length,
            totalVolume: this.totalVolume.toFixed(5),
            totalWeight: (this.totalWeight / 1000).toFixed(2), // kg to tons
            averageWeightPerBrick: (this.totalWeight / this.instances.length / 1000).toFixed(3),
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            createdAt: this.instances[0]?.createdAt || null
        };
    }
    
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            this.totalVolume -= removed.volume;
            this.totalWeight -= removed.weight;
            
            const meshIndex = this.meshes.findIndex(m => m.userData.instanceId === instanceId);
            if (meshIndex !== -1) {
                const mesh = this.meshes[meshIndex];
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('brick:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Brick instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        const typeNames = {
            clay: 'طوب طيني (أحمر)',
            concrete: 'طوب خرساني',
            sandlime: 'طوب جير رملي',
            fire: 'طوب حراري'
        };
        
        return `
📋 تقرير الطوب العالمي (Brick)
═══════════════════════════════════
🧱 المعرف: ${totals.id}
🏗️ النوع: ${typeNames[totals.type] || totals.type}
🎨 اللون: #${totals.color.toString(16)}
📏 الأبعاد: ${totals.size.width} × ${totals.size.height} × ${totals.size.depth} م
💪 المقاومة: ${totals.strength}
⚖️ الكثافة: ${totals.density} كجم/م³
═══════════════════════════════════
📊 الإجماليات:
• عدد الطوب: ${totals.totalInstances}
• الحجم الكلي: ${totals.totalVolume} م³
• الوزن الكلي: ${totals.totalWeight} طن
• متوسط الوزن لكل طوبة: ${totals.averageWeightPerBrick} كجم
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
        this.instances = [];
        this.totalVolume = 0;
        this.totalWeight = 0;
        this.eventBus?.emit('brick:disposed', { id: this.id });
        console.log(`♻️ GlobalBrick disposed: ${this.id}`);
    }
}

export default GlobalBrick;