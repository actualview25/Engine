// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GRANITE
// =======================================

import * as THREE from 'three';

export class Granite {
    constructor(options = {}) {
        this.type = options.type || 'gray';  // gray, black, pink, red, white
        this.color = options.color || this.getDefaultColor();
        this.grainSize = options.grainSize || 'medium';  // fine, medium, coarse
        this.finish = options.finish || 'polished';  // polished, flamed, honed, sandblasted
        this.size = options.size || { width: 1.0, height: 0.03, depth: 1.0 };
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        
        this.mesh = null;
        this.createdAt = new Date().toISOString();
    }

    getDefaultColor() {
        const colors = {
            'gray': 0x888888,
            'black': 0x333333,
            'pink': 0xffaaaa,
            'red': 0xcc6666,
            'white': 0xeeeeee
        };
        return colors[this.type] || 0x888888;
    }

    createMesh() {
        const group = new THREE.Group();

        // لوح الجرانيت
        const graniteGeo = new THREE.BoxGeometry(
            this.size.width,
            this.size.height,
            this.size.depth
        );

        // خصائص حسب التشطيب
        let roughness = 0.3;
        let metalness = 0.0;
        
        switch(this.finish) {
            case 'polished':
                roughness = 0.1;
                metalness = 0.1;
                break;
            case 'flamed':
                roughness = 0.9;
                break;
            case 'honed':
                roughness = 0.4;
                break;
            case 'sandblasted':
                roughness = 0.7;
                break;
        }

        const graniteMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: roughness,
            metalness: metalness
        });

        const granite = new THREE.Mesh(graniteGeo, graniteMat);
        granite.position.y = this.size.height / 2;
        granite.castShadow = true;
        granite.receiveShadow = true;
        group.add(granite);

        // إضافة حبيبات الجرانيت
        this.addGrains(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    addGrains(group) {
        // إضافة نقاط تمثل حبيبات الجرانيت
        const grainCount = 20 + Math.floor(Math.random() * 20);
        const grainGeo = new THREE.SphereGeometry(0.01, 4);
        
        for (let i = 0; i < grainCount; i++) {
            const grainColor = Math.random() > 0.7 ? 0xffffff : 0x222222;
            const grainMat = new THREE.MeshStandardMaterial({ color: grainColor });
            const grain = new THREE.Mesh(grainGeo, grainMat);
            
            grain.position.set(
                (Math.random() - 0.5) * this.size.width * 0.8,
                this.size.height / 2,
                (Math.random() - 0.5) * this.size.depth * 0.8
            );
            
            group.add(grain);
        }
    }

    getBOQ() {
        const volume = this.size.width * this.size.height * this.size.depth;
        const weight = volume * 2.7 * 1000; // كثافة الجرانيت ~2.7 طن/م³

        const types = {
            'gray': 'رمادي',
            'black': 'أسود',
            'pink': 'وردي',
            'red': 'أحمر',
            'white': 'أبيض'
        };

        const finishes = {
            'polished': 'مصقول',
            'flamed': 'ملهب',
            'honed': 'مطفي',
            'sandblasted': 'رمل'
        };

        const grains = {
            'fine': 'ناعم',
            'medium': 'متوسط',
            'coarse': 'خشن'
        };

        return {
            نوع: 'جرانيت',
            النوع: types[this.type] || this.type,
            التشطيب: finishes[this.finish] || this.finish,
            التحبب: grains[this.grainSize] || this.grainSize,
            الأبعاد: `${this.size.width.toFixed(2)}×${this.size.depth.toFixed(2)} م`,
            السمك: (this.size.height * 1000).toFixed(0) + ' مم',
            المساحة: (this.size.width * this.size.depth).toFixed(2) + ' م²',
            الوزن: weight.toFixed(0) + ' كجم'
        };
    }
}