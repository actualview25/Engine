// modules/MEP/Drainage.js
import * as THREE from 'three';
import { Pipe } from './Pipe.js';

export class DrainageSystem {
    constructor(options = {}) {
        this.type = options.type || 'sanitary'; // sanitary, storm, vent
        this.slope = options.slope || 0.02; // 2% ميل
        
        this.pipes = [];
        this.manholes = []; // غرف تفتيش
        this.traps = []; // أطواق
    }
    
    addPipe(options) {
        const pipe = new Pipe({
            type: 'pipe_sewer',
            diameter: options.diameter || 110,
            start: options.start,
            end: options.end
        });
        
        // تطبيق الميل
        const length = pipe.calculateLength();
        pipe.endPoint.y -= length * this.slope;
        
        this.pipes.push(pipe);
        return pipe;
    }
    
    addManhole(options) {
        this.manholes.push(options);
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        this.pipes.forEach(pipe => {
            group.add(pipe.createMesh());
        });
        
        // غرف التفتيش
        this.manholes.forEach(m => {
            const cylinderGeo = new THREE.CylinderGeometry(0.6, 0.6, 1, 8);
            const cylinderMat = new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                transparent: true,
                opacity: 0.7
            });
            const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
            cylinder.position.set(m.position.x, m.position.y, m.position.z);
            group.add(cylinder);
        });
        
        return group;
    }
    
    getBOQ() {
        let totalLength = 0;
        this.pipes.forEach(p => totalLength += p.calculateLength());
        
        return {
            نظام: this.type === 'sanitary' ? 'صرف صحي' :
                  this.type === 'storm' ? 'مطر' : 'تهوية',
            ميل: (this.slope * 100) + ' %',
            طول_مواسير: totalLength.toFixed(2) + ' م',
            غرف_تفتيش: this.manholes.length,
            أقطار: [...new Set(this.pipes.map(p => p.diameter))].join(', ') + ' مم'
        };
    }
}