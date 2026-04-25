// ============================================
// HOTSPOT SYSTEM - نقاط المعلومات والانتقال
// يدعم: Info hotspots, Scene transition hotspots, 3D markers
// ============================================

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export class HotspotSystem {
    constructor(scene, camera, eventBus, nodeSystem) {
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        
        this.hotspots = new Map(); // id -> hotspot object
        this.css2DRenderer = null;
        this.activeMode = null; // 'info', 'scene', null
        self.tempPoint = null;
        
        this.setupCSS2DRenderer();
        this.setupEventListeners();
    }
    
    setupCSS2DRenderer() {
        this.css2DRenderer = new CSS2DRenderer();
        this.css2DRenderer.setSize(window.innerWidth, window.innerHeight);
        this.css2DRenderer.domElement.style.position = 'absolute';
        this.css2DRenderer.domElement.style.top = '0px';
        this.css2DRenderer.domElement.style.left = '0px';
        this.css2DRenderer.domElement.style.pointerEvents = 'none';
        this.css2DRenderer.domElement.style.zIndex = '10';
        document.body.appendChild(this.css2DRenderer.domElement);
    }
    
    setupEventListeners() {
        this.eventBus.on('hotspot:add', (data) => {
            this.addHotspot(data.type, data.position, data.data);
        });
        
        this.eventBus.on('hotspot:remove', (id) => {
            this.removeHotspot(id);
        });
        
        this.eventBus.on('hotspot:clear', () => {
            this.clearAllHotspots();
        });
        
        this.eventBus.on('tool:activate', (tool) => {
            if (tool === 'hotspot-info') {
                this.activeMode = 'info';
                this.eventBus.emit('ui:status', 'ℹ️ اضغط على المشهد لإضافة نقطة معلومات');
            } else if (tool === 'hotspot-scene') {
                this.activeMode = 'scene';
                this.eventBus.emit('ui:status', '🔗 اضغط على المشهد لإضافة نقطة انتقال');
            } else if (this.activeMode) {
                this.activeMode = null;
                this.eventBus.emit('ui:status', '🟢 وضع التصفح');
            }
        });
    }
    
    startAddHotspot(type, clickPoint) {
        if (!this.activeMode) return;
        
        if (type === 'info') {
            this.showInfoDialog(clickPoint);
        } else if (type === 'scene') {
            this.showSceneDialog(clickPoint);
        }
    }
    
    showInfoDialog(position) {
        const title = prompt('📝 أدخل عنوان المعلومات:');
        if (!title) {
            this.cancelAdd();
            return;
        }
        
        const content = prompt('📄 أدخل نص المعلومات:');
        if (!content) {
            this.cancelAdd();
            return;
        }
        
        this.addHotspot('info', position, { title, content });
        this.cancelAdd();
    }
    
    showSceneDialog(position) {
        // الحصول على جميع العقد الأخرى
        const currentNode = this.nodeSystem.getCurrentNode();
        const otherNodes = this.nodeSystem.getAllNodes().filter(n => n.id !== currentNode?.id);
        
        if (otherNodes.length === 0) {
            alert('❌ لا توجد مشاهد أخرى للربط');
            this.cancelAdd();
            return;
        }
        
        // إنشاء قائمة اختيار بسيطة
        let sceneList = '';
        otherNodes.forEach((node, index) => {
            sceneList += `${index + 1}. ${node.metadata?.name || node.id}\n`;
        });
        
        const choice = prompt(
            `اختر المشهد للانتقال إليه:\n\n${sceneList}\nأدخل الرقم:`
        );
        
        if (!choice) {
            this.cancelAdd();
            return;
        }
        
        const selectedIndex = parseInt(choice) - 1;
        if (selectedIndex < 0 || selectedIndex >= otherNodes.length) {
            alert('❌ اختيار غير صالح');
            this.cancelAdd();
            return;
        }
        
        const targetNode = otherNodes[selectedIndex];
        const description = prompt('📝 وصف النقطة (اختياري):', `انتقال إلى ${targetNode.metadata?.name || targetNode.id}`) || 'انتقال';
        
        this.addHotspot('scene', position, {
            targetNodeId: targetNode.id,
            targetNodeName: targetNode.metadata?.name || targetNode.id,
            description: description
        });
        
        this.cancelAdd();
    }
    
    cancelAdd() {
        this.activeMode = null;
        this.eventBus.emit('tool:deactivate');
        this.eventBus.emit('ui:status', '🟢 تم الإلغاء');
    }
    
    addHotspot(type, position, data) {
        const id = `hotspot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        // إنشاء عنصر HTML للنقطة
        const div = document.createElement('div');
        div.className = 'hotspot-marker';
        div.style.cssText = `
            background: ${type === 'info' ? '#ffaa44' : '#44aaff'};
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            border: 2px solid white;
        `;
        
        div.innerHTML = type === 'info' ? 'ℹ️' : '🔗';
        
        div.onmouseenter = () => {
            div.style.transform = 'scale(1.2)';
        };
        div.onmouseleave = () => {
            div.style.transform = 'scale(1)';
        };
        
        div.onclick = (e) => {
            e.stopPropagation();
            this.onHotspotClick(id, type, data);
        };
        
        const css2DObject = new CSS2DObject(div);
        css2DObject.position.copy(position);
        
        this.scene.add(css2DObject);
        
        // تخزين البيانات
        this.hotspots.set(id, {
            id,
            type,
            position,
            data,
            css2DObject,
            createdAt: new Date().toISOString()
        });
        
        this.eventBus.emit('hotspot:created', { id, type, data });
        
        return id;
    }
    
    onHotspotClick(id, type, data) {
        if (type === 'info') {
            // عرض معلومات
            alert(`📌 ${data.title}\n\n${data.content}`);
            this.eventBus.emit('hotspot:infoClicked', { id, data });
        } else if (type === 'scene') {
            // الانتقال إلى مشهد آخر
            if (data.targetNodeId) {
                this.eventBus.emit('node:navigate', data.targetNodeId);
                this.eventBus.emit('ui:status', `🚀 جار الانتقال إلى: ${data.targetNodeName}`);
            }
        }
    }
    
    removeHotspot(id) {
        const hotspot = this.hotspots.get(id);
        if (hotspot) {
            this.scene.remove(hotspot.css2DObject);
            if (hotspot.css2DObject.element) {
                hotspot.css2DObject.element.remove();
            }
            this.hotspots.delete(id);
            
            this.eventBus.emit('hotspot:removed', id);
        }
    }
    
    clearAllHotspots() {
        for (const [id, hotspot] of this.hotspots) {
            this.scene.remove(hotspot.css2DObject);
            if (hotspot.css2DObject.element) {
                hotspot.css2DObject.element.remove();
            }
        }
        this.hotspots.clear();
        
        this.eventBus.emit('hotspot:cleared');
    }
    
    updatePositions() {
        // CSS2DRenderer يتعامل مع المواقع تلقائياً
        if (this.css2DRenderer) {
            this.css2DRenderer.render(this.scene, this.camera);
        }
    }
    
    getHotspotsByType(type) {
        const result = [];
        for (const [id, hotspot] of this.hotspots) {
            if (hotspot.type === type) {
                result.push({ id, ...hotspot });
            }
        }
        return result;
    }
    
    getHotspotsByNode(nodeId) {
        // يمكن توسيعه لربط النقاط بمشاهد محددة
        return Array.from(this.hotspots.values());
    }
    
    getCount() {
        return this.hotspots.size;
    }
    
    exportData() {
        const hotspotsData = [];
        for (const [id, hotspot] of this.hotspots) {
            hotspotsData.push({
                id: hotspot.id,
                type: hotspot.type,
                position: hotspot.position,
                data: hotspot.data
            });
        }
        return hotspotsData;
    }
    
    dispose() {
        this.clearAllHotspots();
        if (this.css2DRenderer && this.css2DRenderer.domElement) {
            this.css2DRenderer.domElement.remove();
        }
    }
}