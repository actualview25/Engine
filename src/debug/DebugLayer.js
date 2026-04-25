// ============================================
// DEBUG LAYER - طبقة التصحيح المرئية
// تعرض معلومات الأداء، الإحصائيات، وشبكة التصحيح
// ============================================

import * as THREE from 'three';

export class DebugLayer {
    constructor(sceneGraph = null, realityBridge = null, loader = null, lodManager = null) {
        this.sceneGraph = sceneGraph;
        this.realityBridge = realityBridge;
        this.loader = loader;
        this.lodManager = lodManager;
        
        // عناصر واجهة التصحيح
        this.panel = null;
        this.stats = null;
        this.isVisible = false;
        
        // بيانات الأداء
        this.performanceData = {
            fps: 0,
            frameTime: 0,
            memory: 0,
            drawCalls: 0,
            triangles: 0,
            vertices: 0,
            textures: 0
        };
        
        // شبكة التصحيح (Grid)
        this.debugGrid = null;
        this.axesHelper = null;
        this.lightHelpers = [];
        
        // خيارات العرض
        this.options = {
            showGrid: true,
            showAxes: true,
            showFPS: true,
            showMemory: true,
            showBoundingBoxes: false,
            showWireframes: false,
            showLightHelpers: false,
            showCameraHelper: false,
            gridSize: 50,
            gridDivisions: 20,
            axesSize: 10
        };
        
        // إحصائيات إضافية
        this.drawCallStats = new Map();
        this.objectCounts = new Map();
        
        // معالج اختصارات لوحة المفاتيح
        this.keyboardShortcuts = {
            'F1': () => this.toggle(),
            'F2': () => this.toggleOption('showGrid'),
            'F3': () => this.toggleOption('showAxes'),
            'F4': () => this.toggleOption('showBoundingBoxes'),
            'F5': () => this.refresh(),
            'F12': () => this.takeScreenshot()
        };
        
        console.log('🐛 DebugLayer initialized');
    }
    
    // ========== INITIALIZATION ==========
    
    init(scene) {
        this.scene = scene;
        this.createPanel();
        this.createDebugObjects();
        this.setupKeyboardShortcut();
        
        console.log('✅ DebugLayer initialized');
    }
    
    createPanel() {
        // إنشاء لوحة التصحيح
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.85);
            color: #0f0;
            font-family: monospace;
            font-size: 11px;
            padding: 8px 12px;
            border-radius: 6px;
            border-left: 3px solid #0f0;
            z-index: 10000;
            pointer-events: none;
            backdrop-filter: blur(5px);
            min-width: 200px;
            display: none;
        `;
        
        document.body.appendChild(this.panel);
    }
    
    createDebugObjects() {
        // شبكة التصحيح
        if (this.options.showGrid) {
            this.debugGrid = new THREE.GridHelper(
                this.options.gridSize,
                this.options.gridDivisions,
                0x88aaff,
                0x335588
            );
            this.debugGrid.position.y = -0.01;
            if (this.scene) this.scene.add(this.debugGrid);
        }
        
        // محاور الإحداثيات
        if (this.options.showAxes) {
            this.axesHelper = new THREE.AxesHelper(this.options.axesSize);
            if (this.scene) this.scene.add(this.axesHelper);
        }
    }
    
    setupKeyboardShortcut() {
        window.addEventListener('keydown', (event) => {
            const shortcut = this.keyboardShortcuts[event.key];
            if (shortcut) {
                event.preventDefault();
                shortcut();
            }
        });
    }
    
    // ========== VISIBILITY CONTROL ==========
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    show() {
        this.isVisible = true;
        if (this.panel) {
            this.panel.style.display = 'block';
        }
        
        this.startMonitoring();
        console.log('🐛 Debug layer shown');
    }
    
    hide() {
        this.isVisible = false;
        if (this.panel) {
            this.panel.style.display = 'none';
        }
        
        this.stopMonitoring();
        console.log('🐛 Debug layer hidden');
    }
    
    // ========== MONITORING ==========
    
    startMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
        this.monitorInterval = setInterval(() => {
            if (this.isVisible) {
                this.updateData();
                this.updatePanel();
            }
        }, 100);
        
        // تتبع FPS
        this.startFPSTracking();
    }
    
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        if (this.fpsInterval) {
            cancelAnimationFrame(this.fpsInterval);
            this.fpsInterval = null;
        }
    }
    
    startFPSTracking() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const trackFPS = () => {
            frameCount++;
            const now = performance.now();
            const delta = now - lastTime;
            
            if (delta >= 1000) {
                this.performanceData.fps = frameCount;
                this.performanceData.frameTime = delta / frameCount;
                
                frameCount = 0;
                lastTime = now;
            }
            
            this.fpsInterval = requestAnimationFrame(trackFPS);
        };
        
        this.fpsInterval = requestAnimationFrame(trackFPS);
    }
    
    updateData() {
        // تحديث بيانات الذاكرة
        if (performance.memory) {
            this.performanceData.memory = performance.memory.usedJSHeapSize / (1024 * 1024);
        }
        
        // تحديث إحصائيات المشهد
        if (this.scene) {
            this.collectSceneStats();
        }
        
        // تحديث بيانات الـ Loader
        if (this.loader) {
            this.performanceData.loadingProgress = this.loader.getProgress?.() || 0;
        }
        
        // تحديث بيانات LOD
        if (this.lodManager) {
            this.performanceData.lodLevels = this.lodManager.getActiveLevels?.() || 0;
        }
    }
    
    collectSceneStats() {
        let drawCalls = 0;
        let triangles = 0;
        let vertices = 0;
        let textures = 0;
        
        this.objectCounts.clear();
        
        this.scene.traverse((object) => {
            // حساب الكائنات حسب النوع
            const type = object.type;
            this.objectCounts.set(type, (this.objectCounts.get(type) || 0) + 1);
            
            // حساب draw calls
            if (object.isMesh) {
                drawCalls++;
                
                if (object.geometry) {
                    const attr = object.geometry.attributes.position;
                    if (attr) {
                        vertices += attr.count;
                        triangles += attr.count / 3;
                    }
                }
                
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        textures += object.material.filter(m => m.map).length;
                    } else if (object.material.map) {
                        textures++;
                    }
                }
            }
        });
        
        this.performanceData.drawCalls = drawCalls;
        this.performanceData.triangles = triangles;
        this.performanceData.vertices = vertices;
        this.performanceData.textures = textures;
    }
    
    updatePanel() {
        if (!this.panel) return;
        
        const fpsColor = this.performanceData.fps >= 50 ? '#0f0' : 
                        this.performanceData.fps >= 30 ? '#ff0' : '#f00';
        
        const memoryColor = this.performanceData.memory < 200 ? '#0f0' :
                           this.performanceData.memory < 500 ? '#ff0' : '#f00';
        
        let html = `
            <div style="margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 3px;">
                <strong>🔍 DEBUG PANEL</strong>
            </div>
            <div><span style="color:#888;">FPS:</span> <span style="color:${fpsColor}; font-weight:bold;">${this.performanceData.fps}</span>
            <span style="color:#888; margin-left:10px;">Frame:</span> <span style="color:#ff0;">${this.performanceData.frameTime.toFixed(1)}ms</span></div>
        `;
        
        if (this.options.showMemory) {
            html += `<div><span style="color:#888;">Memory:</span> <span style="color:${memoryColor};">${this.performanceData.memory.toFixed(1)} MB</span></div>`;
        }
        
        html += `
            <div style="margin-top: 5px; border-top: 1px solid #333; padding-top: 3px;">
                <div><span style="color:#888;">Draw Calls:</span> <span style="color:#0ff;">${this.performanceData.drawCalls}</span></div>
                <div><span style="color:#888;">Triangles:</span> <span style="color:#0ff;">${this.formatNumber(this.performanceData.triangles)}</span></div>
                <div><span style="color:#888;">Vertices:</span> <span style="color:#0ff;">${this.formatNumber(this.performanceData.vertices)}</span></div>
                <div><span style="color:#888;">Textures:</span> <span style="color:#0ff;">${this.performanceData.textures}</span></div>
            </div>
        `;
        
        // إضافة إحصائيات الكائنات
        if (this.objectCounts.size > 0) {
            html += `<div style="margin-top: 5px; border-top: 1px solid #333; padding-top: 3px;">`;
            for (const [type, count] of this.objectCounts) {
                if (count > 0 && type !== 'Scene') {
                    html += `<div><span style="color:#888;">${type}:</span> ${count}</div>`;
                }
            }
            html += `</div>`;
        }
        
        // إضافة حالة الأنظمة
        html += `
            <div style="margin-top: 5px; border-top: 1px solid #333; padding-top: 3px;">
                <div><span style="color:#888;">SceneGraph:</span> ${this.sceneGraph ? '✅' : '❌'}</div>
                <div><span style="color:#888;">RealityBridge:</span> ${this.realityBridge ? '✅' : '❌'}</div>
                <div><span style="color:#888;">LOD Manager:</span> ${this.lodManager ? '✅' : '❌'}</div>
            </div>
        `;
        
        html += `
            <div style="margin-top: 5px; border-top: 1px solid #333; padding-top: 3px; font-size: 9px; color:#666;">
                F1: Toggle | F2: Grid | F3: Axes | F4: BBox | F12: Screenshot
            </div>
        `;
        
        this.panel.innerHTML = html;
    }
    
    formatNumber(num) {
        if (num > 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num > 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    // ========== OPTIONS ==========
    
    toggleOption(option) {
        this.options[option] = !this.options[option];
        
        switch(option) {
            case 'showGrid':
                if (this.debugGrid) this.debugGrid.visible = this.options.showGrid;
                break;
            case 'showAxes':
                if (this.axesHelper) this.axesHelper.visible = this.options.showAxes;
                break;
            case 'showBoundingBoxes':
                this.toggleBoundingBoxes();
                break;
            case 'showWireframes':
                this.toggleWireframes();
                break;
            case 'showLightHelpers':
                this.toggleLightHelpers();
                break;
        }
        
        console.log(`🐛 Option ${option}: ${this.options[option]}`);
    }
    
    toggleBoundingBoxes() {
        if (!this.scene) return;
        
        const show = this.options.showBoundingBoxes;
        
        this.scene.traverse((object) => {
            if (object.isMesh) {
                if (show && !object.userData.boundingBoxHelper) {
                    const box = new THREE.Box3().setFromObject(object);
                    const helper = new THREE.Box3Helper(box, 0xff00ff);
                    object.userData.boundingBoxHelper = helper;
                    this.scene.add(helper);
                } else if (!show && object.userData.boundingBoxHelper) {
                    this.scene.remove(object.userData.boundingBoxHelper);
                    delete object.userData.boundingBoxHelper;
                }
            }
        });
    }
    
    toggleWireframes() {
        if (!this.scene) return;
        
        const show = this.options.showWireframes;
        
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.wireframe = show);
                } else {
                    object.material.wireframe = show;
                }
            }
        });
    }
    
    toggleLightHelpers() {
        if (!this.scene) return;
        
        const show = this.options.showLightHelpers;
        
        if (show && this.lightHelpers.length === 0) {
            this.scene.traverse((object) => {
                if (object.isLight) {
                    let helper;
                    if (object.isDirectionalLight) {
                        helper = new THREE.DirectionalLightHelper(object, 1);
                    } else if (object.isPointLight) {
                        helper = new THREE.PointLightHelper(object, 0.5);
                    } else if (object.isSpotLight) {
                        helper = new THREE.SpotLightHelper(object);
                    }
                    
                    if (helper) {
                        this.scene.add(helper);
                        this.lightHelpers.push(helper);
                    }
                }
            });
        } else if (!show) {
            this.lightHelpers.forEach(helper => {
                this.scene.remove(helper);
            });
            this.lightHelpers = [];
        }
    }
    
    // ========== UTILITY ==========
    
    refresh() {
        this.updateData();
        this.updatePanel();
        console.log('🐛 Debug panel refreshed');
    }
    
    takeScreenshot() {
        if (!this.scene || !this.scene.renderer) {
            console.warn('Cannot take screenshot: no renderer found');
            return;
        }
        
        // التقاط صورة من canvas
        const canvas = this.scene.renderer.domElement;
        const dataURL = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `screenshot_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        console.log('📸 Screenshot saved');
    }
    
    getStatistics() {
        return {
            performance: { ...this.performanceData },
            options: { ...this.options },
            objectCounts: Object.fromEntries(this.objectCounts),
            isVisible: this.isVisible
        };
    }
    
    dispose() {
        this.stopMonitoring();
        
        if (this.panel && this.panel.remove) {
            this.panel.remove();
        }
        
        if (this.debugGrid && this.scene) this.scene.remove(this.debugGrid);
        if (this.axesHelper && this.scene) this.scene.remove(this.axesHelper);
        
        this.lightHelpers.forEach(helper => {
            if (this.scene) this.scene.remove(helper);
        });
        
        console.log('♻️ DebugLayer disposed');
    }
}

export default DebugLayer;