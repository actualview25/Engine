// modules/MEP/Pipe.js
import * as THREE from 'three';
import { MEPMaterial } from './Material.js';

export class Pipe {
    constructor(options = {}) {
        this.type = options.type || 'pipe_pvc';
        this.material = new MEPMaterial(this.type);
        
        this.startPoint = options.start || { x: 0, y: 0, z: 0 };
        this.endPoint = options.end || { x: 2, y: 0, z: 0 };
        this.diameter = options.diameter || 50; // مم
        this.wallThickness = options.wallThickness || 2; // مم
        
        this.insulation = options.insulation || false;
        this.trace = options.trace || false; // كابل تتبع
    }
    
    calculateLength() {
        const dx = this.endPoint.x - this.startPoint.x;
        const dy = this.endPoint.y - this.startPoint.y;
        const dz = this.endPoint.z - this.startPoint.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    calculateVolume() {
        const length = this.calculateLength();
        const outerRadius = this.diameter / 2000; // تحويل مم إلى متر
        const innerRadius = (this.diameter - 2*this.wallThickness) / 2000;
        return Math.PI * (outerRadius*outerRadius - innerRadius*innerRadius) * length;
    }
    
    createMesh() {
        const group = new THREE.Group();
        const length = this.calculateLength();
        const radius = this.diameter / 2000; // تحويل إلى متر
        
        // اتجاه الماسورة
        const direction = new THREE.Vector3(
            this.endPoint.x - this.startPoint.x,
            this.endPoint.y - this.startPoint.y,
            this.endPoint.z - this.startPoint.z
        ).normalize();
        
        // منتصف الماسورة
        const midPoint = new THREE.Vector3(
            (this.startPoint.x + this.endPoint.x) / 2,
            (this.startPoint.y + this.endPoint.y) / 2,
            (this.startPoint.z + this.endPoint.z) / 2
        );
        
        // جسم الماسورة
        const cylinderGeo = new THREE.CylinderGeometry(radius, radius, length, 16);
        const cylinderMat = new THREE.MeshStandardMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.8
        });
        
        const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
        
        // تدوير الماسورة لتتماشى مع الاتجاه
        cylinder.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction
        );
        
        cylinder.position.copy(midPoint);
        group.add(cylinder);
        
        // إضافة وصلات في الأطراف
        const jointGeo = new THREE.SphereGeometry(radius * 1.5, 16);
        const jointMat = new THREE.MeshStandardMaterial({
            color: 0x888888
        });
        
        const joint1 = new THREE.Mesh(jointGeo, jointMat);
        joint1.position.set(this.startPoint.x, this.startPoint.y, this.startPoint.z);
        group.add(joint1);
        
        const joint2 = new THREE.Mesh(jointGeo, jointMat);
        joint2.position.set(this.endPoint.x, this.endPoint.y, this.endPoint.z);
        group.add(joint2);
        
        return group;
    }
    
    getBOQ() {
        const length = this.calculateLength();
        return {
            نوع: this.material.name,
            قطر: this.diameter + ' مم',
            طول: length.toFixed(2) + ' م',
            حجم: this.calculateVolume().toFixed(3) + ' م³',
            عزل: this.insulation ? 'نعم' : 'لا'
        };
    }
}