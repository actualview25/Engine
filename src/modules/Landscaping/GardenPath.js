// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GARDEN PATH
// =======================================

import * as THREE from 'three';

export class GardenPath {
    constructor(options = {}) {
        this.type = options.type || 'stone';  // stone, gravel, brick, wood
        this.width = options.width || 1.0;  // متر
        this.points = options.points || [];  // نقاط المسار
        this.material = options.material || 'stone';
        this.edgeType = options.edgeType || 'none';  // none, stone, wood
        this.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.segments = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        if (this.points.length < 2) return group;

        // إنشاء المسار على طول النقاط
        for (let i = 0; i < this.points.length - 1; i++) {
            const segment = this.createPathSegment(
                this.points[i],
                this.points[i + 1]
            );
            group.add(segment);
            this.segments.push(segment);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    createPathSegment(start, end) {
        const group = new THREE.Group();
        
        // حساب الاتجاه والطول
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        // جسم المسار
        const pathGeo = new THREE.PlaneGeometry(length, this.width);
        const pathMat = new THREE.MeshStandardMaterial({ 
            color: this.getMaterialColor(),
            roughness: 0.8,
            side: THREE.DoubleSide
        });
        const path = new THREE.Mesh(pathGeo, pathMat);
        
        path.rotation.y = -angle;
        path.rotation.x = Math.PI / 2;
        path.position.set(
            (start.x + end.x) / 2,
            0.02,
            (start.z + end.z) / 2
        );
        
        path.receiveShadow = true;
        group.add(path);

        return group;
    }

    getMaterialColor() {
        const colors = {
            'stone': 0x888888,
            'gravel': 0xaaaaaa,
            'brick': 0xcc8866,
            'wood': 0x8B4513
        };
        return colors[this.material] || 0x888888;
    }

    getBOQ() {
        let totalLength = 0;
        for (let i = 0; i < this.points.length - 1; i++) {
            const dx = this.points[i+1].x - this.points[i].x;
            const dz = this.points[i+1].z - this.points[i].z;
            totalLength += Math.sqrt(dx * dx + dz * dz);
        }

        const types = {
            'stone': 'حجري',
            'gravel': 'حصوي',
            'brick': 'قرميدي',
            'wood': 'خشبي'
        };

        return {
            نوع: 'ممر',
            النوع: types[this.type] || this.type,
            الطول_الإجمالي: totalLength.toFixed(2) + ' م',
            العرض: this.width.toFixed(2) + ' م',
            المساحة: (totalLength * this.width).toFixed(2) + ' م²',
            المادة: this.material
        };
    }
}