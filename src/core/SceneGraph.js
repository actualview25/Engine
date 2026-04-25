// ============================================
// SCENE GRAPH - إدارة هيكل المشهد
// يدعم: التسلسل الهرمي، الإحداثيات العالمية/المحلية، البحث
// ============================================

import * as THREE from 'three';

export class SceneGraph {
    constructor() {
        // هيكل المشهد
        this.root = new THREE.Group();
        this.root.name = 'SceneGraph_Root';
        
        // تسجيل العقد
        this.nodes = new Map(); // id -> node
        this.nodeCounter = 0;
        
        // الفئات (layers)
        this.categories = new Map(); // category -> Set of node ids
        
        // العلاقات
        this.parents = new Map(); // childId -> parentId
        this.children = new Map(); // parentId -> Set of childIds
        
        // بيانات إضافية
        this.metadata = new Map(); // nodeId -> metadata
        this.transformCache = new Map(); // nodeId -> worldMatrix
        
        // مرشحات البحث
        this.searchIndex = new Map(); // keyword -> Set of node ids
        
        console.log('📊 SceneGraph initialized');
    }
    
    // ========== NODE MANAGEMENT ==========
    
    createNode(name = 'Node', options = {}) {
        const id = `node_${++this.nodeCounter}_${Date.now()}`;
        
        const node = new THREE.Group();
        node.name = name;
        node.userData = {
            id: id,
            type: options.type || 'group',
            category: options.category || 'default',
            createdAt: new Date().toISOString()
        };
        
        // إضافة إلى السجلات
        this.nodes.set(id, node);
        this.parents.set(id, null);
        this.children.set(id, new Set());
        
        // الفئة
        const category = options.category || 'default';
        if (!this.categories.has(category)) {
            this.categories.set(category, new Set());
        }
        this.categories.get(category).add(id);
        
        // الفهرس للبحث
        this.indexNode(id, name, options.tags || []);
        
        // إضافة إلى الجذر إذا لم يتم تحديد والد
        if (!options.parentId) {
            this.root.add(node);
        } else {
            this.setParent(id, options.parentId);
        }
        
        // بيانات إضافية
        if (options.metadata) {
            this.metadata.set(id, options.metadata);
        }
        
        return { id, node };
    }
    
    createMesh(name, geometry, material, options = {}) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name;
        mesh.userData = {
            id: `mesh_${++this.nodeCounter}_${Date.now()}`,
            type: 'mesh',
            category: options.category || 'geometry',
            createdAt: new Date().toISOString()
        };
        
        const id = mesh.userData.id;
        this.nodes.set(id, mesh);
        this.parents.set(id, null);
        this.children.set(id, new Set());
        
        const category = options.category || 'geometry';
        if (!this.categories.has(category)) {
            this.categories.set(category, new Set());
        }
        this.categories.get(category).add(id);
        
        this.indexNode(id, name, options.tags || []);
        
        if (options.metadata) {
            this.metadata.set(id, options.metadata);
        }
        
        // إضافة إلى الجذر أو والد محدد
        if (options.parentId) {
            this.setParent(id, options.parentId);
        } else {
            this.root.add(mesh);
        }
        
        return { id, node: mesh };
    }
    
    createLine(name, points, color = 0xffffff, options = {}) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (const point of points) {
            vertices.push(point.x, point.y, point.z);
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        
        const material = new THREE.LineBasicMaterial({ color: color });
        const line = new THREE.Line(geometry, material);
        line.name = name;
        line.userData = {
            id: `line_${++this.nodeCounter}_${Date.now()}`,
            type: 'line',
            category: options.category || 'annotation',
            createdAt: new Date().toISOString()
        };
        
        const id = line.userData.id;
        this.nodes.set(id, line);
        this.parents.set(id, null);
        this.children.set(id, new Set());
        
        const category = options.category || 'annotation';
        if (!this.categories.has(category)) {
            this.categories.set(category, new Set());
        }
        this.categories.get(category).add(id);
        
        this.indexNode(id, name, options.tags || []);
        
        if (options.parentId) {
            this.setParent(id, options.parentId);
        } else {
            this.root.add(line);
        }
        
        return { id, node: line };
    }
    
    // ========== PARENT-CHILD RELATIONS ==========
    
    setParent(nodeId, parentId) {
        const node = this.nodes.get(nodeId);
        const parent = this.nodes.get(parentId);
        
        if (!node || !parent) {
            console.error(`Node or parent not found: ${nodeId}, ${parentId}`);
            return false;
        }
        
        // إزالة من الوالد القديم
        const oldParentId = this.parents.get(nodeId);
        if (oldParentId) {
            const oldChildren = this.children.get(oldParentId);
            if (oldChildren) {
                oldChildren.delete(nodeId);
            }
        }
        
        // إضافة إلى الوالد الجديد
        this.parents.set(nodeId, parentId);
        this.children.get(parentId).add(nodeId);
        
        // تحديث التحويلات
        this.invalidateTransformCache(nodeId);
        
        // إضافة إلى المشهد
        if (node.parent !== parent) {
            parent.add(node);
        }
        
        return true;
    }
    
    getParent(nodeId) {
        const parentId = this.parents.get(nodeId);
        return parentId ? this.nodes.get(parentId) : null;
    }
    
    getChildren(nodeId) {
        const childIds = this.children.get(nodeId);
        if (!childIds) return [];
        
        const children = [];
        for (const childId of childIds) {
            const child = this.nodes.get(childId);
            if (child) children.push(child);
        }
        return children;
    }
    
    getAllDescendants(nodeId) {
        const descendants = [];
        const children = this.getChildren(nodeId);
        
        for (const child of children) {
            descendants.push(child);
            descendants.push(...this.getAllDescendants(child.userData.id));
        }
        
        return descendants;
    }
    
    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return false;
        
        // إزالة من المشهد
        if (node.parent) {
            node.parent.remove(node);
        }
        
        // إزالة الأطفال
        const children = this.getChildren(nodeId);
        for (const child of children) {
            this.removeNode(child.userData.id);
        }
        
        // إزالة من الفئات
        const category = node.userData?.category;
        if (category && this.categories.has(category)) {
            this.categories.get(category).delete(nodeId);
        }
        
        // إزالة من العلاقات
        this.parents.delete(nodeId);
        this.children.delete(nodeId);
        
        // إزالة من الفهرس
        this.removeFromIndex(nodeId);
        
        // حذف العقدة
        this.nodes.delete(nodeId);
        
        return true;
    }
    
    // ========== TRANSFORMATIONS ==========
    
    getWorldPosition(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        
        const worldPos = new THREE.Vector3();
        node.getWorldPosition(worldPos);
        return worldPos;
    }
    
    getWorldRotation(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        
        const worldQuat = new THREE.Quaternion();
        node.getWorldQuaternion(worldQuat);
        return worldQuat;
    }
    
    getWorldScale(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        
        const worldScale = new THREE.Vector3();
        node.getWorldScale(worldScale);
        return worldScale;
    }
    
    getWorldMatrix(nodeId) {
        if (this.transformCache.has(nodeId)) {
            return this.transformCache.get(nodeId);
        }
        
        const node = this.nodes.get(nodeId);
        if (!node) return null;
        
        const matrix = node.matrixWorld.clone();
        this.transformCache.set(nodeId, matrix);
        return matrix;
    }
    
    invalidateTransformCache(nodeId) {
        this.transformCache.delete(nodeId);
        
        // إبطال ذاكرة التخزين للأطفال
        const children = this.getChildren(nodeId);
        for (const child of children) {
            this.invalidateTransformCache(child.userData.id);
        }
    }
    
    // ========== SEARCH & QUERY ==========
    
    findById(id) {
        return this.nodes.get(id);
    }
    
    findByName(name) {
        const results = [];
        for (const [id, node] of this.nodes) {
            if (node.name === name) {
                results.push({ id, node });
            }
        }
        return results;
    }
    
    findByCategory(category) {
        const ids = this.categories.get(category);
        if (!ids) return [];
        
        const results = [];
        for (const id of ids) {
            const node = this.nodes.get(id);
            if (node) results.push({ id, node });
        }
        return results;
    }
    
    search(keyword) {
        const ids = this.searchIndex.get(keyword.toLowerCase());
        if (!ids) return [];
        
        const results = [];
        for (const id of ids) {
            const node = this.nodes.get(id);
            if (node) results.push({ id, node });
        }
        return results;
    }
    
    query(conditions) {
        let results = Array.from(this.nodes.entries()).map(([id, node]) => ({ id, node }));
        
        // فلترة حسب النوع
        if (conditions.type) {
            results = results.filter(({ node }) => node.userData?.type === conditions.type);
        }
        
        // فلترة حسب الفئة
        if (conditions.category) {
            results = results.filter(({ node }) => node.userData?.category === conditions.category);
        }
        
        // فلترة حسب الاسم (regex)
        if (conditions.namePattern) {
            const regex = new RegExp(conditions.namePattern, 'i');
            results = results.filter(({ node }) => regex.test(node.name));
        }
        
        // فلترة حسب الإحداثيات (في نصف قطر)
        if (conditions.nearPoint && conditions.radius) {
            results = results.filter(({ node }) => {
                const pos = this.getWorldPosition(node.userData.id);
                if (!pos) return false;
                const distance = pos.distanceTo(conditions.nearPoint);
                return distance <= conditions.radius;
            });
        }
        
        return results;
    }
    
    // ========== INDEXING ==========
    
    indexNode(id, name, tags = []) {
        const keywords = [
            name.toLowerCase(),
            ...tags.map(t => t.toLowerCase()),
            ...(name.split(/[\s_-]+/).map(w => w.toLowerCase()))
        ];
        
        for (const keyword of keywords) {
            if (!this.searchIndex.has(keyword)) {
                this.searchIndex.set(keyword, new Set());
            }
            this.searchIndex.get(keyword).add(id);
        }
    }
    
    removeFromIndex(id) {
        for (const [keyword, ids] of this.searchIndex) {
            if (ids.has(id)) {
                ids.delete(id);
                if (ids.size === 0) {
                    this.searchIndex.delete(keyword);
                }
            }
        }
    }
    
    // ========== SERIALIZATION ==========
    
    serialize() {
        const data = {
            version: '1.0',
            nodes: [],
            relations: [],
            metadata: {}
        };
        
        for (const [id, node] of this.nodes) {
            data.nodes.push({
                id: id,
                name: node.name,
                type: node.userData?.type,
                category: node.userData?.category,
                position: node.position.toArray(),
                rotation: node.rotation.toArray(),
                scale: node.scale.toArray(),
                metadata: this.metadata.get(id)
            });
        }
        
        for (const [childId, parentId] of this.parents) {
            if (parentId) {
                data.relations.push({ childId, parentId });
            }
        }
        
        return data;
    }
    
    deserialize(data, scene = null) {
        // مسح البيانات الحالية
        this.clear();
        
        // إعادة بناء العقد
        for (const nodeData of data.nodes) {
            const node = new THREE.Group();
            node.name = nodeData.name;
            node.userData = {
                id: nodeData.id,
                type: nodeData.type,
                category: nodeData.category
            };
            node.position.fromArray(nodeData.position);
            node.rotation.fromArray(nodeData.rotation);
            node.scale.fromArray(nodeData.scale);
            
            this.nodes.set(nodeData.id, node);
            this.parents.set(nodeData.id, null);
            this.children.set(nodeData.id, new Set());
            
            if (nodeData.metadata) {
                this.metadata.set(nodeData.id, nodeData.metadata);
            }
            
            // إضافة إلى المشهد
            if (scene) {
                scene.add(node);
            } else {
                this.root.add(node);
            }
        }
        
        // إعادة بناء العلاقات
        for (const rel of data.relations) {
            this.setParent(rel.childId, rel.parentId);
        }
        
        console.log(`📂 SceneGraph deserialized: ${data.nodes.length} nodes`);
    }
    
    // ========== EXPORT/IMPORT ==========
    
    exportToJSON() {
        return JSON.stringify(this.serialize(), null, 2);
    }
    
    importFromJSON(jsonString, scene = null) {
        const data = JSON.parse(jsonString);
        this.deserialize(data, scene);
        return this;
    }
    
    // ========== STATISTICS ==========
    
    getStatistics() {
        const stats = {
            totalNodes: this.nodes.size,
            byType: {},
            byCategory: {},
            maxDepth: 0,
            rootChildren: this.children.get(this.root.userData?.id)?.size || this.root.children.length
        };
        
        for (const [id, node] of this.nodes) {
            const type = node.userData?.type || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            
            const category = node.userData?.category || 'unknown';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        }
        
        // حساب أقصى عمق
        for (const [id, node] of this.nodes) {
            let depth = 0;
            let currentId = id;
            while (this.parents.get(currentId)) {
                depth++;
                currentId = this.parents.get(currentId);
            }
            stats.maxDepth = Math.max(stats.maxDepth, depth);
        }
        
        return stats;
    }
    
    // ========== CLEANUP ==========
    
    clear() {
        // إزالة جميع العقد من المشهد
        for (const [id, node] of this.nodes) {
            if (node.parent) {
                node.parent.remove(node);
            }
        }
        
        this.nodes.clear();
        this.parents.clear();
        this.children.clear();
        this.categories.clear();
        this.metadata.clear();
        this.transformCache.clear();
        this.searchIndex.clear();
        
        this.nodeCounter = 0;
        
        console.log('🗑️ SceneGraph cleared');
    }
    
    dispose() {
        this.clear();
        
        if (this.root.parent) {
            this.root.parent.remove(this.root);
        }
        
        console.log('♻️ SceneGraph disposed');
    }
}

export default SceneGraph;