// ============================================
// DISTANCE TOOL - أداة قياس المسافة
// ============================================

import * as THREE from 'three';

export class DistanceTool {
    constructor(scene, camera, eventBus) {
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;
        
        this.points = [];
        this.lines = [];
        this.labels = [];
        this.isActive = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('tool:activate', (tool) => {
            this.isActive = (tool === 'distance');
            if (!this.isActive) {
                this.clear();
            }
        });
    }
    
    handleClick(point) {
        if (!this.isActive) return;
        
        // إضافة نقطة
        this.points.push(point.clone());
        
        // إضافة علامة نقطية
        this.addPointMarker(point);
        
        // تحديث الخط
        if (this.points.length >= 2) {
            this.updateLine();
            this.calculateDistance();
        }
        
        // إذا وصلنا لنقطتين، ننهي القياس تلقائياً
        if (this.points.length === 2) {
            this.eventBus.emit('ui:status', `📏 المسافة: ${this.lastDistance.toFixed(2)} متر`);
            setTimeout(() => {
                this.clear();
                this.eventBus.emit('tool:deactivate');
            }, 2000);
        }
    }
    
    addPointMarker(point) {
        const geometry = new THREE.SphereGeometry(0.15, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x442200 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(point);
        this.scene.add(marker);
        this.lines.push(marker);
    }
    
    updateLine() {
        // حذف الخط القديم
        if (this.currentLine) {
            this.scene.remove(this.currentLine);
        }
        
        // إنشاء خط جديد بين النقطتين
        const points_array = [this.points[0], this.points[1]];
        const geometry = new THREE.BufferGeometry().setFromPoints(points_array);
        const material = new THREE.LineBasicMaterial({ color: 0xffaa44, linewidth: 2 });
        this.currentLine = new THREE.Line(geometry, material);
        this.scene.add(this.currentLine);
    }
    
    calculateDistance() {
        const p1 = this.points[0];
        const p2 = this.points[1];
        
        const distance = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
        
        this.lastDistance = distance;
        
        // إضافة نص المسافة
        this.addDistanceLabel((p1.clone().add(p2)).multiplyScalar(0.5), distance);
        
        this.eventBus.emit('measurement:distance', { distance, points: this.points });
        
        return distance;
    }
    
    addDistanceLabel(position, distance) {
        // إنشاء عنصر HTML للنص
        const div = document.createElement('div');
        div.textContent = `${distance.toFixed(2)} m`;
        div.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: #ffaa44;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-family: monospace;
            border: 1px solid #ffaa44;
            white-space: nowrap;
        `;
        
        // استخدام CSS2DRenderer
        import('three/addons/renderers/CSS2DRenderer.js').then(({ CSS2DObject }) => {
            const label = new CSS2DObject(div);
            label.position.copy(position);
            this.scene.add(label);
            this.labels.push(label);
        });
    }
    
    clear() {
        // حذف العلامات
        for (const item of this.lines) {
            this.scene.remove(item);
        }
        
        // حذف النصوص
        for (const label of this.labels) {
            this.scene.remove(label);
        }
        
        if (this.currentLine) {
            this.scene.remove(this.currentLine);
        }
        
        this.points = [];
        this.lines = [];
        this.labels = [];
        this.currentLine = null;
    }
    
    update() {
        // يمكن إضافة تحديثات في الحلقة إذا لزم الأمر
    }
}