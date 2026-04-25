// =======================================
// ACTUAL VIEW CONSTRUCTION OS - TREE
// =======================================

import * as THREE from 'three';

export class Tree {
    constructor(options = {}) {
        this.type = options.type || 'oak';  // oak, pine, palm, fruit
        this.height = options.height || 5.0;  // متر
        this.trunkDiameter = options.trunkDiameter || 0.3;  // متر
        this.canopySize = options.canopySize || 3.0;  // متر
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.age = options.age || 5;  // سنوات
        
        this.mesh = null;
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // جذع الشجرة
        const trunkGeo = new THREE.CylinderGeometry(
            this.trunkDiameter / 2, 
            this.trunkDiameter / 1.5, 
            this.height, 
            8
        );
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = this.height / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // تاج الشجرة (الأوراق)
        const canopyGeo = new THREE.SphereGeometry(this.canopySize, 8);
        const canopyMat = new THREE.MeshStandardMaterial({ 
            color: this.getLeafColor(),
            emissive: 0x112211
        });
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.y = this.height + this.canopySize * 0.5;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        group.add(canopy);

        // إضافة بعض الفروع
        this.addBranches(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    getLeafColor() {
        const colors = {
            'oak': 0x44aa44,
            'pine': 0x226622,
            'palm': 0x88aa44,
            'fruit': 0x88aa44
        };
        return colors[this.type] || 0x44aa44;
    }

    addBranches(group) {
        const branchCount = 4 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < branchCount; i++) {
            const angle = (i / branchCount) * Math.PI * 2;
            const branchHeight = this.height * 0.7;
            const branchLength = this.canopySize * 0.8;
            
            const branchGeo = new THREE.CylinderGeometry(0.05, 0.08, branchLength, 5);
            const branchMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const branch = new THREE.Mesh(branchGeo, branchMat);
            
            branch.position.set(
                Math.cos(angle) * this.trunkDiameter,
                branchHeight,
                Math.sin(angle) * this.trunkDiameter
            );
            
            branch.rotation.z = Math.sin(angle) * 0.3;
            branch.rotation.x = Math.cos(angle) * 0.3;
            
            branch.castShadow = true;
            group.add(branch);
        }
    }

    getBOQ() {
        const types = {
            'oak': 'بلوط',
            'pine': 'صنوبر',
            'palm': 'نخيل',
            'fruit': 'مثمر'
        };

        return {
            نوع: 'شجرة',
            النوع: types[this.type] || this.type,
            الارتفاع: this.height.toFixed(2) + ' م',
            قطر_الجذع: this.trunkDiameter.toFixed(2) + ' م',
            حجم_التاج: this.canopySize.toFixed(2) + ' م',
            العمر: this.age + ' سنوات'
        };
    }
}