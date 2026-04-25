// ============================================
// CLASH VISUALIZER - عرض التصادمات بشكل مرئي
// يدعم: تمييز العناصر المتصادمة، عرض نقاط التصادم، تقارير مرئية
// ============================================

import * as THREE from 'three';

export class ClashVisualizer {
    constructor(scene, clashDetection = null) {
        this.scene = scene;
        this.clashDetection = clashDetection;
        
        // مجموعات العرض
        this.visualizationGroup = new THREE.Group();
        this.scene.add(this.visualizationGroup);
        
        // إعدادات العرض
        this.settings = {
            highlightColor: 0xff3333,
            highlightOpacity: 0.6,
            showSpheres: true,
            showLines: true,
            showLabels: true,
            sphereRadius: 0.15,
            lineColor: 0xff6666,
            pulseEffect: true,
            selectedOnly: false
        };
        
        // العناصر المعروضة
        this.activeHighlights = new Map(); // clashId -> { originalMaterials, elements }
        this.visualMarkers = [];
        this.lineMarkers = [];
        this.labelMarkers = [];
        
        // الحالة
        this.isVisible = true;
        this.selectedClash = null;
        this.pulseTime = 0;
        
        // أنماط العرض
        this.viewModes = {
            spheres: true,
            boundingBoxes: false,
            outlines: false,
            heatmap: false
        };
        
        console.log('🎨 ClashVisualizer initialized');
    }
    
    // ========== MAIN VISUALIZATION ==========
    
    visualizeClashes(clashes = null, options = {}) {
        this.clearVisualization();
        
        const clashesToShow = clashes || this.clashDetection?.clashes || [];
        
        // تحديث الإعدادات
        Object.assign(this.settings, options);
        
        // فلترة حسب الحالة
        const filteredClashes = this.settings.selectedOnly && this.selectedClash
            ? clashesToShow.filter(c => c.id === this.selectedClash)
            : clashesToShow;
        
        for (const clash of filteredClashes) {
            this.visualizeClash(clash);
        }
        
        console.log(`🎨 Visualized ${filteredClashes.length} clashes`);
        
        return filteredClashes.length;
    }
    
    visualizeClash(clash) {
        // تخزين المواد الأصلية وتطبيق التمييز
        this.highlightElements(clash);
        
        // إضافة نقاط التصادم
        if (this.settings.showSpheres && clash.point) {
            this.addClashSphere(clash);
        }
        
        // إضافة خطوط بين العناصر المتصادمة
        if (this.settings.showLines) {
            this.addClashLine(clash);
        }
        
        // إضافة تسميات
        if (this.settings.showLabels) {
            this.addClashLabel(clash);
        }
    }
    
    // ========== ELEMENT HIGHLIGHTING ==========
    
    highlightElements(clash) {
        const elements = [];
        const originalMaterials = [];
        
        // تجميع العناصر من التصادم
        const elementA = this.findElementById(clash.elementA.id);
        const elementB = this.findElementById(clash.elementB.id);
        
        if (elementA) {
            elements.push(elementA);
            originalMaterials.push(this.highlightElement(elementA, this.settings.highlightColor));
        }
        
        if (elementB) {
            elements.push(elementB);
            originalMaterials.push(this.highlightElement(elementB, this.settings.highlightColor));
        }
        
        this.activeHighlights.set(clash.id, {
            elements,
            originalMaterials,
            clash
        });
    }
    
    highlightElement(element, color) {
        const originalMaterials = [];
        
        if (element.isMesh || element.isLineSegments) {
            if (Array.isArray(element.material)) {
                originalMaterials.push(element.material.map(m => ({ ...m })));
                element.material.forEach(m => {
                    if (m.emissive) m.emissive.setHex(color);
                    if (m.color) {
                        m.userData.originalColor = m.color.getHex();
                        m.color.setHex(color);
                    }
                    if (m.transparent !== undefined) {
                        m.userData.originalTransparent = m.transparent;
                        m.transparent = true;
                        m.opacity = this.settings.highlightOpacity;
                    }
                });
            } else if (element.material) {
                originalMaterials.push({ ...element.material });
                
                if (element.material.emissive) {
                    element.material.emissive.setHex(color);
                }
                if (element.material.color) {
                    element.material.userData.originalColor = element.material.color.getHex();
                    element.material.color.setHex(color);
                }
                if (element.material.transparent !== undefined) {
                    element.material.userData.originalTransparent = element.material.transparent;
                    element.material.transparent = true;
                    element.material.opacity = this.settings.highlightOpacity;
                }
            }
        }
        
        // إضافة إطار حول العنصر
        this.addBoundingBoxOutline(element, color);
        
        return originalMaterials;
    }
    
    addBoundingBoxOutline(element, color) {
        if (!this.viewModes.boundingBoxes && !this.viewModes.outlines) return;
        
        const bounds = element.geometry?.boundingBox;
        if (!bounds) return;
        
        // حساب الموشور المحيط بعد التحويل
        const box = bounds.clone();
        box.applyMatrix4(element.matrixWorld);
        
        const geometry = new THREE.BoxGeometry(
            box.max.x - box.min.x,
            box.max.y - box.min.y,
            box.max.z - box.min.z
        );
        
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: color });
        const wireframe = new THREE.LineSegments(edges, material);
        
        wireframe.position.copy(element.getWorldPosition(new THREE.Vector3()));
        wireframe.userData = { type: 'clash_outline', clashTemp: true };
        
        this.visualizationGroup.add(wireframe);
        this.visualMarkers.push(wireframe);
    }
    
    restoreOriginalMaterials() {
        for (const [clashId, data] of this.activeHighlights) {
            for (let i = 0; i < data.elements.length; i++) {
                const element = data.elements[i];
                const original = data.originalMaterials[i];
                
                if (element.isMesh || element.isLineSegments) {
                    if (Array.isArray(element.material)) {
                        element.material.forEach((m, idx) => {
                            if (original[idx]) {
                                if (original[idx].color) m.color.setHex(original[idx].color);
                                if (original[idx].emissive) m.emissive.setHex(original[idx].emissive);
                                if (original[idx].opacity !== undefined) m.opacity = original[idx].opacity;
                                if (original[idx].transparent !== undefined) m.transparent = original[idx].transparent;
                            }
                        });
                    } else if (element.material) {
                        if (original.color) element.material.color.setHex(original.color);
                        if (original.emissive) element.material.emissive.setHex(original.emissive);
                        if (original.opacity !== undefined) element.material.opacity = original.opacity;
                        if (original.transparent !== undefined) element.material.transparent = original.transparent;
                    }
                }
            }
        }
        
        this.activeHighlights.clear();
    }
    
    // ========== VISUAL MARKERS ==========
    
    addClashSphere(clash) {
        if (!clash.point) return;
        
        const geometry = new THREE.SphereGeometry(this.settings.sphereRadius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: this.settings.highlightColor,
            emissive: 0xff2200,
            emissiveIntensity: 0.5,
            metalness: 0.3,
            roughness: 0.2
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(clash.point.x, clash.point.y, clash.point.z);
        sphere.userData = { type: 'clash_sphere', clashId: clash.id };
        
        this.visualizationGroup.add(sphere);
        this.visualMarkers.push(sphere);
    }
    
    addClashLine(clash) {
        const centerA = this.getElementCenter(clash.elementA.id);
        const centerB = this.getElementCenter(clash.elementB.id);
        
        if (!centerA || !centerB) return;
        
        const points = [centerA, centerB];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: this.settings.lineColor });
        const line = new THREE.Line(geometry, material);
        
        line.userData = { type: 'clash_line', clashId: clash.id };
        
        this.visualizationGroup.add(line);
        this.lineMarkers.push(line);
    }
    
    addClashLabel(clash) {
        if (!clash.point) return;
        
        const div = document.createElement('div');
        div.textContent = `⚠️ ${clash.type} | ${clash.severity?.level || 'medium'}`;
        div.style.cssText = `
            background: rgba(0,0,0,0.8);
            color: #ff6666;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-family: monospace;
            border-left: 3px solid #ff3333;
            white-space: nowrap;
            pointer-events: none;
        `;
        
        import('three/addons/renderers/CSS2DRenderer.js').then(({ CSS2DObject }) => {
            const label = new CSS2DObject(div);
            label.position.set(clash.point.x, clash.point.y + 0.3, clash.point.z);
            label.userData = { type: 'clash_label', clashId: clash.id };
            
            this.visualizationGroup.add(label);
            this.labelMarkers.push(label);
        });
    }
    
    // ========== ANIMATION ==========
    
    update(deltaTime) {
        if (!this.settings.pulseEffect) return;
        
        this.pulseTime += deltaTime;
        const intensity = 0.3 + Math.sin(this.pulseTime * 5) * 0.3;
        
        for (const marker of this.visualMarkers) {
            if (marker.isMesh && marker.material) {
                marker.material.emissiveIntensity = intensity;
            }
        }
    }
    
    // ========== UTILITY METHODS ==========
    
    findElementById(elementId) {
        // البحث في المشهد
        let found = null;
        
        this.scene.traverse((obj) => {
            if (obj.userData?.id === elementId || obj.id === elementId) {
                found = obj;
            }
        });
        
        return found;
    }
    
    getElementCenter(elementId) {
        const element = this.findElementById(elementId);
        if (!element) return null;
        
        if (element.geometry && element.geometry.boundingBox) {
            if (!element.geometry.boundingBox) {
                element.geometry.computeBoundingBox();
            }
            const center = element.geometry.boundingBox.getCenter(new THREE.Vector3());
            center.applyMatrix4(element.matrixWorld);
            return center;
        }
        
        return element.getWorldPosition(new THREE.Vector3());
    }
    
    // ========== VIEW MODES ==========
    
    setViewMode(mode, enabled) {
        if (this.viewModes.hasOwnProperty(mode)) {
            this.viewModes[mode] = enabled;
            this.refreshVisualization();
        }
    }
    
    setSettings(settings) {
        Object.assign(this.settings, settings);
        this.refreshVisualization();
    }
    
    setSelectedClash(clashId) {
        this.selectedClash = clashId;
        this.refreshVisualization();
    }
    
    refreshVisualization() {
        if (this.clashDetection) {
            this.visualizeClashes();
        }
    }
    
    // ========== CLEAR ==========
    
    clearVisualization() {
        // استعادة المواد الأصلية
        this.restoreOriginalMaterials();
        
        // حذف العلامات البصرية
        for (const marker of this.visualMarkers) {
            this.visualizationGroup.remove(marker);
            if (marker.geometry) marker.geometry.dispose();
            if (marker.material) marker.material.dispose();
        }
        
        for (const line of this.lineMarkers) {
            this.visualizationGroup.remove(line);
            if (line.geometry) line.geometry.dispose();
        }
        
        for (const label of this.labelMarkers) {
            this.visualizationGroup.remove(label);
            if (label.element) label.element.remove();
        }
        
        this.visualMarkers = [];
        this.lineMarkers = [];
        this.labelMarkers = [];
    }
    
    setVisible(visible) {
        this.isVisible = visible;
        this.visualizationGroup.visible = visible;
    }
    
    dispose() {
        this.clearVisualization();
        this.scene.remove(this.visualizationGroup);
    }
    
    // ========== EXPORT ==========
    
    exportScreenshot() {
        // يمكن توسيعه لالتقاط صورة للمشهد مع التصادمات
        console.log('📸 Screenshot export not implemented yet');
    }
}

export default ClashVisualizer;