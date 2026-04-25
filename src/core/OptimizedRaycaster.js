// ============================================
// OPTIMIZED RAYCASTER - راي كاستر محسن للمشاريع الكبيرة
// يستخدم: Spatial Hash Grid + LOD + Worker
// ============================================

import * as THREE from 'three';

export class OptimizedRaycaster {
    constructor(scene, camera, eventBus) {
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;
        
        // Spatial Hash Grid للتسريع
        this.grid = new Map();
        this.cellSize = 10; // حجم الخلية
        
        // قوائم الكائنات
        this.registeredObjects = new Set();
        this.interactiveObjects = new Set();
        
        // إعدادات الأداء
        this.raycaster = new THREE.Raycaster();
        this.worker = null;
        this.useWorker = false;
        
        // تحديث دوري
        this.lastUpdateTime = 0;
        this.updateInterval = 100; // ms
        
        this.setupWorker();
        this.setupEventListeners();
    }
    
    setupWorker() {
        // إنشاء Web Worker للحسابات الثقيلة
        const workerCode = `
            self.onmessage = function(e) {
                const { points, origin, direction } = e.data;
                const results = [];
                
                for (const point of points) {
                    const dx = point.x - origin.x;
                    const dy = point.y - origin.y;
                    const dz = point.z - origin.z;
                    
                    const t = dx * direction.x + dy * direction.y + dz * direction.z;
                    if (t < 0) continue;
                    
                    const closestPoint = {
                        x: origin.x + direction.x * t,
                        y: origin.y + direction.y * t,
                        z: origin.z + direction.z * t
                    };
                    
                    const distance = Math.sqrt(
                        Math.pow(closestPoint.x - point.x, 2) +
                        Math.pow(closestPoint.y - point.y, 2) +
                        Math.pow(closestPoint.z - point.z, 2)
                    );
                    
                    if (distance < 0.5) {
                        results.push({ point, distance, t });
                    }
                }
                
                results.sort((a, b) => a.distance - b.distance);
                self.postMessage(results);
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        
        this.worker.onmessage = (e) => {
            if (this.pendingCallback) {
                this.pendingCallback(e.data);
                this.pendingCallback = null;
            }
        };
    }
    
    setupEventListeners() {
        this.eventBus.on('raycaster:register', (object) => {
            this.registerObject(object);
        });
        
        this.eventBus.on('raycaster:unregister', (object) => {
            this.unregisterObject(object);
        });
        
        this.eventBus.on('raycaster:performance', (mode) => {
            if (mode === 'high') {
                this.useWorker = true;
            } else {
                this.useWorker = false;
            }
        });
    }
    
    registerObject(object, interactive = true) {
        this.registeredObjects.add(object);
        
        if (interactive) {
            this.interactiveObjects.add(object);
        }
        
        // إضافة إلى الـ Spatial Grid
        this.addToGrid(object);
    }
    
    unregisterObject(object) {
        this.registeredObjects.delete(object);
        this.interactiveObjects.delete(object);
        this.removeFromGrid(object);
    }
    
    addToGrid(object) {
        if (!object.position) return;
        
        const cellKey = this.getCellKey(object.position);
        if (!this.grid.has(cellKey)) {
            this.grid.set(cellKey, new Set());
        }
        this.grid.get(cellKey).add(object);
    }
    
    removeFromGrid(object) {
        if (!object.position) return;
        
        const cellKey = this.getCellKey(object.position);
        if (this.grid.has(cellKey)) {
            this.grid.get(cellKey).delete(object);
        }
    }
    
    getCellKey(position) {
        const x = Math.floor(position.x / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${z}`;
    }
    
    getNearbyObjects(position, radius = 2) {
        const nearby = new Set();
        const centerX = Math.floor(position.x / this.cellSize);
        const centerZ = Math.floor(position.z / this.cellSize);
        
        // البحث في الخلايا المجاورة
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const cellKey = `${centerX + dx},${centerZ + dz}`;
                if (this.grid.has(cellKey)) {
                    for (const obj of this.grid.get(cellKey)) {
                        if (obj.position && obj.position.distanceTo(position) <= radius) {
                            nearby.add(obj);
                        }
                    }
                }
            }
        }
        
        return nearby;
    }
    
    raycast(mouseX, mouseY, callback) {
        if (!this.camera) return;
        
        // تحويل إحداثيات الماوس
        const mouse = new THREE.Vector2();
        mouse.x = (mouseX / window.innerWidth) * 2 - 1;
        mouse.y = -(mouseY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(mouse, this.camera);
        
        if (this.useWorker && this.interactiveObjects.size > 100) {
            // استخدام Worker للمشاريع الكبيرة
            this.raycastWithWorker(callback);
        } else {
            // راي كاستر عادي للمشاريع الصغيرة
            this.raycastNormal(callback);
        }
    }
    
    raycastNormal(callback) {
        const intersects = this.raycaster.intersectObjects(
            Array.from(this.interactiveObjects),
            true
        );
        
        if (callback && intersects.length > 0) {
            callback(intersects[0]);
        } else if (callback) {
            callback(null);
        }
    }
    
    raycastWithWorker(callback) {
        // جمع النقاط من الكائنات القريبة فقط
        const origin = this.raycaster.ray.origin;
        const direction = this.raycaster.ray.direction;
        
        const nearbyObjects = this.getNearbyObjects(origin, 50);
        const points = [];
        
        for (const obj of nearbyObjects) {
            if (obj.position) {
                points.push(obj.position.clone());
            }
        }
        
        if (points.length === 0) {
            callback(null);
            return;
        }
        
        this.pendingCallback = (results) => {
            if (results.length > 0 && callback) {
                // العثور على الكائن الأقرب
                const nearest = results[0];
                callback({ point: nearest.point, distance: nearest.distance });
            } else if (callback) {
                callback(null);
            }
        };
        
        this.worker.postMessage({
            points: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
            origin: { x: origin.x, y: origin.y, z: origin.z },
            direction: { x: direction.x, y: direction.y, z: direction.z }
        });
    }
    
    // طريقة محسنة للـ Sphere (الكرة البانورامية)
    raycastSphere(sphereMesh, mouseX, mouseY, callback) {
        const mouse = new THREE.Vector2();
        mouse.x = (mouseX / window.innerWidth) * 2 - 1;
        mouse.y = -(mouseY / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // اختبار مباشر للكرة
        const intersects = this.raycaster.intersectObject(sphereMesh);
        
        if (callback && intersects.length > 0) {
            callback(intersects[0].point);
        } else if (callback) {
            callback(null);
        }
    }
    
    // تحديث الـ Spatial Grid بشكل دوري
    update() {
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateInterval) return;
        
        this.lastUpdateTime = now;
        
        // إعادة بناء الـ Grid للكائنات المتحركة
        for (const obj of this.interactiveObjects) {
            if (obj.position && obj.userData?.dynamic) {
                this.removeFromGrid(obj);
                this.addToGrid(obj);
            }
        }
    }
    
    setCellSize(size) {
        this.cellSize = size;
        // إعادة بناء الـ Grid
        this.grid.clear();
        for (const obj of this.registeredObjects) {
            this.addToGrid(obj);
        }
    }
    
    dispose() {
        if (this.worker) {
            this.worker.terminate();
        }
    }
}