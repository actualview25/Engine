// modules/MEP/HVAC.js
import * as THREE from 'three';
import { Pipe } from './Pipe.js';

export class HVACSystem {
    constructor(options = {}) {
        this.type = options.type || 'split'; // split, ducted, vrf
        this.capacity = options.capacity || 18000; // BTU
        this.area = options.area || 0; // م²
        
        this.ducts = [];
        this.refrigerantPipes = [];
        this.units = []; // وحدات داخلية وخارجية
    }
    
    addDuct(options) {
        const duct = new Pipe({
            type: 'duct_galv',
            diameter: options.diameter || 200,
            start: options.start,
            end: options.end
        });
        this.ducts.push(duct);
        return duct;
    }
    
    addUnit(options) {
        this.units.push(options);
    }
    
    calculateRequiredCapacity(area) {
        // تقريبي: 600 BTU لكل متر مربع
        return area * 600;
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // مجاري الهواء
        this.ducts.forEach(duct => {
            group.add(duct.createMesh());
        });
        
        // مواسير الفريون
        this.refrigerantPipes.forEach(pipe => {
            group.add(pipe.createMesh());
        });
        
        // الوحدات
        this.units.forEach((unit, index) => {
            const boxGeo = new THREE.BoxGeometry(1, 0.5, 0.8);
            const boxMat = new THREE.MeshStandardMaterial({
                color: index === 0 ? 0x44AAFF : 0xFFAA44
            });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(unit.position.x, unit.position.y, unit.position.z);
            group.add(box);
        });
        
        return group;
    }
    
    getBOQ() {
        return {
            نظام: this.type === 'split' ? 'سبليت' :
                  this.type === 'ducted' ? 'مخفي' : 'VRF',
            سعة: this.capacity + ' BTU',
            مساحة_تغطية: this.area + ' م²',
            وحدات_داخلية: this.units.filter(u => u.type === 'indoor').length,
            وحدات_خارجية: this.units.filter(u => u.type === 'outdoor').length,
            مجاري: this.ducts.length
        };
    }
}