// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GLASS PARTITION
// =======================================

import * as THREE from 'three';

export class GlassPartition {
    constructor(options = {}) {
        this.length = options.length || 3.0;
        this.height = options.height || 2.4;
        this.glassType = options.glassType || 'clear';
        this.glassThickness = options.glassThickness || 0.01;
        this.frameColor = options.frameColor || 0xcccccc;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.panels = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({ color: this.frameColor });

        // Base frame
        const base = new THREE.Mesh(new THREE.BoxGeometry(this.length, 0.05, 0.1), frameMat);
        base.position.y = 0.025;
        group.add(base);

        // Side posts
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.05, this.height, 0.1), frameMat);
        left.position.set(-this.length/2 + 0.025, this.height/2, 0);
        group.add(left);

        const right = new THREE.Mesh(new THREE.BoxGeometry(0.05, this.height, 0.1), frameMat);
        right.position.set(this.length/2 - 0.025, this.height/2, 0);
        group.add(right);

        // Top frame
        const top = new THREE.Mesh(new THREE.BoxGeometry(this.length, 0.05, 0.1), frameMat);
        top.position.y = this.height - 0.025;
        group.add(top);

        // Glass panels
        const panelCount = Math.floor(this.length / 1.0) || 1;
        const panelWidth = this.length / panelCount;
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < panelCount; i++) {
            const x = (i + 0.5) * panelWidth - this.length/2;
            const panel = new THREE.Mesh(
                new THREE.BoxGeometry(panelWidth - 0.04, this.height - 0.04, this.glassThickness),
                glassMat
            );
            panel.position.set(x, this.height/2, 0);
            group.add(panel);
            this.panels.push(panel);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh = group;
        return group;
    }

    getBOQ() {
        return {
            نوع: 'فاصل زجاجي',
            الطول: this.length.toFixed(2) + ' م',
            الارتفاع: this.height.toFixed(2) + ' م',
            المساحة: (this.length * this.height).toFixed(2) + ' م²',
            عدد_الألواح: this.panels.length
        };
    }
}