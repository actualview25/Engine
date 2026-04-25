// ============================================
// RAYCASTER HANDLER - معالج الأشعة والتفاعل مع الكرة
// يدعم: النقر، التمرير، السحب، وتحديد العناصر
// ============================================

import * as THREE from 'three';

export class RaycasterHandler {
    constructor(camera, domElement, eventBus = null) {
        this.camera = camera;
        this.domElement = domElement;
        this.eventBus = eventBus;
        
        // إعدادات Raycaster
        this.raycaster = new THREE.Raycaster();
        this.sphereMesh = null;
        
        // حالة التفاعل
        this.isDragging = false;
        this.dragStart = null;
        this.lastIntersect = null;
        this.hoveredObject = null;
        
        // إعدادات
        this.radius = 500; // نصف قطر الكرة
        this.raycastPrecision = 'high'; // low, medium, high
        this.enableHover = true;
        this.enableClick = true;
        this.enableDrag = false;
        
        // مرشحات
        this.filterFunction = null; // (object) => boolean
        this.priorityObjects = []; // قائمة بالأولويات
        
        // معالجات الأحداث المخصصة
        this.clickHandler = null;
        this.hoverHandler = null;
        this.dragHandler = null;
        
        // معالج الأحداث
        this.listeners = new Map();
        
        // حالة التصحيح
        this.debugMode = false;
        this.debugMarker = null;
        
        console.log('🎯 RaycasterHandler initialized');
        this.setupEventListeners();
    }
    
    // ========== INITIALIZATION ==========
    
    setupEventListeners() {
        if (!this.domElement) return;
        
        // أحداث الماوس
        this.domElement.addEventListener('click', this.onClick.bind(this));
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        
        // منع التداخل مع الأحداث الافتراضية
        this.domElement.style.cursor = 'pointer';
    }
    
    setSphereMesh(mesh) {
        this.sphereMesh = mesh;
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    // ========== CORE RAYCASTING ==========
    
    raycast(mouseX, mouseY) {
        if (!this.camera || !this.domElement) return [];
        
        // تحويل إحداثيات الماوس إلى Normalized Device Coordinates (-1 to +1)
        const rect = this.domElement.getBoundingClientRect();
        const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
        const y = -((mouseY - rect.top) / rect.height) * 2 + 1;
        
        const mouse = new THREE.Vector2(x, y);
        return this.raycastFromMouse(mouse);
    }
    
    raycastFromMouse(mouse) {
        if (!this.camera) return [];
        
        this.raycaster.setFromCamera(mouse, this.camera);
        
        // جمع جميع الكائنات للفحص
        const objects = [];
        
        // إضافة الكرة إذا وجدت
        if (this.sphereMesh) {
            objects.push(this.sphereMesh);
        }
        
        // إضافة كائنات أخرى مسجلة
        for (const obj of this.priorityObjects) {
            if (obj.visible !== false) {
                objects.push(obj);
            }
        }
        
        const intersects = this.raycaster.intersectObjects(objects);
        
        // تطبيق مرشح مخصص
        if (this.filterFunction && intersects.length > 0) {
            return intersects.filter(this.filterFunction);
        }
        
        return intersects;
    }
    
    getIntersectionPoint(mouseX, mouseY) {
        const intersects = this.raycast(mouseX, mouseY);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // إذا كانت الكرة، نحتاج إلى إزاحة النقطة للخارج قليلاً
            if (hit.object === this.sphereMesh) {
                const direction = hit.point.clone().normalize();
                return direction.multiplyScalar(this.radius + 0.1);
            }
            
            return hit.point;
        }
        
        return null;
    }
    
    getIntersectionPointNormalized(mouseX, mouseY) {
        const point = this.getIntersectionPoint(mouseX, mouseY);
        if (point) {
            return point.clone().normalize();
        }
        return null;
    }
    
    // ========== EVENT HANDLERS ==========
    
    onClick(event) {
        if (!this.enableClick) return;
        if (this.isDragging) return;
        
        const intersect = this.getIntersectionPoint(event.clientX, event.clientY);
        
        if (intersect) {
            const hit = this.raycast(event.clientX, event.clientY)[0];
            
            this.notifyListeners('click', {
                point: intersect,
                originalPoint: hit?.point,
                normal: hit?.normal,
                object: hit?.object,
                event: event
            });
            
            if (this.eventBus) {
                this.eventBus.emit('raycaster:click', {
                    point: intersect,
                    object: hit?.object
                });
            }
            
            if (this.clickHandler) {
                this.clickHandler(intersect, hit?.object);
            }
        }
    }
    
    onMouseMove(event) {
        if (!this.enableHover) return;
        
        const intersect = this.getIntersectionPoint(event.clientX, event.clientY);
        const hit = intersect ? this.raycast(event.clientX, event.clientY)[0] : null;
        const hovered = hit?.object || null;
        
        // تغيير المؤشر عند التمرير فوق نقطة تفاعل
        if (hovered && hovered.userData?.interactive) {
            this.domElement.style.cursor = 'pointer';
        } else if (intersect) {
            this.domElement.style.cursor = 'crosshair';
        } else {
            this.domElement.style.cursor = 'default';
        }
        
        // إشعار تغيير العنصر المحدد بالتمرير
        if (this.hoveredObject !== hovered) {
            if (this.hoveredObject) {
                this.notifyListeners('hoverOut', { object: this.hoveredObject });
            }
            if (hovered) {
                this.notifyListeners('hoverIn', { object: hovered, point: intersect });
            }
            this.hoveredObject = hovered;
        }
        
        if (intersect) {
            this.notifyListeners('hover', {
                point: intersect,
                object: hovered,
                event: event
            });
            
            if (this.eventBus) {
                this.eventBus.emit('raycaster:hover', {
                    point: intersect,
                    object: hovered
                });
            }
        }
        
        // معالجة السحب
        if (this.isDragging && this.dragStart) {
            const delta = {
                x: event.clientX - this.dragStart.x,
                y: event.clientY - this.dragStart.y
            };
            
            this.notifyListeners('drag', {
                start: this.dragStart.point,
                current: intersect,
                delta: delta,
                event: event
            });
            
            if (this.dragHandler) {
                this.dragHandler(this.dragStart.point, intersect, delta);
            }
        }
        
        this.lastIntersect = intersect;
        
        // عرض نقطة التصحيح في وضع التصحيح
        if (this.debugMode && intersect && !this.debugMarker) {
            this.createDebugMarker();
        }
        
        if (this.debugMarker && intersect) {
            this.debugMarker.position.copy(intersect);
        } else if (this.debugMarker && !intersect) {
            this.debugMarker.visible = false;
        }
    }
    
    onMouseDown(event) {
        if (!this.enableDrag) return;
        
        const intersect = this.getIntersectionPoint(event.clientX, event.clientY);
        
        if (intersect) {
            this.isDragging = true;
            this.dragStart = {
                x: event.clientX,
                y: event.clientY,
                point: intersect.clone()
            };
            
            this.notifyListeners('dragStart', {
                point: intersect,
                event: event
            });
        }
    }
    
    onMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.dragStart = null;
            
            this.notifyListeners('dragEnd', { event: event });
        }
    }
    
    // ========== OBJECT MANAGEMENT ==========
    
    addPriorityObject(object) {
        if (!this.priorityObjects.includes(object)) {
            this.priorityObjects.push(object);
        }
    }
    
    removePriorityObject(object) {
        const index = this.priorityObjects.indexOf(object);
        if (index !== -1) {
            this.priorityObjects.splice(index, 1);
        }
    }
    
    clearPriorityObjects() {
        this.priorityObjects = [];
    }
    
    setFilter(filterFn) {
        this.filterFunction = filterFn;
    }
    
    clearFilter() {
        this.filterFunction = null;
    }
    
    // ========== PRECISION SETTINGS ==========
    
    setPrecision(precision) {
        this.raycastPrecision = precision;
        
        // تعديل دقة raycaster حسب الطلب
        switch(precision) {
            case 'ultra':
                this.raycaster.params.Line.threshold = 0.1;
                this.raycaster.params.Points.threshold = 0.1;
                break;
            case 'high':
                this.raycaster.params.Line.threshold = 0.5;
                this.raycaster.params.Points.threshold = 0.5;
                break;
            case 'medium':
                this.raycaster.params.Line.threshold = 1;
                this.raycaster.params.Points.threshold = 1;
                break;
            case 'low':
                this.raycaster.params.Line.threshold = 2;
                this.raycaster.params.Points.threshold = 2;
                break;
        }
    }
    
    setRadius(radius) {
        this.radius = radius;
    }
    
    // ========== UTILITY ==========
    
    worldToScreen(point) {
        if (!this.camera) return null;
        
        const vector = point.clone().project(this.camera);
        
        const rect = this.domElement.getBoundingClientRect();
        const x = (vector.x * 0.5 + 0.5) * rect.width;
        const y = (-vector.y * 0.5 + 0.5) * rect.height;
        
        return { x: x + rect.left, y: y + rect.top };
    }
    
    screenToWorld(screenX, screenY, distance = 1) {
        if (!this.camera) return null;
        
        const rect = this.domElement.getBoundingClientRect();
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        const mouse = new THREE.Vector2(x, y);
        this.raycaster.setFromCamera(mouse, this.camera);
        
        const direction = this.raycaster.ray.direction.clone().normalize();
        return this.raycaster.ray.origin.clone().add(direction.multiplyScalar(distance));
    }
    
    // ========== DEBUG ==========
    
    createDebugMarker() {
        const geometry = new THREE.SphereGeometry(0.15, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff });
        this.debugMarker = new THREE.Mesh(geometry, material);
        
        if (this.sphereMesh?.parent) {
            this.sphereMesh.parent.add(this.debugMarker);
        } else if (this.camera?.scene) {
            this.camera.scene.add(this.debugMarker);
        }
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        if (enabled && !this.debugMarker) {
            this.createDebugMarker();
        }
        
        if (this.debugMarker) {
            this.debugMarker.visible = enabled;
        }
        
        console.log(`🐛 Raycaster debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    // ========== SETTINGS ==========
    
    setEnableHover(enabled) {
        this.enableHover = enabled;
    }
    
    setEnableClick(enabled) {
        this.enableClick = enabled;
    }
    
    setEnableDrag(enabled) {
        this.enableDrag = enabled;
    }
    
    // ========== HANDLER REGISTRATION ==========
    
    setClickHandler(handler) {
        this.clickHandler = handler;
    }
    
    setHoverHandler(handler) {
        this.hoverHandler = handler;
    }
    
    setDragHandler(handler) {
        this.dragHandler = handler;
    }
    
    // ========== EVENT LISTENERS ==========
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const filtered = this.listeners.get(event).filter(cb => cb !== callback);
            if (filtered.length === 0) {
                this.listeners.delete(event);
            } else {
                this.listeners.set(event, filtered);
            }
        }
    }
    
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('RaycasterHandler listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        // إزالة مستمعي الأحداث
        if (this.domElement) {
            this.domElement.removeEventListener('click', this.onClick);
            this.domElement.removeEventListener('mousemove', this.onMouseMove);
            this.domElement.removeEventListener('mousedown', this.onMouseDown);
            this.domElement.removeEventListener('mouseup', this.onMouseUp);
        }
        
        // إزالة علامة التصحيح
        if (this.debugMarker && this.debugMarker.parent) {
            this.debugMarker.parent.remove(this.debugMarker);
        }
        
        // تنظيف
        this.priorityObjects = [];
        this.listeners.clear();
        
        console.log('♻️ RaycasterHandler disposed');
    }
}

export default RaycasterHandler;