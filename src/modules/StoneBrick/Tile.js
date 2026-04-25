// =======================================
// ACTUAL VIEW CONSTRUCTION OS - TILE
// =======================================

import * as THREE from 'three';

export class Tile {
    constructor(options = {}) {
        this.type = options.type || 'ceramic';  // ceramic, porcelain, stone, wood
        this.size = options.size || { width: 0.3, height: 0.3, thickness: 0.01 };
        this.color = options.color || this.getDefaultColor();
        this.finish = options.finish || 'matte';  // matte, glossy, textured
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        this.pattern = options.pattern || 'grid';  // grid, herringbone, basket
        
        this.mesh = null;
        this.groups = [];  // للبلاطات المتعددة
        this.createdAt = new Date().toISOString();
    }

    getDefaultColor() {
        const colors = {
            'ceramic': 0xffffff,
            'porcelain': 0xeeeeee,
            'stone': 0xaaaaaa,
            'wood': 0xdeaa87
        };
        return colors[this.type] || 0xffffff;
    }

    createMesh() {
        const group = new THREE.Group();

        // بلاطة واحدة
        const tileGeo = new THREE.BoxGeometry(
            this.size.width,
            this.size.thickness,
            this.size.height
        );

        // خصائص المادة حسب النوع
        let roughness = 0.6;
        let metalness = 0.0;
        
        if (this.finish === 'glossy') {
            roughness = 0.2;
            metalness = 0.1;
        } else if (this.finish === 'textured') {
            roughness = 0.8;
        }

        if (this.type === 'wood') {
            roughness = 0.7;
        }

        const tileMat = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: roughness,
            metalness: metalness
        });

        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.y = this.size.thickness / 2;
        tile.receiveShadow = true;
        group.add(tile);

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    // إنشاء أرضية من البلاط
    createFloor(width, length, spacing = 0.002) {
        const floorGroup = new THREE.Group();
        const tileWidth = this.size.width + spacing;
        const tileLength = this.size.height + spacing;
        
        const cols = Math.floor(width / tileWidth);
        const rows = Math.floor(length / tileLength);
        
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const tile = new Tile({
                    ...this,
                    position: {
                        x: i * tileWidth - width/2 + tileWidth/2,
                        y: 0,
                        z: j * tileLength - length/2 + tileLength/2
                    }
                });
                
                const mesh = tile.createMesh();
                floorGroup.add(mesh);
                this.groups.push(mesh);
            }
        }
        
        return floorGroup;
    }

    getBOQ() {
        const area = this.size.width * this.size.height;

        const types = {
            'ceramic': 'سيراميك',
            'porcelain': 'بورسلين',
            'stone': 'حجر',
            'wood': 'باركيه'
        };

        const finishes = {
            'matte': 'مطفي',
            'glossy': 'لامع',
            'textured': 'محبب'
        };

        return {
            نوع: 'بلاط',
            النوع: types[this.type] || this.type,
            التشطيب: finishes[this.finish] || this.finish,
            الأبعاد: `${this.size.width.toFixed(2)}×${this.size.height.toFixed(2)} م`,
            السمك: (this.size.thickness * 1000).toFixed(0) + ' مم',
            مساحة_البلاطة: area.toFixed(3) + ' م²',
            عدد_للمتر: Math.floor(1 / area)
        };
    }

    static getStandardSizes() {
        return [
            { name: 'سيراميك 30×30', width: 0.3, height: 0.3 },
            { name: 'سيراميك 40×40', width: 0.4, height: 0.4 },
            { name: 'بورسلين 60×60', width: 0.6, height: 0.6 },
            { name: 'بورسلين 80×80', width: 0.8, height: 0.8 },
            { name: 'باركيه 10×50', width: 0.1, height: 0.5 }
        ];
    }
}