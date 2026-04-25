// modules/Concrete/Slab.js
import * as THREE from 'three';
import { ConcreteMaterial } from './ConcreteMaterial.js';
import { RebarLayout } from './Rebar.js';

export class Slab {
    constructor(options = {}) {
        this.type = options.type || 'solid'; // solid, hollow, ribbed
        this.width = options.width || 5.0; // متر
        this.length = options.length || 5.0; // متر
        this.thickness = options.thickness || 0.15; // متر
        
        this.material = new ConcreteMaterial(options.grade || 'C30');
        this.rebars = new RebarLayout({
            mainBars: options.mainBars || [],
            spacing: 150 // 15 سم
        });
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
    }
    
    calculateVolume() {
        return this.width * this.length * this.thickness;
    }
    
    calculateRebarWeight() {
        // حديد في اتجاهين
        const mainSteel = this.rebars.calculateWeight(this.length) * (this.width / 0.15);
        const secondarySteel = this.rebars.calculateWeight(this.width) * (this.length / 0.15);
        return mainSteel + secondarySteel;
    }
    
    createMesh() {
        const geometry = new THREE.BoxGeometry(this.width, this.thickness, this.length);
        const material = new THREE.MeshStandardMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.7
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.position.x, this.position.y + this.thickness/2, this.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    getBOQ() {
        const volume = this.calculateVolume();
        return {
            نوع: 'سقف',
            أبعاد: `${this.width} × ${this.length} × ${this.thickness} م`,
            المساحة: (this.width * this.length).toFixed(2) + ' م²',
            حجم_الخرسانة: volume.toFixed(2) + ' م³',
            وزن_الحديد: this.calculateRebarWeight().toFixed(2) + ' كجم',
            خرسانة: this.material.grade
        };
    }
}