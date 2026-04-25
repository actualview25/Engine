// modules/MEP/Plumbing.js
import * as THREE from 'three';
import { Pipe } from './Pipe.js';

export class PlumbingSystem {
    constructor(options = {}) {
        this.type = options.type || 'cold'; // cold, hot, mixed
        this.pressure = options.pressure || 4; // بار
        this.temperature = options.temperature || 20; // درجة مئوية
        
        this.pipes = [];
        this.fixtures = []; // حنفيات - سخانات - مضخات
        
        this.mainLine = null;
    }
    
    addPipe(options) {
        const pipe = new Pipe({
            type: options.type || 'pipe_ppr',
            diameter: options.diameter || 20,
            start: options.start,
            end: options.end
        });
        
        this.pipes.push(pipe);
        return pipe;
    }
    
    addFixture(options) {
        this.fixtures.push(options);
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        this.pipes.forEach(pipe => {
            group.add(pipe.createMesh());
        });
        
        // رسم التركيبات
        this.fixtures.forEach(f => {
            const sphereGeo = new THREE.SphereGeometry(0.15, 8);
            const sphereMat = new THREE.MeshStandardMaterial({
                color: this.type === 'hot' ? 0xFF4444 : 0x4444FF
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.set(f.position.x, f.position.y, f.position.z);
            group.add(sphere);
        });
        
        return group;
    }
    
    getBOQ() {
        let totalLength = 0;
        this.pipes.forEach(p => totalLength += p.calculateLength());
        
        return {
            نظام: this.type === 'cold' ? 'مياه باردة' :
                  this.type === 'hot' ? 'مياه ساخنة' : 'مياه مختلطة',
            ضغط: this.pressure + ' بار',
            أقطار: [...new Set(this.pipes.map(p => p.diameter))].join(', ') + ' مم',
            طول_مواسير: totalLength.toFixed(2) + ' م',
            تركيبات: this.fixtures.length
        };
    }
}