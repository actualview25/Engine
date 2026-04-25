// =======================================
// GLOBAL COLUMN - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalColumn {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.columnData = {
            shape: options.shape || 'rectangular',
            width: options.width || 0.3,
            depth: options.depth || 0.3,
            diameter: options.diameter || 0.3,
            height: options.height || 3.0,
            grade: options.grade || 'C35',
            rebar: options.rebar || {
                mainBars: 6,
                stirrups: 8
            },
            color: options.color || 0x7a7a7a
        };
        
        this.id = `column_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.columns = [];
        this.meshes = [];
        this.totalVolume = 0;
        this.totalRebar = 0;
        
        if (this.eventBus) {
            this.eventBus.on('column:create', (data) => this.create(data.position, data.sceneId));
            this.eventBus.on('column:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(position, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addColumn(sceneId, position);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('column:created', {
                id: this.id,
                position: position,
                sceneId: sceneId,
                volume: this.totalVolume
            });
        }
        
        console.log(`🏛️ Column created with ID: ${this.id}`);
        return this.id;
    }

    addColumn(sceneId, position) {
        // تحويل إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const volume = this.calculateVolume();
        const rebarWeight = this.calculateRebarWeight(volume);

        const columnData = {
            id: `column_${Date.now()}_${this.columns.length}`,
            sceneId: sceneId,
            position: globalPos,
            localPosition: position,
            volume: volume,
            rebarWeight: rebarWeight,
            height: this.columnData.height,
            createdAt: Date.now()
        };

        this.columns.push(columnData);
        this.totalVolume += volume;
        this.totalRebar += rebarWeight;
        
        if (this.eventBus) {
            this.eventBus.emit('column:added', columnData);
        }

        console.log(`🏛️ Column added at (${position.x}, ${position.z}) in scene ${sceneId}`);
        return columnData;
    }

    calculateVolume() {
        if (this.columnData.shape === 'circular') {
            const radius = this.columnData.diameter / 2;
            return Math.PI * Math.pow(radius, 2) * this.columnData.height;
        } else {
            return this.columnData.width * this.columnData.depth * this.columnData.height;
        }
    }

    calculateRebarWeight(volume) {
        // وزن تقريبي: 150 كجم/م³ للأعمدة
        return volume * 150;
    }

    renderInScene(sceneId, threeScene) {
        const columnsForScene = this.columns.filter(c => c.sceneId === sceneId);
        
        for (const column of columnsForScene) {
            const mesh = this.renderColumn(column, threeScene);
            if (mesh) this.meshes.push(mesh);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('column:rendered', { sceneId, count: columnsForScene.length });
        }
    }

    renderColumn(column, threeScene) {
        let geometry;
        
        if (this.columnData.shape === 'circular') {
            const radius = this.columnData.diameter / 2;
            geometry = new THREE.CylinderGeometry(radius, radius, this.columnData.height, 24);
        } else {
            geometry = new THREE.BoxGeometry(
                this.columnData.width, 
                this.columnData.height, 
                this.columnData.depth
            );
        }

        const material = new THREE.MeshStandardMaterial({
            color: this.columnData.color,
            roughness: 0.4,
            metalness: 0.15,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        // تعديل الموقع ليكون قاعدة العمود على الأرض
        mesh.position.set(
            column.position.x,
            column.position.y + this.columnData.height / 2,
            column.position.z
        );
        
        mesh.userData = { 
            type: 'column', 
            columnId: this.id, 
            columnDataId: column.id,
            shape: this.columnData.shape
        };
        
        threeScene.add(mesh);
        return mesh;
    }
    
    // تحديث الخصائص
    updateDimensions(width, depth, height = null) {
        this.columnData.width = width;
        this.columnData.depth = depth;
        if (height !== null) this.columnData.height = height;
        
        // إعادة حساب الحجم والحديد
        this.totalVolume = 0;
        this.totalRebar = 0;
        
        for (const column of this.columns) {
            const volume = this.calculateVolume();
            const rebarWeight = this.calculateRebarWeight(volume);
            column.volume = volume;
            column.rebarWeight = rebarWeight;
            this.totalVolume += volume;
            this.totalRebar += rebarWeight;
        }
        
        // تحديث المشاهدات
        for (const mesh of this.meshes) {
            if (mesh.userData.type === 'column') {
                if (this.columnData.shape === 'circular') {
                    const radius = this.columnData.diameter / 2;
                    const newGeometry = new THREE.CylinderGeometry(radius, radius, this.columnData.height, 24);
                    mesh.geometry.dispose();
                    mesh.geometry = newGeometry;
                } else {
                    const newGeometry = new THREE.BoxGeometry(width, this.columnData.height, depth);
                    mesh.geometry.dispose();
                    mesh.geometry = newGeometry;
                }
                mesh.position.y = column.position.y + this.columnData.height / 2;
            }
        }
        
        this.eventBus?.emit('column:dimensionsUpdated', {
            id: this.id,
            width,
            depth,
            height: this.columnData.height,
            totalVolume: this.totalVolume,
            totalRebar: this.totalRebar
        });
    }
    
    updateHeight(height) {
        this.columnData.height = height;
        
        // إعادة حساب الحجم والحديد
        this.totalVolume = 0;
        this.totalRebar = 0;
        
        for (const column of this.columns) {
            const volume = this.calculateVolume();
            const rebarWeight = this.calculateRebarWeight(volume);
            column.volume = volume;
            column.rebarWeight = rebarWeight;
            column.height = height;
            this.totalVolume += volume;
            this.totalRebar += rebarWeight;
        }
        
        // تحديث المشاهدات
        for (let i = 0; i < this.meshes.length; i++) {
            const mesh = this.meshes[i];
            const column = this.columns[i];
            if (mesh && column && mesh.userData.type === 'column') {
                if (this.columnData.shape === 'circular') {
                    const radius = this.columnData.diameter / 2;
                    const newGeometry = new THREE.CylinderGeometry(radius, radius, height, 24);
                    mesh.geometry.dispose();
                    mesh.geometry = newGeometry;
                } else {
                    const newGeometry = new THREE.BoxGeometry(this.columnData.width, height, this.columnData.depth);
                    mesh.geometry.dispose();
                    mesh.geometry = newGeometry;
                }
                mesh.position.y = column.position.y + height / 2;
            }
        }
        
        this.eventBus?.emit('column:heightUpdated', {
            id: this.id,
            height,
            totalVolume: this.totalVolume
        });
    }
    
    updateShape(shape) {
        this.columnData.shape = shape;
        
        // إعادة حساب الحجم والحديد
        this.totalVolume = 0;
        this.totalRebar = 0;
        
        for (const column of this.columns) {
            const volume = this.calculateVolume();
            const rebarWeight = this.calculateRebarWeight(volume);
            column.volume = volume;
            column.rebarWeight = rebarWeight;
            this.totalVolume += volume;
            this.totalRebar += rebarWeight;
        }
        
        // إعادة إنشاء المشاهدات
        const scenes = new Set(this.columns.map(c => c.sceneId));
        // سيتم إعادة العرض عند استدعاء render مرة أخرى
        
        this.eventBus?.emit('column:shapeUpdated', {
            id: this.id,
            shape,
            totalVolume: this.totalVolume
        });
    }
    
    updateColor(color) {
        this.columnData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.material && mesh.userData.type === 'column') {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('column:colorUpdated', { id: this.id, color });
    }
    
    updateGrade(grade) {
        this.columnData.grade = grade;
        this.eventBus?.emit('column:gradeUpdated', { id: this.id, grade });
    }

    getTotalQuantities() {
        return {
            id: this.id,
            shape: this.columnData.shape,
            dimensions: this.columnData.shape === 'circular' 
                ? `直径 ${this.columnData.diameter}m`
                : `${this.columnData.width} × ${this.columnData.depth} m`,
            height: this.columnData.height,
            grade: this.columnData.grade,
            count: this.columns.length,
            totalVolume: this.totalVolume.toFixed(2),
            totalRebar: this.totalRebar.toFixed(2),
            scenes: [...new Set(this.columns.map(c => c.sceneId))],
            rebarDetails: this.columnData.rebar,
            createdAt: this.columns[0]?.createdAt || null
        };
    }
    
    generateReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير العمود العالمي
═══════════════════════════════════
🏛️ المعرف: ${totals.id}
📐 الشكل: ${totals.shape === 'circular' ? 'دائري' : 'مستطيل'}
📏 الأبعاد: ${totals.dimensions}
📐 الارتفاع: ${totals.height} م
🏷️ الدرجة: ${totals.grade}
═══════════════════════════════════
📊 الإجماليات:
• العدد: ${totals.count}
• الحجم: ${totals.totalVolume} م³
• الحديد: ${totals.totalRebar} كجم
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    // حذف عمود معين
    removeColumn(columnId) {
        const index = this.columns.findIndex(c => c.id === columnId);
        if (index !== -1) {
            const removed = this.columns.splice(index, 1)[0];
            
            // حذف المesh المرتبط
            if (this.meshes[index] && this.meshes[index].parent) {
                this.meshes[index].parent.remove(this.meshes[index]);
                if (this.meshes[index].geometry) this.meshes[index].geometry.dispose();
                if (this.meshes[index].material) this.meshes[index].material.dispose();
            }
            this.meshes.splice(index, 1);
            
            // تحديث الإجماليات
            this.totalVolume -= removed.volume;
            this.totalRebar -= removed.rebarWeight;
            
            this.eventBus?.emit('column:removed', { id: this.id, columnId });
            console.log(`🗑️ Column removed from scene ${removed.sceneId}`);
            return true;
        }
        return false;
    }
    
    dispose() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        this.columns = [];
        this.eventBus?.emit('column:disposed', { id: this.id });
    }
}

export default GlobalColumn;