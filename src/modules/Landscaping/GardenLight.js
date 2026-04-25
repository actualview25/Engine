// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GARDEN LIGHT
// =======================================

import * as THREE from 'three';

export class GardenLight {
    constructor(options = {}) {
        this.type = options.type || 'path';  // path, spot, pole, decorative
        this.height = options.height || 0.8;  // متر
        this.color = options.color || 0xffaa44;  // لون الضوء
        this.intensity = options.intensity || 1.0;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.light = null;
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // عمود الإنارة
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, this.height, 6);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = this.height / 2;
        pole.castShadow = true;
        pole.receiveShadow = true;
        group.add(pole);

        // رأس الإنارة
        const headGeo = new THREE.SphereGeometry(0.1, 6);
        const headMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: this.color,
            emissiveIntensity: this.intensity
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = this.height;
        head.castShadow = true;
        group.add(head);

        // إضافة الضوء
        this.light = new THREE.PointLight(this.color, this.intensity, 5);
        this.light.position.y = this.height;
        group.add(this.light);

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    // تشغيل/إطفاء الإنارة
    toggle(state) {
        if (this.light) {
            this.light.visible = state;
        }
        console.log(`💡 Garden light turned ${state ? 'on' : 'off'}`);
    }

    getBOQ() {
        const types = {
            'path': 'إنارة ممرات',
            'spot': 'إنارة موجهة',
            'pole': 'عمود إنارة',
            'decorative': 'إنارة ديكورية'
        };

        return {
            نوع: 'إنارة حدائق',
            النوع: types[this.type] || this.type,
            الارتفاع: this.height.toFixed(2) + ' م',
            شدة_الإضاءة: this.intensity.toFixed(1),
            لون_الضوء: '#' + this.color.toString(16)
        };
    }
}