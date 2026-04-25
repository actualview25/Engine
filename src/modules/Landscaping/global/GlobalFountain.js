// =======================================
// GLOBAL FOUNTAIN - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalFountain {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.fountainData = {
            type: options.type || 'classic', // classic, modern, tiered, wall
            diameter: options.diameter || 2.0,
            height: options.height || 1.5,
            waterFlow: options.waterFlow !== false,
            waterColor: options.waterColor || 0x44aaff,
            material: options.material || 'stone',
            color: options.color || 0xccaa88,
            tierCount: options.tierCount || 3,
            lighted: options.lighted || false,
            lightColor: options.lightColor || 0xffaa44
        };
        
        this.id = `fountain_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.instances = [];
        this.meshes = [];
        this.particleSystems = [];
        
        if (this.eventBus) {
            this.eventBus.on('fountain:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('fountain:render', (data) => this.renderInScene(data.sceneId, data.scene));
            this.eventBus.on('fountain:animate', (data) => this.animate(data.deltaTime));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addInstance(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('fountain:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                fountainData: this.fountainData
            });
        }
        
        console.log(`⛲ Fountain created with ID: ${this.id}`);
        return this.id;
    }

    addInstance(sceneId, position) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const instanceData = {
            id: `fountain_instance_${Date.now()}_${this.instances.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            fountainData: { ...this.fountainData },
            createdAt: Date.now(),
            waterParticles: []
        };

        this.instances.push(instanceData);
        
        if (this.eventBus) {
            this.eventBus.emit('fountain:instanceAdded', instanceData);
        }
        
        console.log(`⛲ Fountain instance added at (${position.x}, ${position.z}) in scene ${sceneId}`);
        return instanceData;
    }

    renderInScene(sceneId, threeScene) {
        const instancesForScene = this.instances.filter(i => i.sceneId === sceneId);
        
        for (const instance of instancesForScene) {
            const meshes = this.renderInstance(instance, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('fountain:rendered', { sceneId, instances: instancesForScene.length });
        }
    }

    renderInstance(instance, threeScene) {
        const meshes = [];
        const pos = instance.position;
        const data = instance.fountainData;
        
        const material = new THREE.MeshStandardMaterial({
            color: data.color,
            roughness: 0.6,
            metalness: 0.1
        });
        
        const waterMat = new THREE.MeshStandardMaterial({
            color: data.waterColor,
            emissive: data.waterColor,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.7
        });
        
        if (data.type === 'classic') {
            // القاعدة السفلية
            const base = new THREE.Mesh(new THREE.CylinderGeometry(data.diameter / 2, data.diameter / 2 + 0.3, 0.4, 32), material);
            base.position.set(pos.x, pos.y, pos.z);
            threeScene.add(base);
            meshes.push(base);
            
            // الجسم الرئيسي
            const body = new THREE.Mesh(new THREE.CylinderGeometry(data.diameter / 3, data.diameter / 2, data.height, 32), material);
            body.position.set(pos.x, pos.y + 0.4, pos.z);
            threeScene.add(body);
            meshes.push(body);
            
            // الحوض العلوي
            const basin = new THREE.Mesh(new THREE.CylinderGeometry(data.diameter / 2.5, data.diameter / 3, 0.2, 32), material);
            basin.position.set(pos.x, pos.y + 0.4 + data.height, pos.z);
            threeScene.add(basin);
            meshes.push(basin);
            
            // الماء
            const water = new THREE.Mesh(new THREE.CylinderGeometry(data.diameter / 2.6, data.diameter / 2.6, 0.05, 32), waterMat);
            water.position.set(pos.x, pos.y + 0.45 + data.height, pos.z);
            threeScene.add(water);
            meshes.push(water);
            
        } else if (data.type === 'modern') {
            // قاعدة مستطيلة حديثة
            const basePlate = new THREE.Mesh(new THREE.BoxGeometry(data.diameter, 0.2, data.diameter), material);
            basePlate.position.set(pos.x, pos.y, pos.z);
            threeScene.add(basePlate);
            meshes.push(basePlate);
            
            // عمود زجاجي
            const glassMat = new THREE.MeshPhysicalMaterial({
                color: 0x88aaff,
                transparent: true,
                opacity: 0.6,
                metalness: 0.8
            });
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, data.height, 16), glassMat);
            pillar.position.set(pos.x, pos.y + data.height / 2, pos.z);
            threeScene.add(pillar);
            meshes.push(pillar);
            
            // حوض ماء
            const modernBasin = new THREE.Mesh(new THREE.CylinderGeometry(data.diameter / 2, data.diameter / 2, 0.1, 32), waterMat);
            modernBasin.position.set(pos.x, pos.y - 0.05, pos.z);
            threeScene.add(modernBasin);
            meshes.push(modernBasin);
            
        } else if (data.type === 'tiered') {
            // نافورة متعددة الطبقات
            const tierHeight = data.height / data.tierCount;
            
            for (let i = 0; i < data.tierCount; i++) {
                const tierRadius = data.diameter / 2 * (1 - i * 0.2);
                const tier = new THREE.Mesh(new THREE.CylinderGeometry(tierRadius, tierRadius + 0.1, 0.15, 32), material);
                tier.position.set(pos.x, pos.y + i * tierHeight, pos.z);
                threeScene.add(tier);
                meshes.push(tier);
                
                // ماء في كل طبقة
                const tierWater = new THREE.Mesh(new THREE.CylinderGeometry(tierRadius - 0.05, tierRadius - 0.05, 0.05, 32), waterMat);
                tierWater.position.set(pos.x, pos.y + i * tierHeight + 0.08, pos.z);
                threeScene.add(tierWater);
                meshes.push(tierWater);
            }
        }
        
        // إضافة نظام الجسيمات للمياه المتدفقة
        if (data.waterFlow) {
            const particleSystem = this.createWaterParticles(instance, threeScene);
            instance.waterParticles = particleSystem;
            this.particleSystems.push(particleSystem);
        }
        
        // إضافة إضاءة
        if (data.lighted) {
            const light = new THREE.PointLight(data.lightColor, 0.8, 8);
            light.position.set(pos.x, pos.y + 1, pos.z);
            threeScene.add(light);
            meshes.push(light);
            instance.light = light;
        }
        
        return meshes;
    }
    
    createWaterParticles(instance, threeScene) {
        const pos = instance.position;
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 1.5;
            positions[i * 3] = pos.x + Math.cos(angle) * radius;
            positions[i * 3 + 1] = pos.y + 1.5 + Math.random() * 2;
            positions[i * 3 + 2] = pos.z + Math.sin(angle) * radius;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x44aaff,
            size: 0.05,
            transparent: true,
            opacity: 0.7
        });
        
        const particles = new THREE.Points(geometry, material);
        threeScene.add(particles);
        
        return {
            particles,
            velocities: new Array(particleCount).fill().map(() => ({
                y: Math.random() * 2,
                angle: Math.random() * Math.PI * 2,
                radius: Math.random() * 1.5
            })),
            position: pos
        };
    }
    
    animate(deltaTime = 0.016) {
        for (const particleSystem of this.particleSystems) {
            if (!particleSystem.particles) continue;
            
            const positions = particleSystem.particles.geometry.attributes.position.array;
            const particleCount = positions.length / 3;
            
            for (let i = 0; i < particleCount; i++) {
                // تحديث ارتفاع الجسيم
                let y = positions[i * 3 + 1];
                y += deltaTime * 2;
                
                if (y > particleSystem.position.y + 3.5) {
                    y = particleSystem.position.y + 1;
                    // إعادة تعيين الموقع الأفقي
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 1.5;
                    positions[i * 3] = particleSystem.position.x + Math.cos(angle) * radius;
                    positions[i * 3 + 2] = particleSystem.position.z + Math.sin(angle) * radius;
                }
                
                positions[i * 3 + 1] = y;
            }
            
            particleSystem.particles.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    // تحديث تدفق المياه
    setWaterFlow(enabled) {
        this.fountainData.waterFlow = enabled;
        
        for (const instance of this.instances) {
            instance.fountainData.waterFlow = enabled;
        }
        
        this.eventBus?.emit('fountain:waterFlowUpdated', { id: this.id, enabled });
        console.log(`⛲ Water flow ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // تحديث الإضاءة
    setLighting(enabled, color = null) {
        this.fountainData.lighted = enabled;
        if (color) this.fountainData.lightColor = color;
        
        for (const instance of this.instances) {
            instance.fountainData.lighted = enabled;
            if (color) instance.fountainData.lightColor = color;
            
            if (instance.light) {
                instance.light.visible = enabled;
                if (color) instance.light.color.setHex(color);
            }
        }
        
        this.eventBus?.emit('fountain:lightingUpdated', { id: this.id, enabled, color });
        console.log(`⛲ Lighting ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // تحديث النوع
    setType(type) {
        this.fountainData.type = type;
        
        for (const instance of this.instances) {
            instance.fountainData.type = type;
        }
        
        this.eventBus?.emit('fountain:typeUpdated', { id: this.id, type });
        console.log(`⛲ Fountain type updated to: ${type}`);
    }

    getTotalQuantities() {
        return {
            id: this.id,
            type: this.fountainData.type,
            diameter: this.fountainData.diameter,
            height: this.fountainData.height,
            waterFlow: this.fountainData.waterFlow,
            lighted: this.fountainData.lighted,
            totalInstances: this.instances.length,
            scenes: [...new Set(this.instances.map(i => i.sceneId))],
            createdAt: this.instances[0]?.createdAt || null
        };
    }
    
    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id === instanceId);
        if (index !== -1) {
            const removed = this.instances.splice(index, 1)[0];
            
            // حذف الـ meshes المرتبطة
            const meshesToRemove = this.meshes.filter(m => m.userData?.instanceId === instanceId);
            for (const mesh of meshesToRemove) {
                if (mesh.parent) mesh.parent.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            }
            
            // حذف نظام الجسيمات
            const particleIndex = this.particleSystems.findIndex(p => p.position === removed.position);
            if (particleIndex !== -1) {
                const ps = this.particleSystems[particleIndex];
                if (ps.particles && ps.particles.parent) ps.particles.parent.remove(ps.particles);
                this.particleSystems.splice(particleIndex, 1);
            }
            
            this.meshes = this.meshes.filter(m => m.userData?.instanceId !== instanceId);
            
            this.eventBus?.emit('fountain:instanceRemoved', { id: this.id, instanceId });
            console.log(`🗑️ Fountain instance removed: ${instanceId}`);
            return true;
        }
        return false;
    }

    generateGlobalReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير النافورات العالمية
═══════════════════════════════════
⛲ المعرف: ${totals.id}
🎨 النوع: ${totals.type === 'classic' ? 'كلاسيكية' : totals.type === 'modern' ? 'حديثة' : 'متعددة الطبقات'}
📏 القطر: ${totals.diameter} م
📐 الارتفاع: ${totals.height} م
💧 تدفق المياه: ${totals.waterFlow ? 'نشط' : 'غير نشط'}
💡 إضاءة: ${totals.lighted ? 'نشطة' : 'غير نشطة'}
═══════════════════════════════════
📊 الإجماليات:
• عدد النوافير: ${totals.totalInstances}
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
        
        for (const ps of this.particleSystems) {
            if (ps.particles && ps.particles.parent) ps.particles.parent.remove(ps.particles);
            if (ps.particles && ps.particles.geometry) ps.particles.geometry.dispose();
            if (ps.particles && ps.particles.material) ps.particles.material.dispose();
        }
        
        this.meshes = [];
        this.instances = [];
        this.particleSystems = [];
        this.eventBus?.emit('fountain:disposed', { id: this.id });
        console.log(`♻️ GlobalFountain disposed: ${this.id}`);
    }
}

export default GlobalFountain;