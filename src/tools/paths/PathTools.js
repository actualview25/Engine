// ============================================
// PATH TOOLS - أدوات رسم المسارات
// يدعم: رسم خطوط، مسارات، قياس المسافات، حفظ وتحميل المسارات
// ============================================

import * as THREE from 'three';

export class PathTools {
    constructor(engine = null) {
        this.engine = engine;
        
        // حالة الرسم
        this.drawMode = false;
        this.selectedPoints = [];
        this.pointMarkers = [];
        this.tempLine = null;
        this.previewPoint = null;
        
        // أنواع المسارات
        this.pathTypes = {
            EL: { name: 'Electrical', color: 0xffaa44, lineColor: 0xffaa44, icon: '⚡' },
            AC: { name: 'Air Conditioning', color: 0x44aaff, lineColor: 0x44aaff, icon: '❄️' },
            WP: { name: 'Water Pipe', color: 0x44ffaa, lineColor: 0x44ffaa, icon: '💧' },
            WA: { name: 'Water Supply', color: 0x88aaff, lineColor: 0x88aaff, icon: '🚰' },
            GS: { name: 'Gas Line', color: 0xffaa88, lineColor: 0xffaa88, icon: '🔥' },
            FP: { name: 'Fire Protection', color: 0xff4444, lineColor: 0xff4444, icon: '🧯' },
            DT: { name: 'Drainage', color: 0x88aa44, lineColor: 0x88aa44, icon: '🚽' },
            custom: { name: 'Custom', color: 0xffffff, lineColor: 0xffffff, icon: '📏' }
        };
        
        this.currentType = 'EL';
        
        // المسارات المحفوظة
        this.savedPaths = [];
        this.activePath = null;
        
        // إعدادات الرسم
        this.settings = {
            snapToGrid: true,
            gridSize: 0.5,
            showDistances: true,
            showAngles: false,
            autoConnect: true,
            lineWidth: 2,
            pointSize: 0.15,
            defaultHeight: 0.1
        };
        
        // أحداث
        this.listeners = new Map();
        
        console.log('🛤️ PathTools initialized');
    }
    
    // ========== INITIALIZATION ==========
    
    init() {
        console.log('✅ PathTools ready');
    }
    
    // ========== DRAW MODE CONTROL ==========
    
    startDrawing(type = null) {
        if (type && this.pathTypes[type]) {
            this.currentType = type;
        }
        
        this.drawMode = true;
        this.selectedPoints = [];
        this.clearTempVisuals();
        
        this.updateStatus(`✏️ Drawing mode: ${this.pathTypes[this.currentType].name}`);
        this.notifyListeners('drawingStarted', { type: this.currentType });
        
        return this;
    }
    
    stopDrawing() {
        this.drawMode = false;
        this.clearCurrentDrawing();
        this.updateStatus('Drawing stopped');
        this.notifyListeners('drawingStopped');
        
        return this;
    }
    
    setType(type) {
        if (this.pathTypes[type]) {
            this.currentType = type;
            this.updateStatus(`Path type changed to: ${this.pathTypes[type].name}`);
            this.notifyListeners('typeChanged', { type });
        }
        return this;
    }
    
    // ========== POINT MANAGEMENT ==========
    
    addPoint(position, addToScene = true) {
        if (!this.drawMode) return null;
        
        // تطبيق snap to grid
        let finalPosition = position.clone();
        if (this.settings.snapToGrid) {
            finalPosition = this.snapToGrid(position);
        }
        
        // ضبط الارتفاع الافتراضي
        if (finalPosition.y === 0 && this.settings.defaultHeight > 0) {
            finalPosition.y = this.settings.defaultHeight;
        }
        
        this.selectedPoints.push(finalPosition.clone());
        
        if (addToScene) {
            this.addPointMarker(finalPosition, this.selectedPoints.length);
        }
        
        // تحديث الخط المؤقت
        this.updateTempLine();
        
        this.updateStatus(`Point ${this.selectedPoints.length} added`);
        this.notifyListeners('pointAdded', { 
            point: finalPosition, 
            index: this.selectedPoints.length,
            total: this.selectedPoints.length 
        });
        
        // رسم سريع عند الضغط Enter
        return finalPosition;
    }
    
    addPointMarker(position, index) {
        const geometry = new THREE.SphereGeometry(this.settings.pointSize, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.pathTypes[this.currentType].color,
            emissive: this.pathTypes[this.currentType].color,
            emissiveIntensity: 0.3,
            metalness: 0.7,
            roughness: 0.3
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        marker.userData = { type: 'path_point', index: index, pathType: this.currentType };
        
        this.engine?.scene?.add(marker);
        this.pointMarkers.push(marker);
        
        // إضافة رقم النقطة
        this.addPointLabel(position, index);
        
        return marker;
    }
    
    addPointLabel(position, index) {
        const div = document.createElement('div');
        div.textContent = `${index}`;
        div.style.cssText = `
            background: ${this.getColorHex(this.pathTypes[this.currentType].color)};
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            font-family: monospace;
            border: 2px solid white;
            box-shadow: 0 0 5px black;
            pointer-events: none;
        `;
        
        import('three/addons/renderers/CSS2DRenderer.js').then(({ CSS2DObject }) => {
            const label = new CSS2DObject(div);
            label.position.copy(position);
            label.position.y += 0.2;
            label.userData = { type: 'path_label', index: index };
            
            this.engine?.scene?.add(label);
            this.pointMarkers.push(label);
        });
    }
    
    updateTempLine() {
        // حذف الخط القديم
        if (this.tempLine && this.tempLine.parent) {
            this.engine?.scene?.remove(this.tempLine);
        }
        
        if (this.selectedPoints.length < 2) return;
        
        // إنشاء خط جديد
        const points = [];
        for (const p of this.selectedPoints) {
            points.push(p.clone());
        }
        
        // إضافة نقطة المعاينة إذا وجدت
        if (this.previewPoint) {
            points.push(this.previewPoint.clone());
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: this.pathTypes[this.currentType].lineColor,
            linewidth: this.settings.lineWidth
        });
        
        this.tempLine = new THREE.Line(geometry, material);
        this.engine?.scene?.add(this.tempLine);
        
        // عرض المسافات
        if (this.settings.showDistances && points.length >= 2) {
            this.showSegmentDistances(points);
        }
    }
    
    showSegmentDistances(points) {
        // حذف المسافات القديمة
        this.clearDistances();
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const distance = p1.distanceTo(p2);
            
            const midPoint = p1.clone().add(p2).multiplyScalar(0.5);
            midPoint.y += 0.15;
            
            this.addDistanceLabel(midPoint, distance, i + 1);
        }
    }
    
    addDistanceLabel(position, distance, segmentIndex) {
        const div = document.createElement('div');
        div.textContent = `${distance.toFixed(2)}m`;
        div.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: ${this.getColorHex(this.pathTypes[this.currentType].lineColor)};
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 10px;
            font-family: monospace;
            border: 1px solid ${this.getColorHex(this.pathTypes[this.currentType].lineColor)};
            white-space: nowrap;
            pointer-events: none;
        `;
        
        import('three/addons/renderers/CSS2DRenderer.js').then(({ CSS2DObject }) => {
            const label = new CSS2DObject(div);
            label.position.copy(position);
            label.userData = { type: 'distance_label', segment: segmentIndex };
            
            this.engine?.scene?.add(label);
            this.pointMarkers.push(label);
        });
    }
    
    updatePreview(point) {
        if (!this.drawMode) return;
        
        if (this.previewPoint && this.previewPoint.parent) {
            this.engine?.scene?.remove(this.previewPoint);
        }
        
        // نقطة معاينة
        let finalPoint = point.clone();
        if (this.settings.snapToGrid) {
            finalPoint = this.snapToGrid(point);
        }
        
        const geometry = new THREE.SphereGeometry(this.settings.pointSize * 0.8, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.pathTypes[this.currentType].color,
            emissive: this.pathTypes[this.currentType].color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        
        this.previewPoint = new THREE.Mesh(geometry, material);
        this.previewPoint.position.copy(finalPoint);
        this.engine?.scene?.add(this.previewPoint);
        
        // تحديث الخط
        this.updateTempLine();
    }
    
    clearTempVisuals() {
        if (this.tempLine && this.tempLine.parent) {
            this.engine?.scene?.remove(this.tempLine);
            this.tempLine = null;
        }
        
        if (this.previewPoint && this.previewPoint.parent) {
            this.engine?.scene?.remove(this.previewPoint);
            this.previewPoint = null;
        }
    }
    
    clearDistances() {
        const toRemove = [];
        this.engine?.scene?.traverse((obj) => {
            if (obj.userData?.type === 'distance_label') {
                toRemove.push(obj);
            }
        });
        toRemove.forEach(obj => this.engine?.scene?.remove(obj));
    }
    
    clearCurrentDrawing() {
        // حذف العلامات
        for (const marker of this.pointMarkers) {
            if (marker.parent) {
                this.engine?.scene?.remove(marker);
            }
            if (marker.dispose) marker.dispose();
        }
        
        this.pointMarkers = [];
        this.selectedPoints = [];
        this.clearTempVisuals();
        this.clearDistances();
        
        this.updateStatus('Drawing cleared');
        this.notifyListeners('drawingCleared');
    }
    
    // ========== PATH SAVING ==========
    
    saveCurrentPath(name = null) {
        if (this.selectedPoints.length < 2) {
            this.updateStatus('Need at least 2 points to save path');
            return null;
        }
        
        const path = {
            id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: name || `${this.pathTypes[this.currentType].name}_${this.savedPaths.length + 1}`,
            type: this.currentType,
            points: this.selectedPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
            createdAt: new Date().toISOString(),
            length: this.calculatePathLength(this.selectedPoints),
            metadata: {
                color: this.pathTypes[this.currentType].color,
                lineColor: this.pathTypes[this.currentType].lineColor,
                icon: this.pathTypes[this.currentType].icon
            }
        };
        
        this.savedPaths.push(path);
        this.activePath = path;
        
        // تحويل الخط المؤقت إلى خط دائم
        this.finalizeCurrentPath(path);
        
        this.updateStatus(`Path saved: ${path.name} (${path.length.toFixed(2)}m)`);
        this.notifyListeners('pathSaved', path);
        
        // بدء رسم جديد تلقائياً
        this.selectedPoints = [];
        this.pointMarkers = [];
        this.clearTempVisuals();
        
        return path;
    }
    
    finalizeCurrentPath(path) {
        if (!this.tempLine) return;
        
        // تحويل الخط المؤقت إلى خط دائم
        const points = path.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: this.pathTypes[path.type].lineColor,
            linewidth: this.settings.lineWidth
        });
        
        const permanentLine = new THREE.Line(geometry, material);
        permanentLine.userData = { type: 'saved_path', pathId: path.id, pathType: path.type };
        
        this.engine?.scene?.add(permanentLine);
        
        // تخزين Ref للخط
        path.lineObject = permanentLine;
        
        return permanentLine;
    }
    
    calculatePathLength(points) {
        let length = 0;
        for (let i = 0; i < points.length - 1; i++) {
            length += points[i].distanceTo(points[i + 1]);
        }
        return length;
    }
    
    // ========== PATH MANAGEMENT ==========
    
    loadPath(pathId) {
        const path = this.savedPaths.find(p => p.id === pathId);
        if (!path) return null;
        
        this.activePath = path;
        this.currentType = path.type;
        
        // إظهار المسار
        if (path.lineObject) {
            path.lineObject.visible = true;
        }
        
        this.updateStatus(`Path loaded: ${path.name}`);
        this.notifyListeners('pathLoaded', path);
        
        return path;
    }
    
    deletePath(pathId) {
        const index = this.savedPaths.findIndex(p => p.id === pathId);
        if (index !== -1) {
            const path = this.savedPaths[index];
            
            if (path.lineObject && path.lineObject.parent) {
                this.engine?.scene?.remove(path.lineObject);
                if (path.lineObject.geometry) path.lineObject.geometry.dispose();
                if (path.lineObject.material) path.lineObject.material.dispose();
            }
            
            this.savedPaths.splice(index, 1);
            
            if (this.activePath?.id === pathId) {
                this.activePath = null;
            }
            
            this.updateStatus(`Path deleted: ${path.name}`);
            this.notifyListeners('pathDeleted', path);
            
            return true;
        }
        return false;
    }
    
    getAllPaths() {
        return [...this.savedPaths];
    }
    
    getPathsByType(type) {
        return this.savedPaths.filter(p => p.type === type);
    }
    
    getPathLength(pathId) {
        const path = this.savedPaths.find(p => p.id === pathId);
        return path ? path.length : 0;
    }
    
    getTotalPathsLength() {
        return this.savedPaths.reduce((sum, p) => sum + p.length, 0);
    }
    
    // ========== PATH EXPORT ==========
    
    exportPaths(format = 'json') {
        const data = {
            exportedAt: new Date().toISOString(),
            paths: this.savedPaths.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
                points: p.points,
                length: p.length,
                createdAt: p.createdAt
            }))
        };
        
        if (format === 'json') {
            const json = JSON.stringify(data, null, 2);
            this.downloadFile(json, 'paths.json', 'application/json');
            return json;
        } else if (format === 'csv') {
            let csv = 'Name,Type,Length,Points\n';
            for (const p of data.paths) {
                csv += `"${p.name}",${p.type},${p.length.toFixed(2)},"${p.points.length}"\n`;
            }
            this.downloadFile(csv, 'paths.csv', 'text/csv');
            return csv;
        }
        
        return data;
    }
    
    importPaths(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            for (const pathData of data.paths) {
                const points = pathData.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
                
                const path = {
                    id: pathData.id || `path_imported_${Date.now()}_${Math.random()}`,
                    name: pathData.name,
                    type: pathData.type,
                    points: pathData.points,
                    createdAt: pathData.createdAt || new Date().toISOString(),
                    length: this.calculatePathLength(points),
                    metadata: {
                        color: this.pathTypes[pathData.type]?.color || 0xffffff,
                        lineColor: this.pathTypes[pathData.type]?.lineColor || 0xffffff
                    }
                };
                
                this.savedPaths.push(path);
                this.finalizeCurrentPath(path);
            }
            
            this.updateStatus(`Imported ${data.paths.length} paths`);
            this.notifyListeners('pathsImported', { count: data.paths.length });
            
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }
    
    // ========== UTILITY ==========
    
    snapToGrid(position) {
        const size = this.settings.gridSize;
        return new THREE.Vector3(
            Math.round(position.x / size) * size,
            Math.round(position.y / size) * size,
            Math.round(position.z / size) * size
        );
    }
    
    getColorHex(color) {
        return '#' + color.toString(16).padStart(6, '0');
    }
    
    updateStatus(message) {
        console.log(`🛤️ ${message}`);
        this.notifyListeners('status', message);
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeLink(link);
        URL.revokeObjectURL(url);
    }
    
    // ========== SETTINGS ==========
    
    setSnapToGrid(enabled, gridSize = 0.5) {
        this.settings.snapToGrid = enabled;
        this.settings.gridSize = gridSize;
    }
    
    setShowDistances(enabled) {
        this.settings.showDistances = enabled;
        if (!enabled) this.clearDistances();
        if (enabled && this.selectedPoints.length >= 2) this.updateTempLine();
    }
    
    setLineWidth(width) {
        this.settings.lineWidth = Math.max(1, Math.min(10, width));
    }
    
    setDefaultHeight(height) {
        this.settings.defaultHeight = height;
    }
    
    // ========== EVENT SYSTEM ==========
    
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
                    console.error('PathTools listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.stopDrawing();
        this.clearCurrentDrawing();
        
        for (const path of this.savedPaths) {
            if (path.lineObject && path.lineObject.parent) {
                this.engine?.scene?.remove(path.lineObject);
                if (path.lineObject.geometry) path.lineObject.geometry.dispose();
                if (path.lineObject.material) path.lineObject.material.dispose();
            }
        }
        
        this.savedPaths = [];
        this.listeners.clear();
        
        console.log('♻️ PathTools disposed');
    }
}

export default PathTools;