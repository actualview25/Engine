// =======================================
// GLOBAL COMPACTION - نسخة المحرك الجديد
// =======================================

export class GlobalCompaction {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.compactionData = {
            layers: options.layers || [],
            totalThickness: 0,
            compactionRatio: options.compactionRatio || 0.95
        };
        
        this.id = `compaction_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.layerVolumes = [];
        
        if (this.eventBus) {
            this.eventBus.on('compaction:create', (data) => this.create(data.area, data.sceneId));
        }
    }

    create(area, sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, area);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('compaction:created', {
                id: this.id,
                area: area,
                sceneId: sceneId,
                totalVolume: this.getTotalVolume()
            });
        }
        
        console.log(`🔄 Compaction created with ID: ${this.id}`);
        return this.id;
    }

    addLayer(thickness, materialType, sceneId = null) {
        const layer = {
            id: `layer_${Date.now()}_${this.compactionData.layers.length}`,
            thickness: thickness,
            materialType: materialType,
            compactedVolume: 0,
            looseVolume: 0,
            createdAt: Date.now()
        };
        
        this.compactionData.layers.push(layer);
        this.compactionData.totalThickness += thickness;
        
        // تحديث الأجزاء الموجودة
        for (const segment of this.segments) {
            this.updateSegmentLayer(segment, layer);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('compaction:layerAdded', {
                compactionId: this.id,
                layer: layer,
                totalThickness: this.compactionData.totalThickness
            });
        }
        
        console.log(`➕ Layer added: ${materialType}, thickness: ${thickness}m`);
        return layer;
    }
    
    updateSegmentLayer(segment, layer) {
        const looseVolume = segment.area * layer.thickness;
        const compactedVolume = looseVolume * this.compactionData.compactionRatio;
        
        segment.layers.push({
            id: layer.id,
            thickness: layer.thickness,
            materialType: layer.materialType,
            looseVolume: looseVolume,
            compactedVolume: compactedVolume
        });
        
        segment.totalLooseVolume += looseVolume;
        segment.totalCompactedVolume += compactedVolume;
        
        return segment;
    }

    addSegment(sceneId, area) {
        // تحويل المساحة إلى إحداثيات عالمية إذا كان geoReferencing متاحاً
        let globalArea = area;
        if (this.geoReferencing) {
            // تحويل المساحة (تبسيط: في الواقع تحتاج تحويل أكثر دقة)
            globalArea = area;
        }
        
        const segmentLayers = [];
        let totalLoose = 0;
        let totalCompacted = 0;
        
        for (const layer of this.compactionData.layers) {
            const looseVolume = globalArea * layer.thickness;
            const compactedVolume = looseVolume * this.compactionData.compactionRatio;
            
            segmentLayers.push({
                id: layer.id,
                thickness: layer.thickness,
                materialType: layer.materialType,
                looseVolume: looseVolume,
                compactedVolume: compactedVolume
            });
            
            totalLoose += looseVolume;
            totalCompacted += compactedVolume;
        }

        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            area: globalArea,
            layers: segmentLayers,
            totalLooseVolume: totalLoose,
            totalCompactedVolume: totalCompacted,
            createdAt: Date.now()
        };

        this.segments.push(segmentData);
        this.layerVolumes.push(totalCompacted);
        
        if (this.eventBus) {
            this.eventBus.emit('compaction:segmentAdded', segmentData);
        }

        console.log(`🔄 Compaction segment added: area ${globalArea.toFixed(2)} m², scene: ${sceneId}`);
        return segmentData;
    }
    
    // تحديث نسبة الدمك
    updateCompactionRatio(ratio) {
        this.compactionData.compactionRatio = ratio;
        
        // إعادة حساب جميع الأحجام
        this.layerVolumes = [];
        
        for (const segment of this.segments) {
            let totalCompacted = 0;
            for (const layer of segment.layers) {
                const looseVolume = segment.area * layer.thickness;
                const compactedVolume = looseVolume * ratio;
                layer.looseVolume = looseVolume;
                layer.compactedVolume = compactedVolume;
                totalCompacted += compactedVolume;
            }
            segment.totalCompactedVolume = totalCompacted;
            this.layerVolumes.push(totalCompacted);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('compaction:ratioUpdated', {
                id: this.id,
                compactionRatio: ratio,
                totalVolume: this.getTotalVolume()
            });
        }
        
        console.log(`📊 Compaction ratio updated to: ${ratio}`);
    }
    
    // حذف طبقة معينة
    removeLayer(layerId) {
        const layerIndex = this.compactionData.layers.findIndex(l => l.id === layerId);
        if (layerIndex === -1) return false;
        
        const removedLayer = this.compactionData.layers.splice(layerIndex, 1)[0];
        
        // إعادة حساب السمك الكلي
        this.compactionData.totalThickness = this.compactionData.layers.reduce((sum, l) => sum + l.thickness, 0);
        
        // تحديث الأجزاء
        for (const segment of this.segments) {
            const segmentLayerIndex = segment.layers.findIndex(l => l.id === layerId);
            if (segmentLayerIndex !== -1) {
                const removed = segment.layers.splice(segmentLayerIndex, 1)[0];
                segment.totalLooseVolume -= removed.looseVolume;
                segment.totalCompactedVolume -= removed.compactedVolume;
            }
        }
        
        // إعادة حساب layerVolumes
        this.layerVolumes = this.segments.map(s => s.totalCompactedVolume);
        
        if (this.eventBus) {
            this.eventBus.emit('compaction:layerRemoved', {
                id: this.id,
                layerId: layerId,
                remainingLayers: this.compactionData.layers.length
            });
        }
        
        console.log(`🗑️ Layer removed: ${removedLayer.materialType}`);
        return true;
    }
    
    getTotalVolume() {
        return this.layerVolumes.reduce((sum, v) => sum + v, 0);
    }

    getTotalQuantities() {
        const totalVolume = this.getTotalVolume();
        
        return {
            id: this.id,
            layers: this.compactionData.layers.length,
            totalThickness: this.compactionData.totalThickness,
            totalVolume: totalVolume.toFixed(2),
            compactionRatio: this.compactionData.compactionRatio,
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            materialBreakdown: this.compactionData.layers.map(l => ({
                id: l.id,
                material: l.materialType,
                thickness: l.thickness
            })),
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    getSegmentDetails(segmentId) {
        const segment = this.segments.find(s => s.id === segmentId);
        if (!segment) return null;
        
        return {
            id: segment.id,
            sceneId: segment.sceneId,
            area: segment.area,
            layers: segment.layers.map(l => ({
                material: l.materialType,
                thickness: l.thickness,
                looseVolume: l.looseVolume.toFixed(2),
                compactedVolume: l.compactedVolume.toFixed(2)
            })),
            totalLooseVolume: segment.totalLooseVolume.toFixed(2),
            totalCompactedVolume: segment.totalCompactedVolume.toFixed(2)
        };
    }
    
    generateReport() {
        const totals = this.getTotalQuantities();
        
        let layersReport = '';
        for (const layer of this.compactionData.layers) {
            layersReport += `  • ${layer.materialType}: ${layer.thickness} م\n`;
        }
        
        return `
📋 تقرير الدمك (Compaction)
═══════════════════════════════════
🔄 المعرف: ${totals.id}
📏 نسبة الدمك: ${(totals.compactionRatio * 100)}%
📐 السمك الكلي: ${totals.totalThickness} م
═══════════════════════════════════
📊 الطبقات:
${layersReport}
═══════════════════════════════════
📈 الإجماليات:
• الحجم الكلي: ${totals.totalVolume} م³
• عدد الطبقات: ${totals.layers}
• عدد الأجزاء: ${totals.segments}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    // حذف قطعة معينة
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            this.layerVolumes.splice(index, 1);
            
            this.eventBus?.emit('compaction:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ Compaction segment removed from scene ${removed.sceneId}`);
            return true;
        }
        return false;
    }
    
    dispose() {
        this.segments = [];
        this.layerVolumes = [];
        this.compactionData.layers = [];
        this.compactionData.totalThickness = 0;
        this.eventBus?.emit('compaction:disposed', { id: this.id });
        console.log(`♻️ GlobalCompaction disposed: ${this.id}`);
    }
}

export default GlobalCompaction;