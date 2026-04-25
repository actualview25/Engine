// ============================================
// VOLUME TOOL - أداة قياس الحجم
// تقيس حجم المجسمات ثلاثية الأبعاد
// ============================================

import * as THREE from 'three';

export class VolumeTool {
    constructor(scene, camera, eventBus) {
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;
        
        this.points = [];
        this.markers = [];
        this.edges = [];
        this.tempBox = null;
        this.volumeLabel = null;
        this.isActive = false;
        this.mode = 'box'; // 'box', 'custom'
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('tool:activate', (tool) => {
            this.isActive = (tool === 'volume');
            if (!this.isActive) {
                this.clear();
            }
        });
        
        this.eventBus.on('volume:mode', (mode) => {
            this.mode = mode;
            this.clear();
            this.eventBus.emit('ui:status', `📦 وضع قياس الحجم: ${mode === 'box' ? 'صندوق' : 'مخصص'}`);
        });
    }
    
    handleClick(point) {
        if (!this.isActive) return;
        
        if (this.mode === 'box') {
            this.handleBoxMode(point);
        } else {
            this.handleCustomMode(point);
        }
    }
    
    handleBoxMode(point) {
        this.points.push(point.clone());
        this.addMarker(point);
        
        if (this.points.length === 1) {
            // أول نقطة - تحديد الزاوية الأولى
            this.eventBus.emit('ui:status', '📦 اختر الزاوية الثانية للصندوق');
        } else if (this.points.length === 2) {
            // النقطة الثانية - حساب الصندوق
            this.calculateBoxVolume(this.points[0], this.points[1]);
            this.eventBus.emit('ui:status', `📦 الحجم: ${this.lastVolume.toFixed(2)} متر مكعب`);
            
            // إعادة تعيين بعد 3 ثوانٍ
            setTimeout(() => {
                this.clear();
                this.eventBus.emit('tool:deactivate');
            }, 3000);
        }
    }
    
    handleCustomMode(point) {
        this.points.push(point.clone());
        this.addMarker(point);
        
        if (this.points.length === 1) {
            this.eventBus.emit('ui:status', '📦 اختر النقطة الثانية');
        } else if (this.points.length === 2) {
            this.eventBus.emit('ui:status', '📦 اختر النقطة الثالثة (الارتفاع)');
        } else if (this.points.length === 3) {
            this.calculateCustomVolume();
            this.eventBus.emit('ui:status', `📦 الحجم: ${this.lastVolume.toFixed(2)} متر مكعب`);
            
            setTimeout(() => {
                this.clear();
                this.eventBus.emit('tool:deactivate');
            }, 3000);
        }
    }
    
    calculateBoxVolume(corner1, corner2) {
        // حساب أبعاد الصندوق
        const width = Math.abs(corner2.x - corner1.x);
        const height = Math.abs(corner2.y - corner1.y);
        const depth = Math.abs(corner2.z - corner1.z);
        
        this.lastVolume = width * height * depth;
        
        // إنشاء صندوق شفاف للعرض
        this.createBoxVisual(corner1, corner2);
        
        // إضافة نص الحجم
        const center = new THREE.Vector3(
            (corner1.x + corner2.x) / 2,
            (corner1.y + corner2.y) / 2,
            (corner1.z + corner2.z) / 2
        );
        this.addVolumeLabel(center, this.lastVolume);
        
        this.eventBus.emit('measurement:volume', {
            volume: this.lastVolume,
            dimensions: { width, height, depth },
            type: 'box'
        });
    }
    
    calculateCustomVolume() {
        if (this.points.length < 3) return;
        
        // حساب المساحة الأساسية (من أول نقطتين)
        const width = Math.abs(this.points[1].x - this.points[0].x);
        const depth = Math.abs(this.points[1].z - this.points[0].z);
        const height = Math.abs(this.points[2].y - this.points[0].y);
        
        this.lastVolume = width * height * depth;
        
        // إنشاء تمثيل مرئي
        this.createCustomBoxVisual();
        
        // إضافة نص الحجم
        const center = new THREE.Vector3(
            (this.points[0].x + this.points[1].x) / 2,
            (this.points[0].y + this.points[2].y) / 2,
            (this.points[0].z + this.points[1].z) / 2
        );
        this.addVolumeLabel(center, this.lastVolume);
        
        this.eventBus.emit('measurement:volume', {
            volume: this.lastVolume,
            points: this.points,
            type: 'custom'
        });
    }
    
    createBoxVisual(corner1, corner2) {
        // حذف الصندوق القديم
        if (this.tempBox) {
            this.scene.remove(this.tempBox);
        }
        
        // إنشاء صندوق شفاف
        const width = Math.abs(corner2.x - corner1.x);
        const height = Math.abs(corner2.y - corner1.y);
        const depth = Math.abs(corner2.z - corner1.z);
        
        const center = new THREE.Vector3(
            (corner1.x + corner2.x) / 2,
            (corner1.y + corner2.y) / 2,
            (corner1.z + corner2.z) / 2
        );
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({
            color: 0x44ffaa,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        this.tempBox = new THREE.Mesh(geometry, material);
        this.tempBox.position.copy(center);
        this.scene.add(this.tempBox);
        
        // إضافة حواف الصندوق
        const edgesGeo = new THREE.EdgesGeometry(geometry);
        const edgesMat = new THREE.LineBasicMaterial({ color: 0x44ffaa });
        const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
        this.tempBox.add(wireframe);
    }
    
    createCustomBoxVisual() {
        if (this.points.length < 3) return;
        
        if (this.tempBox) {
            this.scene.remove(this.tempBox);
        }
        
        const width = Math.abs(this.points[1].x - this.points[0].x);
        const depth = Math.abs(this.points[1].z - this.points[0].z);
        const height = Math.abs(this.points[2].y - this.points[0].y);
        
        const center = new THREE.Vector3(
            (this.points[0].x + this.points[1].x) / 2,
            (this.points[0].y + this.points[2].y) / 2,
            (this.points[0].z + this.points[1].z) / 2
        );
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.2
        });
        
        this.tempBox = new THREE.Mesh(geometry, material);
        this.tempBox.position.copy(center);
        this.scene.add(this.tempBox);
    }
    
    addMarker(point) {
        const geometry = new THREE.SphereGeometry(0.15, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x44ffaa, emissive: 0x226644 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(point);
        this.scene.add(marker);
        this.markers.push(marker);
    }
    
    addVolumeLabel(position, volume) {
        if (this.volumeLabel) {
            this.scene.remove(this.volumeLabel);
        }
        
        const div = document.createElement('div');
        div.textContent = `📦 ${volume.toFixed(2)} m³`;
        div.style.cssText = `
            background: rgba(0,0,0,0.8);
            color: #44ffaa;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 14px;
            font-family: monospace;
            font-weight: bold;
            border: 1px solid #44ffaa;
            white-space: nowrap;
        `;
        
        import('three/addons/renderers/CSS2DRenderer.js').then(({ CSS2DObject }) => {
            this.volumeLabel = new CSS2DObject(div);
            this.volumeLabel.position.copy(position);
            this.scene.add(this.volumeLabel);
        });
    }
    
    clear() {
        for (const marker of this.markers) {
            this.scene.remove(marker);
        }
        
        if (this.tempBox) {
            this.scene.remove(this.tempBox);
        }
        
        if (this.volumeLabel) {
            this.scene.remove(this.volumeLabel);
        }
        
        this.points = [];
        this.markers = [];
        this.tempBox = null;
        this.volumeLabel = null;
    }
    
    update() {
        // يمكن إضافة تحديثات هنا
    }
}