// ============================================
// ANGLE TOOL - أداة قياس الزوايا
// تقيس الزوايا بين ثلاثة نقاط
// ============================================

import * as THREE from 'three';

export class AngleTool {
    constructor(scene, camera, eventBus) {
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;
        
        this.points = [];
        this.markers = [];
        this.lines = [];
        this.angleLabel = null;
        this.arcLine = null;
        this.isActive = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('tool:activate', (tool) => {
            this.isActive = (tool === 'angle');
            if (!this.isActive) {
                this.clear();
            }
        });
    }
    
    handleClick(point) {
        if (!this.isActive) return;
        
        this.points.push(point.clone());
        this.addMarker(point);
        
        if (this.points.length === 1) {
            this.eventBus.emit('ui:status', '📐 اختر النقطة الثانية (رأس الزاوية)');
        } else if (this.points.length === 2) {
            this.eventBus.emit('ui:status', '📐 اختر النقطة الثالثة');
            this.addLine(this.points[0], this.points[1]);
        } else if (this.points.length === 3) {
            this.calculateAngle();
            this.eventBus.emit('ui:status', `📐 الزاوية: ${this.lastAngle.toFixed(1)}°`);
            
            setTimeout(() => {
                this.clear();
                this.eventBus.emit('tool:deactivate');
            }, 3000);
        }
    }
    
    calculateAngle() {
        if (this.points.length < 3) return;
        
        const p1 = this.points[0];
        const p2 = this.points[1]; // رأس الزاوية
        const p3 = this.points[2];
        
        // حساب المتجهات
        const v1 = new THREE.Vector3(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
        const v2 = new THREE.Vector3(p3.x - p2.x, p3.y - p2.y, p3.z - p2.z);
        
        // حساب الزاوية بالراديان
        const dot = v1.dot(v2);
        const mag1 = v1.length();
        const mag2 = v2.length();
        const angleRad = Math.acos(dot / (mag1 * mag2));
        
        // تحويل إلى درجات
        this.lastAngle = angleRad * 180 / Math.PI;
        
        // إضافة الخط الثالث
        this.addLine(this.points[1], this.points[2]);
        
        // إضافة قوس الزاوية
        this.addArc(p2, v1, v2, angleRad);
        
        // إضافة نص الزاوية
        this.addAngleLabel(p2, this.lastAngle);
        
        this.eventBus.emit('measurement:angle', {
            angle: this.lastAngle,
            points: this.points,
            vertex: p2
        });
    }
    
    addMarker(point) {
        const geometry = new THREE.SphereGeometry(0.12, 12, 12);
        const material = new THREE.MeshStandardMaterial({ color: 0xff6688, emissive: 0x442233 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(point);
        this.scene.add(marker);
        this.markers.push(marker);
    }
    
    addLine(p1, p2) {
        const points_array = [p1, p2];
        const geometry = new THREE.BufferGeometry().setFromPoints(points_array);
        const material = new THREE.LineBasicMaterial({ color: 0xff6688, linewidth: 2 });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.lines.push(line);
    }
    
    addArc(center, v1, v2, angleRad) {
        if (this.arcLine) {
            this.scene.remove(this.arcLine);
        }
        
        // إنشاء قوس دائري
        const radius = 1.5;
        const segments = 32;
        const points = [];
        
        // توحيد المتجهات
        v1.normalize();
        v2.normalize();
        
        // حساب زاوية البداية والنهاية
        const startAngle = Math.atan2(v1.y, v1.x);
        const endAngle = startAngle + angleRad;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = startAngle + t * angleRad;
            
            const x = center.x + radius * Math.cos(angle);
            const y = center.y + radius * Math.sin(angle);
            const z = center.z;
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xffaa44, linewidth: 2 });
        this.arcLine = new THREE.Line(geometry, material);
        this.scene.add(this.arcLine);
    }
    
    addAngleLabel(position, angle) {
        if (this.angleLabel) {
            this.scene.remove(this.angleLabel);
        }
        
        // إزاحة النص قليلاً عن رأس الزاوية
        const labelPos = position.clone();
        labelPos.x += 1.2;
        labelPos.y += 0.8;
        
        const div = document.createElement('div');
        div.textContent = `${angle.toFixed(1)}°`;
        div.style.cssText = `
            background: rgba(0,0,0,0.8);
            color: #ffaa44;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 14px;
            font-family: monospace;
            font-weight: bold;
            border: 1px solid #ffaa44;
            white-space: nowrap;
        `;
        
        import('three/addons/renderers/CSS2DRenderer.js').then(({ CSS2DObject }) => {
            this.angleLabel = new CSS2DObject(div);
            this.angleLabel.position.copy(labelPos);
            this.scene.add(this.angleLabel);
        });
    }
    
    clear() {
        for (const marker of this.markers) {
            this.scene.remove(marker);
        }
        
        for (const line of this.lines) {
            this.scene.remove(line);
        }
        
        if (this.arcLine) {
            this.scene.remove(this.arcLine);
        }
        
        if (this.angleLabel) {
            this.scene.remove(this.angleLabel);
        }
        
        this.points = [];
        this.markers = [];
        this.lines = [];
        this.arcLine = null;
        this.angleLabel = null;
    }
    
    update() {}
}