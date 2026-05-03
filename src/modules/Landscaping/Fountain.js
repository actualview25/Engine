// =======================================
// ACTUAL VIEW CONSTRUCTION OS - FOUNTAIN
// =======================================

import * as THREE from 'three';

export class Fountain {
    constructor(options = {}) {
        this.type = options.type || 'classic';  // classic, modern, waterfall
        this.diameter = options.diameter || 2.0;  // متر
        this.height = options.height || 1.5;  // متر
        this.material = options.material || 'stone';  // stone, marble, concrete
        this.waterFlow = options.waterFlow || true;  // هل يوجد ماء
        this.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.waterParticles = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // حوض النافورة السفلي
        const baseGeo = new THREE.CylinderGeometry(
            this.diameter, 
            this.diameter * 1.1, 
            0.3, 
            16
        );
        const baseMat = new THREE.MeshStandardMaterial({ 
            color: this.getMaterialColor(),
            roughness: 0.7
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.15;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // الحوض العلوي
        const topGeo = new THREE.CylinderGeometry(
            this.diameter * 0.6, 
            this.diameter * 0.7, 
            0.4, 
            16
        );
        const top = new THREE.Mesh(topGeo, baseMat);
        top.position.y = 0.5;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);

        // عمود في الوسط
        const columnGeo = new THREE.CylinderGeometry(0.2, 0.25, 1.0, 8);
        const columnMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const column = new THREE.Mesh(columnGeo, columnMat);
        column.position.y = 1.0;
        column.castShadow = true;
        column.receiveShadow = true;
        group.add(column);

        // كرة في الأعلى
        const sphereGeo = new THREE.SphereGeometry(0.25, 8);
        const sphereMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.y = 1.5;
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        group.add(sphere);

        // إضافة الماء إذا مطلوب
        if (this.waterFlow) {
            this.createWater(group);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    getMaterialColor() {
        const colors = {
            'stone': 0x888888,
            'marble': 0xcccccc,
            'concrete': 0x999999
        };
        return colors[this.material] || 0x888888;
    }

    createWater(group) {
        // ماء في الحوض السفلي
        const waterGeo = new THREE.CylinderGeometry(this.diameter * 0.8, this.diameter * 0.8, 0.05, 16);
        const waterMat = new THREE.MeshStandardMaterial({ 
            color: 0x44aaff,
            transparent: true,
            opacity: 0.6,
            emissive: 0x112244
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.y = 0.3;
        water.receiveShadow = true;
        group.add(water);

        // ماء في الحوض العلوي
        const topWaterGeo = new THREE.CylinderGeometry(this.diameter * 0.5, this.diameter * 0.5, 0.05, 16);
        const topWater = new THREE.Mesh(topWaterGeo, waterMat);
        topWater.position.y = 0.7;
        topWater.receiveShadow = true;
        group.add(topWater);
    }

    getBOQ() {
        const types = {
            'classic': 'كلاسيك',
            'modern': 'حديث',
            'waterfall': 'شلال'
        };

        return {
            نوع: 'نافورة',
            النوع: types[this.type] || this.type,
            القطر: this.diameter.toFixed(2) + ' م',
            الارتفاع: this.height.toFixed(2) + ' م',
            المادة: this.material,
            تدفق_ماء: this.waterFlow ? 'نعم' : 'لا'
        };
    }
}
