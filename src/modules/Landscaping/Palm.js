// =======================================
// ACTUAL VIEW CONSTRUCTION OS - PALM
// =======================================

import * as THREE from 'three';

export class Palm {
    constructor(options = {}) {
        this.type = options.type || 'date';  // date, coconut, ornamental
        this.height = options.height || 8.0;  // متر
        this.trunkDiameter = options.trunkDiameter || 0.4;  // متر
        this.frondCount = options.frondCount || 12;  // عدد السعف
        this.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // جذع النخلة
        const trunkGeo = new THREE.CylinderGeometry(
            this.trunkDiameter / 1.5,
            this.trunkDiameter,
            this.height,
            8
        );
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B6B4D });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = this.height / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // إضافة نسيج للجذع (حلقات)
        for (let i = 0; i < 5; i++) {
            const ringGeo = new THREE.TorusGeometry(this.trunkDiameter/2, 0.02, 8, 20);
            const ringMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = (i / 4) * this.height;
            group.add(ring);
        }

        // إضافة السعف
        for (let i = 0; i < this.frondCount; i++) {
            const frond = this.createFrond(i);
            group.add(frond);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    createFrond(index) {
        const angle = (index / this.frondCount) * Math.PI * 2;
        const frondGroup = new THREE.Group();

        // ساق السعفة
        const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, 1.5, 5);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x8B6B4D });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.75;
        stem.rotation.z = 0.3;
        frondGroup.add(stem);

        // أوراق السعفة
        for (let j = 0; j < 6; j++) {
            const leafGeo = new THREE.PlaneGeometry(0.1, 0.5);
            const leafMat = new THREE.MeshStandardMaterial({ 
                color: 0x44aa44,
                side: THREE.DoubleSide
            });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            
            leaf.position.set(
                Math.sin(j) * 0.3,
                0.5 + j * 0.2,
                0
            );
            
            leaf.rotation.y = Math.PI / 2;
            leaf.rotation.z = -0.2;
            
            frondGroup.add(leaf);
        }

        frondGroup.position.set(
            Math.cos(angle) * 0.5,
            this.height - 0.5,
            Math.sin(angle) * 0.5
        );
        
        frondGroup.rotation.y = angle;
        frondGroup.rotation.z = 0.5;
        
        return frondGroup;
    }

    getBOQ() {
        const types = {
            'date': 'نخيل تمر',
            'coconut': 'نخيل جوز هند',
            'ornamental': 'نخيل زينة'
        };

        return {
            نوع: 'نخلة',
            النوع: types[this.type] || this.type,
            الارتفاع: this.height.toFixed(2) + ' م',
            قطر_الجذع: this.trunkDiameter.toFixed(2) + ' م',
            عدد_السعف: this.frondCount
        };
    }
}