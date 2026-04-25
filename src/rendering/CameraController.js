// ============================================
// CAMERA CONTROLLER - تحكم كامل بالكاميرا مع انتقالات سلسة
// يدعم: Smooth transitions, Auto-orientation, Camera snapping
// ============================================

import * as THREE from 'three';

export class CameraController {
    constructor(camera, orbitControls, eventBus) {
        this.camera = camera;
        this.controls = orbitControls;
        this.eventBus = eventBus;
        
        // حالة الانتقال
        this.isTransitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 0.8; // seconds
        this.transitionStartTime = 0;
        this.startPosition = null;
        this.startRotation = null;
        this.targetPosition = null;
        this.targetRotation = null;
        this.targetZoom = null;
        
        // إعدادات الكاميرا
        this.defaultPosition = { x: 0, y: 0, z: 0.1 };
        this.defaultZoom = 75; // FOV
        this.autoRotateEnabled = false;
        this.autoRotateSpeed = 0.5;
        
        // إعدادات التأثيرات
        this.fadeAlpha = 0;
        this.fadeElement = null;
        
        this.setupEventListeners();
        this.createFadeOverlay();
    }
    
    setupEventListeners() {
        this.eventBus.on('camera:transition', ({ targetPosition, targetRotation, duration }) => {
            this.startTransition(targetPosition, targetRotation, duration);
        });
        
        this.eventBus.on('camera:snapToNode', (node) => {
            this.snapToNode(node);
        });
        
        this.eventBus.on('camera:autoRotate', (enabled) => {
            this.setAutoRotate(enabled);
        });
        
        this.eventBus.on('camera:reset', () => {
            this.resetCamera();
        });
    }
    
    createFadeOverlay() {
        // إنشاء عنصر fade للانتقالات السلسة
        this.fadeElement = document.createElement('div');
        this.fadeElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            pointer-events: none;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(this.fadeElement);
    }
    
    startTransition(targetPosition, targetRotation, duration = 0.8) {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.transitionDuration = duration;
        this.transitionStartTime = performance.now() / 1000;
        
        // حفظ الوضع الحالي
        this.startPosition = this.camera.position.clone();
        this.startRotation = {
            x: this.camera.rotation.x,
            y: this.camera.rotation.y,
            z: this.camera.rotation.z
        };
        
        // تحديد الأهداف
        this.targetPosition = new THREE.Vector3(
            targetPosition.x || targetPosition[0] || 0,
            targetPosition.y || targetPosition[1] || 0,
            targetPosition.z || targetPosition[2] || 0.1
        );
        
        this.targetRotation = targetRotation || { x: 0, y: 0, z: 0 };
        
        // بدء تأثير Fade
        this.fadeElement.style.opacity = '1';
        
        setTimeout(() => {
            this.fadeElement.style.opacity = '0';
        }, duration * 1000 * 0.3);
        
        this.eventBus.emit('camera:transitionStart', { duration });
    }
    
    snapToNode(node) {
        // الانتقال المباشر بدون تأثير
        if (node.position) {
            this.camera.position.set(
                node.position.x,
                node.position.y,
                node.position.z
            );
        }
        
        if (node.rotation) {
            this.camera.rotation.set(
                node.rotation.x,
                node.rotation.y,
                node.rotation.z
            );
        }
        
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
        
        this.eventBus.emit('camera:snapped', node);
    }
    
    updateTransition(currentTime) {
        if (!this.isTransitioning) return;
        
        const elapsed = currentTime - this.transitionStartTime;
        let progress = Math.min(1, elapsed / this.transitionDuration);
        
        // استخدام easing سلس
        progress = this.easeInOutCubic(progress);
        
        // تحديث الموضع
        if (this.targetPosition) {
            this.camera.position.lerpVectors(this.startPosition, this.targetPosition, progress);
        }
        
        // تحديث الدوران
        if (this.targetRotation) {
            this.camera.rotation.x = this.lerp(this.startRotation.x, this.targetRotation.x, progress);
            this.camera.rotation.y = this.lerp(this.startRotation.y, this.targetRotation.y, progress);
            this.camera.rotation.z = this.lerp(this.startRotation.z, this.targetRotation.z, progress);
        }
        
        // تحديث OrbitControls target
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
        
        // إنهاء الانتقال
        if (progress >= 1) {
            this.isTransitioning = false;
            this.eventBus.emit('camera:transitionEnd');
        }
    }
    
    setAutoRotate(enabled, speed = 0.5) {
        this.autoRotateEnabled = enabled;
        this.autoRotateSpeed = speed;
        
        if (this.controls) {
            this.controls.autoRotate = enabled;
            this.controls.autoRotateSpeed = speed;
        }
        
        this.eventBus.emit('camera:autoRotateChanged', enabled);
    }
    
    resetCamera() {
        this.startTransition(
            this.defaultPosition,
            { x: 0, y: 0, z: 0 },
            0.5
        );
        
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
        }
        
        this.eventBus.emit('camera:reset');
    }
    
    lookAt(point, duration = 0.3) {
        const direction = new THREE.Vector3(
            point.x,
            point.y,
            point.z
        ).normalize();
        
        // تحويل الاتجاه إلى زوايا أويلر
        const targetRotation = {
            x: Math.asin(direction.y),
            y: Math.atan2(direction.x, direction.z),
            z: 0
        };
        
        this.startTransition(this.camera.position, targetRotation, duration);
    }
    
    // دوال مساعدة
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }
    
    easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }
    
    update() {
        if (this.isTransitioning) {
            this.updateTransition(performance.now() / 1000);
        }
        
        // تحديث OrbitControls إذا كان موجوداً
        if (this.controls && this.controls.update) {
            this.controls.update();
        }
    }
    
    dispose() {
        if (this.fadeElement && this.fadeElement.remove) {
            this.fadeElement.remove();
        }
    }
}