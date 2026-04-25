// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GLASS
// =======================================

import * as THREE from 'three';

export class Glass {
    constructor(options = {}) {
        this.type = options.type || 'clear';  // clear, frosted, tinted, reflective, laminated
        this.color = options.color || this.getDefaultColor();
        this.thickness = options.thickness || 0.01;  // 10mm default
        this.width = options.width || 1.0;
        this.height = options.height || 1.0;
        this.transparency = options.transparency || 0.8;
        this.reflectivity = options.reflectivity || 0.2;
        this.roughness = options.roughness || 0.1;
        this.tint = options.tint || 0xffffff;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        
        this.mesh = null;
        this.createdAt = new Date().toISOString();
    }

    getDefaultColor() {
        const colors = {
            'clear': 0xffffff,
            'frosted': 0xeeeeee,
            'tinted': 0xaaccff,
            'reflective': 0x88aadd,
            'laminated': 0xccddff,
            'tempered': 0xffffff,
            'insulated': 0xffffff
        };
        return colors[this.type] || 0xffffff;
    }

    createMesh() {
        const group = new THREE.Group();

        // لوح الزجاج
        const glassGeo = new THREE.BoxGeometry(this.width, this.height, this.thickness);

        // خصائص الزجاج حسب النوع
        let transparent = true;
        let opacity = this.transparency;
        let roughness = this.roughness;
        let metalness = this.reflectivity;
        let emissive = 0x000000;

        switch(this.type) {
            case 'frosted':
                roughness = 0.4;
                break;
            case 'reflective':
                metalness = 0.8;
                roughness = 0.1;
                break;
            case 'tinted':
                opacity = 0.7;
                break;
            case 'laminated':
                opacity = 0.9;
                break;
        }

        const glassMat = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: emissive,
            transparent: transparent,
            opacity: opacity,
            roughness: roughness,
            metalness: metalness,
            side: THREE.DoubleSide
        });

        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.y = this.height / 2;
        glass.castShadow = true;
        glass.receiveShadow = true;
        group.add(glass);

        // إضافة إطار إذا كان مطلوباً
        if (options.frame) {
            this.addFrame(group);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    addFrame(group) {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const frameThickness = 0.05;

        // إطار علوي
        const topFrame = new THREE.Mesh(
            new THREE.BoxGeometry(this.width + frameThickness, frameThickness, frameThickness),
            frameMat
        );
        topFrame.position.set(0, this.height, 0);
        group.add(topFrame);

        // إطار سفلي
        const bottomFrame = new THREE.Mesh(
            new THREE.BoxGeometry(this.width + frameThickness, frameThickness, frameThickness),
            frameMat
        );
        bottomFrame.position.set(0, 0, 0);
        group.add(bottomFrame);

        // إطار أيمن
        const rightFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameThickness, this.height, frameThickness),
            frameMat
        );
        rightFrame.position.set(this.width/2, this.height/2, 0);
        group.add(rightFrame);

        // إطار أيسر
        const leftFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameThickness, this.height, frameThickness),
            frameMat
        );
        leftFrame.position.set(-this.width/2, this.height/2, 0);
        group.add(leftFrame);
    }

    getSpecs() {
        const specs = {
            'clear': { uValue: 5.7, shgc: 0.87, vt: 0.88 },
            'tinted': { uValue: 5.7, shgc: 0.62, vt: 0.55 },
            'reflective': { uValue: 5.5, shgc: 0.35, vt: 0.30 },
            'laminated': { uValue: 5.5, shgc: 0.70, vt: 0.75 },
            'insulated': { uValue: 2.5, shgc: 0.60, vt: 0.70 }
        };
        return specs[this.type] || specs.clear;
    }

    getBOQ() {
        const area = this.width * this.height;
        const specs = this.getSpecs();

        const types = {
            'clear': 'شفاف',
            'frosted': 'مطفي',
            'tinted': 'ملون',
            'reflective': 'عاكس',
            'laminated': 'مُصفّح',
            'tempered': 'مُقسّى',
            'insulated': 'عازل'
        };

        return {
            نوع: 'زجاج',
            النوع: types[this.type] || this.type,
            الأبعاد: `${this.width.toFixed(2)} × ${this.height.toFixed(2)} م`,
            السمك: (this.thickness * 1000).toFixed(0) + ' مم',
            المساحة: area.toFixed(2) + ' م²',
            الشفافية: (this.transparency * 100).toFixed(0) + '%',
            معامل_U: specs.uValue.toFixed(2),
            معامل_SHGC: specs.shgc.toFixed(2),
            نفاذية_ضوء: (specs.vt * 100).toFixed(0) + '%'
        };
    }

    static getStandardThickness() {
        return [3, 4, 5, 6, 8, 10, 12, 15, 19].map(t => t / 1000);
    }
}