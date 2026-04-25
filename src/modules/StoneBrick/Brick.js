// =======================================
// ACTUAL VIEW CONSTRUCTION OS - BRICK
// =======================================

import * as THREE from 'three';

export class Brick {
    constructor(options = {}) {
        this.type = options.type || 'clay';  // clay, concrete, fire, glass
        this.color = options.color || this.getDefaultColor();
        this.size = options.size || { width: 0.2, height: 0.1, depth: 0.1 };  // أبعاد الطوبة
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        this.mortar = options.mortar !== false;
        this.mortarColor = options.mortarColor || 0xcccccc;
        this.bond = options.bond || 'stretcher';  // stretcher, header, english, flemish
        
        this.mesh = null;
        this.createdAt = new Date().toISOString();
    }

    getDefaultColor() {
        const colors = {
            'clay': 0xcc8866,
            'concrete': 0xaaaaaa,
            'fire': 0xaa6644,
            'glass': 0x88aacc
        };
        return colors[this.type] || 0xcc8866;
    }

    createMesh() {
        const group = new THREE.Group();

        // جسم الطوبة
        const brickGeo = new THREE.BoxGeometry(
            this.size.width,
            this.size.height,
            this.size.depth
        );

        // إضافة نسيج للطوبة
        let roughness = 0.8;
        let metalness = 0.1;
        
        if (this.type === 'glass') {
            roughness = 0.1;
            metalness = 0.0;
        }

        const brickMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: roughness,
            metalness: metalness
        });

        const brick = new THREE.Mesh(brickGeo, brickMat);
        brick.position.set(0, this.size.height/2, 0);
        brick.castShadow = true;
        brick.receiveShadow = true;
        group.add(brick);

        // إضافة ثقوب للطوب المفرغ
        if (this.type === 'concrete' && options.hollow) {
            this.addHoles(group);
        }

        // إضافة المونة
        if (this.mortar) {
            this.addMortar(group);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    addHoles(group) {
        // ثقوب في الطوب المفرغ
        const holeGeo = new THREE.BoxGeometry(0.04, 0.06, 0.04);
        const holeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        for (let i = -1; i <= 1; i+=2) {
            const hole = new THREE.Mesh(holeGeo, holeMat);
            hole.position.set(i * 0.05, 0.05, 0);
            group.add(hole);
        }
    }

    addMortar(group) {
        const mortarMat = new THREE.MeshStandardMaterial({ 
            color: this.mortarColor,
            roughness: 0.9
        });

        // مونة أفقية
        const mortarHorGeo = new THREE.BoxGeometry(
            this.size.width + 0.01,
            0.005,
            this.size.depth + 0.01
        );
        
        const mortarTop = new THREE.Mesh(mortarHorGeo, mortarMat);
        mortarTop.position.y = this.size.height;
        group.add(mortarTop);
        
        const mortarBottom = new THREE.Mesh(mortarHorGeo, mortarMat);
        mortarBottom.position.y = 0;
        group.add(mortarBottom);

        // مونة جانبية
        const mortarVertGeo = new THREE.BoxGeometry(
            0.005,
            this.size.height,
            this.size.depth + 0.01
        );
        
        const mortarLeft = new THREE.Mesh(mortarVertGeo, mortarMat);
        mortarLeft.position.set(-this.size.width/2, this.size.height/2, 0);
        group.add(mortarLeft);
        
        const mortarRight = new THREE.Mesh(mortarVertGeo, mortarMat);
        mortarRight.position.set(this.size.width/2, this.size.height/2, 0);
        group.add(mortarRight);
    }

    getBOQ() {
        const volume = this.size.width * this.size.height * this.size.depth;
        const weight = volume * (this.type === 'clay' ? 1.8 : 2.4) * 1000;

        const types = {
            'clay': 'طوب أحمر',
            'concrete': 'طوب خرساني',
            'fire': 'طوب ناري',
            'glass': 'طوب زجاجي'
        };

        const bonds = {
            'stretcher': 'رابط ظهر',
            'header': 'رابط رأس',
            'english': 'رابط إنجليزي',
            'flemish': 'رابط فلمنكي'
        };

        return {
            نوع: 'طوب',
            النوع: types[this.type] || this.type,
            الرباط: bonds[this.bond] || this.bond,
            الأبعاد: `${this.size.width.toFixed(2)}×${this.size.height.toFixed(2)}×${this.size.depth.toFixed(2)} م`,
            الحجم: volume.toFixed(3) + ' م³',
            الوزن: weight.toFixed(0) + ' كجم',
            عدد_للمتر: Math.floor(1 / (this.size.width * this.size.height))
        };
    }

    static getStandardSizes() {
        return [
            { name: 'أحمر 20×10×10', width: 0.2, height: 0.1, depth: 0.1 },
            { name: 'أحمر 25×12×12', width: 0.25, height: 0.12, depth: 0.12 },
            { name: 'خرساني 40×20×20', width: 0.4, height: 0.2, depth: 0.2 },
            { name: 'خرساني مفرغ 40×20×20', width: 0.4, height: 0.2, depth: 0.2, hollow: true }
        ];
    }
}