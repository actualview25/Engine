// modules/Architecture/Finish.js
import * as THREE from 'three';
import { BuildingMaterial } from './Material.js';

export class Finish {
    constructor(options = {}) {
        this.type = options.type || 'paint'; // paint, wallpaper, tile
        this.material = new BuildingMaterial(options.material || 'paint_white');
        this.area = options.area || 0;
        this.color = options.color || this.material.color;
        
        this.surface = options.surface || 'wall'; // wall, ceiling, floor
        this.thickness = options.thickness || 0.001; // 1 مم
    }
    
    applyToSurface(mesh) {
        // تطبيق التشطيب على سطح موجود
        if (this.type === 'paint') {
            mesh.material.color.setHex(this.color);
            mesh.material.emissive.setHex(0x000000);
        } else if (this.type === 'tile') {
            // إضافة طبقة من البلاط
            const tileGeo = new THREE.BoxGeometry(0.6, 0.01, 0.6);
            const tileMat = new THREE.MeshStandardMaterial({
                color: this.color
            });
            
            // توزيع البلاط على السطح
            // سنطورها لاحقاً
        }
    }
    
    getBOQ() {
        return {
            نوع: this.type === 'paint' ? 'دهان' : 
                 this.type === 'wallpaper' ? 'ورق جدران' : 'بلاط',
            مادة: this.material.name,
            مساحة: this.area.toFixed(2) + ' م²',
            سعر_المتر: this.material.cost + ' ريال',
            التكلفة: (this.area * this.material.cost).toFixed(2) + ' ريال'
        };
    }
}