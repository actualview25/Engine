// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GLASS RAILING
// =======================================

import * as THREE from 'three';
import { Glass } from './Glass.js';

export class GlassRailing {
    constructor(options = {}) {
        this.length = options.length || 5.0;
        this.height = options.height || 1.1;
        self.postSpacing = options.postSpacing || 1.5;
        self.handrailMaterial = options.handrailMaterial || 'stainless_steel';
        self.glassType = options.glassType || 'tempered';
        self.mounting = options.mounting || 'side';  // side, top, embedded
        self.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.panels = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // إنشاء الأعمدة
        this.createPosts(group);

        // إنشاء الدرابزين العلوي
        this.createHandrail(group);

        // إنشاء الألواح الزجاجية
        this.createGlassPanels(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    createPosts(group) {
        const postMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const postCount = Math.floor(this.length / this.postSpacing) + 1;

        for (let i = 0; i < postCount; i++) {
            const x = (i / (postCount - 1) - 0.5) * this.length;
            
            const postGeo = new THREE.CylinderGeometry(0.05, 0.05, this.height, 8);
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(x, this.height/2, 0);
            group.add(post);
        }
    }

    createHandrail(group) {
        const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });

        // درابزين علوي
        const topRail = new THREE.Mesh(
            new THREE.BoxGeometry(this.length, 0.05, 0.05),
            railMat
        );
        topRail.position.set(0, this.height, 0);
        group.add(topRail);

        // درابزين سفلي
        const bottomRail = new THREE.Mesh(
            new THREE.BoxGeometry(this.length, 0.05, 0.05),
            railMat
        );
        bottomRail.position.set(0, 0.1, 0);
        group.add(bottomRail);
    }

    createGlassPanels(group) {
        const glass = new Glass({
            type: this.glassType,
            thickness: 0.012,
            transparency: 0.9
        });

        const panelCount = Math.floor(this.length / 1.0);
        const panelWidth = this.length / panelCount;

        for (let i = 0; i < panelCount; i++) {
            const x = (i + 0.5) * panelWidth - this.length/2;
            
            const panel = glass.createMesh();
            panel.scale.set(panelWidth - 0.1, this.height - 0.15, 1);
            panel.position.set(x, this.height/2, 0);
            
            group.add(panel);
            this.panels.push(panel);
        }
    }

    getBOQ() {
        const area = this.length * this.height;

        return {
            نوع: 'درابزين زجاجي',
            الطول: this.length.toFixed(2) + ' م',
            الارتفاع: this.height.toFixed(2) + ' م',
            المساحة: area.toFixed(2) + ' م²',
            عدد_الألواح: this.panels.length,
            نوع_الزجاج: this.glassType === 'tempered' ? 'مُقسّى' : 'مُصفّح',
            مادة_الدرابزين: this.handrailMaterial === 'stainless_steel' ? 'استانلس ستيل' : this.handrailMaterial
        };
    }
}