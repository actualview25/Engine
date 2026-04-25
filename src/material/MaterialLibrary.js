// ============================================
// MATERIAL LIBRARY - مكتبة المواد المركزية
// تدير جميع أنواع المواد وتوفر واجهة موحدة
// ============================================

import * as THREE from 'three';
import ConcreteMaterial from './ConcreteMaterial.js';
import GlassMaterial from './GlassMaterial.js';
import SteelMaterial from './SteelMaterial.js';
import WoodMaterial from './WoodMaterial.js';

export class MaterialLibrary {
    constructor() {
        this.libraries = {
            concrete: new ConcreteMaterial(),
            glass: new GlassMaterial(),
            steel: new SteelMaterial(),
            wood: new WoodMaterial()
        };
        
        this.materialCache = new Map();
        this.templateLibrary = new Map();
        
        // قوالب المواد المدمجة
        this.templates = {
            // خرسانة
            'concrete_standard': { type: 'concrete', params: { type: 'standard' } },
            'concrete_smooth': { type: 'concrete', params: { type: 'smooth' } },
            'concrete_rough': { type: 'concrete', params: { type: 'rough' } },
            'concrete_polished': { type: 'concrete', params: { type: 'polished' } },
            'concrete_reinforced': { type: 'concrete', params: { type: 'reinforced' } },
            'concrete_weathered': { type: 'concrete', params: {}, custom: 'createWeatherConcrete' },
            
            // زجاج
            'glass_clear': { type: 'glass', params: { type: 'clear' } },
            'glass_tinted': { type: 'glass', params: { type: 'tinted' } },
            'glass_frosted': { type: 'glass', params: { type: 'frosted' } },
            'glass_reflective': { type: 'glass', params: { type: 'reflective' } },
            'glass_patterned': { type: 'glass', params: { type: 'patterned' } },
            
            // صلب
            'steel_structural': { type: 'steel', params: { type: 'structural' } },
            'steel_stainless': { type: 'steel', params: { type: 'stainless' } },
            'steel_galvanized': { type: 'steel', params: { type: 'galvanized' } },
            'steel_corten': { type: 'steel', params: { type: 'corten' } },
            'steel_black': { type: 'steel', params: { type: 'black' } },
            
            // خشب
            'wood_oak': { type: 'wood', params: { type: 'oak' } },
            'wood_walnut': { type: 'wood', params: { type: 'walnut' } },
            'wood_maple': { type: 'wood', params: { type: 'maple' } },
            'wood_cherry': { type: 'wood', params: { type: 'cherry' } },
            'wood_bamboo': { type: 'wood', params: { type: 'bamboo' } },
            'wood_plywood': { type: 'wood', params: { type: 'plywood' } }
        };
        
        this.registerTemplates();
        
        console.log('📚 MaterialLibrary initialized');
    }
    
    // ========== TEMPLATE REGISTRATION ==========
    
    registerTemplates() {
        for (const [name, template] of Object.entries(this.templates)) {
            this.templateLibrary.set(name, template);
        }
    }
    
    registerTemplate(name, template) {
        this.templateLibrary.set(name, template);
    }
    
    // ========== MATERIAL CREATION ==========
    
    createMaterial(typeOrTemplate, options = {}) {
        // إذا كان القالب موجوداً
        if (this.templateLibrary.has(typeOrTemplate)) {
            const template = this.templateLibrary.get(typeOrTemplate);
            return this.createFromTemplate(template, options);
        }
        
        // إذا كان النوع مباشراً
        const library = this.libraries[typeOrTemplate];
        if (library) {
            return this.createFromLibrary(library, typeOrTemplate, options);
        }
        
        // إنشاء مادة Three.js عادية
        return this.createStandardMaterial(typeOrTemplate, options);
    }
    
    createFromTemplate(template, options = {}) {
        const mergedOptions = { ...template.params, ...options };
        
        if (template.custom) {
            const library = this.libraries[template.type];
            if (library && library[template.custom]) {
                return library[template.custom](mergedOptions);
            }
        }
        
        return this.createFromLibrary(this.libraries[template.type], template.type, mergedOptions);
    }
    
    createFromLibrary(library, type, options = {}) {
        const cacheKey = `${type}_${JSON.stringify(options)}`;
        
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey).clone();
        }
        
        let material;
        
        switch(type) {
            case 'concrete':
                material = library.createConcrete(options);
                break;
            case 'glass':
                material = library.createGlass(options);
                break;
            case 'steel':
                material = library.createSteel(options);
                break;
            case 'wood':
                material = library.createWood(options);
                break;
            default:
                material = new THREE.MeshStandardMaterial(options);
        }
        
        this.materialCache.set(cacheKey, material);
        
        return material.clone();
    }
    
    createStandardMaterial(type, options = {}) {
        // مواد Three.js الأساسية
        switch(type) {
            case 'standard':
                return new THREE.MeshStandardMaterial(options);
            case 'physical':
                return new THREE.MeshPhysicalMaterial(options);
            case 'basic':
                return new THREE.MeshBasicMaterial(options);
            case 'phong':
                return new THREE.MeshPhongMaterial(options);
            case 'lambert':
                return new THREE.MeshLambertMaterial(options);
            default:
                return new THREE.MeshStandardMaterial(options);
        }
    }
    
    // ========== QUICK MATERIALS ==========
    
    getConcrete(type = 'standard', options = {}) {
        return this.libraries.concrete.createConcrete({ ...options, type });
    }
    
    getGlass(type = 'clear', options = {}) {
        return this.libraries.glass.createGlass({ ...options, type });
    }
    
    getSteel(type = 'structural', options = {}) {
        return this.libraries.steel.createSteel({ ...options, type });
    }
    
    getWood(type = 'oak', options = {}) {
        return this.libraries.wood.createWood({ ...options, type });
    }
    
    // ========== MESH UTILITIES ==========
    
    applyMaterial(mesh, materialName, options = {}) {
        const material = this.createMaterial(materialName, options);
        mesh.material = material;
        return mesh;
    }
    
    applyMaterialsToGroup(group, materialMap) {
        group.traverse((child) => {
            if (child.isMesh && materialMap[child.name]) {
                this.applyMaterial(child, materialMap[child.name]);
            }
        });
    }
    
    // ========== PROCEDURAL MATERIALS ==========
    
    createProceduralMaterial(type, seed = Math.random()) {
        switch(type) {
            case 'marble':
                return this.createMarbleMaterial(seed);
            case 'granite':
                return this.createGraniteMaterial(seed);
            case 'brick':
                return this.createBrickMaterial(seed);
            case 'tile':
                return this.createTileMaterial(seed);
            default:
                return this.createStandardMaterial('standard');
        }
    }
    
    createMarbleMaterial(seed) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // رسم رخامي بسيط
        ctx.fillStyle = '#f5f5f0';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 100; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            ctx.lineTo(Math.random() * 512, Math.random() * 512);
            ctx.strokeStyle = `rgba(100, 80, 60, ${Math.random() * 0.3})`;
            ctx.lineWidth = Math.random() * 2 + 1;
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.3,
            metalness: 0.1,
            color: 0xf5f5f0
        });
    }
    
    createGraniteMaterial(seed) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 512, 512);
        
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 3 + 1;
            const brightness = Math.random() * 100 + 100;
            
            ctx.fillStyle = `rgb(${brightness}, ${brightness - 30}, ${brightness - 50})`;
            ctx.fillRect(x, y, size, size);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.6,
            metalness: 0.05
        });
    }
    
    createBrickMaterial(seed) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#aa6644';
        ctx.fillRect(0, 0, 512, 256);
        
        const brickW = 50;
        const brickH = 25;
        const mortar = 3;
        
        for (let y = 0; y < 256; y += brickH + mortar) {
            const offset = (Math.floor(y / (brickH + mortar)) % 2) * (brickW / 2);
            
            for (let x = -offset; x < 512 + brickW; x += brickW + mortar) {
                ctx.fillStyle = '#cc8866';
                ctx.fillRect(x + mortar, y + mortar, brickW, brickH);
                
                // إضافة نسيج للطوبة
                ctx.fillStyle = '#aa6644';
                for (let i = 0; i < 5; i++) {
                    ctx.fillRect(
                        x + mortar + Math.random() * brickW,
                        y + mortar + Math.random() * brickH,
                        3, 3
                    );
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.7,
            bumpScale: 0.3
        });
    }
    
    createTileMaterial(seed) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, 512, 512);
        
        const tileSize = 64;
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 2;
        
        for (let x = 0; x <= 512; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 512);
            ctx.stroke();
        }
        
        for (let y = 0; y <= 512; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        return new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.2,
            metalness: 0.1
        });
    }
    
    // ========== UTILITY ==========
    
    getTemplateNames() {
        return Array.from(this.templateLibrary.keys());
    }
    
    getMaterialTypes() {
        return Object.keys(this.libraries);
    }
    
    cloneMaterial(material) {
        if (material.clone) {
            return material.clone();
        }
        return new THREE.MeshStandardMaterial().copy(material);
    }
    
    clearCache() {
        this.materialCache.clear();
        console.log('🗑️ Material cache cleared');
    }
    
    dispose() {
        this.clearCache();
        
        for (const library of Object.values(this.libraries)) {
            if (library.dispose) library.dispose();
        }
        
        this.templateLibrary.clear();
        console.log('♻️ MaterialLibrary disposed');
    }
}

export default MaterialLibrary;