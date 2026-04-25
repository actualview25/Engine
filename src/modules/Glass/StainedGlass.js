// =======================================
// ACTUAL VIEW CONSTRUCTION OS - STAINED GLASS
// =======================================

import * as THREE from 'three';
import { Glass } from './Glass.js';

export class StainedGlass extends Glass {
    constructor(options = {}) {
        super(options);
        this.pattern = options.pattern || 'geometric';  // geometric, floral, religious
        self.leadWidth = options.leadWidth || 0.005;
        self.colorCount = options.colorCount || 5;
        self.designFile = options.designFile || null;
        self.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // إنشاء الخلفية الزجاجية
        const baseGlass = super.createMesh();
        group.add(baseGlass);

        // إنشاء إطار الرصاص
        this.createLeadFrame(group);

        // إنشاء الزخارف الملونة
        this.createColorPatches(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    createLeadFrame(group) {
        const leadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // إطار خارجي
        const frameGeo = new THREE.BoxGeometry(
            this.width + 0.02,
            this.height + 0.02,
            this.thickness + 0.01
        );
        const frame = new THREE.Mesh(frameGeo, leadMat);
        frame.position.y = this.height/2;
        group.add(frame);

        // تقسيمات داخلية حسب النمط
        if (this.pattern === 'geometric') {
            this.createGeometricPattern(group);
        } else if (this.pattern === 'floral') {
            this.createFloralPattern(group);
        }
    }

    createGeometricPattern(group) {
        const leadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const divisions = 4;

        // خطوط أفقية
        for (let i = 1; i < divisions; i++) {
            const y = (i / divisions) * this.height;
            
            const lineGeo = new THREE.BoxGeometry(this.width, this.leadWidth, 0.001);
            const line = new THREE.Mesh(lineGeo, leadMat);
            line.position.set(0, y, 0);
            group.add(line);
        }

        // خطوط رأسية
        for (let i = 1; i < divisions; i++) {
            const x = (i / divisions - 0.5) * this.width;
            
            const lineGeo = new THREE.BoxGeometry(this.leadWidth, this.height, 0.001);
            const line = new THREE.Mesh(lineGeo, leadMat);
            line.position.set(x, this.height/2, 0);
            group.add(line);
        }

        // خطوط قطرية
        for (let i = 0; i < 2; i++) {
            const angle = i * Math.PI / 2;
            // يمكن إضافة خطوط قطرية هنا
        }
    }

    createFloralPattern(group) {
        // زخارف نباتية مبسطة
        // يمكن تطويرها لاحقاً
    }

    createColorPatches(group) {
        const colors = [
            0xff0000, 0x00ff00, 0x0000ff, 
            0xffff00, 0xff00ff, 0x00ffff,
            0xffaa00, 0xaa00ff, 0xff66aa
        ];

        const patchCount = this.colorCount;
        const patchSize = Math.min(this.width, this.height) / 4;

        for (let i = 0; i < patchCount; i++) {
            const color = colors[i % colors.length];
            const x = (Math.random() - 0.5) * this.width * 0.6;
            const y = Math.random() * this.height * 0.8 + this.height * 0.1;

            const patchGeo = new THREE.CircleGeometry(patchSize * (0.5 + Math.random()), 16);
            const patchMat = new THREE.MeshStandardMaterial({
                color: color,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });

            const patch = new THREE.Mesh(patchGeo, patchMat);
            patch.position.set(x, y, this.thickness/2 + 0.001);
            patch.rotation.y = Math.random() * Math.PI;
            
            group.add(patch);
        }
    }

    getBOQ() {
        const baseBOQ = super.getBOQ();

        const patterns = {
            'geometric': 'هندسي',
            'floral': 'نباتي',
            'religious': 'ديني'
        };

        return {
            ...baseBOQ,
            النوع: 'زجاج معشق',
            النمط: patterns[this.pattern] || this.pattern,
            عدد_الألوان: this.colorCount
        };
    }
}