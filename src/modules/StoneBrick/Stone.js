// =======================================
// ACTUAL VIEW CONSTRUCTION OS - STONE
// =======================================

import * as THREE from 'three';

export class Stone {
    constructor(options = {}) {
        this.type = options.type || 'limestone';  // limestone, sandstone, granite, slate, basalt
        this.finish = options.finish || 'natural';  // natural, polished, rough, split
        this.color = options.color || this.getDefaultColor();
        this.size = options.size || { width: 0.4, height: 0.2, depth: 0.2 };  // أبعاد الحجر
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        this.mortar = options.mortar !== false;  // هل يوجد مونة
        this.mortarColor = options.mortarColor || 0xcccccc;
        
        this.mesh = null;
        this.texture = null;
        this.createdAt = new Date().toISOString();
    }

    getDefaultColor() {
        const colors = {
            'limestone': 0xeeeeee,
            'sandstone': 0xdeaa87,
            'granite': 0x888888,
            'slate': 0x444444,
            'basalt': 0x222222,
            'marble': 0xffffff,
            'travertine': 0xdeb887
        };
        return colors[this.type] || 0xcccccc;
    }

    getMaterialProperties() {
        const properties = {
            'limestone': { density: 2.3, hardness: 3, porosity: 0.2 },
            'sandstone': { density: 2.2, hardness: 2, porosity: 0.25 },
            'granite': { density: 2.7, hardness: 7, porosity: 0.05 },
            'slate': { density: 2.6, hardness: 4, porosity: 0.1 },
            'basalt': { density: 2.9, hardness: 6, porosity: 0.03 },
            'marble': { density: 2.6, hardness: 3, porosity: 0.1 },
            'travertine': { density: 2.4, hardness: 3, porosity: 0.3 }
        };
        return properties[this.type] || { density: 2.5, hardness: 3, porosity: 0.15 };
    }

    createMesh() {
        const group = new THREE.Group();

        // جسم الحجر
        const stoneGeo = new THREE.BoxGeometry(
            this.size.width,
            this.size.height,
            this.size.depth
        );

        // إضافة نسيج حسب نوع التشطيب
        let roughness = 0.7;
        let metalness = 0.1;
        
        switch(this.finish) {
            case 'polished':
                roughness = 0.2;
                metalness = 0.3;
                break;
            case 'rough':
                roughness = 0.9;
                break;
            case 'split':
                roughness = 0.8;
                break;
        }

        const stoneMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: roughness,
            metalness: metalness,
            emissive: 0x000000
        });

        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(0, this.size.height/2, 0);
        stone.castShadow = true;
        stone.receiveShadow = true;
        group.add(stone);

        // إضافة المونة حول الحجر
        if (this.mortar) {
            this.addMortar(group);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    addMortar(group) {
        // مونة أفقية
        const mortarHorGeo = new THREE.BoxGeometry(
            this.size.width + 0.02,
            0.01,
            this.size.depth + 0.02
        );
        const mortarMat = new THREE.MeshStandardMaterial({ 
            color: this.mortarColor,
            roughness: 0.9
        });
        
        // مونة علوية
        const mortarTop = new THREE.Mesh(mortarHorGeo, mortarMat);
        mortarTop.position.y = this.size.height;
        group.add(mortarTop);
        
        // مونة سفلية
        const mortarBottom = new THREE.Mesh(mortarHorGeo, mortarMat);
        mortarBottom.position.y = 0;
        group.add(mortarBottom);
        
        // مونة جانبية
        const mortarVertGeo = new THREE.BoxGeometry(0.01, this.size.height, this.size.depth + 0.02);
        
        const mortarLeft = new THREE.Mesh(mortarVertGeo, mortarMat);
        mortarLeft.position.set(-this.size.width/2, this.size.height/2, 0);
        group.add(mortarLeft);
        
        const mortarRight = new THREE.Mesh(mortarVertGeo, mortarMat);
        mortarRight.position.set(this.size.width/2, this.size.height/2, 0);
        group.add(mortarRight);
    }

    getBOQ() {
        const props = this.getMaterialProperties();
        const volume = this.size.width * this.size.height * this.size.depth;
        const weight = volume * props.density * 1000; // بالكيلوجرام

        const types = {
            'limestone': 'حجر جيري',
            'sandstone': 'حجر رملي',
            'granite': 'جرانيت',
            'slate': 'حجر أردواز',
            'basalt': 'بازلت',
            'marble': 'رخام',
            'travertine': 'ترافيرتين'
        };

        const finishes = {
            'natural': 'طبيعي',
            'polished': 'مصقول',
            'rough': 'خشن',
            'split': 'مشقق'
        };

        return {
            نوع: 'حجر',
            النوع: types[this.type] || this.type,
            التشطيب: finishes[this.finish] || this.finish,
            الأبعاد: `${this.size.width.toFixed(2)}×${this.size.height.toFixed(2)}×${this.size.depth.toFixed(2)} م`,
            الحجم: volume.toFixed(3) + ' م³',
            الوزن: weight.toFixed(0) + ' كجم',
            الكثافة: props.density.toFixed(1) + ' طن/م³',
            الصلادة: props.hardness + ' موس'
        };
    }

    static getStandardSizes() {
        return [
            { name: '20×20×40', width: 0.2, height: 0.2, depth: 0.4 },
            { name: '20×20×20', width: 0.2, height: 0.2, depth: 0.2 },
            { name: '30×30×60', width: 0.3, height: 0.3, depth: 0.6 },
            { name: '40×20×20', width: 0.4, height: 0.2, depth: 0.2 }
        ];
    }
}