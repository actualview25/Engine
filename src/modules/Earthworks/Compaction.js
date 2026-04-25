// =======================================
// ACTUAL VIEW CONSTRUCTION OS - COMPACTION
// =======================================
// نظام إدارة عمليات الدمك والردم
// =======================================

import * as THREE from 'three';
import { SoilMaterial } from './SoilMaterial.js';

export class Compaction {
    constructor(boundary, options = {}) {
        this.boundary = boundary;
        this.layers = [];
        this.totalVolume = 0;
        
        // إعدادات الدمك
        this.compactionRatio = options.compactionRatio || 0.95; // نسبة الدمك المطلوبة
        this.passesRequired = options.passesRequired || 4; // عدد تمريرات الدمك
        this.compactionMethod = options.compactionMethod || 'vibratory'; // طريقة الدمك
        
        // أنواع مواد الردم المتاحة
        this.materials = {
            'sand': new SoilMaterial('sand'),
            'gravel': new SoilMaterial('gravel'),
            'selected': new SoilMaterial('fill', { density: 1.8 }),
            'natural': new SoilMaterial('topsoil'),
            'rock': new SoilMaterial('rock')
        };
        
        // إحصائيات
        this.stats = {
            totalCompactedVolume: 0,
            totalLayers: 0,
            compactionQuality: 0,
            passesCompleted: 0
        };
    }
    
    /**
     * إضافة طبقة ردم جديدة
     * @param {number} thickness - سمك الطبقة بالمتر
     * @param {string} materialType - نوع المادة (sand, gravel, selected, natural, rock)
     * @param {Object} options - خيارات إضافية
     */
    addLayer(thickness, materialType = 'sand', options = {}) {
        // التحقق من وجود المادة
        if (!this.materials[materialType]) {
            console.warn(`⚠️ مادة غير معروفة: ${materialType}، استخدام الرمل كبديل`);
            materialType = 'sand';
        }
        
        const material = this.materials[materialType];
        
        // حساب الحجم قبل الدمك
        const looseVolume = this.boundary.area * thickness;
        
        // حساب الحجم بعد الدمك
        const compactedVolume = material.getCompactedVolume 
            ? material.getCompactedVolume(looseVolume) 
            : looseVolume * this.compactionRatio;
        
        // حساب عدد تمريرات الدمك حسب السمك ونوع المادة
        const passes = this.calculateRequiredPasses(thickness, materialType);
        
        // إنشاء الطبقة
        const layer = {
            id: `layer-${Date.now()}-${this.layers.length}`,
            thickness: thickness,
            material: material,
            materialType: materialType,
            looseVolume: looseVolume,
            compactedVolume: compactedVolume,
            passes: passes,
            density: material.density,
            compactionRatio: compactedVolume / looseVolume,
            quality: this.estimateQuality(thickness, materialType),
            timestamp: new Date().toISOString()
        };
        
        this.layers.push(layer);
        this.totalVolume += compactedVolume;
        this.stats.totalLayers = this.layers.length;
        this.stats.totalCompactedVolume += compactedVolume;
        
        // تحديث جودة الدمك الإجمالية
        this.updateOverallQuality();
        
        console.log(`✅ تم إضافة طبقة ${material.name} بسمك ${thickness.toFixed(2)} م، حجم مدمك: ${compactedVolume.toFixed(2)} م³`);
        
        return layer;
    }
    
    /**
     * حساب عدد تمريرات الدمك المطلوبة
     * @param {number} thickness - سمك الطبقة
     * @param {string} materialType - نوع المادة
     */
    calculateRequiredPasses(thickness, materialType) {
        let basePasses = this.passesRequired;
        
        // تعديل حسب نوع المادة
        const materialFactors = {
            'sand': 1.0,
            'gravel': 1.2,
            'selected': 1.1,
            'natural': 1.3,
            'rock': 1.5
        };
        
        const materialFactor = materialFactors[materialType] || 1.0;
        
        // تعديل حسب السمك
        let thicknessFactor = 1.0;
        if (thickness <= 0.2) thicknessFactor = 0.8;
        else if (thickness <= 0.3) thicknessFactor = 1.0;
        else thicknessFactor = 1.3;
        
        return Math.ceil(basePasses * materialFactor * thicknessFactor);
    }
    
    /**
     * تقدير جودة الطبقة
     * @param {number} thickness - سمك الطبقة
     * @param {string} materialType - نوع المادة
     */
    estimateQuality(thickness, materialType) {
        let quality = 0.9; // جودة أساسية
        
        // تخفيض الجودة للطبقات السميكة
        if (thickness > 0.3) quality -= 0.1;
        if (thickness > 0.4) quality -= 0.15;
        
        // تعديل حسب نوع المادة
        const qualityFactors = {
            'gravel': 1.05,
            'selected': 1.02,
            'sand': 1.0,
            'natural': 0.95,
            'rock': 0.9
        };
        
        quality *= qualityFactors[materialType] || 1.0;
        
        return Math.min(1.0, Math.max(0.7, quality));
    }
    
    /**
     * تحديث جودة الدمك الإجمالية
     */
    updateOverallQuality() {
        if (this.layers.length === 0) {
            this.stats.compactionQuality = 0;
            return;
        }
        
        const totalQuality = this.layers.reduce((sum, layer) => sum + layer.quality, 0);
        this.stats.compactionQuality = totalQuality / this.layers.length;
    }
    
    /**
     * رسم طبقات الردم في المشهد
     * @param {THREE.Scene} scene - المشهد ثلاثي الأبعاد
     * @param {number} baseElevation - منسوب الأساس
     */
    draw(scene, baseElevation = 0) {
        if (!scene) {
            console.error('❌ المشهد غير موجود');
            return;
        }
        
        let currentElevation = baseElevation;
        const colors = {
            'sand': 0xF4E542,
            'gravel': 0x808080,
            'selected': 0xCD853F,
            'natural': 0x8B4513,
            'rock': 0x555555
        };
        
        this.layers.forEach((layer, index) => {
            // إنشاء شكل المنطقة
            const shape = new THREE.Shape();
            const points = this.boundary.points || this.getDefaultBoundary();
            
            points.forEach((p, i) => {
                if (i === 0) shape.moveTo(p.x, p.z);
                else shape.lineTo(p.x, p.z);
            });
            shape.closePath();
            
            // إنشاء الهندسة ثلاثية الأبعاد
            const geometry = new THREE.ExtrudeGeometry(shape, {
                depth: layer.thickness,
                bevelEnabled: false
            });
            
            // اختيار اللون حسب نوع المادة
            const materialColor = colors[layer.materialType] || 0xCCCCCC;
            
            const material = new THREE.MeshStandardMaterial({
                color: materialColor,
                transparent: true,
                opacity: 0.6 + (index * 0.1),
                emissive: 0x000000,
                roughness: 0.7,
                metalness: 0.1
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, currentElevation + layer.thickness / 2, 0);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = {
                type: 'compaction',
                layerId: layer.id,
                material: layer.materialType,
                thickness: layer.thickness
            };
            
            scene.add(mesh);
            
            currentElevation += layer.thickness;
        });
        
        // رسم الحدود
        this.drawBoundary(scene, currentElevation);
        
        console.log(`✅ تم رسم ${this.layers.length} طبقات ردم`);
    }
    
    /**
     * الحصول على حدود افتراضية (للاستخدام في حالة عدم وجود حدود محددة)
     */
    getDefaultBoundary() {
        const size = Math.sqrt(this.boundary?.area || 100);
        return [
            { x: -size/2, z: -size/2 },
            { x: size/2, z: -size/2 },
            { x: size/2, z: size/2 },
            { x: -size/2, z: size/2 }
        ];
    }
    
    /**
     * رسم حدود منطقة الردم
     * @param {THREE.Scene} scene - المشهد ثلاثي الأبعاد
     * @param {number} topElevation - أعلى منسوب
     */
    drawBoundary(scene, topElevation) {
        const points = this.boundary.points || this.getDefaultBoundary();
        
        // نقاط الحدود العلوية
        const topPoints = points.map(p => new THREE.Vector3(p.x, topElevation, p.z));
        
        // رسم الحدود العلوية
        const topGeometry = new THREE.BufferGeometry().setFromPoints(topPoints);
        const topMaterial = new THREE.LineBasicMaterial({ color: 0xffaa44 });
        const topLine = new THREE.Line(topGeometry, topMaterial);
        scene.add(topLine);
        
        // رسم الأعمدة الرأسية
        const bottomPoints = points.map(p => new THREE.Vector3(p.x, 0, p.z));
        
        bottomPoints.forEach((bottom, i) => {
            const verticalPoints = [bottom, topPoints[i]];
            const verticalGeo = new THREE.BufferGeometry().setFromPoints(verticalPoints);
            const verticalLine = new THREE.Line(verticalGeo, topMaterial);
            scene.add(verticalLine);
        });
        
        // رسم الحدود السفلية
        const bottomGeometry = new THREE.BufferGeometry().setFromPoints(bottomPoints);
        const bottomLine = new THREE.Line(bottomGeometry, topMaterial);
        scene.add(bottomLine);
    }
    
    /**
     * تنفيذ عملية الدمك
     * @param {number} passes - عدد التمريرات
     */
    compact(passes = 1) {
        this.stats.passesCompleted += passes;
        
        // تحسين جودة الدمك مع كل تمريرة
        this.layers.forEach(layer => {
            const improvement = passes * 0.02; // 2% تحسين لكل تمريرة
            layer.quality = Math.min(1.0, layer.quality + improvement);
        });
        
        this.updateOverallQuality();
        
        console.log(`✅ تم تنفيذ ${passes} تمريرة دمك. الجودة الحالية: ${(this.stats.compactionQuality * 100).toFixed(1)}%`);
        
        return this.stats.compactionQuality;
    }
    
    /**
     * اختبار جودة الدمك
     * @returns {Object} نتائج الاختبار
     */
    testQuality() {
        const results = {
            timestamp: new Date().toISOString(),
            overallQuality: this.stats.compactionQuality,
            layers: this.layers.map(layer => ({
                material: layer.material.name,
                thickness: layer.thickness,
                quality: layer.quality,
                density: layer.density
            })),
            passed: this.stats.compactionQuality >= 0.9,
            recommendations: []
        };
        
        // إضافة توصيات
        if (this.stats.compactionQuality < 0.9) {
            results.recommendations.push('تحتاج إلى تمريرات إضافية للدمك');
        }
        
        if (this.layers.some(l => l.thickness > 0.3)) {
            results.recommendations.push('بعض الطبقات سميكة جداً، يفضل تقسيمها');
        }
        
        return results;
    }
    
    /**
     * الحصول على جدول كميات الردم والدمك
     * @returns {Object} جدول الكميات
     */
    getBOQ() {
        const totalLooseVolume = this.layers.reduce((sum, l) => sum + l.looseVolume, 0);
        const totalCompactedVolume = this.layers.reduce((sum, l) => sum + l.compactedVolume, 0);
        const totalWeight = totalCompactedVolume * 1.8; // وزن تقريبي
        
        return {
            العمل: 'ردم ودمك',
            نوع_التربة: this.layers.map(l => l.material.name).join('، '),
            عدد_الطبقات: this.layers.length,
            الحجم_الرخو: totalLooseVolume.toFixed(2) + ' م³',
            الحجم_المدمك: totalCompactedVolume.toFixed(2) + ' م³',
            نسبة_الدمك: ((totalCompactedVolume / totalLooseVolume) * 100).toFixed(1) + '%',
            جودة_الدمك: (this.stats.compactionQuality * 100).toFixed(1) + '%',
            تمريرات_الدمك: this.stats.passesCompleted,
            الوزن_التقريبي: totalWeight.toFixed(2) + ' طن',
            التفاصيل: this.layers.map((l, i) => ({
                طبقة: i + 1,
                سمك: l.thickness.toFixed(2) + ' م',
                مادة: l.material.name,
                حجم_رخو: l.looseVolume.toFixed(2) + ' م³',
                حجم_مدمك: l.compactedVolume.toFixed(2) + ' م³',
                جودة: (l.quality * 100).toFixed(1) + '%'
            }))
        };
    }
    
    /**
     * تصدير البيانات بتنسيق JSON
     */
    toJSON() {
        return {
            boundary: this.boundary,
            layers: this.layers,
            stats: this.stats,
            compactionRatio: this.compactionRatio,
            passesRequired: this.passesRequired,
            compactionMethod: this.compactionMethod,
            boq: this.getBOQ()
        };
    }
}