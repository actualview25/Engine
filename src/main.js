// ============================================
// ACTUAL VIEW ENGINE v2.0 - ENTRY POINT
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============ CORE SYSTEMS ============
import { EventBus } from './core/EventBus.js';
import { NodeSystem } from './core/NodeSystem.js';
import { SceneGraph } from './core/SceneGraph.js';
import { GeoReferencing } from './core/GeoReferencing.js';
import { ProjectBridge } from './core/ProjectBridge.js';

// ============ RENDERING SYSTEMS ============
import { PanoramaRenderer } from './rendering/PanoramaRenderer.js';
import { CameraController } from './rendering/CameraController.js';
import { LightingSystem } from './rendering/LightingSystem.js';
import { EffectsManager } from './rendering/EffectsManager.js';

// ============ INTERACTION SYSTEMS ============
import { RaycasterHandler } from './interaction/RaycasterHandler.js';
import { NavigationHandler } from './interaction/NavigationHandler.js';
import { HotspotSystem } from './interaction/HotspotSystem.js';

// ============ TOOLS ============
import { DistanceTool } from './tools/measurement/DistanceTool.js';
import { AreaTool } from './tools/measurement/AreaTool.js';
import { VolumeTool } from './tools/measurement/VolumeTool.js';
import { AngleTool } from './tools/measurement/AngleTool.js';
import { PathTools } from './tools/paths/PathTools.js';
import { ExportTools } from './tools/export/ExportTools.js';

// ============ UI PANELS ============
import { Toolbar } from './ui/panels/Toolbar.js';
import { PropertiesPanel } from './ui/panels/PropertiesPanel.js';
import { SceneExplorer } from './ui/panels/SceneExplorer.js';
import { BOQPanel } from './ui/panels/BOQPanel.js';
import { SettingsPanel } from './ui/panels/SettingsPanel.js';
import { UIManager } from './ui/panels/UIManager.js';

// ============ DIALOGS ============
import { CalibrationDialog } from './ui/dialogs/CalibrationDialog.js';
import { ExportDialog } from './ui/dialogs/ExportDialog.js';
import { HotspotDialog } from './ui/dialogs/HotspotDialog.js';

// ============ PLAYER MODES ============
import { WorkerMode } from './player/WorkerMode.js';
import { ForemanMode } from './player/ForemanMode.js';
import { MobileWorkerMode } from './player/MobileWorkerMode.js';
import { WorkerMarkers } from './player/WorkerMarkers.js';

// ============ VOICE COMMANDS ============
import { VoiceCommands } from './voice/VoiceCommands.js';
import { SpeechRecognizer } from './voice/SpeechRecognizer.js';
import { TextToSpeech } from './voice/TextToSpeech.js';

// ============ DEBUG ============
import { DebugLayer } from './debug/DebugLayer.js';
import { PerformanceMonitor } from './debug/PerformanceMonitor.js';
import { MemoryProfiler } from './debug/MemoryProfiler.js';

// ============ ARCHITECTURE MODULES ============
import { Wall } from './modules/Architecture/Wall.js';
import { Door } from './modules/Architecture/Door.js';
import { Window } from './modules/Architecture/Window.js';
import { Floor } from './modules/Architecture/Floor.js';

// ============ CONCRETE MODULES ============
import { Column } from './modules/Concrete/Column.js';
import { Beam } from './modules/Concrete/Beam.js';
import { Slab } from './modules/Concrete/Slab.js';

// ============ MEP MODULES ============
import { ElectricalCircuit } from './modules/MEP/Electrical.js';
import { PlumbingSystem } from './modules/MEP/Plumbing.js';
import { HVACSystem } from './modules/MEP/HVAC.js';

// ============ GLOBAL SYSTEMS ============
// Architecture Global
import { GlobalFloor } from './modules/Architecture/global/GlobalFloor.js';
import { GlobalWall } from './modules/Architecture/global/GlobalWall.js';

// Concrete Global
import { GlobalBeam } from './modules/Concrete/global/GlobalBeam.js';
import { GlobalColumn } from './modules/Concrete/global/GlobalColumn.js';
import { GlobalSlab } from './modules/Concrete/global/GlobalSlab.js';

// MEP Global (تصحيح الأسماء)
import { GlobalElectrical } from './modules/MEP/global/GlobalElectrical.js';
import { GlobalHVAC } from './modules/MEP/global/GlobalHVAC.js';
import { GlobalPlumbing } from './modules/MEP/global/GlobalPlumbing.js';  // تم التصحيح

// Glass Global
import { GlobalGlass } from './modules/Glass/global/GlobalGlass.js';
import { GlobalSkylight } from './modules/Glass/global/GlobalSkylight.js';
import { GlobalCurtainWall } from './modules/Glass/global/GlobalCurtainWall.js';

// Landscaping Global
import { GlobalFountain } from './modules/Landscaping/global/GlobalFountain.js';
import { GlobalGardenPath } from './modules/Landscaping/global/GlobalGardenPath.js';
import { GlobalPlant } from './modules/Landscaping/global/GlobalPlant.js';
import { GlobalTree } from './modules/Landscaping/global/GlobalTree.js';

// Stone & Brick Global
import { GlobalStone } from './modules/StoneBrick/global/GlobalStone.js';
import { GlobalBrick } from './modules/StoneBrick/global/GlobalBrick.js';
import { GlobalMarble } from './modules/StoneBrick/global/GlobalMarble.js';
import { GlobalCladding } from './modules/StoneBrick/global/GlobalCladding.js';
import { GlobalPavement } from './modules/StoneBrick/global/GlobalPavement.js';

// BOQ Global
import { GlobalBOQCalculator } from './modules/BOQ/global/GlobalBOQCalculator.js';
import { GlobalReporter } from './modules/BOQ/global/GlobalReporter.js';
import { GlobalEarthworksBOQ } from './modules/BOQ/global/GlobalEarthworksBOQ.js';

// ============ LOADING SYSTEMS ============
import { IntegratedLoader } from './loading/IntegratedLoader.js';
import { LazySceneLoader } from './loading/LazySceneLoader.js';
import { LoadingStrategy } from './loading/LoadingStrategy.js';
import { PriorityQueue } from './loading/PriorityQueue.js';
import { SegmentedSceneLoader } from './loading/SegmentedSceneLoader.js';  // تم التصحيح
import { TileLODManager } from './loading/TileLODManager.js';

// ============ CAD & UTILS ============
import { CADImporter } from './cad/CADImporter.js';
import { CalibrationWizard } from './cad/CalibrationWizard.js';
import { SVGImporter } from './cad/SVGImporter.js';
import { MaterialLibrary } from './material/MaterialLibrary.js';
import { ColorUtils, FileUtils, GeometryUtils, MathUtils, Validators } from './utils/index.js';

// ============ MAIN ENGINE CLASS ============
class ActualViewEngine {
    constructor() {
        console.log('%c═══════════════════════════════════════', 'color: #ffaa44');
        console.log('%c🏗️ ACTUAL VIEW ENGINE v2.0', 'color: #ffaa44; font-size: 20px; font-weight: bold');
        console.log('%c📐 Reality Navigation Platform', 'color: #44aaff; font-size: 14px');
        console.log('%c═══════════════════════════════════════', 'color: #ffaa44');
        
        this.initCore();
        this.initThree();
        this.initRendering();
        this.initInteraction();
        this.initTools();
        this.initUI();
        this.initPlayerModes();
        this.initVoice();
        this.initLoading();
        this.initCAD();
        this.initMaterials();
        this.initGlobalSystems();
        this.initDebug();
        this.start();
        
        console.log('%c✅ ACTUAL VIEW ENGINE جاهز', 'color: #44ff44; font-size: 16px');
    }
    
    initCore() {
        this.eventBus = new EventBus();
        this.nodeSystem = new NodeSystem(this.eventBus);
        this.sceneGraph = new SceneGraph();
        this.geoReferencing = new GeoReferencing();
        this.geoReferencing.setCoordinateSystem('utm');
        this.projectBridge = new ProjectBridge();
        console.log('✅ Core systems initialized');
    }
    
    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
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
        console.log('✅ Three.js initialized');
    }
    
    initRendering() {
        this.panoramaRenderer = new PanoramaRenderer(this.scene, this.eventBus);
        this.cameraController = new CameraController(this.camera, this.controls, this.eventBus);
        this.lightingSystem = new LightingSystem(this.scene);
        this.lightingSystem.setup();
        this.effectsManager = new EffectsManager(this.renderer, this.scene, this.camera);
        console.log('✅ Rendering systems initialized');
    }
    
    initInteraction() {
        this.raycasterHandler = new RaycasterHandler(this.camera, this.renderer.domElement, this.eventBus);
        this.navigationHandler = new NavigationHandler(this.nodeSystem, this.panoramaRenderer, this.cameraController, this.eventBus);
        this.hotspotSystem = new HotspotSystem(this.scene, this.camera, this.eventBus, this.nodeSystem);
        this.raycasterHandler.setClickHandler((point, object) => {
            this.navigationHandler.handleNavigationClick(point, this.camera);
        });
        console.log('✅ Interaction systems initialized');
    }
    
    initTools() {
        this.distanceTool = new DistanceTool(this.scene, this.camera, this.eventBus);
        this.areaTool = new AreaTool(this.scene, this.camera, this.eventBus);
        this.volumeTool = new VolumeTool(this.scene, this.camera, this.eventBus);
        this.angleTool = new AngleTool(this.scene, this.camera, this.eventBus);
        this.pathTools = new PathTools(this);
        this.exportTools = new ExportTools(this);
        console.log('✅ Tools initialized');
    }
    
    initUI() {
        this.toolbar = new Toolbar(this);
        this.toolbar.show();
        this.propertiesPanel = new PropertiesPanel(this);
        this.sceneExplorer = new SceneExplorer(this);
        this.boqPanel = new BOQPanel(this);
        this.settingsPanel = new SettingsPanel(this);
        this.uiManager = new UIManager(this.eventBus);
        this.calibrationDialog = new CalibrationDialog(this.calibrationWizard);
        this.exportDialog = new ExportDialog((data) => this.handleExport(data));
        this.hotspotDialog = new HotspotDialog(
            (data) => this.hotspotSystem.addHotspot(data.type, data.position, data),
            (id, data) => this.hotspotSystem.updateHotspot(id, data)
        );
        console.log('✅ UI initialized');
    }
    
    initPlayerModes() {
        this.workerMode = new WorkerMode(this);
        this.foremanMode = new ForemanMode(this);
        this.mobileWorkerMode = new MobileWorkerMode(this);
        this.workerMarkers = new WorkerMarkers(this.scene);
        console.log('✅ Player modes initialized');
    }
    
    initVoice() {
        this.voiceCommands = new VoiceCommands(this);
        this.speechRecognizer = new SpeechRecognizer();
        this.textToSpeech = new TextToSpeech();
        console.log('✅ Voice systems initialized');
    }
    
    initLoading() {
        this.integratedLoader = new IntegratedLoader(this.sceneGraph, null, this.camera);
        this.lazySceneLoader = new LazySceneLoader(this.sceneGraph);
        this.loadingStrategy = new LoadingStrategy(this.sceneGraph);
        this.priorityQueue = new PriorityQueue();
        this.segmentedSceneLoader = new SegmentedSceneLoader();
        this.tileLODManager = new TileLODManager(this.camera);
        console.log('✅ Loading systems initialized');
    }
    
    initCAD() {
        this.cadImporter = new CADImporter(this.geoReferencing);
        this.calibrationWizard = new CalibrationWizard(this.geoReferencing);
        this.svgImporter = new SVGImporter();
        console.log('✅ CAD systems initialized');
    }
    
    initMaterials() {
        this.materialLibrary = new MaterialLibrary();
        console.log('✅ Materials initialized');
    }
    
    initGlobalSystems() {
        this.globalFloor = new GlobalFloor(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalWall = new GlobalWall(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalBeam = new GlobalBeam(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalColumn = new GlobalColumn(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalSlab = new GlobalSlab(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalElectrical = new GlobalElectrical(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalHVAC = new GlobalHVAC(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalPlumbing = new GlobalPlumbing(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalGlass = new GlobalGlass(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalSkylight = new GlobalSkylight(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalCurtainWall = new GlobalCurtainWall(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalFountain = new GlobalFountain(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalGardenPath = new GlobalGardenPath(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalPlant = new GlobalPlant(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalTree = new GlobalTree(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalStone = new GlobalStone(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalBrick = new GlobalBrick(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalMarble = new GlobalMarble(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalCladding = new GlobalCladding(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalPavement = new GlobalPavement(this.eventBus, this.nodeSystem, this.geoReferencing);
        this.globalBOQ = new GlobalBOQCalculator(this.eventBus, this.nodeSystem);
        this.globalReporter = new GlobalReporter(this.globalBOQ);
        this.globalEarthworksBOQ = new GlobalEarthworksBOQ();
        console.log('✅ Global systems initialized');
    }
    
    initDebug() {
        this.debugLayer = new DebugLayer(this.sceneGraph, null, this.integratedLoader, this.tileLODManager);
        this.debugLayer.init(this.scene);
        this.performanceMonitor = new PerformanceMonitor();
        this.performanceMonitor.startMonitoring();
        this.memoryProfiler = new MemoryProfiler();
        console.log('✅ Debug systems initialized');
    }
    
    start() {
        this.animate();
        window.addEventListener('resize', () => this.onResize());
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        console.log('🚀 Engine started');
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
        this.effectsManager?.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls?.update();
        this.cameraController?.update();
        this.hotspotSystem?.updatePositions();
        this.workerMarkers?.render(this.camera);
        this.globalFountain?.animate(16);
        if (this.effectsManager) {
            this.effectsManager.render();
        } else if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    handleExport(data) {
        console.log('Export triggered:', data);
        this.exportTools?.exportProject(data);
    }
    
    getSystemStatus() {
        return {
            version: '2.0.0',
            name: 'Actual View Engine',
            type: 'Reality Navigation Platform',
            status: 'running',
            stats: {
                nodes: this.nodeSystem?.getNodeCount() || 0,
                hotspots: this.hotspotSystem?.getCount() || 0,
                markers: this.workerMarkers?.getWorkerCount() || 0,
                activeTools: this.toolbar?.getActiveTool() || 'none'
            }
        };
    }
    
    dispose() {
        this.performanceMonitor?.stopMonitoring();
        this.memoryProfiler?.dispose();
        this.voiceCommands?.dispose();
        this.workerMarkers?.dispose();
        this.hotspotSystem?.dispose();
        console.log('♻️ Engine disposed');
    }
}

// ============ START APPLICATION ============
window.addEventListener('DOMContentLoaded', () => {
    window.app = new ActualViewEngine();
    window.getSystemStatus = () => window.app.getSystemStatus();
    window.engine = window.app;
    console.log('💡 Available commands: window.getSystemStatus(), window.engine');
});
