// modules/Concrete/Column.js
import * as THREE from 'three';
import { ConcreteMaterial } from './ConcreteMaterial.js';
import { RebarLayout } from './Rebar.js';

export class Column {
    constructor(options = {}) {
        this.shape = options.shape || 'rectangular'; // rectangular, circular
        this.width = options.width || 0.3; // متر
        this.depth = options.depth || 0.3; // متر
        this.diameter = options.diameter || 0.3; // متر
        this.height = options.height || 3.0; // متر
        
        this.material = new ConcreteMaterial(options.grade || 'C35');
        this.rebars = new RebarLayout(options.rebars || {});
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
    }
    
    calculateVolume() {
        if (this.shape === 'circular') {
            return Math.PI * Math.pow(this.diameter/2, 2) * this.height;
        } else {
            return this.width * this.depth * this.height;
        }
    }
    
    calculateRebarWeight() {
        return this.rebars.calculateWeight(this.height);
    }
    
    createMesh() {
        let geometry;
        
        if (this.shape === 'circular') {
            geometry = new THREE.CylinderGeometry(this.diameter/2, this.diameter/2, this.height, 16);
        } else {
            geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.9
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(this.position.x, this.position.y + this.height/2, this.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    getBOQ() {
        const volume = this.calculateVolume();
        return {
            نوع: this.shape === 'circular' ? 'عمود دائري' : 'عمود مربع',
            أبعاد: this.shape === 'circular' ? 
                `قطر ${this.diameter} م × ارتفاع ${this.height} م` :
                `${this.width} × ${this.depth} × ${this.height} م`,
            حجم_الخرسانة: volume.toFixed(2) + ' م³',
            وزن_الحديد: this.calculateRebarWeight().toFixed(2) + ' كجم',
            خرسانة: this.material.grade,
            نسبة_الخلط: this.material.mixRatio
        };
    }
}