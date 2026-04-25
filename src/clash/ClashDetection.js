// ============================================
// CLASH DETECTION - نظام اكتشاف التصادم الأساسي
// يكتشف التداخلات بين العناصر المختلفة في المشروع
// ============================================

import * as THREE from 'three';

export class ClashDetection {
    constructor(globalSystem = null, sceneConnector = null) {
        this.globalSystem = globalSystem;
        this.sceneConnector = sceneConnector;
        
        // إعدادات الكشف
        this.tolerance = 0.01; // التسامح بالمتر (1cm)
        this.precision = 'high'; // low, medium, high
        this.checkIntersections = true;
        this.checkPenetrations = true;
        this.checkClearance = false;
        this.clearanceDistance = 0.05; // 5cm
        
        // مجموعات العناصر
        this.elementGroups = {
            architecture: [],
            structure: [],
            mep: [],
            furniture: [],
            landscape: []
        };
        
        // النتائج
        this.clashes = [];
        this.clashGroups = new Map();
        this.lastCheckTime = 0;
        
        // مرشحات
        this.filters = {
            minDistance: 0,
            maxDistance: Infinity,
            categories: ['all'],
            severity: ['all']
        };
        
        console.log('🔍 ClashDetection initialized');
    }
    
    // ========== MAIN DETECTION ==========
    
    detectClashes(elements = null, options = {}) {
        const startTime = performance.now();
        
        // تجميع العناصر
        const allElements = elements || this.collectAllElements();
        
        // تحديث الإعدادات
        this.tolerance = options.tolerance || this.tolerance;
        this.precision = options.precision || this.precision;
        
        // تصفية العناصر
        const filteredElements = this.applyFilters(allElements);
        
        // الكشف عن التصادمات
        this.clashes = [];
        
        // استخدام خوارزمية التجزئة المكانية للتسريع
        const spatialHash = this.buildSpatialHash(filteredElements);
        
        // فحص كل زوج من العناصر في نفس الخلايا
        const checkedPairs = new Set();
        
        for (const [cellKey, elementsInCell] of spatialHash) {
            for (let i = 0; i < elementsInCell.length; i++) {
                for (let j = i + 1; j < elementsInCell.length; j++) {
                    const elemA = elementsInCell[i];
                    const elemB = elementsInCell[j];
                    
                    const pairKey = `${elemA.id}|${elemB.id}`;
                    if (checkedPairs.has(pairKey)) continue;
                    checkedPairs.add(pairKey);
                    
                    const clash = this.checkClashBetween(elemA, elemB);
                    if (clash) {
                        this.clashes.push(clash);
                    }
                }
            }
        }
        
        // تجميع التصادمات حسب النوع
        this.groupClashes();
        
        this.lastCheckTime = performance.now() - startTime;
        
        console.log(`✅ Clash detection complete: ${this.clashes.length} clashes found in ${this.lastCheckTime.toFixed(2)}ms`);
        
        return {
            totalClashes: this.clashes.length,
            clashes: this.clashes,
            groups: this.clashGroups,
            duration: this.lastCheckTime
        };
    }
    
    buildSpatialHash(elements, cellSize = 5.0) {
        const hash = new Map();
        
        for (const element of elements) {
            const bounds = this.getElementBounds(element);
            if (!bounds) continue;
            
            const minX = Math.floor(bounds.min.x / cellSize);
            const maxX = Math.floor(bounds.max.x / cellSize);
            const minY = Math.floor(bounds.min.y / cellSize);
            const maxY = Math.floor(bounds.max.y / cellSize);
            const minZ = Math.floor(bounds.min.z / cellSize);
            const maxZ = Math.floor(bounds.max.z / cellSize);
            
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    for (let z = minZ; z <= maxZ; z++) {
                        const key = `${x},${y},${z}`;
                        if (!hash.has(key)) hash.set(key, []);
                        hash.get(key).push(element);
                    }
                }
            }
        }
        
        return hash;
    }
    
    collectAllElements() {
        const elements = [];
        
        // جمع من جميع المجموعات
        for (const group of Object.values(this.elementGroups)) {
            elements.push(...group);
        }
        
        // جمع من الأنظمة العالمية
        if (this.globalSystem) {
            const globalElements = this.globalSystem.getAllElements();
            elements.push(...globalElements);
        }
        
        return elements;
    }
    
    // ========== CLASH CHECKING ==========
    
    checkClashBetween(elementA, elementB) {
        // التحقق من الفئات المتعارضة
        if (!this.shouldCheckCategory(elementA.category, elementB.category)) {
            return null;
        }
        
        // الحصول على الموشورات المحيطة
        const boundsA = this.getElementBounds(elementA);
        const boundsB = this.getElementBounds(elementB);
        
        if (!boundsA || !boundsB) return null;
        
        // الفحص السريع باستخدام bounding boxes
        if (!this.intersectsFast(boundsA, boundsB)) {
            return null;
        }
        
        // الفحص الدقيق
        let clashData = null;
        
        if (this.checkIntersections) {
            clashData = this.checkIntersection(elementA, elementB, boundsA, boundsB);
        }
        
        if (!clashData && this.checkPenetrations) {
            clashData = this.checkPenetration(elementA, elementB, boundsA, boundsB);
        }
        
        if (!clashData && this.checkClearance) {
            clashData = this.checkClearanceDistance(elementA, elementB, boundsA, boundsB);
        }
        
        if (clashData) {
            return {
                id: `clash_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                elementA: {
                    id: elementA.id,
                    name: elementA.name || elementA.userData?.name,
                    category: elementA.category,
                    type: elementA.type
                },
                elementB: {
                    id: elementB.id,
                    name: elementB.name || elementB.userData?.name,
                    category: elementB.category,
                    type: elementB.type
                },
                ...clashData,
                timestamp: new Date().toISOString(),
                severity: this.calculateSeverity(clashData)
            };
        }
        
        return null;
    }
    
    intersectsFast(boundsA, boundsB) {
        return !(boundsA.max.x < boundsB.min.x - this.tolerance ||
                 boundsA.min.x > boundsB.max.x + this.tolerance ||
                 boundsA.max.y < boundsB.min.y - this.tolerance ||
                 boundsA.min.y > boundsB.max.y + this.tolerance ||
                 boundsA.max.z < boundsB.min.z - this.tolerance ||
                 boundsA.min.z > boundsB.max.z + this.tolerance);
    }
    
    checkIntersection(elementA, elementB, boundsA, boundsB) {
        // فحص دقيق باستخدام هندسة العناصر
        const intersection = this.computeIntersection(elementA, elementB);
        
        if (intersection && intersection.volume > this.tolerance) {
            return {
                type: 'intersection',
                volume: intersection.volume,
                point: intersection.center,
                depth: intersection.depth,
                details: intersection
            };
        }
        
        return null;
    }
    
    checkPenetration(elementA, elementB, boundsA, boundsB) {
        // فحص الاختراق (عنصر يخترق آخر)
        const penetration = this.computePenetration(elementA, elementB);
        
        if (penetration && penetration.depth > this.tolerance) {
            return {
                type: 'penetration',
                depth: penetration.depth,
                point: penetration.point,
                direction: penetration.direction,
                details: penetration
            };
        }
        
        return null;
    }
    
    checkClearanceDistance(elementA, elementB, boundsA, boundsB) {
        // فحص مسافة الخلوص
        const distance = this.computeMinDistance(elementA, elementB);
        
        if (distance < this.clearanceDistance && distance > 0) {
            return {
                type: 'clearance_violation',
                distance: distance,
                requiredDistance: this.clearanceDistance,
                point: this.getClosestPoints(elementA, elementB),
                details: { distance, required: this.clearanceDistance }
            };
        }
        
        return null;
    }
    
    // ========== GEOMETRY COMPUTATIONS ==========
    
    getElementBounds(element) {
        if (!element.geometry) return null;
        
        // استخدام bounding box الموجود أو حسابه
        if (!element.geometry.boundingBox) {
            element.geometry.computeBoundingBox();
        }
        
        const box = element.geometry.boundingBox.clone();
        
        // تطبيق تحويل العنصر
        box.min.applyMatrix4(element.matrixWorld);
        box.max.applyMatrix4(element.matrixWorld);
        
        return box;
    }
    
    computeIntersection(elementA, elementB) {
        // تبسيط: استخدام تقاطع الموشورات المحيطة
        const boundsA = this.getElementBounds(elementA);
        const boundsB = this.getElementBounds(elementB);
        
        if (!boundsA || !boundsB) return null;
        
        const intersection = {
            min: {
                x: Math.max(boundsA.min.x, boundsB.min.x),
                y: Math.max(boundsA.min.y, boundsB.min.y),
                z: Math.max(boundsA.min.z, boundsB.min.z)
            },
            max: {
                x: Math.min(boundsA.max.x, boundsB.max.x),
                y: Math.min(boundsA.max.y, boundsB.max.y),
                z: Math.min(boundsA.max.z, boundsB.max.z)
            }
        };
        
        if (intersection.min.x >= intersection.max.x ||
            intersection.min.y >= intersection.max.y ||
            intersection.min.z >= intersection.max.z) {
            return null;
        }
        
        const volume = (intersection.max.x - intersection.min.x) *
                       (intersection.max.y - intersection.min.y) *
                       (intersection.max.z - intersection.min.z);
        
        const center = {
            x: (intersection.min.x + intersection.max.x) / 2,
            y: (intersection.min.y + intersection.max.y) / 2,
            z: (intersection.min.z + intersection.max.z) / 2
        };
        
        const depth = Math.min(
            intersection.max.x - intersection.min.x,
            intersection.max.y - intersection.min.y,
            intersection.max.z - intersection.min.z
        );
        
        return { volume, center, depth, bounds: intersection };
    }
    
    computePenetration(elementA, elementB) {
        // فحص الاختراق باستخدام أشعة من مركز العنصر
        const centerA = this.getElementCenter(elementA);
        const centerB = this.getElementCenter(elementB);
        
        const direction = new THREE.Vector3(
            centerB.x - centerA.x,
            centerB.y - centerA.y,
            centerB.z - centerA.z
        ).normalize();
        
        const raycaster = new THREE.Raycaster();
        raycaster.set(centerA, direction);
        
        const intersectsA = raycaster.intersectObject(elementA);
        const intersectsB = raycaster.intersectObject(elementB);
        
        if (intersectsA.length > 0 && intersectsB.length > 0) {
            const depth = Math.abs(intersectsA[0].distance - intersectsB[0].distance);
            
            if (depth < 0) {
                return {
                    depth: Math.abs(depth),
                    point: intersectsA[0].point,
                    direction: direction
                };
            }
        }
        
        return null;
    }
    
    computeMinDistance(elementA, elementB) {
        // حساب أقصر مسافة بين عنصرين
        let minDistance = Infinity;
        
        const verticesA = this.getVertices(elementA);
        const verticesB = this.getVertices(elementB);
        
        for (const vA of verticesA) {
            for (const vB of verticesB) {
                const distance = vA.distanceTo(vB);
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
        }
        
        return minDistance;
    }
    
    getClosestPoints(elementA, elementB) {
        let minDistance = Infinity;
        let closestPair = { pointA: null, pointB: null };
        
        const verticesA = this.getVertices(elementA);
        const verticesB = this.getVertices(elementB);
        
        for (const vA of verticesA) {
            for (const vB of verticesB) {
                const distance = vA.distanceTo(vB);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPair = { pointA: vA, pointB: vB };
                }
            }
        }
        
        return closestPair;
    }
    
    getElementCenter(element) {
        const bounds = this.getElementBounds(element);
        if (!bounds) return new THREE.Vector3(0, 0, 0);
        
        return new THREE.Vector3(
            (bounds.min.x + bounds.max.x) / 2,
            (bounds.min.y + bounds.max.y) / 2,
            (bounds.min.z + bounds.max.z) / 2
        );
    }
    
    getVertices(element) {
        const vertices = [];
        
        if (element.geometry && element.geometry.attributes.position) {
            const positionAttribute = element.geometry.attributes.position;
            const matrix = element.matrixWorld;
            
            for (let i = 0; i < positionAttribute.count; i++) {
                const vertex = new THREE.Vector3(
                    positionAttribute.getX(i),
                    positionAttribute.getY(i),
                    positionAttribute.getZ(i)
                );
                vertex.applyMatrix4(matrix);
                vertices.push(vertex);
            }
        }
        
        return vertices;
    }
    
    // ========== SEVERITY CALCULATION ==========
    
    calculateSeverity(clashData) {
        let severity = 'low';
        let score = 0;
        
        switch(clashData.type) {
            case 'intersection':
                score = clashData.volume * 100;
                break;
            case 'penetration':
                score = clashData.depth * 100;
                break;
            case 'clearance_violation':
                score = (this.clearanceDistance - clashData.distance) * 100;
                break;
        }
        
        if (score > 10) severity = 'high';
        else if (score > 2) severity = 'medium';
        else severity = 'low';
        
        return { level: severity, score: score };
    }
    
    // ========== FILTERING ==========
    
    shouldCheckCategory(catA, catB) {
        if (this.filters.categories.includes('all')) return true;
        
        const importantPairs = [
            ['structure', 'mep'],
            ['structure', 'architecture'],
            ['mep', 'architecture'],
            ['mep', 'structure']
        ];
        
        return importantPairs.some(pair => 
            (catA === pair[0] && catB === pair[1]) ||
            (catA === pair[1] && catB === pair[0])
        );
    }
    
    applyFilters(elements) {
        return elements.filter(el => {
            if (this.filters.minDistance > 0 || this.filters.maxDistance < Infinity) {
                const distance = this.getElementCenter(el).length();
                if (distance < this.filters.minDistance) return false;
                if (distance > this.filters.maxDistance) return false;
            }
            
            if (!this.filters.categories.includes('all')) {
                if (!this.filters.categories.includes(el.category)) return false;
            }
            
            return true;
        });
    }
    
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
    }
    
    // ========== GROUPING ==========
    
    groupClashes() {
        this.clashGroups.clear();
        
        for (const clash of this.clashes) {
            const key = `${clash.elementA.category}_${clash.elementB.category}`;
            
            if (!this.clashGroups.has(key)) {
                this.clashGroups.set(key, []);
            }
            this.clashGroups.get(key).push(clash);
        }
    }
    
    getClashesBySeverity(severity) {
        return this.clashes.filter(c => c.severity.level === severity);
    }
    
    getClashesByCategory(categoryA, categoryB) {
        return this.clashes.filter(c => 
            (c.elementA.category === categoryA && c.elementB.category === categoryB) ||
            (c.elementA.category === categoryB && c.elementB.category === categoryA)
        );
    }
    
    getClashesByElement(elementId) {
        return this.clashes.filter(c => 
            c.elementA.id === elementId || c.elementB.id === elementId
        );
    }
    
    // ========== ELEMENT REGISTRATION ==========
    
    registerElement(element, category, group = 'mep') {
        element.category = category;
        element.id = element.id || `elem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        if (this.elementGroups[group]) {
            this.elementGroups[group].push(element);
        } else {
            this.elementGroups[group] = [element];
        }
    }
    
    registerElements(elements, category, group) {
        for (const element of elements) {
            this.registerElement(element, category, group);
        }
    }
    
    clearElements() {
        for (const group of Object.values(this.elementGroups)) {
            group.length = 0;
        }
        this.clashes = [];
        this.clashGroups.clear();
    }
    
    // ========== EXPORT/IMPORT ==========
    
    exportClashReport() {
        return {
            timestamp: new Date().toISOString(),
            settings: {
                tolerance: this.tolerance,
                precision: this.precision,
                checkIntersections: this.checkIntersections,
                checkPenetrations: this.checkPenetrations,
                checkClearance: this.checkClearance,
                clearanceDistance: this.clearanceDistance
            },
            summary: {
                totalClashes: this.clashes.length,
                bySeverity: {
                    high: this.getClashesBySeverity('high').length,
                    medium: this.getClashesBySeverity('medium').length,
                    low: this.getClashesBySeverity('low').length
                },
                byType: this.getClashesByTypeSummary(),
                duration: this.lastCheckTime
            },
            clashes: this.clashes,
            groups: Array.from(this.clashGroups.entries()).map(([key, value]) => ({
                category: key,
                count: value.length,
                clashes: value
            }))
        };
    }
    
    getClashesByTypeSummary() {
        const summary = { intersection: 0, penetration: 0, clearance_violation: 0 };
        for (const clash of this.clashes) {
            summary[clash.type]++;
        }
        return summary;
    }
    
    importClashReport(report) {
        this.clashes = report.clashes;
        this.groupClashes();
        return this;
    }
}

export default ClashDetection;