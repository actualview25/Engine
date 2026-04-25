// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GRASS
// =======================================

import * as THREE from 'three';

export class Grass {
    constructor(options = {}) {
        this.type = options.type || 'natural';  // natural, synthetic, meadow
        this.area = options.area || 10;  // مساحة بالمتر المربع
        this.height = options.height || 0.1;  // ارتفاع النجيل
        this.color = options.color || 0x44aa44;
        this.density = options.density || 0.9;  // كثافة النجيل
        this.boundary = options.boundary || [];  // حدود المساحة
        this.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.blades = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // أرضية خضراء كقاعدة
        const baseGeo = new THREE.PlaneGeometry(
            Math.sqrt(this.area) * 2, 
            Math.sqrt(this.area) * 2
        );
        const baseMat = new THREE.MeshStandardMaterial({ 
            color: this.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.rotation.x = -Math.PI / 2;
        base.position.y = 0.01;
        base.receiveShadow = true;
        group.add(base);

        // إضافة شفرات النجيل (للتفاصيل القريبة)
        if (this.density > 0.5) {
            const bladeCount = Math.floor(this.area * this.density * 5);
            
            for (let i = 0; i < bladeCount; i++) {
                const blade = this.createBlade();
                
                // توزيع عشوائي ضمن المساحة
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * Math.sqrt(this.area);
                blade.position.set(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                );
                
                group.add(blade);
                this.blades.push(blade);
            }
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.receiveShadow = true;
        
        this.mesh = group;
        return group;
    }

    createBlade() {
        // شفرة نجيل فردية
        const height = this.height * (0.5 + Math.random() * 0.5);
        const geo = new THREE.PlaneGeometry(0.02, height);
        const mat = new THREE.MeshStandardMaterial({ 
            color: this.color,
            side: THREE.DoubleSide,
            emissive: 0x112211
        });
        const blade = new THREE.Mesh(geo, mat);
        
        // تدوير عشوائي
        blade.rotation.y = Math.random() * Math.PI * 2;
        blade.rotation.x = Math.random() * 0.2 - 0.1;
        blade.position.y = height / 2;
        
        return blade;
    }

    // ري النجيل
    water(amount = 1) {
        // تغيير اللون ليعكس الري
        this.color = 0x44ff44;
        if (this.mesh) {
            this.mesh.children.forEach(child => {
                if (child.material) {
                    child.material.color.setHex(this.color);
                }
            });
        }
        console.log(`💧 Grass watered, amount: ${amount}`);
    }

    // قص النجيل
    mow(height = 0.05) {
        this.height = height;
        // تحديث ارتفاع الشفرات
        this.blades.forEach(blade => {
            blade.scale.y = height / 0.1;
        });
        console.log('✂️ Grass mowed');
    }

    getBOQ() {
        return {
            نوع: 'مسطح أخضر',
            النوع: this.type === 'natural' ? 'طبيعي' : this.type === 'synthetic' ? 'صناعي' : 'مرج',
            المساحة: this.area.toFixed(2) + ' م²',
            ارتفاع_النجيل: (this.height * 100).toFixed(0) + ' سم',
            الكثافة: (this.density * 100).toFixed(0) + '%'
        };
    }
}