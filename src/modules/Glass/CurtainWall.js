// =======================================
// ACTUAL VIEW CONSTRUCTION OS - CURTAIN WALL
// =======================================

import * as THREE from 'three';
import { Glass } from './Glass.js';

export class CurtainWall {
    constructor(options = {}) {
        this.width = options.width || 10.0;
        this.height = options.height || 20.0;
        this.moduleWidth = options.moduleWidth || 1.5;
        this.moduleHeight = options.moduleHeight || 3.0;
        this.glassType = options.glassType || 'clear';
        this.glassThickness = options.glassThickness || 0.01;
        this.mullionColor = options.mullionColor || 0x888888;
        this.mullionWidth = options.mullionWidth || 0.05;
        this.mullionDepth = options.mullionDepth || 0.15;
        self.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.modules = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        const cols = Math.floor(this.width / this.moduleWidth);
        const rows = Math.floor(this.height / this.moduleHeight);

        // إنشاء الموليونات الرأسية
        this.createVerticalMullions(group, cols);

        // إنشاء الموليونات الأفقية
        this.createHorizontalMullions(group, rows);

        // إنشاء الوحدات الزجاجية
        this.createGlassModules(group, cols, rows);

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    createVerticalMullions(group, cols) {
        const mullionMat = new THREE.MeshStandardMaterial({ 
            color: this.mullionColor,
            roughness: 0.4
        });

        for (let i = 0; i <= cols; i++) {
            const x = i * this.moduleWidth - this.width/2;
            
            const mullionGeo = new THREE.BoxGeometry(
                this.mullionWidth,
                this.height,
                this.mullionDepth
            );
            
            const mullion = new THREE.Mesh(mullionGeo, mullionMat);
            mullion.position.set(x, this.height/2, 0);
            group.add(mullion);
        }
    }

    createHorizontalMullions(group, rows) {
        const mullionMat = new THREE.MeshStandardMaterial({ 
            color: this.mullionColor,
            roughness: 0.4
        });

        for (let i = 0; i <= rows; i++) {
            const y = i * this.moduleHeight;
            
            const mullionGeo = new THREE.BoxGeometry(
                this.width,
                this.mullionWidth,
                this.mullionDepth
            );
            
            const mullion = new THREE.Mesh(mullionGeo, mullionMat);
            mullion.position.set(0, y, 0);
            group.add(mullion);
        }
    }

    createGlassModules(group, cols, rows) {
        const glass = new Glass({
            type: this.glassType,
            thickness: this.glassThickness,
            transparency: 0.8
        });

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const x = (col + 0.5) * this.moduleWidth - this.width/2;
                const y = (row + 0.5) * this.moduleHeight;
                
                const moduleGlass = glass.createMesh();
                moduleGlass.scale.set(
                    this.moduleWidth - this.mullionWidth,
                    this.moduleHeight - this.mullionWidth,
                    1
                );
                moduleGlass.position.set(x, y, 0);
                
                group.add(moduleGlass);
                this.modules.push(moduleGlass);
            }
        }
    }

    getBOQ() {
        const area = this.width * this.height;
        const moduleCount = this.modules.length;

        return {
            نوع: 'واجهة زجاجية',
            الأبعاد: `${this.width.toFixed(2)} × ${this.height.toFixed(2)} م`,
            المساحة: area.toFixed(2) + ' م²',
            عدد_الوحدات: moduleCount,
            نوع_الزجاج: this.glassType,
            سمك_الزجاج: (this.glassThickness * 1000).toFixed(0) + ' مم',
            مقاس_الموليون: `${(this.mullionWidth * 1000).toFixed(0)} × ${(this.mullionDepth * 1000).toFixed(0)} مم`
        };
    }
}