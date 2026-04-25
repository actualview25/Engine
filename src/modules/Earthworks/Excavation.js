// =======================================
// ACTUAL VIEW CONSTRUCTION OS - EXCAVATION
// =======================================

import * as THREE from 'three';
import { SoilMaterial } from './SoilMaterial.js';

export class Excavation {
    constructor(boundary, depth, soilType = 'topsoil') {
        this.boundary = boundary;
        this.depth = depth;
        this.material = new SoilMaterial(soilType);
        this.volume = boundary.area * depth;
        this.createdAt = new Date().toISOString();
        
        // إحصائيات الحفر
        this.stats = {
            depth: depth,
            area: boundary.area,
            volume: this.volume,
            soilType: soilType,
            weight: this.volume * this.material.density,
            timestamp: this.createdAt
        };
        
        console.log(`✅ Excavation created: ${this.volume.toFixed(2)} m³ of ${this.material.name}`);
    }

    draw(scene) {
        if (!scene) {
            console.error('❌ Scene not provided');
            return;
        }

        const points = this.boundary.points;
        if (!points || points.length < 3) {
            console.error('❌ Invalid boundary points');
            return;
        }

        // إنشاء شكل المضلع
        const shape = new THREE.Shape();
        points.forEach((p, i) => {
            if (i === 0) shape.moveTo(p.x, p.z);
            else shape.lineTo(p.x, p.z);
        });
        shape.closePath();

        // إنشاء هندسة الحفر
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: this.depth,
            bevelEnabled: false
        });

        const material = new THREE.MeshStandardMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.6,
            roughness: 0.7,
            metalness: 0.1
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = -this.depth;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = {
            type: 'excavation',
            material: this.material.type,
            depth: this.depth,
            volume: this.volume
        };
        scene.add(mesh);

        // رسم حدود الحفر
        this.drawBoundary(scene);

        console.log(`✅ Excavation drawn: ${this.volume.toFixed(2)} m³`);
        return mesh;
    }

    drawBoundary(scene) {
        const points = this.boundary.points;
        const linePoints = points.map(p => new THREE.Vector3(p.x, -this.depth, p.z));
        
        // الحدود العلوية
        const topPoints = points.map(p => new THREE.Vector3(p.x, 0, p.z));
        
        // الخط العلوي
        const topLineGeo = new THREE.BufferGeometry().setFromPoints(topPoints);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffaa44 });
        const topLine = new THREE.Line(topLineGeo, lineMat);
        scene.add(topLine);
        
        // الخط السفلي
        const bottomLineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
        const bottomLine = new THREE.Line(bottomLineGeo, lineMat);
        scene.add(bottomLine);
        
        // الأعمدة الرأسية
        for (let i = 0; i < points.length; i++) {
            const verticalPoints = [
                new THREE.Vector3(points[i].x, 0, points[i].z),
                new THREE.Vector3(points[i].x, -this.depth, points[i].z)
            ];
            const verticalGeo = new THREE.BufferGeometry().setFromPoints(verticalPoints);
            const verticalLine = new THREE.Line(verticalGeo, lineMat);
            scene.add(verticalLine);
        }
    }

    getBOQ() {
        return {
            العمل: 'حفريات',
            العمق: this.depth.toFixed(2) + ' م',
            المساحة: this.boundary.area.toFixed(2) + ' م²',
            الحجم: this.volume.toFixed(2) + ' م³',
            التربة: this.material.name,
            الكثافة: this.material.density.toFixed(2) + ' طن/م³',
            الوزن: (this.volume * this.material.density).toFixed(2) + ' طن',
            التاريخ: this.createdAt.slice(0, 19).replace('T', ' ')
        };
    }

    getStats() {
        return this.stats;
    }

    toJSON() {
        return {
            type: 'Excavation',
            boundary: {
                points: this.boundary.points,
                area: this.boundary.area
            },
            depth: this.depth,
            soilType: this.material.type,
            volume: this.volume,
            stats: this.stats,
            createdAt: this.createdAt
        };
    }
}