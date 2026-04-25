// =======================================
// ACTUAL VIEW CONSTRUCTION OS - SKYLIGHT
// =======================================

import * as THREE from 'three';
import { Glass } from './Glass.js';

export class Skylight {
    constructor(options = {}) {
        this.shape = options.shape || 'rectangular';  // rectangular, circular, pyramidal
        this.width = options.width || 2.0;
        this.length = options.length || 3.0;
        this.radius = options.radius || 1.5;
        this.height = options.height || 0.5;  // ارتفاع القبة
        this.glassType = options.glassType || 'clear';
        self.doubleGlazed = options.doubleGlazed || false;
        self.opening = options.opening || false;  // قابل للفتح
        self.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        switch(this.shape) {
            case 'circular':
                this.createCircularSkylight(group);
                break;
            case 'pyramidal':
                this.createPyramidalSkylight(group);
                break;
            default:
                this.createRectangularSkylight(group);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    createRectangularSkylight(group) {
        // إطار المناور
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        
        const frameGeo = new THREE.BoxGeometry(this.width + 0.1, 0.1, this.length + 0.1);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.y = -0.05;
        group.add(frame);

        // الزجاج
        const glass = new Glass({
            type: this.glassType,
            width: this.width,
            height: this.length,
            thickness: 0.01
        });

        const glassMesh = glass.createMesh();
        glassMesh.position.y = 0.05;
        glassMesh.rotation.x = Math.PI / 2;
        group.add(glassMesh);

        // زجاج مزدوج إذا مطلوب
        if (this.doubleGlazed) {
            const glass2 = glass.createMesh();
            glass2.position.y = 0.15;
            glass2.rotation.x = Math.PI / 2;
            group.add(glass2);
        }
    }

    createCircularSkylight(group) {
        // إطار دائري
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        
        const frameGeo = new THREE.TorusGeometry(this.radius, 0.05, 16, 32);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.rotation.x = Math.PI / 2;
        frame.position.y = 0;
        group.add(frame);

        // زجاج دائري
        const glassGeo = new THREE.CylinderGeometry(this.radius - 0.05, this.radius - 0.05, 0.01, 32);
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.y = 0.05;
        glass.rotation.x = 0;
        group.add(glass);
    }

    createPyramidalSkylight(group) {
        // قاعدة هرمية
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        
        // إطار سفلي
        const baseFrame = new THREE.Mesh(
            new THREE.BoxGeometry(this.width, 0.1, this.length),
            frameMat
        );
        baseFrame.position.y = 0;
        group.add(baseFrame);

        // أضلاع الهرم
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2);
            const ribGeo = new THREE.BoxGeometry(0.05, this.height, 0.05);
            const rib = new THREE.Mesh(ribGeo, frameMat);
            
            rib.position.set(
                Math.cos(angle) * this.width/2,
                this.height/2,
                Math.sin(angle) * this.length/2
            );
            
            rib.rotation.z = Math.atan2(this.height, this.width/2);
            
            group.add(rib);
        }

        // ألواح زجاجية مثلثة
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 4; i++) {
            // يمكن إضافة ألواح مثلثة هنا
        }
    }

    getBOQ() {
        const shapes = {
            'rectangular': 'مستطيل',
            'circular': 'دائري',
            'pyramidal': 'هرمي'
        };

        let area = 0;
        if (this.shape === 'circular') {
            area = Math.PI * this.radius * this.radius;
        } else {
            area = this.width * this.length;
        }

        return {
            نوع: 'مناور',
            الشكل: shapes[this.shape] || this.shape,
            المساحة: area.toFixed(2) + ' م²',
            نوع_الزجاج: this.glassType,
            زجاج_مزدوج: this.doubleGlazed ? 'نعم' : 'لا',
            قابل_للفتح: this.opening ? 'نعم' : 'لا'
        };
    }
}