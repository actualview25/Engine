// modules/Architecture/Door.js
import * as THREE from 'three';
import { BuildingMaterial } from './Material.js';

export class Door {
    constructor(options = {}) {
        this.type = options.type || 'single'; // single, double, sliding
        this.width = options.width || 0.9; // متر
        this.height = options.height || 2.1; // متر
        this.thickness = options.thickness || 0.05; // متر
        
        this.material = new BuildingMaterial(options.material || 'wood');
        this.glass = options.glass || false;
        this.handle = options.handle || 'standard';
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // إطار الباب
        const frameGeo = new THREE.BoxGeometry(this.width, this.height, this.thickness);
        const frameMat = new THREE.MeshStandardMaterial({
            color: this.material.color
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, this.height/2, 0);
        group.add(frame);
        
        // مقبض الباب
        const handleGeo = new THREE.SphereGeometry(0.03, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(this.width/3, this.height/2, this.thickness/2 + 0.01);
        group.add(handle);
        
        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        return group;
    }
    
    getBOQ() {
        return {
            نوع: this.type === 'single' ? 'باب مفرد' : 
                 this.type === 'double' ? 'باب مزدوج' : 'باب منزلق',
            أبعاد: `${this.width} × ${this.height} م`,
            مادة: this.material.name,
            زجاج: this.glass ? 'نعم' : 'لا'
        };
    }
}