// =======================================
// ACTUAL VIEW CONSTRUCTION OS - GLASS FLOOR
// =======================================

import * as THREE from 'three';
import { Glass } from './Glass.js';

export class GlassFloor {
    constructor(options = {}) {
        this.width = options.width || 3.0;
        this.length = options.length || 3.0;
        this.glassType = options.glassType || 'laminated';  // laminated, tempered
        self.loadBearing = options.loadBearing || 'medium';  // light, medium, heavy
        self.supportStructure = options.supportStructure || 'grid';  // grid, beam, cable
        self.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.panels = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // إنشاء الهيكل الداعم
        this.createSupportStructure(group);

        // إنشاء الألواح الزجاجية
        this.createGlassPanels(group);

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    createSupportStructure(group) {
        const supportMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

        if (this.supportStructure === 'grid') {
            const beamSize = 0.1;
            const cells = 3;

            // عوارض أفقية
            for (let i = 0; i <= cells; i++) {
                const x = (i / cells - 0.5) * this.width;
                
                const beam = new THREE.Mesh(
                    new THREE.BoxGeometry(beamSize, beamSize, this.length),
                    supportMat
                );
                beam.position.set(x, -beamSize/2, 0);
                group.add(beam);
            }

            // عوارض رأسية
            for (let i = 0; i <= cells; i++) {
                const z = (i / cells - 0.5) * this.length;
                
                const beam = new THREE.Mesh(
                    new THREE.BoxGeometry(this.width, beamSize, beamSize),
                    supportMat
                );
                beam.position.set(0, -beamSize/2, z);
                group.add(beam);
            }
        }
    }

    createGlassPanels(group) {
        const glass = new Glass({
            type: this.glassType,
            thickness: this.getThicknessByLoad(),
            transparency: 0.7
        });

        const panelSize = 1.0;
        const cols = Math.floor(this.width / panelSize);
        const rows = Math.floor(this.length / panelSize);

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const x = (col + 0.5) * panelSize - this.width/2;
                const z = (row + 0.5) * panelSize - this.length/2;
                
                const panel = glass.createMesh();
                panel.scale.set(panelSize - 0.02, 1, panelSize - 0.02);
                panel.position.set(x, 0, z);
                panel.rotation.x = 0;
                
                group.add(panel);
                this.panels.push(panel);
            }
        }
    }

    getThicknessByLoad() {
        const thicknesses = {
            'light': 0.015,
            'medium': 0.025,
            'heavy': 0.038
        };
        return thicknesses[this.loadBearing] || 0.019;
    }

    getBOQ() {
        const area = this.width * this.length;
        const panelCount = this.panels.length;

        const loads = {
            'light': 'خفيف',
            'medium': 'متوسط',
            'heavy': 'ثقيل'
        };

        return {
            نوع: 'أرضية زجاجية',
            الأبعاد: `${this.width.toFixed(2)} × ${this.length.toFixed(2)} م`,
            المساحة: area.toFixed(2) + ' م²',
            عدد_الألواح: panelCount,
            نوع_الزجاج: this.glassType === 'laminated' ? 'مُصفّح' : 'مُقسّى',
            تحمل_الأحمال: loads[this.loadBearing] || this.loadBearing,
            سمك_الزجاج: (this.getThicknessByLoad() * 1000).toFixed(0) + ' مم'
        };
    }
}