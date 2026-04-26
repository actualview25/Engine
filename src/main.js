// ============================================
// ACTUAL VIEW ENGINE v2.0 - SIMPLE ENTRY POINT
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============ CLASSES (مضمنة لتجنب مشاكل الاستيراد) ============

// Event Bus
class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    emit(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) callback(data);
        }
    }
    off(event, callback) {
        if (this.listeners.has(event)) {
            const filtered = this.listeners.get(event).filter(cb => cb !== callback);
            if (filtered.length === 0) this.listeners.delete(event);
            else this.listeners.set(event, filtered);
        }
    }
}

// Node System
class NodeSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.nodes = new Map();
        this.currentNodeId = null;
    }
    createNode(data) {
        const id = data.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const node = {
            id, name: data.name || id, panorama: data.panorama || null,
            position: data.position || { x: 0, y: 0, z: 0 },
            rotation: data.rotation || { x: 0, y: 0, z: 0 },
            links: data.links || [], createdAt: Date.now()
        };
        this.nodes.set(id, node);
        this.eventBus.emit('node:created', node);
        return id;
    }
    getNode(id) { return this.nodes.get(id); }
    getAllNodes() { return Array.from(this.nodes.values()); }
    setCurrentNode(id) {
        if (this.nodes.has(id)) {
            this.currentNodeId = id;
            this.eventBus.emit('node:currentChanged', this.nodes.get(id));
            return true;
        }
        return false;
    }
    getCurrentNode() { return this.nodes.get(this.currentNodeId); }
    getNodeCount() { return this.nodes.size; }
}

// Panorama Renderer
class PanoramaRenderer {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.currentSphere = null;
    }
    async loadPanorama(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(url, (texture) => {
                if (this.currentSphere) {
                    this.currentSphere.material.map = texture;
                    this.currentSphere.material.needsUpdate = true;
                } else {
                    const geometry = new THREE.SphereGeometry(500, 64, 64);
                    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
                    this.currentSphere = new THREE.Mesh(geometry, material);
                    this.scene.add(this.currentSphere);
                }
                this.eventBus.emit('panorama:loaded', { url });
                resolve(texture);
            }, undefined, reject);
        });
    }
}

// Camera Controller
class CameraController {
    constructor(camera, controls, eventBus) {
        this.camera = camera;
        this.controls = controls;
        this.eventBus = eventBus;
        this.isTransitioning = false;
    }
    startTransition(targetPosition, targetRotation, duration = 0.6) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        const startPos = this.camera.position.clone();
        const startRot = { x: this.camera.rotation.x, y: this.camera.rotation.y };
        const startTime = performance.now();
        const animate = (now) => {
            const elapsed = (now - startTime) / 1000;
            const t = Math.min(1, elapsed / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            this.camera.position.lerpVectors(startPos, targetPosition, ease);
            this.camera.rotation.x = startRot.x + (targetRotation.x - startRot.x) * ease;
            this.camera.rotation.y = startRot.y + (targetRotation.y - startRot.y) * ease;
            if (t < 1) requestAnimationFrame(animate);
            else { this.isTransitioning = false; this.eventBus.emit('camera:transitionEnd'); }
        };
        requestAnimationFrame(animate);
    }
    update() { this.controls?.update(); }
}

// Lighting System
class LightingSystem {
    constructor(scene) {
        this.scene = scene;
    }
    setup() {
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
        dirLight.position.set(10, 20, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
        const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
        fillLight.position.set(-5, 10, -10);
        this.scene.add(fillLight);
        const backLight = new THREE.PointLight(0x4466aa, 0.3);
        backLight.position.set(0, 5, -15);
        this.scene.add(backLight);
    }
}

// Raycaster Handler
class RaycasterHandler {
    constructor(camera, domElement, eventBus) {
        this.camera = camera;
        this.domElement = domElement;
        this.eventBus = eventBus;
        this.raycaster = new THREE.Raycaster();
        this.sphereMesh = null;
        this.clickHandler = null;
        this.domElement.addEventListener('click', (e) => this.onClick(e));
    }
    setSphereMesh(mesh) { this.sphereMesh = mesh; }
    setClickHandler(handler) { this.clickHandler = handler; }
    onClick(event) {
        if (!this.sphereMesh) return;
        const rect = this.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const intersects = this.raycaster.intersectObject(this.sphereMesh);
        if (intersects.length > 0) {
            const point = intersects[0].point.clone().normalize().multiplyScalar(502);
            if (this.clickHandler) this.clickHandler(point);
            this.eventBus.emit('raycaster:click', { point });
        }
    }
}

// Navigation Handler
class NavigationHandler {
    constructor(nodeSystem, panoramaRenderer, cameraController, eventBus) {
        this.nodeSystem = nodeSystem;
        this.panoramaRenderer = panoramaRenderer;
        this.cameraController = cameraController;
        this.eventBus = eventBus;
        this.currentNode = null;
        this.isTransitioning = false;
        this.eventBus.on('node:currentChanged', (node) => { this.currentNode = node; });
    }
    handleNavigationClick(clickPoint) {
        if (this.isTransitioning || !this.currentNode) return false;
        if (this.currentNode.links && this.currentNode.links.length > 0) {
            this.navigateToNode(this.currentNode.links[0].targetId);
            return true;
        }
        return false;
    }
    async navigateToNode(targetId) {
        const targetNode = this.nodeSystem.getNode(targetId);
        if (!targetNode) return false;
        this.isTransitioning = true;
        this.eventBus.emit('navigation:start', { from: this.currentNode, to: targetNode });
        try {
            if (targetNode.panorama) await this.panoramaRenderer.loadPanorama(targetNode.panorama);
            this.nodeSystem.setCurrentNode(targetId);
            this.isTransitioning = false;
            this.eventBus.emit('navigation:complete', { node: targetNode });
            return true;
        } catch (error) {
            this.isTransitioning = false;
            console.error('Navigation failed:', error);
            return false;
        }
    }
    setCurrentNode(nodeId) { this.nodeSystem.setCurrentNode(nodeId); }
}

// Hotspot System
class HotspotSystem {
    constructor(scene, camera, eventBus, nodeSystem) {
        this.scene = scene;
        this.camera = camera;
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.hotspots = [];
    }
    addHotspot(type, position, data) {
        const id = `hotspot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.hotspots.push({ id, type, position, data, createdAt: Date.now() });
        this.eventBus.emit('hotspot:added', { id, type, position });
        return id;
    }
    updatePositions() {}
    getCount() { return this.hotspots.length; }
    dispose() { this.hotspots = []; }
}

// Toolbar
class Toolbar {
    constructor(engine) {
        this.engine = engine;
        this.activeTool = 'navigate';
        this.createToolbar();
    }
    createToolbar() {
        this.element = document.createElement('div');
        this.element.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(30,30,46,0.95); backdrop-filter: blur(10px);
            border-radius: 50px; padding: 8px 16px; display: flex; gap: 8px;
            z-index: 1000; border: 1px solid rgba(255,170,68,0.3);
        `;
        const tools = [
            { id: 'navigate', icon: '🗺️', name: 'تصفح' },
            { id: 'distance', icon: '📏', name: 'مسافة' },
            { id: 'area', icon: '📐', name: 'مساحة' },
            { id: 'hotspot', icon: '📍', name: 'نقطة' }
        ];
        tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.innerHTML = `${tool.icon} ${tool.name}`;
            btn.style.cssText = `
                background: ${this.activeTool === tool.id ? '#ffaa44' : 'transparent'};
                border: none; border-radius: 40px; padding: 8px 16px;
                color: ${this.activeTool === tool.id ? '#1e1e2e' : '#ccc'};
                cursor: pointer; font-family: monospace;
            `;
            btn.onclick = () => this.activateTool(tool.id);
            this.element.appendChild(btn);
        });
        document.body.appendChild(this.element);
    }
    activateTool(toolId) {
        this.activeTool = toolId;
        document.querySelectorAll('#toolbar button').forEach(btn => btn.style.background = 'transparent');
        if (this.element.children[toolId]) this.element.children[toolId].style.background = '#ffaa44';
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            const names = { navigate: '🟢 وضع التصفح', distance: '📏 قياس المسافة', area: '📐 قياس المساحة', hotspot: '📍 إضافة نقطة' };
            statusEl.innerHTML = names[toolId] || '🟢 جاهز';
        }
    }
    getActiveTool() { return this.activeTool; }
    show() { if (this.element) this.element.style.display = 'flex'; }
}

// WorkerMarkers (مبسط)
class WorkerMarkers {
    constructor(scene) {
        this.scene = scene;
        this.markers = [];
    }
    render(camera) {}
    getWorkerCount() { return this.markers.length; }
    dispose() { this.markers.forEach(m => this.scene.remove(m)); this.markers = []; }
}

// GlobalFountain (مبسط للرسوم المتحركة)
class GlobalFountain {
    constructor(eventBus) { this.eventBus = eventBus; this.particles = []; }
    animate(deltaTime) {}
}

// ============ MAIN ENGINE CLASS ============
class ActualViewEngine {
    constructor() {
        console.log('%c═══════════════════════════════════════', 'color: #ffaa44');
        console.log('%c🏗️ ACTUAL VIEW ENGINE v2.0', 'color: #ffaa44; font-size: 20px; font-weight: bold');
        console.log('%c═══════════════════════════════════════', 'color: #ffaa44');
        
        // Core
        this.eventBus = new EventBus();
        this.nodeSystem = new NodeSystem(this.eventBus);
        
        // Three.js
        this.initThree();
        
        // Lighting
        this.lightingSystem = new LightingSystem(this.scene);
        this.lightingSystem.setup();
        
        // Rendering
        this.panoramaRenderer = new PanoramaRenderer(this.scene, this.eventBus);
        this.cameraController = new CameraController(this.camera, this.controls, this.eventBus);
        
        // Interaction
        this.raycasterHandler = new RaycasterHandler(this.camera, this.renderer.domElement, this.eventBus);
        this.navigationHandler = new NavigationHandler(this.nodeSystem, this.panoramaRenderer, this.cameraController, this.eventBus);
        this.hotspotSystem = new HotspotSystem(this.scene, this.camera, this.eventBus, this.nodeSystem);
        
        // UI
        this.toolbar = new Toolbar(this);
        this.workerMarkers = new WorkerMarkers(this.scene);
        
        // Global
        this.globalFountain = new GlobalFountain(this.eventBus);
        
        // Setup
        this.setupSphere();
        this.createDefaultNode();
        
        // Start
        this.start();
        
        console.log('%c✅ ACTUAL VIEW ENGINE جاهز', 'color: #44ff44; font-size: 16px');
    }
    
    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.002);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 1.6, 0.1);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        
        document.getElementById('container').appendChild(this.renderer.domElement);
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.8;
        this.controls.zoomSpeed = 1.0;
        this.controls.enablePan = false;
        this.controls.target.set(0, 1.6, 0);
        
        // Helpers
        const gridHelper = new THREE.GridHelper(100, 20, 0x44aaff, 0x335588);
        gridHelper.position.y = -0.01;
        this.scene.add(gridHelper);
        
        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);
        
        console.log('✅ Three.js initialized');
    }
    
    setupSphere() {
        // إنشاء كرة بانورامية باللون الأزرق الداكن
        const geometry = new THREE.SphereGeometry(500, 64, 64);
        const material = new THREE.MeshBasicMaterial({ color: 0x1a2a4a, side: THREE.BackSide });
        this.sphereMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphereMesh);
        this.raycasterHandler.setSphereMesh(this.sphereMesh);
        
        // إضافة نقاط بيضاء للزينة
        const pointsMat = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.3 });
        const pointsGeo = new THREE.BufferGeometry();
        const positions = [];
        for (let i = 0; i < 300; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions.push(500 * Math.sin(phi) * Math.cos(theta));
            positions.push(500 * Math.sin(phi) * Math.sin(theta));
            positions.push(500 * Math.cos(phi));
        }
        pointsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        this.scene.add(new THREE.Points(pointsGeo, pointsMat));
        
        // إضافة بعض الكرات الصغيرة الملونة للاختبار
        const colors = [0xff4444, 0x44ff44, 0x44aaff, 0xffaa44];
        for (let i = 0; i < 12; i++) {
            const theta = (i / 12) * Math.PI * 2;
            const phi = Math.sin(i * 0.5) * 0.5;
            const x = 500 * Math.cos(theta) * Math.cos(phi);
            const y = 500 * Math.sin(phi);
            const z = 500 * Math.sin(theta) * Math.cos(phi);
            const marker = new THREE.Mesh(
                new THREE.SphereGeometry(2, 16, 16),
                new THREE.MeshStandardMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.3 })
            );
            marker.position.set(x, y, z);
            this.scene.add(marker);
        }
    }
    
    createDefaultNode() {
        const nodeId = this.nodeSystem.createNode({
            name: 'المشهد الرئيسي',
            panorama: null,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            links: []
        });
        this.navigationHandler.setCurrentNode(nodeId);
    }
    
    start() {
        this.animate();
        window.addEventListener('resize', () => this.onResize());
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        this.hideLoading();
        console.log('🚀 Engine started');
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
        }
    }
    
    updateTime() {
        const timeElement = document.getElementById('statusTime');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString('ar-EG');
        }
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls?.update();
        this.cameraController?.update();
        this.hotspotSystem?.updatePositions();
        this.workerMarkers?.render(this.camera);
        this.globalFountain?.animate(16);
        
        // تدوير الكرات الصغيرة
        const time = Date.now() * 0.002;
        this.scene.children.forEach(child => {
            if (child.isMesh && child.geometry.type === 'SphereGeometry' && child !== this.sphereMesh && child.material?.emissiveIntensity) {
                child.material.emissiveIntensity = 0.3 + Math.sin(time) * 0.2;
            }
        });
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// ============ START APPLICATION ============
window.addEventListener('DOMContentLoaded', () => {
    window.app = new ActualViewEngine();
    window.engine = window.app;
    console.log('💡 Available: window.engine.getSystemStatus()');
});
