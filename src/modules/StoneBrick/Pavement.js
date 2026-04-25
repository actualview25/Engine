// =======================================
// ACTUAL VIEW CONSTRUCTION OS - PAVEMENT
// =======================================

import * as THREE from 'three';
import { Stone } from './Stone.js';
import { Brick } from './Brick.js';
import { Tile } from './Tile.js';

export class Pavement {
    constructor(options = {}) {
        this.material = options.material || 'stone';  // stone, brick, tile, concrete
        this.pattern = options.pattern || 'grid';  // grid, herringbone, basket, random
        this.width = options.width || 5.0;  // عرض المنطقة المرصوفة
        this.length = options.length || 5.0;  // طول المنطقة
        this.thickness = options.thickness || 0.1;  // سمك الرصف
        this.baseLayer = options.baseLayer || 0.2;  // طبقة الأساس (تحت الرصف)
        this.position = options.position || { x: 0, y: 0, z: 0 };
        
        this.mesh = null;
        this.units = [];
        this.createdAt = new Date().toISOString();
    }

    createMesh() {
        const group = new THREE.Group();

        // طبقة الأساس (تحت الرصف)
        this.createBaseLayer(group);

        // طبقة الرصف حسب النمط
        switch(this.pattern) {
            case 'herringbone':
                this.createHerringbonePattern(group);
                break;
            case 'basket':
                this.createBasketPattern(group);
                break;
            case 'random':
                this.createRandomPattern(group);
                break;
            default:
                this.createGridPattern(group);
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        
        this.mesh = group;
        return group;
    }

    createBaseLayer(group) {
        const baseGeo = new THREE.BoxGeometry(this.width, this.baseLayer, this.length);
        const baseMat = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            roughness: 0.9,
            transparent: true,
            opacity: 0.3
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -this.baseLayer/2;
        base.receiveShadow = true;
        group.add(base);
    }

    createGridPattern(group) {
        // نمط شبكي بسيط
        const unitSize = 0.4;
        const cols = Math.floor(this.width / unitSize);
        const rows = Math.floor(this.length / unitSize);
        
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const unit = this.createPavingUnit({
                    width: unitSize,
                    length: unitSize,
                    position: {
                        x: col * unitSize - this.width/2 + unitSize/2,
                        y: 0,
                        z: row * unitSize - this.length/2 + unitSize/2
                    }
                });
                group.add(unit);
                this.units.push(unit);
            }
        }
    }

    createHerringbonePattern(group) {
        // نمط متعرج (سمكة)
        const unitWidth = 0.2;
        const unitLength = 0.4;
        const cols = Math.floor(this.width / unitWidth);
        const rows = Math.floor(this.length / unitLength);
        
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const rotation = (col + row) % 2 === 0 ? 45 : -45;
                const unit = this.createPavingUnit({
                    width: unitWidth,
                    length: unitLength,
                    rotation: rotation,
                    position: {
                        x: col * unitWidth - this.width/2 + unitWidth/2,
                        y: 0,
                        z: row * unitLength - this.length/2 + unitLength/2
                    }
                });
                group.add(unit);
                this.units.push(unit);
            }
        }
    }

    createBasketPattern(group) {
        // نمط سلة (مربعات متناوبة)
        const unitSize = 0.3;
        const cols = Math.floor(this.width / unitSize);
        const rows = Math.floor(this.length / unitSize);
        
        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const color = (col + row) % 2 === 0 ? 0xcccccc : 0x888888;
                const unit = this.createPavingUnit({
                    width: unitSize,
                    length: unitSize,
                    color: color,
                    position: {
                        x: col * unitSize - this.width/2 + unitSize/2,
                        y: 0,
                        z: row * unitSize - this.length/2 + unitSize/2
                    }
                });
                group.add(unit);
                this.units.push(unit);
            }
        }
    }

    createRandomPattern(group) {
        // نمط عشوائي
        const unitCount = Math.floor((this.width * this.length) / 0.2);
        
        for (let i = 0; i < unitCount; i++) {
            const unitWidth = 0.2 + Math.random() * 0.3;
            const unitLength = 0.2 + Math.random() * 0.3;
            
            const x = (Math.random() - 0.5) * this.width;
            const z = (Math.random() - 0.5) * this.length;
            
            const unit = this.createPavingUnit({
                width: unitWidth,
                length: unitLength,
                rotation: Math.random() * 90,
                position: { x, y: 0, z }
            });
            group.add(unit);
            this.units.push(unit);
        }
    }

    createPavingUnit(options) {
        const unitGeo = new THREE.BoxGeometry(
            options.width,
            this.thickness,
            options.length
        );
        
        const unitMat = new THREE.MeshStandardMaterial({
            color: options.color || this.getMaterialColor(),
            roughness: 0.7
        });
        
        const unit = new THREE.Mesh(unitGeo, unitMat);
        unit.position.set(options.position.x, this.thickness/2, options.position.z);
        unit.rotation.y = (options.rotation || 0) * Math.PI / 180;
        unit.receiveShadow = true;
        unit.castShadow = true;
        
        return unit;
    }

    getMaterialColor() {
        const colors = {
            'stone': 0x888888,
            'brick': 0xcc8866,
            'tile': 0xcccccc,
            'concrete': 0xaaaaaa
        };
        return colors[this.material] || 0x888888;
    }

    getBOQ() {
        const area = this.width * this.length;
        const volume = area * this.thickness;

        const materials = {
            'stone': 'حجر',
            'brick': 'طوب',
            'tile': 'بلاط',
            'concrete': 'خرسانة'
        };

        const patterns = {
            'grid': 'شبكي',
            'herringbone': 'متعرج',
            'basket': 'سلة',
            'random': 'عشوائي'
        };

        return {
            نوع: 'رصف',
            المادة: materials[this.material] || this.material,
            النمط: patterns[this.pattern] || this.pattern,
            المساحة: area.toFixed(2) + ' م²',
            الحجم: volume.toFixed(2) + ' م³',
            سمك_الرصف: (this.thickness * 1000).toFixed(0) + ' مم',
            عدد_الوحدات: this.units.length
        };
    }
}