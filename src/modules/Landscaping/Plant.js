// =======================================
// ACTUAL VIEW CONSTRUCTION OS - PLANT
// =======================================

import * as THREE from 'three';

export class Plant {
    constructor(options = {}) {
        this.type = options.type || 'shrub';  // shrub, flower, ground_cover
        this.species = options.species || 'generic';
        this.height = options.height || 0.5;  // متر
        this.width = options.width || 0.4;    // متر
        this.color = options.color || 0x44aa44;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.density = options.density || 0.8; // كثافة الأوراق
        
        this.mesh = null;
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // ساق النبات
        const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, this.height, 8);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = this.height / 2;
        group.add(stem);

        // أوراق النبات (عدة كرات)
        const leafCount = Math.floor(this.density * 10);
        for (let i = 0; i < leafCount; i++) {
            const leafGeo = new THREE.SphereGeometry(0.1 + Math.random()*0.1, 5);
            const leafMat = new THREE.MeshStandardMaterial({ 
                color: this.color,
                emissive: 0x112211
            });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            
            // توزيع الأوراق بشكل عشوائي
            const angle = (i / leafCount) * Math.PI * 2;
            const radius = this.width * 0.7;
            leaf.position.set(
                Math.cos(angle) * radius,
                this.height * 0.7 + Math.random() * this.height * 0.3,
                Math.sin(angle) * radius
            );
            group.add(leaf);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.castShadow = true;
        group.receiveShadow = true;
        
        this.mesh = group;
        return group;
    }

    getBOQ() {
        return {
            نوع: 'نبات',
            النوع: this.type === 'shrub' ? 'شجيرة' : this.type === 'flower' ? 'زهرة' : 'غطاء أرضي',
            النوع_العلمي: this.species,
            الارتفاع: this.height.toFixed(2) + ' م',
            العرض: this.width.toFixed(2) + ' م',
            الكثافة: (this.density * 100).toFixed(0) + '%'
        };
    }
}