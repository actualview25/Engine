// ============================================
// NODE SYSTEM - قلب المحرك
// نظام النقاط الذي يربط المشاهد والانتقالات
// ============================================

export class NodeSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.nodes = new Map(); // id -> Node
        this.currentNodeId = null;
        this.geoReferencing = null;
        
        // استماع للأحداث
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('node:navigate', (nodeId) => {
            this.navigateToNode(nodeId);
        });
        
        this.eventBus.on('node:create', (nodeData) => {
            this.createNode(nodeData);
        });
        
        this.eventBus.on('node:link', ({ fromId, toId, direction }) => {
            this.addLink(fromId, toId, direction);
        });
    }
    
    setGeoReferencing(geoRef) {
        this.geoReferencing = geoRef;
    }
    
    createNode(data) {
        const node = {
            id: data.id || this.generateId(),
            panorama: data.panorama,
            position: data.position || { x: 0, y: 0, z: 0 },
            rotation: data.rotation || { x: 0, y: 0, z: 0 },
            links: data.links || [],
            metadata: data.metadata || {},
            createdAt: new Date().toISOString()
        };
        
        this.nodes.set(node.id, node);
        
        this.eventBus.emit('node:created', node);
        
        return node.id;
    }
    
    addLink(fromNodeId, toNodeId, direction = null) {
        const fromNode = this.nodes.get(fromNodeId);
        const toNode = this.nodes.get(toNodeId);
        
        if (!fromNode || !toNode) {
            console.error(`Node not found: ${fromNodeId} or ${toNodeId}`);
            return false;
        }
        
        // حساب المسافة بين النقطتين
        const distance = this.calculateDistance(fromNode.position, toNode.position);
        
        const link = {
            targetId: toNodeId,
            direction: direction,
            distance: distance,
            createdAt: new Date().toISOString()
        };
        
        // تجنب التكرار
        const existing = fromNode.links.find(l => l.targetId === toNodeId);
        if (!existing) {
            fromNode.links.push(link);
            
            this.eventBus.emit('node:linkAdded', { fromId: fromNodeId, toId: toNodeId, link });
            return true;
        }
        
        return false;
    }
    
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    
    getCurrentNode() {
        return this.nodes.get(this.currentNodeId);
    }
    
    setCurrentNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            this.currentNodeId = nodeId;
            this.eventBus.emit('node:currentChanged', node);
            return true;
        }
        return false;
    }
    
    navigateToNode(nodeId) {
        const targetNode = this.nodes.get(nodeId);
        const currentNode = this.getCurrentNode();
        
        if (!targetNode) {
            console.error(`Cannot navigate to ${nodeId}: node not found`);
            return false;
        }
        
        if (currentNode && currentNode.id === nodeId) {
            return false; // Already there
        }
        
        this.eventBus.emit('node:navigating', { from: currentNode, to: targetNode });
        
        this.currentNodeId = nodeId;
        
        this.eventBus.emit('node:navigated', targetNode);
        
        return true;
    }
    
    findNearestNode(position, maxDistance = 10) {
        let nearest = null;
        let minDistance = maxDistance;
        
        for (const [id, node] of this.nodes) {
            const distance = this.calculateDistance(position, node.position);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = node;
            }
        }
        
        return nearest;
    }
    
    calculateDistance(pos1, pos2) {
        const dx = (pos1.x || 0) - (pos2.x || 0);
        const dy = (pos1.y || 0) - (pos2.y || 0);
        const dz = (pos1.z || 0) - (pos2.z || 0);
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    
    getNodeCount() {
        return this.nodes.size;
    }
    
    generateId() {
        return `node_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    exportData() {
        return {
            nodes: this.getAllNodes(),
            currentNodeId: this.currentNodeId,
            exportedAt: new Date().toISOString()
        };
    }
    
    importData(data) {
        this.nodes.clear();
        
        for (const node of data.nodes) {
            this.nodes.set(node.id, node);
        }
        
        if (data.currentNodeId && this.nodes.has(data.currentNodeId)) {
            this.currentNodeId = data.currentNodeId;
        }
        
        this.eventBus.emit('node:dataImported', { nodeCount: this.nodes.size });
        
        return true;
    }
}