// ============================================
// NODE SYSTEM - نظام إدارة النقاط والمشاهد
// ============================================

export class NodeSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.nodes = new Map();
        this.currentNodeId = null;
        this.nodeCounter = 0;
    }
    
    createNode(data) {
        const id = data.id || `node_${++this.nodeCounter}_${Date.now()}`;
        const node = {
            id: id,
            name: data.name || `Node ${this.nodeCounter}`,
            panorama: data.panorama || null,
            position: data.position || { x: 0, y: 0, z: 0 },
            rotation: data.rotation || { x: 0, y: 0, z: 0 },
            links: data.links || [],
            metadata: data.metadata || {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.nodes.set(id, node);
        this.eventBus.emit('node:created', node);
        
        return id;
    }
    
    getNode(id) {
        return this.nodes.get(id);
    }
    
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    
    getNodeCount() {
        return this.nodes.size;
    }
    
    setCurrentNode(id) {
        if (this.nodes.has(id)) {
            this.currentNodeId = id;
            this.eventBus.emit('node:currentChanged', this.nodes.get(id));
            return true;
        }
        return false;
    }
    
    getCurrentNode() {
        return this.nodes.get(this.currentNodeId);
    }
    
    updateNode(id, updates) {
        const node = this.nodes.get(id);
        if (node) {
            Object.assign(node, updates);
            node.updatedAt = Date.now();
            this.eventBus.emit('node:updated', node);
            return true;
        }
        return false;
    }
    
    deleteNode(id) {
        if (this.nodes.has(id)) {
            const node = this.nodes.get(id);
            this.nodes.delete(id);
            if (this.currentNodeId === id) {
                this.currentNodeId = null;
            }
            this.eventBus.emit('node:deleted', node);
            return true;
        }
        return false;
    }
    
    addLink(fromId, toId, direction = null) {
        const fromNode = this.nodes.get(fromId);
        const toNode = this.nodes.get(toId);
        
        if (!fromNode || !toNode) {
            console.error(`Node not found: ${fromId} or ${toId}`);
            return false;
        }
        
        const link = {
            targetId: toId,
            direction: direction,
            createdAt: Date.now()
        };
        
        fromNode.links.push(link);
        fromNode.updatedAt = Date.now();
        
        this.eventBus.emit('node:linkAdded', { fromId, toId, direction });
        return true;
    }
    
    removeLink(fromId, toId) {
        const fromNode = this.nodes.get(fromId);
        if (fromNode) {
            const index = fromNode.links.findIndex(l => l.targetId === toId);
            if (index !== -1) {
                fromNode.links.splice(index, 1);
                fromNode.updatedAt = Date.now();
                this.eventBus.emit('node:linkRemoved', { fromId, toId });
                return true;
            }
        }
        return false;
    }
    
    getNodeLinks(nodeId) {
        const node = this.nodes.get(nodeId);
        return node ? [...node.links] : [];
    }
    
    exportData() {
        return {
            nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
                id,
                ...node,
                links: node.links
            })),
            currentNodeId: this.currentNodeId,
            exportedAt: Date.now()
        };
    }
    
    importData(data) {
        this.nodes.clear();
        for (const nodeData of data.nodes) {
            this.nodes.set(nodeData.id, {
                ...nodeData,
                createdAt: nodeData.createdAt || Date.now(),
                updatedAt: Date.now()
            });
        }
        this.currentNodeId = data.currentNodeId || null;
        this.eventBus.emit('node:dataImported', { count: this.nodes.size });
        return true;
    }
    
    clear() {
        this.nodes.clear();
        this.currentNodeId = null;
        this.nodeCounter = 0;
        this.eventBus.emit('node:cleared');
    }
}

export default NodeSystem;
