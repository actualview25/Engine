// =======================================
// ACTUAL VIEW CONSTRUCTION OS - LAYER
// =======================================
// نظام إدارة طبقات التربة والأساسات

import * as THREE from 'three';
import { SoilMaterial } from './SoilMaterial.js';

export class Layer {
    constructor(name, material, thickness, elevation) {
        this.name = name;
        this.material = material;
        this.thickness = thickness;
        this.elevation = elevation;
        this.mesh = null;
        this.volume = 0;
        this.createdAt = new Date().toISOString();
        
        // إحصائيات الطبقة
        this.stats = {
            thickness: thickness,
            elevation: elevation,
            materialType: material.type,
            density: material.density,
            compaction: 0
        };
        
        console.log(`✅ Layer created: ${name} (${thickness}m at ${elevation}m)`);
    }

    /**
     * إنشاء التمثيل ثلاثي الأبعاد للطبقة
     * @param {Array} boundaryPoints - نقاط حدود الطبقة
     * @returns {THREE.Mesh} المجسم ثلاثي الأبعاد
     */
    createMesh(boundaryPoints) {
        if (!boundaryPoints || boundaryPoints.length < 3) {
            console.error('❌ Invalid boundary points');
            return null;
        }

        // إنشاء شكل المضلع
        const shape = new THREE.Shape();
        boundaryPoints.forEach((p, i) => {
            if (i === 0) shape.moveTo(p.x, p.z);
            else shape.lineTo(p.x, p.z);
        });
        shape.closePath();

        // إنشاء هندسة الطبقة
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: this.thickness,
            bevelEnabled: false
        });

        // حساب الحجم
        const area = this.calculateArea(boundaryPoints);
        this.volume = area * this.thickness;

        // إعداد المادة
        const material = new THREE.MeshStandardMaterial({
            color: this.material.color,
            transparent: true,
            opacity: 0.7,
            roughness: 0.7,
            metalness: 0.1,
            emissive: 0x000000
        });

        // إنشاء المجسم
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = this.elevation;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.userData = {
            type: 'layer',
            name: this.name,
            thickness: this.thickness,
            elevation: this.elevation,
            material: this.material.type,
            volume: this.volume
        };

        console.log(`🎨 Layer mesh created: ${this.name}, volume: ${this.volume.toFixed(2)} m³`);
        
        return this.mesh;
    }

    /**
     * حساب مساحة الطبقة
     * @param {Array} points - نقاط المضلع
     * @returns {number} المساحة بالمتر المربع
     */
    calculateArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].z;
            area -= points[j].x * points[i].z;
        }
        return Math.abs(area) / 2;
    }

    /**
     * تحديث موقع الطبقة
     * @param {number} newElevation - المنسوب الجديد
     */
    setElevation(newElevation) {
        this.elevation = newElevation;
        if (this.mesh) {
            this.mesh.position.y = newElevation;
        }
        this.stats.elevation = newElevation;
        console.log(`📏 Layer ${this.name} elevation set to ${newElevation}m`);
    }

    /**
     * تحديث سمك الطبقة
     * @param {number} newThickness - السمك الجديد
     * @param {Array} boundaryPoints - نقاط الحدود (لإعادة حساب الحجم)
     */
    setThickness(newThickness, boundaryPoints) {
        this.thickness = newThickness;
        this.stats.thickness = newThickness;
        
        if (this.mesh && boundaryPoints) {
            const area = this.calculateArea(boundaryPoints);
            this.volume = area * newThickness;
            this.mesh.userData.volume = this.volume;
            this.mesh.userData.thickness = newThickness;
            
            // إعادة إنشاء المجسم
            const newMesh = this.createMesh(boundaryPoints);
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
                this.mesh.parent.add(newMesh);
            }
            this.mesh = newMesh;
        }
        
        console.log(`📏 Layer ${this.name} thickness set to ${newThickness}m, volume: ${this.volume.toFixed(2)} m³`);
    }

    /**
     * تطبيق الضغط (الدمك)
     * @param {number} compactionRatio - نسبة الدمك (0-1)
     */
    applyCompaction(compactionRatio) {
        const originalThickness = this.thickness;
        const originalVolume = this.volume;
        
        this.thickness *= compactionRatio;
        this.volume *= compactionRatio;
        this.stats.compaction = compactionRatio;
        
        console.log(`🔨 Layer ${this.name} compacted: ${originalThickness.toFixed(2)}m → ${this.thickness.toFixed(2)}m (${(compactionRatio * 100).toFixed(0)}%)`);
        
        return {
            originalThickness,
            newThickness: this.thickness,
            originalVolume,
            newVolume: this.volume,
            reduction: (1 - compactionRatio) * 100
        };
    }

    /**
     * الحصول على جدول الكميات للطبقة
     * @returns {Object} جدول الكميات
     */
    getBOQ() {
        return {
            نوع: 'طبقة تربة',
            اسم_الطبقة: this.name,
            نوع_التربة: this.material.name,
            السمك: this.thickness.toFixed(2) + ' م',
            المنسوب: this.elevation.toFixed(2) + ' م',
            الحجم: this.volume.toFixed(2) + ' م³',
            الكثافة: this.material.density.toFixed(2) + ' طن/م³',
            الوزن: (this.volume * this.material.density).toFixed(2) + ' طن',
            تاريخ_الإنشاء: this.createdAt.slice(0, 19).replace('T', ' ')
        };
    }

    /**
     * تغيير لون الطبقة
     * @param {number} color - اللون الجديد (hex)
     */
    setColor(color) {
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.setHex(color);
            console.log(`🎨 Layer ${this.name} color changed to ${color.toString(16)}`);
        }
    }

    /**
     * إظهار الطبقة
     */
    show() {
        if (this.mesh) {
            this.mesh.visible = true;
        }
    }

    /**
     * إخفاء الطبقة
     */
    hide() {
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    /**
     * تبديل حالة الرؤية
     */
    toggleVisibility() {
        if (this.mesh) {
            this.mesh.visible = !this.mesh.visible;
        }
    }

    /**
     * تصدير بيانات الطبقة
     * @returns {Object} بيانات الطبقة
     */
    toJSON() {
        return {
            name: this.name,
            material: {
                type: this.material.type,
                name: this.material.name,
                density: this.material.density,
                color: this.material.color
            },
            thickness: this.thickness,
            elevation: this.elevation,
            volume: this.volume,
            stats: this.stats,
            createdAt: this.createdAt
        };
    }

    /**
     * إنشاء طبقة من بيانات JSON
     * @param {Object} data - بيانات الطبقة
     * @returns {Layer} الطبقة الجديدة
     */
    static fromJSON(data) {
        const material = new SoilMaterial(data.material.type);
        const layer = new Layer(data.name, material, data.thickness, data.elevation);
        layer.volume = data.volume;
        layer.stats = data.stats;
        layer.createdAt = data.createdAt;
        return layer;
    }
}