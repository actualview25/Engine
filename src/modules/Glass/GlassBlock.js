// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GLASS BLOCK
// =======================================

import * as THREE from 'three';

export class GlassBlock {
    constructor(options = {}) {
        this.size = options.size || { width: 0.19, height: 0.19, depth: 0.08 };
        this.color = options.color || 0xaaccff;
        self.transparency = options.transparency || 0.6;
        self.texture = options.texture || 'clear';  // clear, frosted, patterned
        self.position = options.position || { x: 0, y: 0, z: 0 };
        self.rotation = options.rotation || 0;
        
        this.mesh = null;
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // جسم الطوبة الزجاجية
        const blockGeo = new THREE.BoxGeometry(
            this.size.width,
            this.size.height,
            this.size.depth
        );

        let roughness = 0.2;
        if (this.texture === 'frosted') roughness = 0.6;

        const blockMat = new THREE.MeshStandardMaterial({
            color: this.color,
            transparent: true,
            opacity: this.transparency,
            roughness: roughness,
            metalness: 0.1,
            emissive: 0x112233,
            side: THREE.DoubleSide
        });

        const block = new THREE.Mesh(blockGeo, blockMat);
        block.position.y = this.size.height / 2;
        block.castShadow = true;
        block.receiveShadow = true;
        group.add(block);

        // إضافة سطح محبب إذا كان منقوشاً
        if (this.texture === 'patterned') {
            this.addPattern(group);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    addPattern(group) {
        const patternMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        // خطوط متقاطعة على السطح
        const lineGeo = new THREE.BoxGeometry(this.size.width - 0.02, 0.005, 0.005);
        
        // خط أفقي
        const hLine = new THREE.Mesh(lineGeo, patternMat);
        hLine.position.set(0, this.size.height/2, this.size.depth/2);
        group.add(hLine);

        // خط رأسي
        const vLine = new THREE.Mesh(lineGeo, patternMat);
        vLine.rotation.y = Math.PI / 2;
        vLine.position.set(0, this.size.height/2, this.size.depth/2);
        group.add(vLine);
    }

    // إنشاء جدار من الطوب الزجاجي
    createWall(width, height) {
        const wallGroup = new THREE.Group();
        
        const cols = Math.floor(width / this.size.width);
        const rows = Math.floor(height / this.size.height);

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const x = (col + 0.5) * this.size.width - width/2;
                const y = (row + 0.5) * this.size.height;
                
                const block = new GlassBlock({
                    ...this,
                    position: { x, y, z: 0 }
                });
                
                wallGroup.add(block.createMesh());
            }
        }

        return wallGroup;
    }

    getBOQ() {
        const volume = this.size.width * this.size.height * this.size.depth;

        const textures = {
            'clear': 'شفاف',
            'frosted': 'مطفي',
            'patterned': 'منقوش'
        };

        return {
            نوع: 'طوب زجاجي',
            الأبعاد: `${(this.size.width*100).toFixed(0)}×${(this.size.height*100).toFixed(0)}×${(this.size.depth*100).toFixed(0)} مم`,
            الحجم: volume.toFixed(3) + ' م³',
            الشفافية: (this.transparency * 100).toFixed(0) + '%',
            الملمس: textures[this.texture] || this.texture
        };
    }

    static getStandardSizes() {
        return [
            { name: '19×19×8 سم', width: 0.19, height: 0.19, depth: 0.08 },
            { name: '24×24×8 سم', width: 0.24, height: 0.24, depth: 0.08 },
            { name: '30×30×10 سم', width: 0.30, height: 0.30, depth: 0.10 }
        ];
    }
}