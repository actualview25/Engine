// modules/Architecture/Window.js
import * as THREE from 'three';
import { BuildingMaterial } from './Material.js';

export class Window {
    constructor(options = {}) {
        this.type = options.type || 'sliding'; // sliding, casement, fixed
        this.width = options.width || 1.2; // متر
        this.height = options.height || 1.2; // متر
        this.sillHeight = options.sillHeight || 0.9; // ارتفاع العتبة
        
        this.frameMaterial = new BuildingMaterial(options.frameMaterial || 'wood');
        this.glassMaterial = options.glassMaterial || 'clear';
        
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.wallThickness = options.wallThickness || 0.2;
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // إطار الشباك
        const frameGeo = new THREE.BoxGeometry(this.width, this.height, 0.05);
        const frameMat = new THREE.MeshStandardMaterial({
            color: this.frameMaterial.color
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, this.height/2, 0);
        group.add(frame);
        
        // زجاج
        const glassGeo = new THREE.BoxGeometry(this.width - 0.1, this.height - 0.1, 0.02);
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x88CCFF,
            transparent: true,
            opacity: 0.3
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, this.height/2, 0.02);
        group.add(glass);
        
        group.position.set(
            this.position.x,
            this.position.y + this.sillHeight + this.height/2,
            this.position.z
        );
        
        return group;
    }
    
    getBOQ() {
        return {
            نوع: 'شباك',
            أبعاد: `${this.width} × ${this.height} م`,
            مساحة: (this.width * this.height).toFixed(2) + ' م²',
            إطار: this.frameMaterial.name
        };
    }
}