// modules/Concrete/Beam.js
import * as THREE from 'three';
import { ConcreteMaterial } from './ConcreteMaterial.js';
import { RebarLayout } from './Rebar.js';

export class Beam {
    constructor(options = {}) {
        this.width = options.width || 0.2; // متر
        this.depth = options.depth || 0.5; // متر
        this.length = options.length || 4.0; // متر
        
        this.material = new ConcreteMaterial(options.grade || 'C35');
        this.rebars = new RebarLayout(options.rebars || {});
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
    }
    
    calculateVolume() {
        return this.width * this.depth * this.length;
    }
    
    createMesh() {
        const geometry = new THREE.BoxGeometry(this.length, this.depth, this.width);
        const material = new THREE.MeshStandardMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.position.x, this.position.y + this.depth/2, this.position.z);
        mesh.rotation.y = this.rotation;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    getBOQ() {
        const volume = this.calculateVolume();
        return {
            نوع: 'كمرة',
            أبعاد: `${this.width} × ${this.depth} × ${this.length} م`,
            حجم_الخرسانة: volume.toFixed(2) + ' م³',
            وزن_الحديد: this.rebars.calculateWeight(this.length).toFixed(2) + ' كجم',
            خرسانة: this.material.grade
        };
    }
}