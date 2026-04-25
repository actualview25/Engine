// ============================================
// AREA TOOL - أداة قياس المساحة
// ============================================

import * as THREE from 'three';

export class AreaTool {
    constructor(scene, camera, eventBus) {
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;
        
        this.points = [];
        this.markers = [];
        this.polygonLines = [];
        this.areaLabel = null;
        this.isActive = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('tool:activate', (tool) => {
            this.isActive = (tool === 'area');
            if (!this.isActive) {
                this.clear();
            }
        });
    }
    
    handleClick(point) {
        if (!this.isActive) return;
        
        // إضافة نقطة
        this.points.push(point.clone());
        
        // إضافة علامة
        this.addMarker(point);
        
        // تحديث المضلع
        if (this.points.length >= 3) {
            this.updatePolygon();
            this.calculateArea();
        }
        
        // إعلام المستخدم بعدد النقاط
        this.eventBus.emit('ui:status', `📐 ${this.points.length} نقاط (اضغط Enter لإنهاء)`);
    }
    
    addMarker(point) {
        const geometry = new THREE.SphereGeometry(0.12, 12, 12);
        const material = new THREE.MeshStandardMaterial({ color: 0x44aaff, emissive: 0x004466 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(point);
        this.scene.add(marker);
        this.markers.push(marker);
    }
    
    updatePolygon() {
        // حذف الخطوط القديمة
        for (const line of this.polygonLines) {
            this.scene.remove(line);
        }
        this.polygonLines = [];
        
        // إنشاء خطوط جديدة بين النقاط
        for (let i = 0; i < this.points.length - 1; i++) {
            const points_array = [this.points[i], this.points[i + 1]];
            const geometry = new THREE.BufferGeometry().setFromPoints(points_array);
            const material = new THREE.LineBasicMaterial({ color: 0x44aaff, linewidth: 2 });
            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            this.polygonLines.push(line);
        }
        
        // إغلاق المضلع
        if (this.points.length >= 3) {
            const points_array = [this.points[this.points.length - 1], this.points[0]];
            const geometry = new THREE.BufferGeometry().setFromPoints(points_array);
            const material = new THREE.LineBasicMaterial({ color: 0x44aaff, linewidth: 2 });
            const closingLine = new THREE.Line(geometry, material);
            this.scene.add(closingLine);
            this.polygonLines.push(closingLine);
        }
    }
    
    calculateArea() {
        if (this.points.length < 3) return 0;
        
        // حساب المساحة باستخدام صيغة المضلع (Shoelace formula)
        let area = 0;
        const n = this.points.length;
        
        for (let i = 0; i < n; i++) {
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % n];
            area += p1.x * p2.z - p2.x * p1.z;
        }
        
        area = Math.abs(area) / 2;
        
        this.lastArea = area;
        
        // تحديث أو إنشاء نص المساحة
        this.updateAreaLabel(area);
        
        this.eventBus.emit('measurement:area', { area, points: this.points });
        
        return area;
    }
    
    updateAreaLabel(area) {
        // حذف النص القديم
        if (this.areaLabel) {
            this.scene.remove(this.areaLabel);
        }
        
        // حساب مركز المضلع
        const center = new THREE.Vector3();
        for (const point of this.points) {
            center.add(point);
        }
        center.divideScalar(this.points.length);
        
        // إنشاء نص جديد
        const div = document.createElement('div');
        div.textContent = `📐 ${area.toFixed(2)} m²`;
        div.style.cssText = `
            background: rgba(0,0,0,0.8);
            color: #44aaff;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 14px;
            font-family: monospace;
            font-weight: bold;
            border: 1px solid #44aaff;
            white-space: nowrap;
        `;
        
        import('three/addons/renderers/CSS2DRenderer.js').then(({ CSS2DObject }) => {
            this.areaLabel = new CSS2DObject(div);
            this.areaLabel.position.copy(center);
            this.scene.add(this.areaLabel);
        });
    }
    
    finishMeasurement() {
        if (this.points.length >= 3) {
            const area = this.calculateArea();
            this.eventBus.emit('ui:status', `📐 المساحة النهائية: ${area.toFixed(2)} متر مربع`);
            this.eventBus.emit('measurement:areaComplete', { area, points: this.points });
        }
        
        this.clear();
        this.eventBus.emit('tool:deactivate');
    }
    
    clear() {
        // حذف العلامات
        for (const marker of this.markers) {
            this.scene.remove(marker);
        }
        
        // حذف الخطوط
        for (const line of this.polygonLines) {
            this.scene.remove(line);
        }
        
        // حذف النص
        if (this.areaLabel) {
            this.scene.remove(this.areaLabel);
        }
        
        this.points = [];
        this.markers = [];
        this.polygonLines = [];
        this.areaLabel = null;
    }
    
    update() {
        // استماع لحدث Enter لإنهاء القياس
        window.addEventListener('keydown', (e) => {
            if (this.isActive && e.key === 'Enter') {
                this.finishMeasurement();
            }
        });
    }
}