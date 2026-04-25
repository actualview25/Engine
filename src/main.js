// ============================================
// ACTUAL VIEW ENGINE v1.0
// المحرك المستخلص من Construction + Studio
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Core
import { EventBus } from './core/EventBus.js';
import { NodeSystem } from './core/NodeSystem.js';
import { SceneGraph } from './core/SceneGraph.js';
import { GeoReferencing } from './core/GeoReferencing.js';
import { ProjectBridge } from './core/ProjectBridge.js';

// Rendering
import { PanoramaRenderer } from './rendering/PanoramaRenderer.js';
import { CameraController } from './rendering/CameraController.js';
import { LightingSystem } from './rendering/LightingSystem.js';

// Interaction
import { RaycasterHandler } from './interaction/RaycasterHandler.js';
import { HotspotSystem } from './interaction/HotspotSystem.js';
import { NavigationHandler } from './interaction/NavigationHandler.js';

// Tools
import { DistanceTool } from './tools/measurement/DistanceTool.js';
import { AreaTool } from './tools/measurement/AreaTool.js';
import { PathTools } from './tools/paths/PathTools.js';
import { ExportTools } from './tools/export/ExportTools.js';

// UI
import { UIManager } from './ui/UIManager.js';

class ActualViewEngine {
    constructor() {
        console.log('%c🏗️ ACTUAL VIEW ENGINE v1.0', 'color: #ffaa44; font-size: 20px; font-weight: bold');
        console.log('%c📐 Reality Navigation Platform', 'color: #88aaff; font-size: 14px');
        
        // Event Bus (بديل window)
        this.eventBus = new EventBus();
        
        // تهيئة Three.js
        this.initThree();
        
        // تهيئة الأنظمة الأساسية
        this.initCoreSystems();
        
        // تهيئة أنظمة التفاعل
        this.initInteractionSystems();
        
        // تهيئة الأدوات
        this.initTools();
        
        // تهيئة الواجهة
        this.initUI();
        
        // تحميل المشروع الافتراضي أو إنشاء مشهد فارغ
        this.loadDefaultProject();
        
        // بدء الحلقة
        this.animate();
        
        console.log('✅ المحرك جاهز', this.getSystemStatus());
    }
    
    initThree() {
        // المشهد
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        
        // الكاميرا
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 0, 0.1);
        
        // الريندرر
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.getElementById('container').appendChild(this.renderer.domElement);
        
        // OrbitControls (للتنقل في وضع التصميم)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.8;
        this.controls.zoomSpeed = 1.0;
        this.controls.enablePan = false;
        this.controls.enableZoom = true;
        
        // إضاءة
        this.lighting = new LightingSystem(this.scene);
        this.lighting.setup();
        
        // معالج النقر
        this.raycaster = new RaycasterHandler(this.camera, this.renderer.domElement);
        
        // تحديث الحجم عند تغيير النافذة
        window.addEventListener('resize', () => this.onResize());
    }
    
    initCoreSystems() {
        // Node System - ❤️ قلب المحرك الجديد
        this.nodeSystem = new NodeSystem(this.eventBus);
        
        // Scene Graph من Construction
        this.sceneGraph = new SceneGraph();
        
        // GeoReferencing - ميزتك الفريدة
        this.geoReferencing = new GeoReferencing();
        this.geoReferencing.setCoordinateSystem('utm');
        
        // Bridge للتصدير والاستيراد
        this.projectBridge = new ProjectBridge();
        
        // ربط الأنظمة
        this.nodeSystem.setGeoReferencing(this.geoReferencing);
        
        console.log('✅ Core systems initialized');
    }
    
    initInteractionSystems() {
        // Panorama Renderer (من Studio مطور)
        this.panoramaRenderer = new PanoramaRenderer(this.scene, this.eventBus);
        
        // Camera Controller مع transitions السلسة
        this.cameraController = new CameraController(this.camera, this.controls, this.eventBus);
        
        // Hotspot System
        this.hotspotSystem = new HotspotSystem(this.scene, this.camera, this.eventBus, this.nodeSystem);
        
        // Navigation Handler - أهم إضافة
        this.navigationHandler = new NavigationHandler(
            this.nodeSystem,
            this.panoramaRenderer,
            this.cameraController,
            this.eventBus
        );
        
        // ربط الـ Raycaster بالنظام
        this.raycaster.setOnIntersect((point, normal) => {
            this.handleInteraction(point, normal);
        });
        
        console.log('✅ Interaction systems initialized');
    }
    
    initTools() {
        this.distanceTool = new DistanceTool(this.scene, this.camera, this.eventBus);
        this.areaTool = new AreaTool(this.scene, this.camera, this.eventBus);
        this.pathTools = new PathTools(this.scene, this.camera, this.eventBus);
        this.exportTools = new ExportTools(this, this.eventBus);
        
        console.log('✅ Tools initialized');
    }
    
    initUI() {
        this.ui = new UIManager(this.eventBus);
        this.ui.init();
        
        console.log('✅ UI initialized');
    }
    
    handleInteraction(point, normal) {
        const activeTool = this.ui.getActiveTool();
        
        switch(activeTool) {
            case 'distance':
                this.distanceTool.handleClick(point);
                break;
            case 'area':
                this.areaTool.handleClick(point);
                break;
            case 'hotspot-info':
                this.hotspotSystem.startAddHotspot('info', point);
                break;
            case 'hotspot-scene':
                this.hotspotSystem.startAddHotspot('scene', point);
                break;
            default:
                // وضع التصفح - محاولة الانتقال
                this.navigationHandler.handleNavigationClick(point);
        }
    }
    
    async loadDefaultProject() {
        // محاولة تحميل مشروع محفوظ، أو إنشاء مشهد افتراضي
        const savedProject = localStorage.getItem('actualview_project');
        
        if (savedProject) {
            try {
                const project = JSON.parse(savedProject);
                await this.loadProject(project);
                console.log('✅ Loaded saved project');
                return;
            } catch(e) {}
        }
        
        // إنشاء مشهد افتراضي
        await this.createDefaultScene();
    }
    
    async createDefaultScene() {
        const defaultPanorama = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
        
        const nodeId = await this.nodeSystem.createNode({
            id: 'start',
            panorama: defaultPanorama,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
        });
        
        await this.panoramaRenderer.loadPanorama(defaultPanorama);
        this.navigationHandler.setCurrentNode(nodeId);
        
        this.eventBus.emit('project:loaded', { nodeCount: 1 });
    }
    
    async loadProject(projectData) {
        // استيراد مشروع من JSON (من Construction أو محفوظ)
        const nodes = await this.projectBridge.importProject(projectData, this.nodeSystem);
        
        if (nodes.length > 0) {
            await this.panoramaRenderer.loadPanorama(nodes[0].panorama);
            this.navigationHandler.setCurrentNode(nodes[0].id);
        }
        
        this.eventBus.emit('project:loaded', { nodeCount: nodes.length });
        return nodes;
    }
    
    exportProject() {
        const projectData = this.projectBridge.exportProject(this.nodeSystem, this.geoReferencing);
        localStorage.setItem('actualview_project', JSON.stringify(projectData));
        return projectData;
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        if (this.hotspotSystem) {
            this.hotspotSystem.updatePositions();
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // تحديث OrbitControls
        if (this.controls) {
            this.controls.update();
        }
        
        // تحديث Hotspots (تبقى في مكانها)
        if (this.hotspotSystem) {
            this.hotspotSystem.updatePositions();
        }
        
        // تحديث أدوات القياس
        if (this.distanceTool) {
            this.distanceTool.update();
        }
        
        if (this.areaTool) {
            this.areaTool.update();
        }
        
        // الرسم
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    getSystemStatus() {
        return {
            version: '1.0.0',
            name: 'Actual View Engine',
            type: 'Reality Navigation Platform',
            nodes: this.nodeSystem.getNodeCount(),
            hotspots: this.hotspotSystem.getCount(),
            geoEnabled: this.geoReferencing.isEnabled()
        };
    }
}

// ============================================
// 🚀 تشغيل المحرك
// ============================================

window.addEventListener('load', () => {
    window.engine = new ActualViewEngine();
    
    // للوصول من Console للتطوير
    console.log('💡可用 commands: window.engine.exportProject(), window.engine.getSystemStatus()');
});