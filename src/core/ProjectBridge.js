// ============================================
// PROJECT BRIDGE - الجسر بين المنصات المختلفة
// يسمح بتبادل البيانات بين Studio و Construction ومنصات أخرى
// ============================================

export class ProjectBridge {
    constructor() {
        this.version = '2.0';
        this.formats = {
            'actual-view': this.parseActualView,
            'matterport': this.parseMatterport,
            'kuula': this.parseKuula,
            'threejs': this.parseThreeJS,
            'ifc': this.parseIFC,
            'json': this.parseGenericJSON
        };
        
        // مخزن المشاريع المؤقتة
        this.cache = new Map();
        
        // محولات للتحويل بين الصيغ
        this.adapters = {
            toActualView: this.convertToActualView,
            fromActualView: this.convertFromActualView
        };
        
        console.log('🌉 ProjectBridge initialized');
    }
    
    // ========== MAIN IMPORT/EXPORT ==========
    
    async importProject(source, format = 'auto', options = {}) {
        let projectData;
        
        // تحديد الصيغة تلقائياً
        if (format === 'auto') {
            format = this.detectFormat(source);
        }
        
        // استدعاء المحلل المناسب
        const parser = this.formats[format];
        if (!parser) {
            throw new Error(`Unsupported format: ${format}`);
        }
        
        try {
            if (typeof source === 'string') {
                // JSON string
                const json = JSON.parse(source);
                projectData = parser.call(this, json, options);
            } else if (source instanceof File) {
                // File object
                const text = await source.text();
                const json = JSON.parse(text);
                projectData = parser.call(this, json, options);
            } else if (typeof source === 'object') {
                // Object already
                projectData = parser.call(this, source, options);
            } else {
                throw new Error('Invalid source type');
            }
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
        
        // تخزين في الكاش
        const projectId = `project_${Date.now()}`;
        this.cache.set(projectId, projectData);
        
        console.log(`📥 Project imported: ${projectId} (${format} format)`);
        
        return {
            id: projectId,
            data: projectData,
            format: format,
            timestamp: new Date().toISOString()
        };
    }
    
    exportProject(projectData, format = 'actual-view', options = {}) {
        const exporter = this.adapters.toActualView;
        
        const exported = exporter.call(this, projectData, options);
        
        return {
            version: this.version,
            format: format,
            exportedAt: new Date().toISOString(),
            data: exported
        };
    }
    
    detectFormat(source) {
        if (typeof source === 'string') {
            if (source.includes('"matterport"') || source.includes('"sweep"')) {
                return 'matterport';
            }
            if (source.includes('"kuula"') || source.includes('"scene_id"')) {
                return 'kuula';
            }
            if (source.includes('"sceneGraph"') || source.includes('"geoRef"')) {
                return 'actual-view';
            }
            if (source.includes('"geometry"') && source.includes('"materials"')) {
                return 'threejs';
            }
        }
        
        return 'json';
    }
    
    // ========== PARSERS ==========
    
    parseActualView(json, options) {
        // تحويل من صيغة Actual View الأصلية
        const project = {
            version: json.version || '1.0',
            name: json.name || 'Imported Project',
            nodes: [],
            geoData: null,
            metadata: {}
        };
        
        // استخراج العقد (Nodes)
        if (json.nodes) {
            project.nodes = json.nodes.map(node => ({
                id: node.id,
                name: node.name || node.id,
                panorama: node.panorama,
                position: node.position || { x: 0, y: 0, z: 0 },
                rotation: node.rotation || { x: 0, y: 0, z: 0 },
                links: node.links || [],
                hotspots: node.hotspots || []
            }));
        } else if (json.scenes) {
            // Format قديم
            project.nodes = Object.entries(json.scenes).map(([id, scene]) => ({
                id: id,
                name: scene.name || id,
                panorama: scene.imageUrl,
                position: scene.position || { x: 0, y: 0, z: 0 },
                rotation: scene.rotation || { x: 0, y: 0, z: 0 },
                links: scene.links || [],
                hotspots: scene.hotspots || []
            }));
        }
        
        // استخراج البيانات الجغرافية
        if (json.geoData || json.geoRef) {
            project.geoData = json.geoData || json.geoRef;
        }
        
        // استخراج العناصر الهندسية
        if (json.elements) {
            project.elements = json.elements;
        }
        
        if (json.metadata) {
            project.metadata = json.metadata;
        }
        
        return project;
    }
    
    parseMatterport(json, options) {
        // تحويل من صيغة Matterport
        const project = {
            version: '1.0',
            name: json.name || json.title || 'Matterport Import',
            nodes: [],
            metadata: { source: 'matterport' }
        };
        
        // Matterport sweeps -> nodes
        if (json.sweeps || json.positions) {
            const sweeps = json.sweeps || json.positions;
            
            for (const sweep of sweeps) {
                const node = {
                    id: sweep.id || sweep.position_id,
                    name: sweep.name || sweep.id,
                    panorama: sweep.panorama_url || sweep.image_url,
                    position: {
                        x: sweep.position?.x || sweep.x || 0,
                        y: sweep.position?.y || sweep.y || 0,
                        z: sweep.position?.z || sweep.z || 0
                    },
                    rotation: {
                        x: sweep.rotation?.x || sweep.rot_x || 0,
                        y: sweep.rotation?.y || sweep.rot_y || 0,
                        z: sweep.rotation?.z || sweep.rot_z || 0
                    },
                    links: []
                };
                
                // استخراج الروابط
                if (sweep.links || sweep.connections) {
                    node.links = (sweep.links || sweep.connections).map(link => ({
                        targetId: link.target_id || link.target,
                        direction: link.direction || null
                    }));
                }
                
                project.nodes.push(node);
            }
        }
        
        return project;
    }
    
    parseKuula(json, options) {
        // تحويل من صيغة Kuula
        const project = {
            version: '1.0',
            name: json.name || json.title || 'Kuula Import',
            nodes: [],
            metadata: { source: 'kuula' }
        };
        
        if (json.scenes) {
            for (const scene of json.scenes) {
                const node = {
                    id: scene.scene_id || scene.id,
                    name: scene.name || scene.title,
                    panorama: scene.panorama_url || scene.image_url,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0 },
                    links: [],
                    hotspots: []
                };
                
                // استخراج hotspots
                if (scene.hotspots) {
                    node.hotspots = scene.hotspots.map(hs => ({
                        type: hs.type === 'link' ? 'scene' : 'info',
                        position: {
                            x: hs.x || 0,
                            y: hs.y || 0,
                            z: hs.z || 0
                        },
                        data: hs.data || hs,
                        targetId: hs.target_scene_id || hs.link
                    }));
                }
                
                project.nodes.push(node);
            }
        }
        
        return project;
    }
    
    parseThreeJS(json, options) {
        // تحويل من صيغة Three.js JSON
        const project = {
            version: '1.0',
            name: json.metadata?.title || 'ThreeJS Import',
            nodes: [],
            elements: [],
            metadata: { source: 'threejs' }
        };
        
        // استخراج العناصر
        if (json.geometries || json.meshes) {
            const elements = json.objects || json.meshes || [];
            
            for (const element of elements) {
                if (element.type === 'Mesh' || element.geometry) {
                    project.elements.push({
                        type: element.geometry?.type || 'mesh',
                        position: element.position || { x: 0, y: 0, z: 0 },
                        rotation: element.rotation || { x: 0, y: 0, z: 0 },
                        scale: element.scale || { x: 1, y: 1, z: 1 },
                        material: element.material,
                        uuid: element.uuid
                    });
                }
            }
        }
        
        return project;
    }
    
    parseIFC(json, options) {
        // تحويل من IFC (JSON format)
        const project = {
            version: '1.0',
            name: json.project_name || 'IFC Import',
            nodes: [],
            elements: [],
            metadata: { source: 'ifc' }
        };
        
        if (json.elements || json.products) {
            const elements = json.elements || json.products;
            
            for (const element of elements) {
                project.elements.push({
                    id: element.global_id || element.id,
                    type: element.type || element.ifc_type,
                    category: this.mapIFCType(element.type),
                    position: element.position || { x: 0, y: 0, z: 0 },
                    geometry: element.geometry,
                    properties: element.properties || {}
                });
            }
        }
        
        return project;
    }
    
    parseGenericJSON(json, options) {
        // محاولة استنتاج بنية JSON العامة
        const project = {
            version: '1.0',
            name: json.name || json.title || 'Imported Project',
            nodes: [],
            elements: [],
            metadata: {}
        };
        
        // البحث عن الأنماط الشائعة
        if (json.nodes || json.scenes || json.positions) {
            const nodes = json.nodes || json.scenes || json.positions;
            
            if (Array.isArray(nodes)) {
                project.nodes = nodes.map((node, index) => ({
                    id: node.id || node.scene_id || `node_${index}`,
                    name: node.name || node.title,
                    panorama: node.image || node.image_url || node.panorama,
                    position: node.position || node.location || { x: 0, y: 0, z: 0 },
                    rotation: node.rotation || { x: 0, y: 0, z: 0 }
                }));
            }
        }
        
        if (json.elements || json.objects || json.entities) {
            project.elements = json.elements || json.objects || json.entities;
        }
        
        project.metadata.originalStructure = Object.keys(json);
        project.metadata.generated = true;
        
        return project;
    }
    
    mapIFCType(ifcType) {
        const mapping = {
            'IfcWall': 'architecture',
            'IfcColumn': 'structure',
            'IfcBeam': 'structure',
            'IfcSlab': 'structure',
            'IfcDoor': 'architecture',
            'IfcWindow': 'architecture',
            'IfcPipeSegment': 'mep',
            'IfcDuctSegment': 'mep',
            'IfcCableCarrier': 'mep'
        };
        
        return mapping[ifcType] || 'other';
    }
    
    // ========== CONVERTERS ==========
    
    convertToActualView(projectData, options) {
        const output = {
            version: this.version,
            name: projectData.name || 'Exported Project',
            exportedAt: new Date().toISOString(),
            nodes: [],
            geoData: null,
            elements: [],
            metadata: projectData.metadata || {}
        };
        
        // تحويل العقد
        if (projectData.nodes) {
            output.nodes = projectData.nodes.map(node => ({
                id: node.id,
                name: node.name,
                panorama: node.panorama,
                position: node.position,
                rotation: node.rotation,
                links: node.links || [],
                hotspots: node.hotspots || []
            }));
        }
        
        // تحويل البيانات الجغرافية
        if (projectData.geoData || projectData.geoRef) {
            output.geoData = projectData.geoData || projectData.geoRef;
        }
        
        // تحويل العناصر الهندسية
        if (projectData.elements) {
            output.elements = projectData.elements;
        }
        
        return output;
    }
    
    convertFromActualView(actualViewData, targetFormat) {
        const converter = this.formats[targetFormat];
        if (!converter) {
            throw new Error(`Target format not supported: ${targetFormat}`);
        }
        
        return converter.call(this, actualViewData, { reverse: true });
    }
    
    // ========== PROJECT MANAGEMENT ==========
    
    mergeProjects(projects, options = {}) {
        const merged = {
            name: options.name || 'Merged Project',
            nodes: [],
            elements: [],
            metadata: {
                sources: [],
                mergedAt: new Date().toISOString()
            }
        };
        
        const nodeIds = new Set();
        
        for (const project of projects) {
            if (project.nodes) {
                for (const node of project.nodes) {
                    if (!nodeIds.has(node.id)) {
                        nodeIds.add(node.id);
                        merged.nodes.push(node);
                    }
                }
            }
            
            if (project.elements) {
                merged.elements.push(...project.elements);
            }
            
            if (project.metadata) {
                merged.metadata.sources.push(project.metadata);
            }
        }
        
        return merged;
    }
    
    validateProject(projectData) {
        const errors = [];
        const warnings = [];
        
        // التحقق من البنية الأساسية
        if (!projectData.nodes && !projectData.elements) {
            errors.push('Project has no nodes or elements');
        }
        
        // التحقق من العقد
        if (projectData.nodes) {
            if (!Array.isArray(projectData.nodes)) {
                errors.push('Nodes must be an array');
            } else {
                for (const node of projectData.nodes) {
                    if (!node.id) warnings.push(`Node missing id: ${JSON.stringify(node)}`);
                    if (!node.panorama) warnings.push(`Node ${node.id} missing panorama`);
                }
            }
        }
        
        // التحقق من الروابط
        if (projectData.nodes) {
            const nodeIds = new Set(projectData.nodes.map(n => n.id));
            
            for (const node of projectData.nodes) {
                if (node.links) {
                    for (const link of node.links) {
                        if (!nodeIds.has(link.targetId)) {
                            warnings.push(`Node ${node.id} links to missing target: ${link.targetId}`);
                        }
                    }
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }
    
    // ========== CACHE MANAGEMENT ==========
    
    getCachedProject(id) {
        return this.cache.get(id);
    }
    
    clearCache() {
        this.cache.clear();
    }
    
    // ========== UTILITY ==========
    
    getSupportedFormats() {
        return Object.keys(this.formats);
    }
    
    getVersion() {
        return this.version;
    }
}

export default ProjectBridge;