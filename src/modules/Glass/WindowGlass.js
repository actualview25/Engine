// =======================================
// ACTUAL VIEW CONSTRUCTION OS - WINDOW GLASS
// =======================================

import * as THREE from 'three';
import { Glass } from './Glass.js';

export class WindowGlass extends Glass {
    constructor(options = {}) {
        super(options);
        this.windowType = options.windowType || 'sliding';  // sliding, casement, fixed, awning
        this.frameMaterial = options.frameMaterial || 'aluminum';  // aluminum, wood, uPVC
        this.frameColor = options.frameColor || 0xcccccc;
        this.panes = options.panes || 1;  // عدد الألواح
        this.gasFill = options.gasFill || 'air';  // air, argon, krypton
        this.spacer = options.spacer || 'aluminum';
        
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // إنشاء الإطار
        this.createFrame(group);

        // إنشاء الألواح الزجاجية
        this.createPanes(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    createFrame(group) {
        const frameMat = new THREE.MeshStandardMaterial({ 
            color: this.frameColor,
            roughness: 0.5
        });

        const frameWidth = 0.1;
        const frameDepth = 0.08;

        // إطار علوي
        const topFrame = new THREE.Mesh(
            new THREE.BoxGeometry(this.width, frameWidth, frameDepth),
            frameMat
        );
        topFrame.position.set(0, this.height, 0);
        group.add(topFrame);

        // إطار سفلي
        const bottomFrame = new THREE.Mesh(
            new THREE.BoxGeometry(this.width, frameWidth, frameDepth),
            frameMat
        );
        bottomFrame.position.set(0, 0, 0);
        group.add(bottomFrame);

        // إطار أيمن
        const rightFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameWidth, this.height - frameWidth*2, frameDepth),
            frameMat
        );
        rightFrame.position.set(this.width/2 - frameWidth/2, this.height/2, 0);
        group.add(rightFrame);

        // إطار أيسر
        const leftFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameWidth, this.height - frameWidth*2, frameDepth),
            frameMat
        );
        leftFrame.position.set(-this.width/2 + frameWidth/2, this.height/2, 0);
        group.add(leftFrame);

        // إطار وسطي إذا كان هناك عدة ألواح
        if (this.panes > 1) {
            const midFrame = new THREE.Mesh(
                new THREE.BoxGeometry(frameWidth, this.height - frameWidth*2, frameDepth),
                frameMat
            );
            midFrame.position.set(0, this.height/2, 0);
            group.add(midFrame);
        }
    }

    createPanes(group) {
        const paneWidth = this.width / this.panes;
        const glassThickness = this.thickness;

        for (let i = 0; i < this.panes; i++) {
            const paneX = (i - (this.panes-1)/2) * paneWidth;
            
            const glassGeo = new THREE.BoxGeometry(
                paneWidth - 0.02,
                this.height - 0.1,
                glassThickness
            );

            const glassMat = new THREE.MeshStandardMaterial({
                color: this.color,
                transparent: true,
                opacity: this.transparency,
                roughness: this.roughness,
                metalness: this.reflectivity,
                side: THREE.DoubleSide
            });

            const pane = new THREE.Mesh(glassGeo, glassMat);
            pane.position.set(paneX, this.height/2, 0);
            group.add(pane);
        }
    }

    getBOQ() {
        const area = this.width * this.height;
        const baseBOQ = super.getBOQ();

        const windowTypes = {
            'sliding': 'منزلق',
            'casement': 'محوري',
            'fixed': 'ثابت',
            'awning': 'مفتوح لأعلى'
        };

        const frameMaterials = {
            'aluminum': 'ألمنيوم',
            'wood': 'خشب',
            'uPVC': 'يو بي في سي'
        };

        return {
            ...baseBOQ,
            نوع_النافذة: windowTypes[this.windowType] || this.windowType,
            مادة_الإطار: frameMaterials[this.frameMaterial] || this.frameMaterial,
            عدد_الألواح: this.panes,
            الغاز_المحشو: this.gasFill === 'air' ? 'هواء' : this.gasFill === 'argon' ? 'أرجون' : 'كريبتون'
        };
    }
}