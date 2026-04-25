// modules/Architecture/Floor.js
import * as THREE from 'three';
import { BuildingMaterial } from './Material.js';

export class Floor {
    constructor(options = {}) {
        this.width = options.width || 5.0; // متر
        this.length = options.length || 5.0; // متر
        this.thickness = options.thickness || 0.02; // متر
        
        this.material = new BuildingMaterial(options.material || 'tile_ceramic');
        this.baseMaterial = options.baseMaterial || 'concrete';
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
    }
    
    calculateArea() {
        return this.width * this.length;
    }
    
    createMesh() {
        const geometry = new THREE.BoxGeometry(this.width, this.thickness, this.length);
        const material = new THREE.MeshStandardMaterial({
            color: this.material.color,
            roughness: 0.3,
            metalness: 0.1
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.position.x, this.position.y, this.position.z);
        mesh.rotation.y = this.rotation;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    getBOQ() {
        const area = this.calculateArea();
        return {
            نوع: 'أرضيات',
            أبعاد: `${this.width} × ${this.length} م`,
            مساحة: area.toFixed(2) + ' م²',
            مادة: this.material.name,
            عدد_البلاط: Math.ceil(area / 0.36) + ' بلاطة' // بلاط 60×60
        };
    }
}