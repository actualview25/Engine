// modules/Concrete/Foundation.js
import * as THREE from 'three';
import { ConcreteMaterial } from './ConcreteMaterial.js';
import { RebarLayout } from './Rebar.js';

export class Foundation {
    constructor(options = {}) {
        this.type = options.type || 'isolated'; // isolated, strip, raft
        this.width = options.width || 1.0; // متر
        this.length = options.length || 1.0; // متر
        this.height = options.height || 0.5; // متر
        this.material = new ConcreteMaterial(options.grade || 'C30');
        this.rebars = new RebarLayout(options.rebars || {});
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
    }
    
    calculateVolume() {
        return this.width * this.length * this.height;
    }
    
    calculateRebarWeight() {
        return this.rebars.calculateWeight(this.length);
    }
    
    createMesh() {
        let geometry;
        
        switch(this.type) {
            case 'strip':
                geometry = new THREE.BoxGeometry(this.length, this.height, this.width);
                break;
            case 'raft':
                geometry = new THREE.BoxGeometry(this.length, this.height, this.width);
                break;
            default: // isolated
                geometry = new THREE.BoxGeometry(this.width, this.height, this.width);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.position.x, this.position.y, this.position.z);
        mesh.rotation.y = this.rotation;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    getBOQ() {
        const volume = this.calculateVolume();
        return {
            نوع: this.type === 'isolated' ? 'قاعدة منفصلة' : 
                 this.type === 'strip' ? 'قاعدة شريطية' : 'لبشة',
            أبعاد: `${this.width} × ${this.length} × ${this.height} م`,
            حجم_الخرسانة: volume.toFixed(2) + ' م³',
            وزن_الحديد: this.calculateRebarWeight().toFixed(2) + ' كجم',
            خرسانة: this.material.grade,
            نسبة_الخلط: this.material.mixRatio
        };
    }
}