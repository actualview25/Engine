// ============================================
// GLASS MATERIAL - مادة الزجاج
// يدعم: أنواع الزجاج، انعكاس، انكسار، شفافية، تشطيبات
// ============================================

import * as THREE from 'three';

export class GlassMaterial {
    constructor() {
        this.materials = new Map();
        this.textureCache = new Map();
        
        // أنواع الزجاج
        this.glassTypes = {
            clear: { color: 0xffffff, opacity: 0.3, roughness: 0.1, metalness: 0.9, ior: 1.52 },
            tinted: { color: 0x88aaff, opacity: 0.4, roughness: 0.15, metalness: 0.85, ior: 1.52 },
            frosted: { color: 0xffffff, opacity: 0.5, roughness: 0.5, metalness: 0.6, ior: 1.5 },
            reflective: { color: 0xccccdd, opacity: 0.2, roughness: 0.05, metalness: 0.95, ior: 1.52 },
            tempered: { color: 0xffffff, opacity: 0.35, roughness: 0.12, metalness: 0.88, ior: 1.53 },
            laminated: { color: 0xeeeedd, opacity: 0.45, roughness: 0.2, metalness: 0.8, ior: 1.52 },
            low_e: { color: 0xaaddff, opacity: 0.25, roughness: 0.08, metalness: 0.92, ior: 1.51 },
            patterned: { color: 0xffffff, opacity: 0.4, roughness: 0.3, metalness: 0.7, ior: 1.52 }
        };
        
        // تشطيبات الزجاج
        this.finishes = {
            smooth: { roughness: 0.05 },
            matte: { roughness: 0.3 },
            etched: { roughness: 0.4 },
            textured: { roughness: 0.6 },
            mirror: { roughness: 0.02, metalness: 0.98 }
        };
        
        console.log('🔮 GlassMaterial library initialized');
    }
    
    // ========== MAIN MATERIAL CREATION ==========
    
    createGlass(options = {}) {
        const type = options.type || 'clear';
        const finish = options.finish || 'smooth';
        const quality = options.quality || 'standard';
        
        const glassType = this.glassTypes[type];
        const glassFinish = this.finishes[finish];
        
        if (!glassType) {
            console.warn(`Unknown glass type: ${type}, using clear`);
            return this.createClearGlass(options);
        }
        
        const material = new THREE.MeshPhysicalMaterial({
            color: options.color || glassType.color,
            metalness: options.metalness || glassFinish.metalness || glassType.metalness,
            roughness: options.roughness || glassFinish.roughness || glassType.roughness,
            transparent: true,
            opacity: options.opacity || glassType.opacity,
            clearcoat: options.clearcoat !== false ? 1 : 0,
            clearcoatRoughness: 0.1,
            reflectivity: options.reflectivity || 0.5,
            ior: options.ior || glassType.ior,
            side: options.doubleSided !== false ? THREE.DoubleSide : THREE.FrontSide
        });
        
        // إضافة خرائط إضافية
        if (quality !== 'low') {
            this.addGlassTextures(material, type, finish, quality);
        }
        
        material.userData = {
            type: 'glass',
            glassType: type,
            finish: finish,
            quality: quality,
            createdAt: Date.now()
        };
        
        this.materials.set(`${type}_${finish}_${quality}`, material);
        
        return material;
    }
    
    createClearGlass(options = {}) {
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.9,
            roughness: 0.1,
            transparent: true,
            opacity: 0.3,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            reflectivity: 0.5,
            ior: 1.52,
            side: THREE.DoubleSide
        });
        
        return material;
    }
    
    // ========== TEXTURES ==========
    
    async addGlassTextures(material, type, finish, quality) {
        const textureKey = `glass_${type}_${finish}_${quality}`;
        
        if (this.textureCache.has(textureKey)) {
            const textures = this.textureCache.get(textureKey);
            if (textures.alphaMap) material.alphaMap = textures.alphaMap;
            if (textures.roughnessMap) material.roughnessMap = textures.roughnessMap;
            return;
        }
        
        try {
            const textures = this.generateGlassTextures(type, finish, quality);
            this.textureCache.set(textureKey, textures);
            
            if (textures.alphaMap) material.alphaMap = textures.alphaMap;
            if (textures.roughnessMap) material.roughnessMap = textures.roughnessMap;
            
        } catch (error) {
            console.warn('Failed to generate glass textures:', error);
        }
    }
    
    generateGlassTextures(type, finish, quality) {
        const size = quality === 'high' ? 512 : 256;
        const textures = {};
        
        // نسيج الشفافية للزجاج المنقوش
        if (type === 'patterned' || finish === 'textured') {
            const patternCanvas = this.createPatternTexture(size);
            const patternTexture = new THREE.CanvasTexture(patternCanvas);
            patternTexture.wrapS = THREE.RepeatWrapping;
            patternTexture.wrapT = THREE.RepeatWrapping;
            patternTexture.repeat.set(2, 2);
            textures.alphaMap = patternTexture;
        }
        
        // نسيج الخشونة للزجاج المصنفر
        if (finish === 'frosted' || finish === 'etched') {
            const roughnessCanvas = this.createRoughnessTexture(size);
            const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
            roughnessTexture.wrapS = THREE.RepeatWrapping;
            roughnessTexture.wrapT = THREE.RepeatWrapping;
            textures.roughnessMap = roughnessTexture;
        }
        
        return textures;
    }
    
    createPatternTexture(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);
        
        // إنشاء نمط
        ctx.strokeStyle = 'black';
        ctx.lineWidth = size / 20;
        
        const step = size / 8;
        for (let i = step; i < size; i += step) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
            ctx.stroke();
        }
        
        return canvas;
    }
    
    createRoughnessTexture(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const noise = Math.random() * 255;
                data[idx] = noise;
                data[idx + 1] = noise;
                data[idx + 2] = noise;
                data[idx + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    
    // ========== SPECIALIZED GLASS ==========
    
    createTintedGlass(color, options = {}) {
        const material = this.createGlass({ ...options, type: 'tinted' });
        
        if (color) {
            material.color.setHex(color);
            material.userData.tinted = true;
            material.userData.tintColor = color;
        }
        
        return material;
    }
    
    createFrostedGlass(options = {}) {
        return this.createGlass({ ...options, type: 'frosted', finish: 'matte' });
    }
    
    createReflectiveGlass(options = {}) {
        const material = this.createGlass({ ...options, type: 'reflective', finish: 'mirror' });
        material.reflectivity = options.reflectivity || 0.8;
        return material;
    }
    
    createSmartGlass(options = {}) {
        const material = this.createGlass({ ...options, type: 'clear' });
        
        material.userData.smartGlass = true;
        material.userData.transparencyEnabled = true;
        
        // إمكانية التبديل بين الشفاف والمعتم
        material.setTransparency = (enabled) => {
            material.opacity = enabled ? 0.3 : 0.9;
            material.userData.transparencyEnabled = enabled;
        };
        
        return material;
    }
    
    // ========== UTILITY ==========
    
    applyTint(material, tintColor, intensity = 0.5) {
        if (!material.userData.originalColor) {
            material.userData.originalColor = material.color.getHex();
        }
        
        const original = material.userData.originalColor;
        const r = ((original >> 16) & 255) * (1 - intensity) + ((tintColor >> 16) & 255) * intensity;
        const g = ((original >> 8) & 255) * (1 - intensity) + ((tintColor >> 8) & 255) * intensity;
        const b = (original & 255) * (1 - intensity) + (tintColor & 255) * intensity;
        
        material.color.setRGB(r / 255, g / 255, b / 255);
        material.userData.tintApplied = true;
        
        return material;
    }
    
    applyReflectionStrength(material, strength) {
        material.reflectivity = Math.min(1, Math.max(0, strength));
        material.metalness = 0.8 + strength * 0.19;
        return material;
    }
    
    getMaterial(key) {
        return this.materials.get(key);
    }
    
    dispose() {
        for (const material of this.materials.values()) {
            material.dispose();
        }
        for (const texture of this.textureCache.values()) {
            if (texture.alphaMap) texture.alphaMap.dispose();
            if (texture.roughnessMap) texture.roughnessMap.dispose();
        }
        this.materials.clear();
        this.textureCache.clear();
        console.log('♻️ GlassMaterial disposed');
    }
}

export default GlassMaterial;