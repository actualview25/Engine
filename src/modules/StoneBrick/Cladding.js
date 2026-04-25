// =======================================
// ACTUAL VIEW CONSTRUCTION OS - CLADDING
// =======================================

import * as THREE from 'three';
import { Stone } from './Stone.js';
import { Brick } from './Brick.js';

export class Cladding {
    constructor(options = {}) {
        this.material = options.material || 'stone';  // stone, brick, tile
        this.materialType = options.materialType || 'limestone';
        this.pattern = options.pattern || 'random';  // random, regular, coursed
        this.thickness = options.thickness || 0.1;  // سمك التكسية
        this.height = options.height || 3.0;  // ارتفاع الجدار المكسو
        this.width = options.width || 5.0;  // عرض الجدار
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        
        this.mesh = null;
        this.units = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // إنشاء وحدات التكسية حسب النمط
        switch(this.pattern) {
            case 'regular':
                this.createRegularPattern(group);
                break;
            case 'coursed':
                this.createCoursedPattern(group);
                break;
            default:
                this.createRandomPattern(group);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;
        
        this.mesh = group;
        return group;
    }

    createRegularPattern(group) {
        // نمط منتظم (مثل الطوب العادي)
        const unitHeight = 0.2;
        const unitWidth = 0.4;
        const rows = Math.floor(this.height / unitHeight);
        const cols = Math.floor(this.width / unitWidth);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const unit = this.createUnit({
                    width: unitWidth,
                    height: unitHeight,
                    depth: this.thickness,
                    position: {
                        x: col * unitWidth - this.width/2 + unitWidth/2,
                        y: row * unitHeight,
                        z: 0
                    }
                });
                group.add(unit);
                this.units.push(unit);
            }
        }
    }

    createCoursedPattern(group) {
        // نمط مداميك (ارتفاعات مختلفة)
        const rows = Math.floor(this.height / 0.2);
        let y = 0;
        
        for (let row = 0; row < rows; row++) {
            const unitHeight = row % 3 === 0 ? 0.3 : 0.2;
            const unitWidth = 0.4;
            const cols = Math.floor(this.width / unitWidth);
            
            for (let col = 0; col < cols; col++) {
                const unit = this.createUnit({
                    width: unitWidth,
                    height: unitHeight,
                    depth: this.thickness,
                    position: {
                        x: col * unitWidth - this.width/2 + unitWidth/2,
                        y: y + unitHeight/2,
                        z: 0
                    }
                });
                group.add(unit);
                this.units.push(unit);
            }
            
            y += unitHeight;
            if (y >= this.height) break;
        }
    }

    createRandomPattern(group) {
        // نمط عشوائي (حجري)
        const count = Math.floor((this.width * this.height) / 0.1);
        
        for (let i = 0; i < count; i++) {
            const unitWidth = 0.2 + Math.random() * 0.3;
            const unitHeight = 0.1 + Math.random() * 0.2;
            
            // تجنب التداخل (تبسيط)
            const x = (Math.random() - 0.5) * this.width;
            const y = Math.random() * this.height;
            
            const unit = this.createUnit({
                width: unitWidth,
                height: unitHeight,
                depth: this.thickness,
                position: { x, y, z: 0 }
            });
            group.add(unit);
            this.units.push(unit);
        }
    }

    createUnit(options) {
        if (this.material === 'stone') {
            return new Stone({
                type: this.materialType,
                size: {
                    width: options.width,
                    height: options.height,
                    depth: options.depth
                },
                position: options.position,
                mortar: true
            }).createMesh();
        } else {
            return new Brick({
                type: this.materialType,
                size: {
                    width: options.width,
                    height: options.height,
                    depth: options.depth
                },
                position: options.position,
                mortar: true
            }).createMesh();
        }
    }

    getBOQ() {
        const area = this.width * this.height;
        const volume = area * this.thickness;

        const materials = {
            'stone': 'حجر',
            'brick': 'طوب',
            'tile': 'بلاط'
        };

        const patterns = {
            'regular': 'منتظم',
            'coursed': 'مداميك',
            'random': 'عشوائي'
        };

        return {
            نوع: 'تكسية',
            المادة: materials[this.material] || this.material,
            نوع_المادة: this.materialType,
            النمط: patterns[this.pattern] || this.pattern,
            المساحة: area.toFixed(2) + ' م²',
            الحجم: volume.toFixed(2) + ' م³',
            عدد_الوحدات: this.units.length,
            سمك_التكسية: (this.thickness * 1000).toFixed(0) + ' مم'
        };
    }
}