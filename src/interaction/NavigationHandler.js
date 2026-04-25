// ============================================
// NAVIGATION HANDLER - معالج الانتقال بين النقاط
// يحدد أقرب نقطة انتقال بناءً على زاوية النقر، ويدعم الانتقال السلس
// ============================================

import * as THREE from 'three';

export class NavigationHandler {
    constructor(nodeSystem, panoramaRenderer, cameraController, eventBus = null) {
        this.nodeSystem = nodeSystem;
        this.panoramaRenderer = panoramaRenderer;
        this.cameraController = cameraController;
        this.eventBus = eventBus;
        
        // الحالة الحالية
        this.currentNode = null;
        this.navigationEnabled = true;
        this.isTransitioning = false;
        
        // إعدادات التنقل
        this.snapThreshold = 25; // degrees - أقصى زاوية للنقر للانتقال
        this.transitionDuration = 0.6; // seconds
        this.useFadeEffect = true;
        this.autoOrientCamera = true;
        
        // ذاكرة التنقل (للرجوع)
        this.navigationHistory = [];
        this.maxHistorySize = 50;
        
        // روابط سريعة
        this.quickLinks = new Map(); // nodeId -> Set of targetIds
        
        // معالج الأحداث
        this.listeners = new Map();
        
        // إعدادات إضافية
        this.debugMode = false;
        
        console.log('🧭 NavigationHandler initialized');
        this.setupEventListeners();
    }
    
    // ========== INITIALIZATION ==========
    
    setupEventListeners() {
        if (!this.eventBus) return;
        
        this.eventBus.on('node:navigate', (nodeId) => {
            this.navigateToNode(nodeId);
        });
        
        this.eventBus.on('node:currentChanged', (node) => {
            this.currentNode = node;
        });
        
        this.eventBus.on('navigation:enable', () => {
            this.navigationEnabled = true;
        });
        
        this.eventBus.on('navigation:disable', () => {
            this.navigationEnabled = false;
        });
        
        this.eventBus.on('navigation:back', () => {
            this.goBack();
        });
        
        this.eventBus.on('camera:transitionEnd', () => {
            this.isTransitioning = false;
        });
    }
    
    // ========== CURRENT NODE MANAGEMENT ==========
    
    setCurrentNode(nodeId) {
        const node = this.nodeSystem?.getNode(nodeId);
        if (node) {
            this.currentNode = node;
            if (this.nodeSystem) {
                this.nodeSystem.setCurrentNode(nodeId);
            }
            
            // إضافة إلى السجل
            this.addToHistory(nodeId);
            
            this.notifyListeners('nodeChanged', node);
            
            if (this.eventBus) {
                this.eventBus.emit('navigation:nodeChanged', node);
            }
        }
        return this.currentNode;
    }
    
    getCurrentNode() {
        return this.currentNode;
    }
    
    addToHistory(nodeId) {
        // تجنب التكرار المتتالي
        if (this.navigationHistory.length > 0 && 
            this.navigationHistory[this.navigationHistory.length - 1] === nodeId) {
            return;
        }
        
        this.navigationHistory.push(nodeId);
        
        // الاحتفاظ بالحجم المحدد
        if (this.navigationHistory.length > this.maxHistorySize) {
            this.navigationHistory.shift();
        }
    }
    
    goBack() {
        if (this.navigationHistory.length < 2) {
            console.warn('No previous node to go back to');
            return false;
        }
        
        // إزالة العقدة الحالية
        this.navigationHistory.pop();
        
        // العقدة السابقة
        const previousNodeId = this.navigationHistory[this.navigationHistory.length - 1];
        
        return this.navigateToNode(previousNodeId);
    }
    
    canGoBack() {
        return this.navigationHistory.length > 1;
    }
    
    // ========== NAVIGATION CLICK HANDLING ==========
    
    handleNavigationClick(clickPoint, camera) {
        if (!this.navigationEnabled) return false;
        if (!this.currentNode) return false;
        if (this.isTransitioning) return false;
        
        // تحويل نقطة النقر إلى زوايا كروية
        const clickAngles = this.pointToAngles(clickPoint, camera);
        
        // البحث عن أقرب رابط
        const nearestLink = this.findNearestLinkByAngle(clickAngles);
        
        if (nearestLink && nearestLink.angleDiff < this.snapThreshold) {
            this.navigateToNode(nearestLink.targetId);
            return true;
        }
        
        return false;
    }
    
    pointToAngles(point, camera) {
        // تحويل نقطة على الكرة (x,y,z) إلى زوايا theta (أفقي) و phi (عمودي)
        // بالنسبة للكاميرا في مركز الكرة
        const direction = point.clone().normalize();
        
        // حساب الزوايا بالنسبة للكاميرا
        let theta = Math.atan2(direction.z, direction.x);
        let phi = Math.asin(direction.y);
        
        // تطبيق دوران الكاميرا إذا لزم الأمر
        if (camera) {
            const cameraRotation = camera.rotation.y;
            theta -= cameraRotation;
        }
        
        return {
            theta: theta * 180 / Math.PI,
            phi: phi * 180 / Math.PI
        };
    }
    
    findNearestLinkByAngle(clickAngles) {
        if (!this.currentNode || !this.currentNode.links) return null;
        
        let nearest = null;
        let minAngleDiff = this.snapThreshold;
        
        for (const link of this.currentNode.links) {
            const targetNode = this.nodeSystem?.getNode(link.targetId);
            if (!targetNode) continue;
            
            // حساب زاوية الهدف من الموضع الحالي
            const targetAngles = this.calculateTargetAngles(targetNode);
            
            if (targetAngles) {
                // حساب الفرق في الزوايا مع لفافة الزوايا
                let thetaDiff = Math.abs(this.angleDifference(clickAngles.theta, targetAngles.theta));
                const phiDiff = Math.abs(this.angleDifference(clickAngles.phi, targetAngles.phi));
                
                // الوزن: الزاوية الأفقية أهم من العمودية (70% / 30%)
                let totalDiff = thetaDiff * 0.7 + phiDiff * 0.3;
                
                // إذا كانت الزاوية الأفقية كبيرة جداً، تجاهل
                if (thetaDiff > this.snapThreshold * 1.5) {
                    totalDiff = Infinity;
                }
                
                if (totalDiff < minAngleDiff) {
                    minAngleDiff = totalDiff;
                    nearest = {
                        targetId: link.targetId,
                        angleDiff: totalDiff,
                        thetaDiff: thetaDiff,
                        phiDiff: phiDiff,
                        link: link
                    };
                }
            }
        }
        
        return nearest;
    }
    
    calculateTargetAngles(targetNode) {
        // حساب الاتجاه من العقدة الحالية إلى العقدة الهدف
        if (!this.currentNode || !targetNode.position) return null;
        
        const dx = targetNode.position.x - this.currentNode.position.x;
        const dz = targetNode.position.z - this.currentNode.position.z;
        const dy = targetNode.position.y - this.currentNode.position.y;
        
        const theta = Math.atan2(dz, dx) * 180 / Math.PI;
        const phi = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * 180 / Math.PI;
        
        return { theta, phi };
    }
    
    angleDifference(angle1, angle2) {
        let diff = angle1 - angle2;
        diff = ((diff % 360) + 360) % 360;
        if (diff > 180) diff = 360 - diff;
        return diff;
    }
    
    // ========== NAVIGATION EXECUTION ==========
    
    async navigateToNode(targetNodeId) {
        if (this.isTransitioning) {
            console.warn('Already transitioning, please wait');
            return false;
        }
        
        const targetNode = this.nodeSystem?.getNode(targetNodeId);
        if (!targetNode) {
            console.error(`Node ${targetNodeId} not found`);
            this.notifyListeners('error', { error: 'Node not found', targetNodeId });
            return false;
        }
        
        const fromNode = this.currentNode;
        
        // إرسال حدث بدء الانتقال
        this.isTransitioning = true;
        this.notifyListeners('start', { from: fromNode, to: targetNode });
        
        if (this.eventBus) {
            this.eventBus.emit('navigation:start', { from: fromNode, to: targetNode });
            this.eventBus.emit('ui:loading', true);
        }
        
        try {
            // تأثير Fade out if enabled
            if (this.useFadeEffect && this.cameraController?.startFade) {
                this.cameraController.startFade('out', 0.2);
                await this.delay(200);
            }
            
            // تحميل البانوراما الجديدة
            if (this.panoramaRenderer) {
                await this.panoramaRenderer.loadPanorama(targetNode.panorama);
            }
            
            // تحديث العقدة الحالية
            this.currentNode = targetNode;
            if (this.nodeSystem) {
                this.nodeSystem.setCurrentNode(targetNodeId);
            }
            
            // إضافة إلى السجل
            this.addToHistory(targetNodeId);
            
            // تحريك الكاميرا إلى الموضع المحدد أو الاتجاه
            if (this.autoOrientCamera && this.cameraController) {
                const targetPosition = targetNode.position || { x: 0, y: 0, z: 0.1 };
                const targetRotation = targetNode.rotation || { x: 0, y: 0, z: 0 };
                
                await this.cameraController.startTransition(
                    targetPosition,
                    targetRotation,
                    this.transitionDuration
                );
            }
            
            // تأثير Fade in
            if (this.useFadeEffect && this.cameraController?.startFade) {
                this.cameraController.startFade('in', 0.2);
            }
            
            // إرسال حدث نجاح الانتقال
            this.notifyListeners('complete', { node: targetNode, nodeId: targetNodeId });
            
            if (this.eventBus) {
                this.eventBus.emit('navigation:complete', { node: targetNode, nodeId: targetNodeId });
                this.eventBus.emit('ui:loading', false);
                this.eventBus.emit('ui:status', `📍 انتقلت إلى: ${targetNode.name || targetNodeId}`);
            }
            
            return true;
            
        } catch (error) {
            console.error('Navigation failed:', error);
            
            this.notifyListeners('error', { error, targetNodeId });
            
            if (this.eventBus) {
                this.eventBus.emit('navigation:error', { error, targetNodeId });
                this.eventBus.emit('ui:loading', false);
                this.eventBus.emit('ui:status', `❌ فشل الانتقال: ${error.message}`, 'error');
            }
            
            return false;
            
        } finally {
            setTimeout(() => {
                this.isTransitioning = false;
            }, 100);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ========== QUICK NAVIGATION ==========
    
    addQuickLink(fromNodeId, toNodeId) {
        if (!this.quickLinks.has(fromNodeId)) {
            this.quickLinks.set(fromNodeId, new Set());
        }
        this.quickLinks.get(fromNodeId).add(toNodeId);
    }
    
    removeQuickLink(fromNodeId, toNodeId) {
        if (this.quickLinks.has(fromNodeId)) {
            this.quickLinks.get(fromNodeId).delete(toNodeId);
        }
    }
    
    getQuickLinks(fromNodeId = null) {
        const nodeId = fromNodeId || this.currentNode?.id;
        if (!nodeId) return [];
        
        const links = this.quickLinks.get(nodeId);
        return links ? Array.from(links) : [];
    }
    
    // ========== NAVIGATION GRAPH ==========
    
    buildNavigationGraph() {
        if (!this.nodeSystem) return null;
        
        const nodes = this.nodeSystem.getAllNodes();
        const graph = new Map();
        
        for (const node of nodes) {
            const connections = [];
            
            if (node.links) {
                for (const link of node.links) {
                    connections.push({
                        targetId: link.targetId,
                        distance: link.distance,
                        direction: link.direction
                    });
                }
            }
            
            graph.set(node.id, {
                node: node,
                connections: connections
            });
        }
        
        return graph;
    }
    
    findShortestPath(fromNodeId, toNodeId) {
        if (!this.nodeSystem) return null;
        
        // BFS للعثور على أقصر مسار
        const queue = [{ nodeId: fromNodeId, path: [fromNodeId] }];
        const visited = new Set([fromNodeId]);
        
        while (queue.length > 0) {
            const { nodeId, path } = queue.shift();
            
            if (nodeId === toNodeId) {
                return path;
            }
            
            const node = this.nodeSystem.getNode(nodeId);
            if (node && node.links) {
                for (const link of node.links) {
                    if (!visited.has(link.targetId)) {
                        visited.add(link.targetId);
                        queue.push({
                            nodeId: link.targetId,
                            path: [...path, link.targetId]
                        });
                    }
                }
            }
        }
        
        return null; // No path found
    }
    
    // ========== SETTINGS ==========
    
    setSnapThreshold(degrees) {
        this.snapThreshold = Math.max(5, Math.min(90, degrees));
        this.notifyListeners('settingsChanged', { snapThreshold: this.snapThreshold });
    }
    
    setTransitionDuration(duration) {
        this.transitionDuration = Math.max(0.2, Math.min(2, duration));
        this.notifyListeners('settingsChanged', { transitionDuration: this.transitionDuration });
    }
    
    setUseFadeEffect(useFade) {
        this.useFadeEffect = useFade;
    }
    
    setAutoOrientCamera(autoOrient) {
        this.autoOrientCamera = autoOrient;
    }
    
    setNavigationEnabled(enabled) {
        this.navigationEnabled = enabled;
        this.notifyListeners(enabled ? 'enabled' : 'disabled');
    }
    
    // ========== UTILITY ==========
    
    getNavigationHistory() {
        return [...this.navigationHistory];
    }
    
    getNavigationStatus() {
        return {
            enabled: this.navigationEnabled,
            isTransitioning: this.isTransitioning,
            currentNode: this.currentNode,
            historySize: this.navigationHistory.length,
            canGoBack: this.canGoBack(),
            snapThreshold: this.snapThreshold,
            transitionDuration: this.transitionDuration
        };
    }
    
    reset() {
        this.navigationHistory = [];
        this.currentNode = null;
        this.isTransitioning = false;
        this.quickLinks.clear();
        
        this.notifyListeners('reset');
        console.log('🔄 NavigationHandler reset');
    }
    
    // ========== DEBUG ==========
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
        
        if (enabled) {
            console.log('🐛 NavigationHandler debug mode enabled');
            console.log('Current node:', this.currentNode);
            console.log('History:', this.navigationHistory);
        }
    }
    
    debugLog(...args) {
        if (this.debugMode) {
            console.log('[NavigationHandler]', ...args);
        }
    }
    
    // ========== EVENT LISTENERS ==========
    
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
                    console.error('NavigationHandler listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.reset();
        this.listeners.clear();
        this.quickLinks.clear();
        console.log('♻️ NavigationHandler disposed');
    }
}

export default NavigationHandler;