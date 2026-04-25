// =======================================
// ACTUAL VIEW CONSTRUCTION OS - SMART GLASS
// =======================================

import * as THREE from 'three';
import { Glass } from './Glass.js';

export class SmartGlass extends Glass {
    constructor(options = {}) {
        super(options);
        this.technology = options.technology || 'electrochromic';  // electrochromic, PDLC, thermochromic
        self.opacityLevel = options.opacityLevel || 0.9;  // مستوى الشفافية الحالي
        self.voltage = options.voltage || 0;  // 0 = شفاف, 1 = معتم
        self.controlType = options.controlType || 'manual';  // manual, automatic, voice
        self.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // الزجاج الذكي (يمكن تغيير شفافيته)
        const glassGeo = new THREE.BoxGeometry(this.width, this.height, this.thickness);

        const glassMat = new THREE.MeshStandardMaterial({
            color: this.color,
            transparent: true,
            opacity: this.opacityLevel,
            roughness: 0.1,
            metalness: 0.3,
            emissive: 0x112233,
            side: THREE.DoubleSide
        });

        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.y = this.height / 2;
        group.add(glass);

        // إضافة أقطاب كهربائية (للتأثير البصري)
        this.addElectrodes(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    addElectrodes(group) {
        const electrodeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });

        // أقطاب على الحواف
        const electrodeGeo = new THREE.BoxGeometry(0.01, this.height, 0.01);
        
        const electrodeLeft = new THREE.Mesh(electrodeGeo, electrodeMat);
        electrodeLeft.position.set(-this.width/2, this.height/2, 0);
        group.add(electrodeLeft);

        const electrodeRight = new THREE.Mesh(electrodeGeo, electrodeMat);
        electrodeRight.position.set(this.width/2, this.height/2, 0);
        group.add(electrodeRight);
    }

    // تغيير الشفافية
    setOpacity(level) {
        this.opacityLevel = Math.max(0.1, Math.min(0.9, level));
        if (this.mesh) {
            this.mesh.children[0].material.opacity = this.opacityLevel;
        }
        console.log(`🔆 Smart glass opacity set to ${this.opacityLevel}`);
    }

    // تبديل الحالة (شفاف/معتم)
    toggle() {
        if (this.voltage === 0) {
            this.voltage = 1;
            this.setOpacity(0.2);
        } else {
            this.voltage = 0;
            this.setOpacity(0.9);
        }
    }

    getBOQ() {
        const baseBOQ = super.getBOQ();

        const technologies = {
            'electrochromic': 'إلكتروكروميك',
            'PDLC': 'بلوري سائل',
            'thermochromic': 'ثرموكروميك'
        };

        return {
            ...baseBOQ,
            النوع: 'زجاج ذكي',
            التقنية: technologies[this.technology] || this.technology,
            مستوى_الشفافية: (this.opacityLevel * 100).toFixed(0) + '%',
            التحكم: this.controlType === 'manual' ? 'يدوي' : this.controlType === 'automatic' ? 'تلقائي' : 'صوتي'
        };
    }
}