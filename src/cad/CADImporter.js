// ============================================
// CAD IMPORTER - استيراد ملفات CAD
// يدعم: DXF, DWG (بسيط), و SVG
// ============================================

import * as THREE from 'three';

export class CADImporter {
    constructor(scene, eventBus, geoReferencing) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.geoReferencing = geoReferencing;
        
        this.importedObjects = [];
        this.layers = new Map();
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('cad:import', (file) => {
            this.importCAD(file);
        });
        
        this.eventBus.on('cad:clear', () => {
            this.clearAllCAD();
        });
        
        this.eventBus.on('cad:layerToggle', (layerName, visible) => {
            this.toggleLayer(layerName, visible);
        });
    }
    
    async importCAD(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        
        this.eventBus.emit('ui:loading', true);
        this.eventBus.emit('ui:status', `📄 جاري استيراد ${file.name}...`);
        
        try {
            let objects = [];
            
            switch(extension) {
                case 'dxf':
                    objects = await this.parseDXF(file);
                    break;
                case 'svg':
                    objects = await this.parseSVG(file);
                    break;
                case 'json':
                    objects = await this.parseGeoJSON(file);
                    break;
                default:
                    throw new Error(`格式 ${extension}  غير مدعوم`);
            }
            
            // إضافة الكائنات إلى المشهد
            for (const obj of objects) {
                this.scene.add(obj);
                this.importedObjects.push(obj);
            }
            
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:success', `تم استيراد ${objects.length} عنصر من ${file.name}`);
            this.eventBus.emit('cad:imported', { count: objects.length, file: file.name });
            
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `فشل الاستيراد: ${error.message}`);
            console.error('CAD import error:', error);
        }
    }
    
    async parseDXF(file) {
        // تبسيط: في الإصدار الكامل، استخدم مكتبة dxf-parser
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const objects = [];
                
                // استخراج الخطوط البسيطة من DXF
                const lines = content.split('\n');
                let inEntity = false;
                let currentType = null;
                
                for (let i = 0; i < lines.length; i++) {
                    const code = parseInt(lines[i]);
                    const value = lines[i + 1]?.trim();
                    
                    if (code === 0) {
                        inEntity = true;
                        currentType = value;
                        i++;
                        continue;
                    }
                    
                    // تبسيط: استخراج LINE entities فقط
                    if (currentType === 'LINE' && code === 10) {
                        const x1 = parseFloat(value);
                        const y1 = parseFloat(lines[i + 3]);
                        const x2 = parseFloat(lines[i + 6]);
                        const y2 = parseFloat(lines[i + 9]);
                        
                        const points = [
                            new THREE.Vector3(x1, 0, y1),
                            new THREE.Vector3(x2, 0, y2)
                        ];
                        
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const material = new THREE.LineBasicMaterial({ color: 0xffaa44 });
                        const line = new THREE.Line(geometry, material);
                        
                        objects.push(line);
                    }
                }
                
                resolve(objects);
            };
            reader.readAsText(file);
        });
    }
    
    async parseSVG(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(content, 'image/svg+xml');
                const paths = svgDoc.querySelectorAll('path, line, rect, circle');
                
                const objects = [];
                
                paths.forEach(path => {
                    const tagName = path.tagName.toLowerCase();
                    
                    if (tagName === 'line') {
                        const x1 = parseFloat(path.getAttribute('x1') || 0);
                        const y1 = parseFloat(path.getAttribute('y1') || 0);
                        const x2 = parseFloat(path.getAttribute('x2') || 0);
                        const y2 = parseFloat(path.getAttribute('y2') || 0);
                        
                        const points = [
                            new THREE.Vector3(x1 / 100, 0, y1 / 100),
                            new THREE.Vector3(x2 / 100, 0, y2 / 100)
                        ];
                        
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const material = new THREE.LineBasicMaterial({ color: 0x88aaff });
                        const line = new THREE.Line(geometry, material);
                        objects.push(line);
                    }
                    
                    if (tagName === 'rect') {
                        const x = parseFloat(path.getAttribute('x') || 0) / 100;
                        const y = parseFloat(path.getAttribute('y') || 0) / 100;
                        const w = parseFloat(path.getAttribute('width') || 0) / 100;
                        const h = parseFloat(path.getAttribute('height') || 0) / 100;
                        
                        const points = [
                            new THREE.Vector3(x, 0, y),
                            new THREE.Vector3(x + w, 0, y),
                            new THREE.Vector3(x + w, 0, y + h),
                            new THREE.Vector3(x, 0, y + h),
                            new THREE.Vector3(x, 0, y)
                        ];
                        
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const material = new THREE.LineBasicMaterial({ color: 0x88aaff });
                        const rect = new THREE.Line(geometry, material);
                        objects.push(rect);
                    }
                });
                
                resolve(objects);
            };
            reader.readAsText(file);
        });
    }
    
    async parseGeoJSON(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = JSON.parse(e.target.result);
                const objects = [];
                
                if (data.type === 'FeatureCollection') {
                    for (const feature of data.features) {
                        const geom = feature.geometry;
                        
                        if (geom.type === 'LineString') {
                            const points = geom.coordinates.map(coord => 
                                new THREE.Vector3(coord[0], 0, coord[1])
                            );
                            const geometry = new THREE.BufferGeometry().setFromPoints(points);
                            const material = new THREE.LineBasicMaterial({ color: 0x44ffaa });
                            const line = new THREE.Line(geometry, material);
                            objects.push(line);
                        }
                        
                        if (geom.type === 'Polygon') {
                            const points = geom.coordinates[0].map(coord => 
                                new THREE.Vector3(coord[0], 0, coord[1])
                            );
                            points.push(points[0]); // إغلاق المضلع
                            
                            const geometry = new THREE.BufferGeometry().setFromPoints(points);
                            const material = new THREE.LineBasicMaterial({ color: 0x44ffaa });
                            const polygon = new THREE.Line(geometry, material);
                            objects.push(polygon);
                        }
                    }
                }
                
                resolve(objects);
            };
            reader.readAsText(file);
        });
    }
    
    clearAllCAD() {
        for (const obj of this.importedObjects) {
            this.scene.remove(obj);
        }
        this.importedObjects = [];
        this.layers.clear();
        
        this.eventBus.emit('ui:success', 'تم مسح جميع عناصر CAD');
    }
    
    toggleLayer(layerName, visible) {
        const layerObjects = this.layers.get(layerName) || [];
        for (const obj of layerObjects) {
            obj.visible = visible;
        }
    }
    
    getImportedCount() {
        return this.importedObjects.length;
    }
}