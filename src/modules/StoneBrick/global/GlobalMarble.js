// =======================================
// GLOBAL MARBLE - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalMarble {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.marbleData = {
            type: options.type || 'carrara', // carrara, calacatta, emperador, verde, nero
            finish: options.finish || 'polished', // polished, honed, brushed, tumbled
            size: options.size || { width: 1.0, height: 0.02, depth: 1.0 },
            veining: options.veining || 'light',
            glossLevel: options.glossLevel || 0.9,
            color: options.color || 0xf5f5f0
        };
        
        // ألوان وأسعار أنواع الرخام
        this.marbleTypes = {
            carrara: { color: 0xf5f5f0, price: 50, veiningColor: 0xcccccc },
            calacatta: { color: 0xffffee, price: 120, veiningColor: 0xddccaa },
            emperador: { color: 0xccaa88, price: 80, veiningColor: 0xaa8866 },
            verde: { color: 0x88aa66, price: 90, veiningColor: 0x668844 },
            nero: { color: 0x222222, price: 100, veiningColor: 0x444444 }
        };
        
        this.id = `marble_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.meshes = [];
        this.totalArea = 0;
        this.totalVolume = 0;
        this.totalCost = 0;
        
        if (this.eventBus) {
            this.eventBus.on('marble:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('marble:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('marble:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                marbleData: this.marbleData
            });
        }
        
        console.log(`🪨 Marble created with ID: ${this.id}, type: ${this.marbleData.type}`);
        return this.id;
    }

    addInstance(sceneId, position, size = null) {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const actualSize = size || this.marbleData.size;
        const area = actualSize.width * actualSize.depth;
        const volume = area * actualSize.height;
        const marbleType = this.marbleTypes[this.marbleData.type];
        const cost = area * (marbleType?.price || 50);
        
        const instanceData = {
            id: `marble_instance_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            size: { ...actualSize },
            marbleData: { ...this.marbleData },
            area: area,
            volume: volume,
            cost: cost,
            createdAt: Date.now()
        };

        this.instances.push(instanceData);
        this.totalArea += area;
        this.totalVolume += volume;
        this.totalCost += cost;
        
        if (this.eventBus) {
            this.eventBus.emit('marble:instanceAdded', instanceData);
        }
        
        console.log(`🪨 Marble added: ${this.marbleData.type}, area: ${area.toFixed(2)}m², cost: $${cost.toFixed(2)}`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const mesh = this.renderInstance(instance, threeScene);
            if (mesh) this.meshes.push(mesh);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('marble:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const pos = instance.position;
        const size = instance.size;
        const marbleType = this.marbleTypes[this.marbleData.type];
        
        // إنشاء نسيج الرخام
        const texture = this.createMarbleTexture();
        
        const material = new THREE.MeshStandardMaterial({
            color: marbleType?.color || this.marbleData.color,
            map: texture,
            roughness: this.marbleData.finish === 'polished' ? 0.1 : (this.marbleData.finish === 'honed' ? 0.3 : 0.6),
            metalness: this.marbleData.finish === 'polished' ? 0.3 : 0.1,
            emissive: 0x000000,
            flatShading: false
        });
        
        const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.userData = { 
            type: 'marble', 
            marbleId: this.id, 
            instanceId: instance.id,
            marbleType: this.marbleData.type,
            finish: this.marbleData.finish
        };
        
        threeScene.add(mesh);
        return mesh;
    }
    
    // إنشاء نسيج رخامي
    createMarbleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        const marbleType = this.marbleTypes[this.marbleData.type];
        const baseColor = marbleType?.color || this.marbleData.color;
        const veiningColor = marbleType?.veiningColor || 0xcccccc;
        
        const r = ((baseColor >> 16) & 255) / 255;
        const g = ((baseColor >> 8) & 255) / 255;
        const b = (baseColor & 255) / 255;
        
        ctx.fillStyle = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // رسم العروق
        const vr = ((veiningColor >> 16) & 255) / 255;
        const vg = ((veiningColor >> 8) & 255) / 255;
        const vb = (veiningColor & 255) / 255;
        
        const veinCount = this.marbleData.veining === 'heavy' ? 50 : (this.marbleData.veining === 'light' ? 15 : 30);
        
        for (let i = 0; i < veinCount; i++) {
            ctx.beginPath();
            let x = Math.random() * canvas.width;
            let y = Math.random() * canvas.height;
            ctx.moveTo(x, y);
            
            const segments = 5 + Math.floor(Math.random() * 10);
            for (let j = 0; j < segments; j++) {
                x += (Math.random() - 0.5) * 100;
                y += (Math.random() - 0.5) * 100;
                ctx.lineTo(x, y);
            }
            
            const opacity = 0.1 + Math.random() * 0.3;
            ctx.strokeStyle = `rgba(${vr * 255}, ${vg * 255}, ${vb * 255}, ${opacity})`;
            ctx.lineWidth = 2 + Math.random() * 4;
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return texture;
    }
    
    // إنشاء أرضية رخامية
    createFloor(sceneId, points, options = {}) {
        const floorId = `marble_floor_${Date.now()}`;
        const tiles = [];
        
        const tileSize = options.tileSize || 0.6;
        const tilesPerRow = Math.ceil(this.calculatePathLength(points) / tileSize);
        
        for (let i = 0; i < tilesPerRow; i++) {
            for (let j = 0; j < tilesPerRow; j++) {
                const x = points[0].x + i * tileSize;
                const z = points[0].z + j * tileSize;
                
                if (this.isPointInsidePolygon({ x, z }, points)) {
                    const tile = this.addInstance(sceneId, { x, y: options.yOffset || 0, z }, {
                        width: tileSize,
                        height: this.marbleData.size.height,
                        depth: tileSize
                    });
                    tiles.push(tile);
                }
            }
        }
        
        console.log(`🪨 Marble floor created: ${tiles.length} tiles`);
        return floorId;
    }
    
    // إنشاء سطح رخامي (كونترتوب)
    createCountertop(sceneId, startPoint, endPoint, options = {}) {
        const length = this.calculateDistance(startPoint, endPoint);
        const width = options.width || 0.6;
        const thickness = options.thickness || 0.03;
        
        const midPoint = {
            x: (startPoint.x + endPoint.x) / 2,
            y: startPoint.y + (thickness / 2),
            z: (startPoint.z + endPoint.z) / 2
        };
        
        const angle = Math.atan2(endPoint.z - startPoint.z, endPoint.x - startPoint.x);
        
        const countertop = this.addInstance(sceneId, midPoint, {
            width: length,
            height: thickness,
            depth: width
        });
        
        // إضافة حافة (edge profile)
        const edgeProfile = {
            countertopId: countertop.id,
            angle: angle,
            length: length
        };
        
        console.log(`🪨 Marble countertop created: length ${length.toFixed(2)}m, width ${width}m`);
        return { countertop, edgeProfile };
    }
    
    // تحديث نوع الرخام
    updateType(type) {
        if (this.marbleTypes[type]) {
            this.marbleData.type = type;
            this.marbleData.color = this.marbleTypes[type].color;
            
            this.eventBus?.emit('marble:typeUpdated', { id: this.id, type });
            console.log(`🪨 Marble type updated to: ${type}`);
        }
    }
    
    // تحديث التشطيب
    updateFinish(finish) {
        this.marbleData.finish = finish;
        
        let roughness = 0.1;
        let metalness = 0.3;
        
        switch(finish) {
            case 'polished':
                roughness = 0.1;
                metalness = 0.3;
                break;
            case 'honed':
                roughness = 0.3;
                metalness = 0.1;
                break;
            case 'brushed':
                roughness = 0.5;
                metalness = 0.05;
                break;
            case 'tumbled':
                roughness = 0.7;
                metalness = 0.02;
                break;
        }
        
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'marble') {
                mesh.material.roughness = roughness;
                mesh.material.metalness = metalness;
            }
        }
        
        this.eventBus?.emit('marble:finishUpdated', { id: this.id, finish });
        console.log(`🪨 Marble finish updated to: ${finish}`);
    }
    
    // تحديث مستوى العروق
    updateVeining(level) {
        this.marbleData.veining = level;
        this.eventBus?.emit('marble:veiningUpdated', { id: this.id, veining: level });
    }

    calculateDistance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
    }
    
    isPointInsidePolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, zi = polygon[i].z;
            const xj = polygon[j].x, zj = polygon[j].z;
            const intersect = ((zi > point.z) != (zj > point.z)) &&
                (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
    
    calculatePathLength(points) {
        let length = 0;
        for (let i = 0; i < points.length - 1; i++) {
            length += this.calculateDistance(points[i], points[i + 1]);
        }
        return length;
    }

    getTotalQuantities() {
        const marbleType = this.marbleTypes[this.marbleData.type];
        
        return {
            id: this.id,
            type: this.marbleData.type,
            finish: this.marbleData.finish,
            veining: this.marbleData.veining,
            totalArea: this.totalArea.toFixed(2),
            totalVolume: this.totalVolume.toFixed(5),
            totalCost: this.totalCost.toFixed(2),
            unitPrice: marbleType?.price || 50,
            totalInstances: this.instances.length,
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            createdAt: this.instances[0]?.createdAt || null
        };
    }
    
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            this.totalArea -= removed.area;
            this.totalVolume -= removed.volume;
            this.totalCost -= removed.cost;
            
            const meshIndex = this.meshes.findIndex(m => m.userData.instanceId === instanceId);
            if (meshIndex !== -1) {
                const mesh = this.meshes[meshIndex];
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.meshes.splice(meshIndex, 1);
            }
            
            this.eventBus?.emit('marble:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Marble instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        const typeNames = {
            carrara: 'كارارا (أبيض)',
            calacatta: 'كالاكاتا (ذهبي)',
            emperador: 'إمبرادور (بني)',
            verde: 'فيردي (أخضر)',
            nero: 'نيرو (أسود)'
        };
        
        const finishNames = {
            polished: 'مصقول',
            honed: 'مات',
            brushed: 'مشطب',
            tumbled: 'مخدد'
        };
        
        return `
📋 تقرير الرخام العالمي (Marble)
═══════════════════════════════════
🪨 المعرف: ${totals.id}
🏛️ النوع: ${typeNames[totals.type] || totals.type}
✨ التشطيب: ${finishNames[totals.finish] || totals.finish}
🪨 العروق: ${totals.veining === 'light' ? 'خفيفة' : (totals.veining === 'heavy' ? 'ثقيلة' : 'متوسطة')}
═══════════════════════════════════
📊 الإجماليات:
• المساحة الكلية: ${totals.totalArea} م²
• الحجم الكلي: ${totals.totalVolume} م³
• التكلفة الكلية: $${totals.totalCost}
• سعر الوحدة: $${totals.unitPrice}/م²
• عدد القطع: ${totals.totalInstances}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    dispose() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            if (mesh.material.map) mesh.material.map.dispose();
        }
        this.meshes = [];
        this.instances = [];
        this.totalArea = 0;
        this.totalVolume = 0;
        this.totalCost = 0;
        this.eventBus?.emit('marble:disposed', { id: this.id });
        console.log(`♻️ GlobalMarble disposed: ${this.id}`);
    }
}

export default GlobalMarble;