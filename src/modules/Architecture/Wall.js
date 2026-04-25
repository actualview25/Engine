// modules/Architecture/Wall.js
import * as THREE from 'three';
import { BuildingMaterial } from './Material.js';

export class Wall {
    constructor(options = {}) {
        this.startPoint = options.start || { x: 0, y: 0, z: 0 };
        this.endPoint = options.end || { x: 4, y: 0, z: 0 };
        this.height = options.height || 3.0; // متر
        this.thickness = options.thickness || 0.2; // متر
        
        this.material = new BuildingMaterial(options.material || 'concrete_block');
        this.finish = options.finish || null; // تشطيب خارجي
        
        this.hasOpening = options.hasOpening || false;
        this.openings = options.openings || []; // فتحات (أبواب/شبابيك)
        
        this.calculateDimensions();
    }
    
    calculateDimensions() {
        // حساب طول الجدار
        const dx = this.endPoint.x - this.startPoint.x;
        const dz = this.endPoint.z - this.startPoint.z;
        this.length = Math.sqrt(dx * dx + dz * dz);
        
        // حساب زاوية الدوران
        this.angle = Math.atan2(dz, dx);
        
        // حساب منتصف الجدار
        this.center = {
            x: (this.startPoint.x + this.endPoint.x) / 2,
            y: this.height / 2,
            z: (this.startPoint.z + this.endPoint.z) / 2
        };
    }
    
    calculateVolume() {
        return this.length * this.height * this.thickness;
    }
    
    calculateArea() {
        return this.length * this.height;
    }
    
    createMesh() {
        const geometry = new THREE.BoxGeometry(this.length, this.height, this.thickness);
        const material = new THREE.MeshStandardMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.9
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.center.x, this.center.y, this.center.z);
        mesh.rotation.y = this.angle;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // إضافة الفتحات
        this.openings.forEach(opening => {
            this.addOpening(mesh, opening);
        });
        
        return mesh;
    }
    
    addOpening(mesh, opening) {
        // هنا يمكن إضافة قطع للجدار لعمل فتحات
        // سنطورها لاحقاً
    }
    
    getBOQ() {
        const volume = this.calculateVolume();
        const area = this.calculateArea();
        
        return {
            نوع: 'جدار',
            أبعاد: `${this.length.toFixed(2)} × ${this.height.toFixed(2)} م`,
            سمك: this.thickness + ' م',
            مساحة: area.toFixed(2) + ' م²',
            حجم: volume.toFixed(2) + ' م³',
            مادة: this.material.name,
            عدد_الفتحات: this.openings.length
        };
    }
}