// =======================================
// ACTUAL VIEW CONSTRUCTION OS - MARBLE
// =======================================

import * as THREE from 'three';

export class Marble {
    constructor(options = {}) {
        this.type = options.type || 'carrara';  // carrara, calacatta, emperador, travertine
        this.color = options.color || this.getDefaultColor();
        this.veinColor = options.veinColor || this.getVeinColor();
        this.finish = options.finish || 'polished';  // polished, honed, brushed
        this.size = options.size || { width: 1.0, height: 0.02, depth: 1.0 };  // للوحات
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        
        this.mesh = null;
        this.texture = null;
        this.createdAt = new Date().toISOString();
    }

    getDefaultColor() {
        const colors = {
            'carrara': 0xffffff,
            'calacatta': 0xffffee,
            'emperador': 0x8B4513,
            'travertine': 0xdeb887,
            'nero': 0x222222,
            'verde': 0x228822
        };
        return colors[this.type] || 0xffffff;
    }

    getVeinColor() {
        const veins = {
            'carrara': 0xcccccc,
            'calacatta': 0xffaa44,
            'emperador': 0xffffff,
            'travertine': 0xcccccc,
            'nero': 0x888888,
            'verde': 0x226622
        };
        return veins[this.type] || 0xcccccc;
    }

    createMesh() {
        const group = new THREE.Group();

        // لوح الرخام
        const marbleGeo = new THREE.BoxGeometry(
            this.size.width,
            this.size.height,
            this.size.depth
        );

        // خصائص حسب التشطيب
        let roughness = 0.1;
        let metalness = 0.0;
        
        switch(this.finish) {
            case 'polished':
                roughness = 0.1;
                metalness = 0.1;
                break;
            case 'honed':
                roughness = 0.3;
                break;
            case 'brushed':
                roughness = 0.6;
                break;
        }

        const marbleMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: roughness,
            metalness: metalness,
            emissive: 0x000000
        });

        const marble = new THREE.Mesh(marbleGeo, marbleMat);
        marble.position.y = this.size.height / 2;
        marble.castShadow = true;
        marble.receiveShadow = true;
        group.add(marble);

        // إضافة العروق (باستخدام خطوط)
        this.addVeins(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    addVeins(group) {
        // إضافة خطوط تمثل العروق في الرخام
        const veinCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < veinCount; i++) {
            const veinGeo = new THREE.BoxGeometry(
                this.size.width * (0.3 + Math.random() * 0.5),
                0.001,
                0.001
            );
            const veinMat = new THREE.MeshStandardMaterial({ 
                color: this.veinColor,
                emissive: 0x111111
            });
            const vein = new THREE.Mesh(veinGeo, veinMat);
            
            vein.position.set(
                (Math.random() - 0.5) * this.size.width * 0.8,
                this.size.height / 2 + 0.001,
                (Math.random() - 0.5) * this.size.depth * 0.8
            );
            
            vein.rotation.z = (Math.random() - 0.5) * 0.5;
            vein.rotation.y = (Math.random() - 0.5) * 0.5;
            
            group.add(vein);
        }
    }

    getBOQ() {
        const volume = this.size.width * this.size.height * this.size.depth;
        const weight = volume * 2.6 * 1000; // كثافة الرخام ~2.6 طن/م³

        const types = {
            'carrara': 'كارارا',
            'calacatta': 'كالاكاتا',
            'emperador': 'إمبرادور',
            'travertine': 'ترافيرتين',
            'nero': 'أسود',
            'verde': 'أخضر'
        };

        const finishes = {
            'polished': 'مصقول',
            'honed': 'مطفي',
            'brushed': 'مشطوب'
        };

        return {
            نوع: 'رخام',
            النوع: types[this.type] || this.type,
            التشطيب: finishes[this.finish] || this.finish,
            الأبعاد: `${this.size.width.toFixed(2)}×${this.size.depth.toFixed(2)} م`,
            السمك: (this.size.height * 1000).toFixed(0) + ' مم',
            المساحة: (this.size.width * this.size.depth).toFixed(2) + ' م²',
            الوزن: weight.toFixed(0) + ' كجم'
        };
    }

    static getStandardSizes() {
        return [
            { name: 'لوح 2×1 متر', width: 2.0, depth: 1.0 },
            { name: 'لوح 2.5×1.5 متر', width: 2.5, depth: 1.5 },
            { name: 'بلاط 60×60', width: 0.6, depth: 0.6 },
            { name: 'بلاط 80×80', width: 0.8, depth: 0.8 }
        ];
    }
}