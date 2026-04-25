// ============================================
// WORKER MARKERS - علامات العمال على الخريطة
// يدعم: عرض مواقع العمال، أنواع العلامات، تحديث لحظي
// ============================================

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class WorkerMarkers {
    constructor(scene = null) {
        this.scene = scene;
        
        // مجموعات العلامات
        this.markerGroup = new THREE.Group();
        if (this.scene) this.scene.add(this.markerGroup);
        
        // العلامات النشطة
        this.markers = new Map(); // workerId -> marker
        
        // إعدادات العلامات
        this.settings = {
            showNames: true,
            showRoles: true,
            showDistance: true,
            markerSize: 1.0,
            updateInterval: 500, // ms
            maxDistance: 100, // meters
            colors: {
                general: 0x44aaff,
                electrician: 0xffaa44,
                plumber: 0x44ffaa,
                carpenter: 0xff8844,
                foreman: 0xff4444,
                mobile: 0xaa44ff
            }
        };
        
        // CSS2DRenderer للنصوص
        this.css2DRenderer = new CSS2DRenderer();
        this.css2DRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css2DRenderer.domElement.style.position = 'absolute';
        this.css2DRenderer.domElement.style.top = '0px';
        this.css2DRenderer.domElement.style.left = '0px';
        this.css2DRenderer.domElement.style.pointerEvents = 'none';
        this.css2DRenderer.domElement.style.zIndex = '20';
        document.body.appendChild(this.css2DRenderer.domElement);
        
        // تحديث المواقع
        this.updateInterval = null;
        
        // بيانات العمال
        this.workers = new Map(); // workerId -> workerData
        
        console.log('📍 WorkerMarkers initialized');
    }
    
    // ========== MARKER MANAGEMENT ==========
    
    addWorkerMarker(workerId, workerData, position) {
        // حذف العلامة القديمة إذا وجدت
        if (this.markers.has(workerId)) {
            this.removeWorkerMarker(workerId);
        }
        
        // إنشاء علامة ثلاثية الأبعاد
        const marker = this.createMarker3D(workerData, position);
        
        // إنشاء تسمية CSS2D للاسم والمسافة
        const label = this.createLabel(workerData, position);
        
        this.markers.set(workerId, {
            id: workerId,
            data: workerData,
            marker: marker,
            label: label,
            position: position,
            lastUpdate: Date.now()
        });
        
        this.markerGroup.add(marker);
        this.markerGroup.add(label);
        
        this.notifyListeners('markerAdded', { workerId, workerData, position });
        
        return marker;
    }
    
    createMarker3D(workerData, position) {
        const color = this.settings.colors[workerData.role] || this.settings.colors.general;
        
        // الجسم الرئيسي
        const geometry = new THREE.SphereGeometry(0.25 * this.settings.markerSize, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            metalness: 0.7,
            roughness: 0.3
        });
        const sphere = new THREE.Mesh(geometry, material);
        
        // حلقة حول العلامة
        const ringGeo = new THREE.TorusGeometry(0.35 * this.settings.markerSize, 0.05, 16, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: color, emissive: color });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        
        // مؤشر الاتجاه
        const arrowGeo = new THREE.ConeGeometry(0.15 * this.settings.markerSize, 0.4 * this.settings.markerSize, 8);
        const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.y = 0.35 * this.settings.markerSize;
        
        const group = new THREE.Group();
        group.add(sphere);
        group.add(ring);
        group.add(arrow);
        
        group.position.copy(position);
        group.userData = {
            type: 'worker_marker',
            workerId: workerData.id,
            role: workerData.role
        };
        
        return group;
    }
    
    createLabel(workerData, position) {
        const div = document.createElement('div');
        div.className = 'worker-marker-label';
        
        let html = `<div style="
            background: rgba(0,0,0,0.8);
            border-radius: 8px;
            padding: 4px 8px;
            font-size: 11px;
            font-family: monospace;
            color: #fff;
            text-align: center;
            border-left: 3px solid ${this.getRoleColor(workerData.role)};
            white-space: nowrap;
        ">`;
        
        if (this.settings.showNames) {
            html += `<strong>${workerData.name || workerData.id}</strong><br>`;
        }
        
        if (this.settings.showRoles) {
            html += `<span style="font-size: 9px; color: #aaa;">${workerData.role || 'worker'}</span>`;
        }
        
        if (this.settings.showDistance) {
            html += `<span style="font-size: 9px; color: #44ff44; margin-left: 6px;" class="distance">0m</span>`;
        }
        
        html += `</div>`;
        div.innerHTML = html;
        
        const label = new CSS2DObject(div);
        label.position.copy(position);
        label.position.y += 0.6 * this.settings.markerSize;
        label.userData = {
            type: 'worker_label',
            workerId: workerData.id
        };
        
        return label;
    }
    
    removeWorkerMarker(workerId) {
        const markerData = this.markers.get(workerId);
        if (markerData) {
            this.markerGroup.remove(markerData.marker);
            this.markerGroup.remove(markerData.label);
            
            // تنظيف الموارد
            if (markerData.marker.children) {
                markerData.marker.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
            
            this.markers.delete(workerId);
            
            this.notifyListeners('markerRemoved', { workerId });
        }
    }
    
    // ========== WORKER DATA MANAGEMENT ==========
    
    updateWorker(workerId, workerData, position) {
        if (this.markers.has(workerId)) {
            const existing = this.markers.get(workerId);
            
            // تحديث الموقع
            existing.marker.position.copy(position);
            existing.label.position.copy(position);
            existing.label.position.y += 0.6 * this.settings.markerSize;
            existing.position = position;
            existing.lastUpdate = Date.now();
            
            // تحديث البيانات
            existing.data = { ...existing.data, ...workerData };
            
            // تحديث التسمية إذا تغير الاسم أو الدور
            if (existing.data.name !== workerData.name || existing.data.role !== workerData.role) {
                const newLabel = this.createLabel(existing.data, position);
                this.markerGroup.remove(existing.label);
                this.markerGroup.add(newLabel);
                existing.label = newLabel;
            }
            
            this.notifyListeners('workerUpdated', { workerId, workerData, position });
        } else {
            this.addWorkerMarker(workerId, workerData, position);
        }
    }
    
    updateWorkersBatch(workers) {
        for (const worker of workers) {
            if (worker.position) {
                this.updateWorker(worker.id, worker, worker.position);
            }
        }
    }
    
    removeAllMarkers() {
        for (const [workerId] of this.markers) {
            this.removeWorkerMarker(workerId);
        }
    }
    
    // ========== DISTANCE CALCULATION ==========
    
    updateDistances(cameraPosition) {
        for (const [workerId, markerData] of this.markers) {
            const distance = this.calculateDistance(cameraPosition, markerData.position);
            
            // تحديث النص في التسمية
            if (markerData.label && markerData.label.element) {
                const distanceSpan = markerData.label.element.querySelector('.distance');
                if (distanceSpan) {
                    const distanceText = distance < 1000 ? `${distance.toFixed(1)}m` : `${(distance / 1000).toFixed(1)}km`;
                    distanceSpan.textContent = distanceText;
                    
                    // تغيير اللون حسب المسافة
                    const color = distance < 10 ? '#44ff44' : (distance < 50 ? '#ffaa44' : '#ff4444');
                    distanceSpan.style.color = color;
                }
            }
            
            // إخفاء العلامات البعيدة
            const shouldShow = distance <= this.settings.maxDistance;
            markerData.marker.visible = shouldShow;
            markerData.label.visible = shouldShow;
        }
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // ========== ANIMATION ==========
    
    startUpdates(camera, interval = this.settings.updateInterval) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            if (camera) {
                this.updateDistances(camera.position);
            }
        }, interval);
        
        console.log(`▶️ Worker markers updates started (interval: ${interval}ms)`);
    }
    
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('⏹️ Worker markers updates stopped');
    }
    
    animateMarker(workerId, duration = 500) {
        const markerData = this.markers.get(workerId);
        if (!markerData) return;
        
        const startScale = markerData.marker.scale.clone();
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            // تأثير نبض
            const scale = 1 + Math.sin(progress * Math.PI) * 0.5;
            markerData.marker.scale.setScalar(scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                markerData.marker.scale.copy(startScale);
            }
        };
        
        animate();
    }
    
    // ========== RENDERING ==========
    
    render(camera) {
        if (this.css2DRenderer && this.scene) {
            this.css2DRenderer.render(this.scene, camera);
        }
    }
    
    // ========== SETTINGS ==========
    
    setShowNames(show) {
        this.settings.showNames = show;
        this.refreshLabels();
    }
    
    setShowRoles(show) {
        this.settings.showRoles = show;
        this.refreshLabels();
    }
    
    setShowDistance(show) {
        this.settings.showDistance = show;
        this.refreshLabels();
    }
    
    setMaxDistance(maxDistance) {
        this.settings.maxDistance = maxDistance;
    }
    
    refreshLabels() {
        for (const [workerId, markerData] of this.markers) {
            const newLabel = this.createLabel(markerData.data, markerData.position);
            this.markerGroup.remove(markerData.label);
            this.markerGroup.add(newLabel);
            markerData.label = newLabel;
        }
    }
    
    getRoleColor(role) {
        const colorMap = {
            general: '#44aaff',
            electrician: '#ffaa44',
            plumber: '#44ffaa',
            carpenter: '#ff8844',
            foreman: '#ff4444',
            mobile: '#aa44ff'
        };
        return colorMap[role] || '#44aaff';
    }
    
    // ========== UTILITY ==========
    
    getWorkerMarker(workerId) {
        return this.markers.get(workerId);
    }
    
    getAllMarkers() {
        return Array.from(this.markers.values());
    }
    
    getWorkerCount() {
        return this.markers.size;
    }
    
    // ========== EVENT SYSTEM ==========
    
    on(event, callback) {
        if (!this.listeners) this.listeners = new Map();
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners && this.listeners.has(event)) {
            const filtered = this.listeners.get(event).filter(cb => cb !== callback);
            if (filtered.length === 0) {
                this.listeners.delete(event);
            } else {
                this.listeners.set(event, filtered);
            }
        }
    }
    
    notifyListeners(event, data) {
        if (this.listeners && this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('WorkerMarkers listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.stopUpdates();
        this.removeAllMarkers();
        
        if (this.css2DRenderer && this.css2DRenderer.domElement) {
            this.css2DRenderer.domElement.remove();
        }
        
        if (this.markerGroup.parent) {
            this.markerGroup.parent.remove(this.markerGroup);
        }
        
        this.listeners?.clear();
        
        console.log('♻️ WorkerMarkers disposed');
    }
}

export default WorkerMarkers;