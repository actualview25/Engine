// ============================================
// ADVANCED CLASH DETECTION - نظام متقدم لاكتشاف التصادم
// يدعم: اكتشاف دقيق، فحص وقت حقيقي، تقارير متقدمة
// ============================================

import * as THREE from 'three';
import ClashDetection from './ClashDetection.js';

export class AdvancedClashDetection extends ClashDetection {
    constructor(globalSystem = null, sceneConnector = null) {
        super(globalSystem, sceneConnector);
        
        // إعدادات متقدمة
        this.realTimeMode = false;
        this.realTimeInterval = null;
        this.realTimeCallback = null;
        
        // خوارزميات متقدمة
        this.useBVH = true; // Bounding Volume Hierarchy
        this.useGPU = false; // استخدام GPU للتسريع
        this.parallelProcessing = true;
        
        // تحليل إضافي
        this.analyzeImpact = true;
        this.analyzeCost = true;
        this.analyzePriority = true;
        
        // ذاكرة التخزين المؤقت
        this.bvhCache = new Map();
        this.collisionCache = new Map();
        
        // إعدادات الدقة
        this.accuracyLevel = 'high'; // low, medium, high, ultra
        this.subSampling = 1;
        
        console.log('🚀 AdvancedClashDetection initialized');
    }
    
    // ========== ADVANCED DETECTION ==========
    
    detectClashesAdvanced(elements = null, options = {}) {
        const startTime = performance.now();
        
        // تحديث إعدادات الدقة
        this.setAccuracy(options.accuracy || this.accuracyLevel);
        
        // جمع العناصر
        const allElements = elements || this.collectAllElements();
        
        // بناء BVH (Bounding Volume Hierarchy)
        let bvhTree = null;
        if (this.useBVH) {
            bvhTree = this.buildBVH(allElements);
        }
        
        // الكشف عن التصادمات باستخدام BVH
        this.clashes = [];
        const checkedPairs = new Set();
        
        if (bvhTree) {
            this.detectClashesBVH(bvhTree, checkedPairs);
        } else {
            // استخدام الخوارزمية الأساسية
            const spatialHash = this.buildSpatialHash(allElements);
            for (const [_, elementsInCell] of spatialHash) {
                this.checkPairsInList(elementsInCell, checkedPairs);
            }
        }
        
        // تحليل إضافي
        if (this.analyzeImpact || this.analyzeCost || this.analyzePriority) {
            this.analyzeClashes();
        }
        
        // تجميع النتائج
        this.groupClashes();
        
        const duration = performance.now() - startTime;
        
        console.log(`✅ Advanced clash detection: ${this.clashes.length} clashes in ${duration.toFixed(2)}ms`);
        
        return {
            totalClashes: this.clashes.length,
            clashes: this.clashes,
            groups: this.clashGroups,
            duration: duration,
            bvhNodes: bvhTree ? this.countBVHNodes(bvhTree) : 0,
            accuracy: this.accuracyLevel
        };
    }
    
    // ========== BVH (Bounding Volume Hierarchy) ==========
    
    buildBVH(elements, depth = 0) {
        if (elements.length === 0) return null;
        if (elements.length === 1) {
            return {
                element: elements[0],
                bounds: this.getElementBounds(elements[0]),
                left: null,
                right: null,
                depth: depth
            };
        }
        
        // حساب الموشور المحيط للمجموعة
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const el of elements) {
            const bounds = this.getElementBounds(el);
            if (!bounds) continue;
            
            minX = Math.min(minX, bounds.min.x);
            minY = Math.min(minY, bounds.min.y);
            minZ = Math.min(minZ, bounds.min.z);
            maxX = Math.max(maxX, bounds.max.x);
            maxY = Math.max(maxY, bounds.max.y);
            maxZ = Math.max(maxZ, bounds.max.z);
        }
        
        const bounds = {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        };
        
        // اختيار المحور الأطول للتقسيم
        const width = maxX - minX;
        const height = maxY - minY;
        const depthBox = maxZ - minZ;
        
        let axis = 'x';
        let maxDim = width;
        if (height > maxDim) { maxDim = height; axis = 'y'; }
        if (depthBox > maxDim) { maxDim = depthBox; axis = 'z'; }
        
        // فرز العناصر وتقسيمها
        const sorted = [...elements].sort((a, b) => {
            const centerA = this.getElementCenter(a);
            const centerB = this.getElementCenter(b);
            return centerA[axis] - centerB[axis];
        });
        
        const mid = Math.floor(sorted.length / 2);
        const leftElements = sorted.slice(0, mid);
        const rightElements = sorted.slice(mid);
        
        return {
            element: null,
            bounds: bounds,
            left: this.buildBVH(leftElements, depth + 1),
            right: this.buildBVH(rightElements, depth + 1),
            depth: depth,
            axis: axis
        };
    }
    
    detectClashesBVH(nodeA, nodeB = null, checkedPairs = new Set()) {
        if (!nodeA) return;
        
        if (!nodeB) {
            // فحص التداخل داخل العقدة نفسها
            if (nodeA.left && nodeA.right) {
                this.detectClashesBVH(nodeA.left, nodeA.right, checkedPairs);
                this.detectClashesBVH(nodeA.left, checkedPairs);
                this.detectClashesBVH(nodeA.right, checkedPairs);
            }
            return;
        }
        
        // فحص تداخل الموشورات
        if (!this.intersectsFast(nodeA.bounds, nodeB.bounds)) return;
        
        // إذا كانت العقدتان تحتويان على عناصر مباشرة
        if (nodeA.element && nodeB.element) {
            const pairKey = `${nodeA.element.id}|${nodeB.element.id}`;
            if (!checkedPairs.has(pairKey)) {
                checkedPairs.add(pairKey);
                
                const clash = this.checkClashBetween(nodeA.element, nodeB.element);
                if (clash) {
                    this.clashes.push(clash);
                }
            }
            return;
        }
        
        // فحص العقد الفرعية
        if (nodeA.element && nodeB.left) {
            this.detectClashesBVH(nodeA, nodeB.left, checkedPairs);
            this.detectClashesBVH(nodeA, nodeB.right, checkedPairs);
        } else if (nodeB.element && nodeA.left) {
            this.detectClashesBVH(nodeA.left, nodeB, checkedPairs);
            this.detectClashesBVH(nodeA.right, nodeB, checkedPairs);
        } else {
            if (nodeA.left && nodeB.left) this.detectClashesBVH(nodeA.left, nodeB.left, checkedPairs);
            if (nodeA.left && nodeB.right) this.detectClashesBVH(nodeA.left, nodeB.right, checkedPairs);
            if (nodeA.right && nodeB.left) this.detectClashesBVH(nodeA.right, nodeB.left, checkedPairs);
            if (nodeA.right && nodeB.right) this.detectClashesBVH(nodeA.right, nodeB.right, checkedPairs);
        }
    }
    
    countBVHNodes(node) {
        if (!node) return 0;
        return 1 + this.countBVHNodes(node.left) + this.countBVHNodes(node.right);
    }
    
    // ========== ACCURACY SETTINGS ==========
    
    setAccuracy(level) {
        this.accuracyLevel = level;
        
        switch(level) {
            case 'ultra':
                this.tolerance = 0.001; // 1mm
                this.subSampling = 1;
                this.precision = 'ultra';
                this.checkPenetrations = true;
                break;
            case 'high':
                this.tolerance = 0.005; // 5mm
                this.subSampling = 1;
                this.precision = 'high';
                this.checkPenetrations = true;
                break;
            case 'medium':
                this.tolerance = 0.01; // 1cm
                this.subSampling = 2;
                this.precision = 'medium';
                this.checkPenetrations = true;
                break;
            case 'low':
                this.tolerance = 0.025; // 2.5cm
                this.subSampling = 4;
                this.precision = 'low';
                this.checkPenetrations = false;
                break;
        }
    }
    
    // ========== REAL-TIME DETECTION ==========
    
    startRealTimeDetection(interval = 500, callback = null) {
        if (this.realTimeInterval) {
            this.stopRealTimeDetection();
        }
        
        this.realTimeMode = true;
        this.realTimeCallback = callback;
        
        this.realTimeInterval = setInterval(() => {
            if (!this.realTimeMode) return;
            
            const result = this.detectClashesAdvanced();
            
            if (this.realTimeCallback) {
                this.realTimeCallback(result);
            }
            
            this.emitRealTimeUpdate(result);
        }, interval);
        
        console.log(`🔄 Real-time clash detection started (interval: ${interval}ms)`);
    }
    
    stopRealTimeDetection() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
        }
        
        this.realTimeMode = false;
        console.log('⏹️ Real-time clash detection stopped');
    }
    
    emitRealTimeUpdate(result) {
        // إرسال حدث عبر EventBus إذا كان موجوداً
        if (this.eventBus) {
            this.eventBus.emit('clash:realtime', result);
        }
    }
    
    // ========== ADVANCED ANALYSIS ==========
    
    analyzeClashes() {
        for (const clash of this.clashes) {
            if (this.analyzeImpact) {
                clash.impact = this.calculateImpact(clash);
            }
            
            if (this.analyzeCost) {
                clash.costEstimate = this.estimateResolutionCost(clash);
            }
            
            if (this.analyzePriority) {
                clash.priority = this.calculatePriority(clash);
            }
        }
        
        // ترتيب حسب الأولوية
        this.clashes.sort((a, b) => (b.priority?.score || 0) - (a.priority?.score || 0));
    }
    
    calculateImpact(clash) {
        const impactFactors = {
            safety: 0,      // تأثير على السلامة
            structural: 0,  // تأثير على الهيكل
            functional: 0,  // تأثير على الوظيفة
            cost: 0         // تأثير على التكلفة
        };
        
        // تقييم حسب نوع التصادم
        if (clash.type === 'intersection') {
            impactFactors.structural = Math.min(10, clash.volume * 100);
            impactFactors.cost = impactFactors.structural * 2;
        } else if (clash.type === 'penetration') {
            impactFactors.safety = Math.min(10, clash.depth * 50);
            impactFactors.structural = Math.min(10, clash.depth * 30);
        } else if (clash.type === 'clearance_violation') {
            impactFactors.functional = Math.min(10, (this.clearanceDistance - clash.distance) * 50);
        }
        
        // تحديد فئات العناصر
        const categories = [clash.elementA.category, clash.elementB.category];
        if (categories.includes('mep') && categories.includes('structure')) {
            impactFactors.cost += 5;
        }
        if (categories.includes('mep') && categories.includes('mep')) {
            impactFactors.functional += 3;
        }
        
        const totalScore = Object.values(impactFactors).reduce((a, b) => a + b, 0);
        
        return {
            factors: impactFactors,
            totalScore: totalScore,
            level: totalScore > 15 ? 'critical' : totalScore > 8 ? 'major' : 'minor'
        };
    }
    
    estimateResolutionCost(clash) {
        let baseCost = 0;
        
        switch(clash.type) {
            case 'intersection':
                baseCost = clash.volume * 1000;
                break;
            case 'penetration':
                baseCost = clash.depth * 500;
                break;
            case 'clearance_violation':
                baseCost = (this.clearanceDistance - clash.distance) * 300;
                break;
        }
        
        // ضرب حسب الفئة
        const categories = [clash.elementA.category, clash.elementB.category];
        let multiplier = 1;
        
        if (categories.includes('structure')) multiplier *= 1.5;
        if (categories.includes('mep')) multiplier *= 1.2;
        if (categories.includes('architecture')) multiplier *= 0.8;
        
        return {
            currency: 'USD',
            estimated: Math.round(baseCost * multiplier),
            multiplier: multiplier,
            breakdown: {
                labor: Math.round(baseCost * multiplier * 0.6),
                material: Math.round(baseCost * multiplier * 0.3),
                overhead: Math.round(baseCost * multiplier * 0.1)
            }
        };
    }
    
    calculatePriority(clash) {
        let score = 0;
        
        // وزن حسب النوع
        const typeWeights = {
            'intersection': 10,
            'penetration': 8,
            'clearance_violation': 5
        };
        score += typeWeights[clash.type] || 0;
        
        // وزن حسب الشدة
        const severityWeights = { high: 10, medium: 5, low: 2 };
        score += severityWeights[clash.severity.level] || 0;
        
        // وزن حسب التأثير
        if (clash.impact) {
            score += clash.impact.totalScore;
        }
        
        return {
            score: score,
            level: score > 20 ? 'critical' : score > 10 ? 'high' : score > 5 ? 'medium' : 'low'
        };
    }
    
    // ========== SMART FILTERING ==========
    
    filterCriticalClashes() {
        return this.clashes.filter(c => 
            c.priority?.level === 'critical' || c.impact?.level === 'critical'
        );
    }
    
    filterClashesByZone(zoneBounds) {
        return this.clashes.filter(clash => {
            return this.intersectsFast(clash.intersection?.bounds || clash.details?.bounds, zoneBounds);
        });
    }
    
    filterClashesByTrade(trade) {
        return this.clashes.filter(clash =>
            clash.elementA.category === trade || clash.elementB.category === trade
        );
    }
    
    // ========== EXPORT ADVANCED ==========
    
    exportAdvancedReport() {
        const baseReport = this.exportClashReport();
        
        return {
            ...baseReport,
            advanced: {
                accuracy: this.accuracyLevel,
                realTimeMode: this.realTimeMode,
                useBVH: this.useBVH,
                analysis: {
                    impactAnalyzed: this.analyzeImpact,
                    costAnalyzed: this.analyzeCost,
                    priorityAnalyzed: this.analyzePriority
                },
                summary: {
                    ...baseReport.summary,
                    criticalClashes: this.filterCriticalClashes().length,
                    estimatedResolutionCost: this.calculateTotalResolutionCost(),
                    averageImpactScore: this.calculateAverageImpactScore()
                },
                recommendations: this.generateRecommendations()
            }
        };
    }
    
    calculateTotalResolutionCost() {
        let total = 0;
        for (const clash of this.clashes) {
            if (clash.costEstimate) {
                total += clash.costEstimate.estimated;
            }
        }
        return total;
    }
    
    calculateAverageImpactScore() {
        let total = 0;
        let count = 0;
        for (const clash of this.clashes) {
            if (clash.impact) {
                total += clash.impact.totalScore;
                count++;
            }
        }
        return count > 0 ? total / count : 0;
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        // توصيات حسب أنواع التصادم
        const types = new Set(this.clashes.map(c => c.type));
        
        if (types.has('intersection')) {
            recommendations.push({
                type: 'intersection',
                message: 'توجد تقاطعات بين العناصر - يوصى بإعادة تنسيق المسافات',
                priority: 'high'
            });
        }
        
        if (types.has('penetration')) {
            recommendations.push({
                type: 'penetration',
                message: 'اكتشاف اختراقات - يوصى بمراجعة مسارات الخدمات',
                priority: 'critical'
            });
        }
        
        // توصيات حسب الفئات
        const mepStructureCount = this.getClashesByCategory('mep', 'structure').length;
        if (mepStructureCount > 5) {
            recommendations.push({
                type: 'coordination',
                message: `يوجد ${mepStructureCount} تصادم بين MEP والهيكل - يوصى بمراجعة التنسيق`,
                priority: 'high'
            });
        }
        
        return recommendations;
    }
    
    // ========== UTILITY ==========
    
    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }
    
    checkPairsInList(elements, checkedPairs) {
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const pairKey = `${elements[i].id}|${elements[j].id}`;
                if (!checkedPairs.has(pairKey)) {
                    checkedPairs.add(pairKey);
                    const clash = this.checkClashBetween(elements[i], elements[j]);
                    if (clash) this.clashes.push(clash);
                }
            }
        }
    }
}

export default AdvancedClashDetection;