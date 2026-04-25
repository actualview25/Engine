// =======================================
// GLOBAL STONE - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalStone {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.stoneData = {
            type: options.type || 'limestone', // limestone, granite, sandstone, slate, marble
            finish: options.finish || 'natural', // natural, polished, rough, split
            size: options.size || { width: 0.4, height: 0.2, depth: 0.2 },
            color: options.color || 0xeeeeee,
            mortar: options.mortar !== false,
            mortarColor: options.mortarColor || 0xcccccc,
            mortarThickness: options.mortarThickness || 0.005,
            texture: options.texture || 'random'
        };
        
        // خصائص أنواع الحجر
        this.stoneTypes = {
            limestone: { color: 0xeeeeee, density: 2500, price: 30 },
            granite: { color: 0xaa8888, density: 2700, price: 80 },
            sandstone: { color: 0xccaa88, density: 2400, price: 25 },
            slate: { color: 0x668888, density: 2800, price: 45 },
            marble: { color: 0xf5f5f0, density: 2600, price: 100 }
        };
        
        this.id = `stone_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.meshes = [];
        this.walls = [];
        this.totalVolume = 0;
        this.totalWeight = 0;
        this.totalCost = 0;
        
        if (this.eventBus) {
            this.eventBus.on('stone:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('stone:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('stone:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                stoneData: this.stoneData
            });
        }
        
        console.log(`🪨 Stone created with ID: ${this.id}, type: ${this.stoneData.type}`);
        return this.id;
    }

    addInstance(sceneId, position, rotation = 0) {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const volume = this.stoneData.size.width * this.stoneData.size.height * this.stoneData.size.depth;
        const stoneType = this.stoneTypes[this.stoneData.type];
        const density = stoneType?.density || 2500;
        const weight = volume * density / 1000; // kg
        const cost = volume * (stoneType?.price || 50);
        
        const instanceData = {
            id: `stone_instance_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            rotation: rotation,
            stoneData: { ...this.stoneData },
            volume: volume,
            weight: weight,
            cost: cost,
            createdAt: Date.now()
        };

        this.instances.push(instanceData);
        this.totalVolume += volume;
        this.totalWeight += weight;
        this.totalCost += cost;
        
        if (this.eventBus) {
            this.eventBus.emit('stone:instanceAdded', instanceData);
        }
        
        console.log(`🪨 Stone added: ${this.stoneData.type}, volume: ${volume.toFixed(5)}m³`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const meshes = this.renderInstance(instance, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('stone:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const meshes = [];
        const pos = instance.position;
        const size = instance.stoneData.size;
        const stoneType = this.stoneTypes[instance.stoneData.type];
        
        // إنشاء نسيج الحجر
        const texture = this.createStoneTexture();
        
        const material = new THREE.MeshStandardMaterial({
            color: instance.stoneData.color || stoneType?.color || 0xeeeeee,
            map: texture,
            roughness: instance.stoneData.finish === 'polished' ? 0.2 : (instance.stoneData.finish === 'rough' ? 0.8 : 0.5),
            metalness: instance.stoneData.finish === 'polished' ? 0.1 : 0.02
        });
        
        const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(pos.x, pos.y, pos.z);
        if (instance.rotation !== 0) {
            mesh.rotation.y = instance.rotation;
        }
        
        mesh.userData = { 
            type: 'stone', 
            stoneId: this.id, 
            instanceId: instance.id,
            stoneType: instance.stoneData.type,
            finish: instance.stoneData.finish
        };
        
        threeScene.add(mesh);
        meshes.push(mesh);
        
        return meshes;
    }
    
    // إنشاء نسيج حجري
    createStoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        const stoneType = this.stoneTypes[this.stoneData.type];
        const baseColor = this.stoneData.color || stoneType?.color || 0xeeeeee;
        
        const r = ((baseColor >> 16) & 255) / 255;
        const g = ((baseColor >> 8) & 255) / 255;
        const b = (baseColor & 255) / 255;
        
        ctx.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // إضافة نسيج الحجر (حبيبات وشقوق)
        const particleCount = 5000;
        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const brightness = 0.7 + Math.random() * 0.5;
            const size = 1 + Math.random() * 2;
            
            ctx.fillStyle = `rgba(${brightness * 255}, ${brightness * 200}, ${brightness * 180}, ${Math.random() * 0.3})`;
            ctx.fillRect(x, y, size, size);
        }
        
        // إضافة شقوق
        const crackCount = 20;
        for (let i = 0; i < crackCount; i++) {
            ctx.beginPath();
            let x = Math.random() * canvas.width;
            let y = Math.random() * canvas.height;
            ctx.moveTo(x, y);
            
            for (let j = 0; j < 5; j++) {
                x += (Math.random() - 0.5) * 40;
                y += (Math.random() - 0.5) * 40;
                ctx.lineTo(x, y);
            }
            
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.2})`;
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }

    // إنشاء جدار حجري مستمر عبر مشاهد متعددة
    createContinuousWall(sceneIds, points, options = {}) {
        const wallId = `stone_wall_${Date.now()}`;
        const segments = [];
        let totalStones = 0;
        
        const height = options.height || 2.0;
        const rows = Math.ceil(height / this.stoneData.size.height);
        const stoneWidth = this.stoneData.size.width;
        
        for (let i = 0; i < sceneIds.length; i++) {
            const sceneId = sceneIds[i];
            const startPoint = points[i];
            const endPoint = points[i + 1] || points[i];
            const length = this.calculateDistance(startPoint, endPoint);
            const stonesPerRow = Math.ceil(length / stoneWidth);
            
            const angle = Math.atan2(endPoint.z - startPoint.z, endPoint.x - startPoint.x);
            
            // ربط مع المشهد التالي
            if (i < sceneIds.length - 1 && this.eventBus) {
                const linkPoint = this.calculateLinkPoint(startPoint, endPoint);
                this.eventBus.emit('scene:link', {
                    fromSceneId: sceneId,
                    toSceneId: sceneIds[i + 1],
                    position: linkPoint,
                    type: 'wall_connection'
                });
            }
            
            const wallStones = [];
            
            for (let row = 0; row < rows; row++) {
                const offset = (row % 2 === 0) ? 0 : stoneWidth / 2;
                
                for (let col = 0; col < stonesPerRow; col++) {
                    const t = (col * stoneWidth + offset) / length;
                    if (t > 1) continue;
                    
                    const baseX = startPoint.x + (endPoint.x - startPoint.x) * t;
                    const baseZ = startPoint.z + (endPoint.z - startPoint.z) * t;
                    
                    const rotatedX = startPoint.x + Math.cos(angle) * (baseX - startPoint.x) - Math.sin(angle) * (baseZ - startPoint.z);
                    const rotatedZ = startPoint.z + Math.sin(angle) * (baseX - startPoint.x) + Math.cos(angle) * (baseZ - startPoint.z);
                    
                    const pos = {
                        x: rotatedX,
                        y: startPoint.y + (row + 0.5) * this.stoneData.size.height,
                        z: rotatedZ
                    };
                    
                    const stone = this.addInstance(sceneId, pos, angle);
                    wallStones.push(stone);
                }
            }
            
            totalStones += wallStones.length;
            segments.push({
                sceneId,
                startPoint,
                endPoint,
                length: length,
                height: height,
                rows: rows,
                stonesPerRow: stonesPerRow,
                stones: wallStones
            });
        }
        
        const wallData = {
            id: wallId,
            segments,
            totalStones: totalStones,
            totalVolume: totalStones * (this.stoneData.size.width * this.stoneData.size.height * this.stoneData.size.depth),
            createdAt: Date.now()
        };
        
        this.walls.push(wallData);
        
        this.eventBus?.emit('stone:continuousWallCreated', wallData);
        
        console.log(`🪨 Continuous stone wall created: ${totalStones} stones, ${segments.length} segments`);
        return wallId;
    }
    
    // إنشاء عمود حجري
    createPillar(sceneId, position, width, height, depth = null) {
        const pillarId = `stone_pillar_${Date.now()}`;
        const stones = [];
        
        const pillarDepth = depth || width;
        const stoneSize = this.stoneData.size;
        
        const stonesHorizontal = Math.ceil(width / stoneSize.width);
        const stonesVertical = Math.ceil(height / stoneSize.height);
        const stonesDepth = Math.ceil(pillarDepth / stoneSize.depth);
        
        for (let i = 0; i < stonesHorizontal; i++) {
            for (let j = 0; j < stonesVertical; j++) {
                for (let k = 0; k < stonesDepth; k++) {
                    const x = position.x + (i + 0.5) * stoneSize.width - width / 2;
                    const y = position.y + (j + 0.5) * stoneSize.height;
                    const z = position.z + (k + 0.5) * stoneSize.depth - pillarDepth / 2;
                    
                    const stone = this.addInstance(sceneId, { x, y, z });
                    stones.push(stone);
                }
            }
        }
        
        console.log(`🪨 Stone pillar created: ${stones.length} stones`);
        return {
            pillarId,
            stonesCount: stones.length,
            stones,
            width,
            height,
            depth: pillarDepth
        };
    }
    
    // تحديث نوع الحجر
    updateType(type) {
        if (this.stoneTypes[type]) {
            this.stoneData.type = type;
            this.stoneData.color = this.stoneTypes[type].color;
            
            this.eventBus?.emit('stone:typeUpdated', { id: this.id, type });
            console.log(`🪨 Stone type updated to: ${type}`);
        }
    }
    
    // تحديث التشطيب
    updateFinish(finish) {
        this.stoneData.finish = finish;
        
        let roughness = 0.5;
        switch(finish) {
            case 'polished':
                roughness = 0.2;
                break;
            case 'natural':
                roughness = 0.5;
                break;
            case 'rough':
                roughness = 0.8;
                break;
            case 'split':
                roughness = 0.7;
                break;
        }
        
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'stone') {
                mesh.material.roughness = roughness;
            }
        }
        
        this.eventBus?.emit('stone:finishUpdated', { id: this.id, finish });
        console.log(`🪨 Stone finish updated to: ${finish}`);
    }
    
    // تحديث اللون
    updateColor(color) {
        this.stoneData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'stone') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('stone:colorUpdated', { id: this.id, color });
    }

    calculateDistance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
    }

    calculateLinkPoint(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            z: (p1.z + p2.z) / 2
        };
    }

    getTotalQuantities() {
        const stoneType = this.stoneTypes[this.stoneData.type];
        
        return {
            id: this.id,
            type: this.stoneData.type,
            finish: this.stoneData.finish,
            size: this.stoneData.size,
            totalStones: this.instances.length,
            totalVolume: this.totalVolume.toFixed(5),
            totalWeight: (this.totalWeight / 1000).toFixed(2), // kg to tons
            totalCost: this.totalCost.toFixed(2),
            unitPrice: stoneType?.price || 50,
            density: stoneType?.density || 2500,
            walls: this.walls.length,
            totalWallStones: this.walls.reduce((sum, w) => sum + w.totalStones, 0),
            distribution: this.instances.reduce((acc, i) => {
                acc[i.sceneId] = (acc[i.sceneId] || 0) + 1;
                return acc;
            }, {}),
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            createdAt: this.instances[0]?.createdAt || null
        };
    }
    
    getWallDetails(wallId) {
        return this.walls.find(w => w.id === wallId) || null;
    }
    
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            this.totalVolume -= removed.volume;
            this.totalWeight -= removed.weight;
            this.totalCost -= removed.cost;
            
            const meshIndex = this.meshes.findIndex(m => m.userData.instanceId === instanceId);
            if (meshIndex !== -1) {
                const mesh = this.meshes[meshIndex];
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('stone:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Stone instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }
    
    removeWall(wallId) {
        const wallIndex = this.walls.findIndex(w => w.id === wallId);
        if (wallIndex !== -1) {
            const wall = this.walls[wallIndex];
            for (const segment of wall.segments) {
                for (const stone of segment.stones) {
                    this.removeInstance(stone.id);
                }
            }
            this.walls.splice(wallIndex, 1);
            
            this.eventBus?.emit('stone:wallRemoved', { id: this.id, wallId });
            console.log(`🪨 Stone wall removed: ${wallId}`);
            return true;
        }
        return false;
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        const typeNames = {
            limestone: 'حجر جيري',
            granite: 'جرانيت',
            sandstone: 'حجر رملي',
            slate: 'أردواز',
            marble: 'رخام'
        };
        
        const finishNames = {
            natural: 'طبيعي',
            polished: 'مصقول',
            rough: 'خشن',
            split: 'مشقق'
        };
        
        let distributionText = '';
        for (const [sceneId, count] of Object.entries(totals.distribution)) {
            distributionText += `  • المشهد ${sceneId}: ${count} حجر\n`;
        }
        
        return `
📋 تقرير الحجر العالمي (Stone)
═══════════════════════════════════
🪨 المعرف: ${totals.id}
🏛️ النوع: ${typeNames[totals.type] || totals.type}
✨ التشطيب: ${finishNames[totals.finish] || totals.finish}
📏 الأبعاد: ${totals.size.width} × ${totals.size.height} × ${totals.size.depth} م
═══════════════════════════════════
📊 الإجماليات:
• عدد الأحجار: ${totals.totalStones}
• الحجم الكلي: ${totals.totalVolume} م³
• الوزن الكلي: ${totals.totalWeight} طن
• التكلفة الكلية: $${totals.totalCost}
• سعر الوحدة: $${totals.unitPrice}/م³
• الكثافة: ${totals.density} كجم/م³
═══════════════════════════════════
🧱 الجدران الحجرية:
• عدد الجدران: ${totals.walls}
• إجمالي الأحجار في الجدران: ${totals.totalWallStones}
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
            if (mesh.material?.map) mesh.material.map.dispose();
        }
        this.meshes = [];
        this.instances = [];
        this.walls = [];
        this.totalVolume = 0;
        this.totalWeight = 0;
        this.totalCost = 0;
        this.eventBus?.emit('stone:disposed', { id: this.id });
        console.log(`♻️ GlobalStone disposed: ${this.id}`);
    }
}

export default GlobalStone;