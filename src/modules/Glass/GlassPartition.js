// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GLASS PARTITION
// =======================================

import * as THREE from 'three';
import { Glass } from './Glass.js';

export class GlassPartition {
    constructor(options = {}) {
        this.length = options.length || 3.0;
        this.height = options.height || 2.4;
        this.glassType = options.glassType || 'clear';
        this.glassThickness = options.glassThickness || 0.01;
        this.frameColor = options.frameColor || 0xcccccc;
        self.fullHeight = options.fullHeight || false;  // من الأرض للسقف
        self.doors = options.doors || [];  // أبواب داخل الفاصل
        self.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.panels = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // إنشاء الإطار السفلي
        this.createBaseFrame(group);

        // إنشاء الأعمدة الجانبية
        this.createVerticalFrames(group);

        // إنشاء الإطار العلوي
        this.createTopFrame(group);

        // إنشاء الألواح الزجاجية
        this.createGlassPanels(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    createBaseFrame(group) {
        const frameMat = new THREE.MeshStandardMaterial({ color: this.frameColor });
        const frameHeight = 0.1;

        const baseFrame = new THREE.Mesh(
            new THREE.BoxGeometry(this.length, frameHeight, 0.1),
            frameMat
        );
        baseFrame.position.set(0, frameHeight/2, 0);
        group.add(baseFrame);
    }

    createTopFrame(group) {
        if (!this.fullHeight) return;

        const frameMat = new THREE.MeshStandardMaterial({ color: this.frameColor });
        const frameHeight = 0.1;

        const topFrame = new THREE.Mesh(
            new THREE.BoxGeometry(this.length, frameHeight, 0.1),
            frameMat
        );
        topFrame.position.set(0, this.height - frameHeight/2, 0);
        group.add(topFrame);
    }

    createVerticalFrames(group) {
        const frameMat = new THREE.MeshStandardMaterial({ color: this.frameColor });
        const frameWidth = 0.05;

        // عمود أيسر
        const leftFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameWidth, this.height, 0.1),
            frameMat
        );
        leftFrame.position.set(-this.length/2 + frameWidth/2, this.height/2, 0);
        group.add(leftFrame);

        // عمود أيمن
        const rightFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameWidth, this.height, 0.1),
            frameMat
        );
        rightFrame.position.set(this.length/2 - frameWidth/2, this.height/2, 0);
        group.add(rightFrame);
    }

    createGlassPanels(group) {
        const glass = new Glass({
            type: this.glassType,
            thickness: this.glassThickness,
            transparency: 0.9
        });

        const panelCount = Math.floor(this.length / 1.0);  // ألواح كل متر
        const panelWidth = this.length / panelCount;

        for (let i = 0; i < panelCount; i++) {
            const x = (i + 0.5) * panelWidth - this.length/2;
            
            const panel = glass.createMesh();
            panel.scale.set(panelWidth - 0.02, this.height - 0.02, 1);
            panel.position.set(x, this.height/2, 0);
            
            group.add(panel);
            this.panels.push(panel);
        }
    }

    getBOQ() {
        const area = this.length * this.height;
        const panelCount = this.panels.length;

        return {
            نوع: 'فاصل زجاجي',
            الطول: this.length.toFixed(2) + ' م',
            الارتفاع: this.height.toFixed(2) + ' م',
            المساحة: area.toFixed(2) + ' م²',
            عدد_الألواح: panelCount,
            نوع_الزجاج: this.glassType,
            سمك_الزجاج: (this.glassThickness * 1000).toFixed(0) + ' مم'
        };
    }
}