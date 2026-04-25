// ============================================
// STEEL MATERIAL - مادة الصلب
// يدعم: أنواع الصلب، تشطيبات، صدأ، طلاءات
// ============================================

import * as THREE from 'three';

export class SteelMaterial {
    constructor() {
        this.materials = new Map();
        this.textureCache = new Map();
        
        // أنواع الصلب
        this.steelTypes = {
            structural: { color: 0x8899aa, roughness: 0.4, metalness: 0.85 },
            stainless: { color: 0xc0c0c0, roughness: 0.25, metalness: 0.95 },
            galvanized: { color: 0xaabbcc, roughness: 0.35, metalness: 0.8 },
            corten: { color: 0x8b5a2b, roughness: 0.6, metalness: 0.5 },
            black: { color: 0x333333, roughness: 0.5, metalness: 0.7 },
            tool: { color: 0x556677, roughness: 0.3, metalness: 0.9 },
            spring: { color: 0x667788, roughness: 0.28, metalness: 0.92 },
            hardened: { color: 0x778899, roughness: 0.32, metalness: 0.88 }
        };
        
        // تشطيبات الصلب
        this.finishes = {
            mill: { roughness: 0.5, metalness: 0.7 },
            brushed: { roughness: 0.3, metalness: 0.85 },
            polished: { roughness: 0.15, metalness: 0.95 },
            matte: { roughness: 0.6, metalness: 0.75 },
            sandblasted: { roughness: 0.65, metalness: 0.7 },
            painted: { roughness: 0.4, metalness: 0.3 }
        };
        
        console.log('⚙️ SteelMaterial library initialized');
    }
    
    // ========== MAIN MATERIAL CREATION ==========
    
    createSteel(options = {}) {
        const type = options.type || 'structural';
        const finish = options.finish || 'mill';
        const quality = options.quality || 'standard';
        
        const steelType = this.steelTypes[type];
        const steelFinish = this.finishes[finish];
        
        if (!steelType) {
            console.warn(`Unknown steel type: ${type}, using structural`);
            return this.createStructuralSteel(options);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: options.color || steelType.color,
            roughness: options.roughness || steelFinish.roughness,
            metalness: options.metalness || steelFinish.metalness,
            emissive: options.emissive || 0x000000,
            emissiveIntensity: options.emissiveIntensity || 0,
            side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide
        });
        
        if (quality !== 'low') {
            this.addSteelTextures(material, type, finish, quality);
        }
        
        material.userData = {
            type: 'steel',
            steelType: type,
            finish: finish,
            quality: quality,
            createdAt: Date.now()
        };
        
        this.materials.set(`${type}_${finish}_${quality}`, material);
        
        return material;
    }
    
    createStructuralSteel(options = {}) {
        const material = new THREE.MeshStandardMaterial({
            color: 0x8899aa,
            roughness: 0.4,
            metalness: 0.85,
            side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide
        });
        
        return material;
    }
    
    // ========== TEXTURES ==========
    
    async addSteelTextures(material, type, finish, quality) {
        const textureKey = `steel_${type}_${finish}_${quality}`;
        
        if (this.textureCache.has(textureKey)) {
            const textures = this.textureCache.get(textureKey);
            if (textures.map) material.map = textures.map;
            if (textures.roughnessMap) material.roughnessMap = textures.roughnessMap;
            if (textures.metalnessMap) material.metalnessMap = textures.metalnessMap;
            return;
        }
        
        try {
            const textures = this.generateSteelTextures(type, finish, quality);
            this.textureCache.set(textureKey, textures);
            
            if (textures.map) material.map = textures.map;
            if (textures.roughnessMap) material.roughnessMap = textures.roughnessMap;
            if (textures.metalnessMap) material.metalnessMap = textures.metalnessMap;
            
        } catch (error) {
            console.warn('Failed to generate steel textures:', error);
        }
    }
    
    generateSteelTextures(type, finish, quality) {
        const size = quality === 'high' ? 1024 : 512;
        const textures = {};
        
        // نسيج أساسي للصلب
        const baseCanvas = this.createSteelBaseTexture(size, type, finish);
        textures.map = new THREE.CanvasTexture(baseCanvas);
        textures.map.wrapS = THREE.RepeatWrapping;
        textures.map.wrapT = THREE.RepeatWrapping;
        textures.map.repeat.set(2, 2);
        
        // نسيج الخشونة
        const roughnessCanvas = this.createSteelRoughnessTexture(size, finish);
        textures.roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
        textures.roughnessMap.wrapS = THREE.RepeatWrapping;
        textures.roughnessMap.wrapT = THREE.RepeatWrapping;
        textures.roughnessMap.repeat.set(2, 2);
        
        return textures;
    }
    
    createSteelBaseTexture(size, type, finish) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        let baseColor;
        switch(type) {
            case 'stainless': baseColor = '#c0c0c0'; break;
            case 'galvanized': baseColor = '#aabbcc'; break;
            case 'corten': baseColor = '#8b5a2b'; break;
            case 'black': baseColor = '#333333'; break;
            default: baseColor = '#8899aa';
        }
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);
        
        // إضافة نسيج معدني
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const brightness = Math.random() * 40 - 20;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
            ctx.fillRect(x, y, Math.random() * 2 + 1, Math.random() * 2 + 1);
        }
        
        // خطوط معدنية
        if (finish === 'brushed') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 200; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * (size / 200));
                ctx.lineTo(size, i * (size / 200) + (Math.random() - 0.5) * 20);
                ctx.stroke();
            }
        }
        
        return canvas;
    }
    
    createSteelRoughnessTexture(size, finish) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        let roughness = 128;
        switch(finish) {
            case 'polished': roughness = 50; break;
            case 'brushed': roughness = 100; break;
            case 'matte': roughness = 180; break;
            case 'sandblasted': roughness = 200; break;
            default: roughness = 128;
        }
        
        const value = roughness;
        ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
        ctx.fillRect(0, 0, size, size);
        
        // إضافة ضوضاء للخشونة
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const variation = Math.random() * 60 - 30;
            const finalValue = Math.min(255, Math.max(0, roughness + variation));
            ctx.fillStyle = `rgb(${finalValue}, ${finalValue}, ${finalValue})`;
            ctx.fillRect(x, y, 1, 1);
        }
        
        return canvas;
    }
    
    // ========== SPECIALIZED STEEL ==========
    
    createStainlessSteel(options = {}) {
        const material = this.createSteel({ ...options, type: 'stainless', finish: 'polished' });
        material.roughness = 0.15;
        material.metalness = 0.98;
        return material;
    }
    
    createCortenSteel(options = {}) {
        const material = this.createSteel({ ...options, type: 'corten', finish: 'matte' });
        material.color.setHex(0x8b5a2b);
        material.roughness = 0.7;
        material.metalness = 0.4;
        material.userData.corten = true;
        return material;
    }
    
    createGalvanizedSteel(options = {}) {
        const material = this.createSteel({ ...options, type: 'galvanized' });
        material.userData.galvanized = true;
        return material;
    }
    
    // ========== RUST EFFECTS ==========
    
    applyRust(material, rustLevel = 0.3) {
        if (rustLevel <= 0) return material;
        
        const rustColor = 0x8b4513;
        const originalColor = material.color.getHex();
        
        const r = ((originalColor >> 16) & 255) * (1 - rustLevel) + ((rustColor >> 16) & 255) * rustLevel;
        const g = ((originalColor >> 8) & 255) * (1 - rustLevel) + ((rustColor >> 8) & 255) * rustLevel;
        const b = (originalColor & 255) * (1 - rustLevel) + (rustColor & 255) * rustLevel;
        
        material.color.setRGB(r / 255, g / 255, b / 255);
        material.roughness += rustLevel * 0.3;
        material.metalness -= rustLevel * 0.5;
        
        material.userData.rusted = true;
        material.userData.rustLevel = rustLevel;
        
        return material;
    }
    
    applyPaint(material, paintColor, thickness = 0.5) {
        const originalColor = material.color.getHex();
        
        const r = ((originalColor >> 16) & 255) * (1 - thickness) + ((paintColor >> 16) & 255) * thickness;
        const g = ((originalColor >> 8) & 255) * (1 - thickness) + ((paintColor >> 8) & 255) * thickness;
        const b = (originalColor & 255) * (1 - thickness) + (paintColor & 255) * thickness;
        
        material.color.setRGB(r / 255, g / 255, b / 255);
        material.metalness = 0.2;
        
        material.userData.painted = true;
        material.userData.paintColor = paintColor;
        
        return material;
    }
    
    // ========== UTILITY ==========
    
    getMaterial(key) {
        return this.materials.get(key);
    }
    
    dispose() {
        for (const material of this.materials.values()) {
            material.dispose();
        }
        for (const texture of this.textureCache.values()) {
            if (texture.map) texture.map.dispose();
            if (texture.roughnessMap) texture.roughnessMap.dispose();
        }
        this.materials.clear();
        this.textureCache.clear();
        console.log('♻️ SteelMaterial disposed');
    }
}

export default SteelMaterial;