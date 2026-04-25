// modules/MEP/Electrical.js
import * as THREE from 'three';
import { MEPMaterial } from './Material.js';

export class ElectricalCircuit {
    constructor(options = {}) {
        this.type = options.type || 'lighting'; // lighting, power, data
        this.voltage = options.voltage || 220; // فولت
        this.current = options.current || 16; // أمبير
        this.power = options.power || 0; // واط
        
        this.cable = new MEPMaterial('cable_cu', {
            diameter: options.cableDiameter || 2.5
        });
        
        this.points = options.points || [];
        this.fixtures = options.fixtures || [];
    }
    
    addPoint(position, type = 'socket') {
        this.points.push({
            position: position,
            type: type,
            id: `point_${Date.now()}_${this.points.length}`
        });
    }
    
    addFixture(fixture) {
        this.fixtures.push(fixture);
    }
    
    calculateLoad() {
        let totalLoad = 0;
        this.fixtures.forEach(f => {
            totalLoad += f.power || 0;
        });
        return totalLoad;
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // رسم الكابلات بين النقاط
        for (let i = 0; i < this.points.length - 1; i++) {
            const start = this.points[i].position;
            const end = this.points[i + 1].position;
            
            const points = [
                new THREE.Vector3(start.x, start.y, start.z),
                new THREE.Vector3(end.x, end.y, end.z)
            ];
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: this.type === 'lighting' ? 0xFFD700 : 
                       this.type === 'power' ? 0xFF4444 : 0x4444FF
            });
            
            const line = new THREE.Line(geometry, material);
            group.add(line);
        }
        
        // رسم نقاط الكهرباء
        this.points.forEach(point => {
            const sphereGeo = new THREE.SphereGeometry(0.1, 8);
            const sphereMat = new THREE.MeshStandardMaterial({
                color: point.type === 'socket' ? 0x44FF44 : 0xFFAA44
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.set(point.position.x, point.position.y, point.position.z);
            group.add(sphere);
        });
        
        return group;
    }
    
    getBOQ() {
        return {
            نوع: this.type === 'lighting' ? 'إضاءة' :
                 this.type === 'power' ? 'قوى' : 'بيانات',
            جهد: this.voltage + ' فولت',
            تيار: this.current + ' أمبير',
            قدرة: this.calculateLoad().toFixed(0) + ' واط',
            نقاط: this.points.length,
            أجهزة: this.fixtures.length,
            كابل: `${this.cable.name} ${this.cable.diameter} مم²`
        };
    }
}