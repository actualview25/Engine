// ============================================
// CONCRETE MATERIAL - مادة الخرسانة
// يدعم: أنواع مختلفة من الخرسانة، تشطيبات، شيخوخة، تشققات
// ============================================

import * as THREE from 'three';

export class ConcreteMaterial {
    constructor() {
        this.materials = new Map();
        this.textureCache = new Map();
        
        // أنواع الخرسانة
        this.concreteTypes = {
            standard: { color: 0x888888, roughness: 0.7, metalness: 0.05 },
            smooth: { color: 0x9a9a9a, roughness: 0.4, metalness: 0.02 },
            rough: { color: 0x7a7a7a, roughness: 0.85, metalness: 0.03 },
            exposed: { color: 0xaaaaaa, roughness: 0.6, metalness: 0.08 },
            polished: { color: 0xb0b0b0, roughness: 0.25, metalness: 0.1 },
            architectural: { color: 0xc0c0c0, roughness: 0.5, metalness: 0.04 },
            reinforced: { color: 0x8a8a8a, roughness: 0.65, metalness: 0.15 },
            lightweight: { color: 0xa0a0a0, roughness: 0.75, metalness: 0.02 }
        };
        
        // تشطيبات الخرسانة
        this.finishes = {
            raw: { roughness: 0.8, bumpScale: 0.3 },
            troweled: { roughness: 0.5, bumpScale: 0.1 },
            brushed: { roughness: 0.6, bumpScale: 0.2 },
            stamped: { roughness: 0.7, bumpScale: 0.4 },
            exposed_aggregate: { roughness: 0.85, bumpScale: 0.5 },
            sandblasted: { roughness: 0.75, bumpScale: 0.25 }
        };
        
        console.log('🏗️ ConcreteMaterial library initialized');
    }
    
    // ========== MAIN MATERIAL CREATION ==========
    
    createConcrete(options = {}) {
        const type = options.type || 'standard';
        const finish = options.finish || 'raw';
        const quality = options.quality || 'standard'; // low, standard, high
        
        const concreteType = this.concreteTypes[type];
        const concreteFinish = this.finishes[finish];
        
        if (!concreteType) {
            console.warn(`Unknown concrete type: ${type}, using standard`);
            return this.createStandardConcrete(options);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: options.color || concreteType.color,
            roughness: options.roughness || concreteType.roughness,
            metalness: options.metalness || concreteType.metalness,
            bumpScale: concreteFinish.bumpScale,
            side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide
        });
        
        // إضافة الـ maps حسب الجودة
        if (quality !== 'low') {
            this.addConcreteTextures(material, type, finish, quality);
        }
        
        // إعدادات الإضاءة
        if (options.emissive) material.emissive = options.emissive;
        if (options.emissiveIntensity) material.emissiveIntensity = options.emissiveIntensity;
        
        material.userData = {
            type: 'concrete',
            concreteType: type,
            finish: finish,
            quality: quality,
            createdAt: Date.now()
        };
        
        this.materials.set(`${type}_${finish}_${quality}`, material);
        
        return material;
    }
    
    createStandardConcrete(options = {}) {
        const material = new THREE.MeshStandardMaterial({
            color: options.color || 0x888888,
            roughness: options.roughness || 0.7,
            metalness: options.metalness || 0.05,
            bumpScale: 0.2,
            side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide
        });
        
        return material;
    }
    
    // ========== TEXTURES ==========
    
    async addConcreteTextures(material, type, finish, quality) {
        const textureKey = `${type}_${finish}_${quality}`;
        
        if (this.textureCache.has(textureKey)) {
            const textures = this.textureCache.get(textureKey);
            material.map = textures.map;
            material.normalMap = textures.normalMap;
            material.roughnessMap = textures.roughnessMap;
            material.bumpMap = textures.bumpMap;
            return;
        }
        
        try {
            // إنشاء نسيج بروسيجاري للخرسانة
            const textures = this.generateConcreteTextures(type, finish, quality);
            this.textureCache.set(textureKey, textures);
            
            material.map = textures.map;
            material.normalMap = textures.normalMap;
            material.roughnessMap = textures.roughnessMap;
            material.bumpMap = textures.bumpMap;
            
        } catch (error) {
            console.warn('Failed to generate concrete textures:', error);
        }
    }
    
    generateConcreteTextures(type, finish, quality) {
        // إنشاء قماش للنسيج
        const size = quality === 'high' ? 1024 : (quality === 'standard' ? 512 : 256);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // رسم نسيج الخرسانة
        this.drawConcreteTexture(ctx, size, type, finish);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        // إنشاء نسيج Normal Map
        const normalCanvas = this.generateNormalMap(canvas);
        const normalMap = new THREE.CanvasTexture(normalCanvas);
        normalMap.wrapS = THREE.RepeatWrapping;
        normalMap.wrapT = THREE.RepeatWrapping;
        normalMap.repeat.set(4, 4);
        
        return {
            map: texture,
            normalMap: normalMap,
            roughnessMap: texture,
            bumpMap: texture
        };
    }
    
    drawConcreteTexture(ctx, size, type, finish) {
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // تحديد الألوان حسب نوع الخرسانة
        let baseColor = { r: 136, g: 136, b: 136 };
        switch(type) {
            case 'smooth': baseColor = { r: 154, g: 154, b: 154 }; break;
            case 'rough': baseColor = { r: 122, g: 122, b: 122 }; break;
            case 'exposed': baseColor = { r: 170, g: 170, b: 170 }; break;
            case 'architectural': baseColor = { r: 192, g: 192, b: 192 }; break;
            default: baseColor = { r: 136, g: 136, b: 136 };
        }
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // ضوضاء بيرلين بسيطة
                const noise = this.perlinNoise(x / size, y / size);
                const grain = (Math.random() - 0.5) * 30;
                
                let r = baseColor.r + noise * 20 + grain;
                let g = baseColor.g + noise * 20 + grain;
                let b = baseColor.b + noise * 20 + grain;
                
                // تشطيبات خاصة
                if (finish === 'stamped') {
                    const pattern = Math.sin(x * 0.02) * Math.cos(y * 0.02);
                    r += pattern * 30;
                    g += pattern * 30;
                    b += pattern * 30;
                }
                
                if (finish === 'exposed_aggregate') {
                    if (Math.random() < 0.1) {
                        r += 50;
                        g += 40;
                        b += 30;
                    }
                }
                
                data[idx] = Math.min(255, Math.max(0, r));
                data[idx + 1] = Math.min(255, Math.max(0, g));
                data[idx + 2] = Math.min(255, Math.max(0, b));
                data[idx + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    generateNormalMap(sourceCanvas) {
        const size = sourceCanvas.width;
        const normalCanvas = document.createElement('canvas');
        normalCanvas.width = size;
        normalCanvas.height = size;
        const ctx = normalCanvas.getContext('2d');
        
        const sourceCtx = sourceCanvas.getContext('2d');
        const sourceData = sourceCtx.getImageData(0, 0, size, size);
        
        const normalData = ctx.getImageData(0, 0, size, size);
        const data = normalData.data;
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // حساب التدرج
                const dx = this.getPixelGradient(sourceData, x, y, size, true);
                const dy = this.getPixelGradient(sourceData, x, y, size, false);
                
                // تحويل إلى normal
                const nx = dx;
                const ny = dy;
                const nz = Math.sqrt(1 - nx * nx - ny * ny);
                
                data[idx] = (nx + 1) * 128;
                data[idx + 1] = (ny + 1) * 128;
                data[idx + 2] = (nz + 1) * 128;
                data[idx + 3] = 255;
            }
        }
        
        ctx.putImageData(normalData, 0, 0);
        return normalCanvas;
    }
    
    getPixelGradient(data, x, y, size, isX) {
        const getLum = (px, py) => {
            const idx = (py * size + px) * 4;
            return (data.data[idx] + data.data[idx + 1] + data.data[idx + 2]) / 3;
        };
        
        if (isX) {
            const left = x > 0 ? getLum(x - 1, y) : getLum(x, y);
            const right = x < size - 1 ? getLum(x + 1, y) : getLum(x, y);
            return (right - left) / 255;
        } else {
            const up = y > 0 ? getLum(x, y - 1) : getLum(x, y);
            const down = y < size - 1 ? getLum(x, y + 1) : getLum(x, y);
            return (down - up) / 255;
        }
    }
    
    perlinNoise(x, y) {
        return Math.sin(x * 20) * Math.cos(y * 20);
    }
    
    // ========== SPECIALIZED CONCRETE ==========
    
    createReinforcedConcrete(options = {}) {
        const material = this.createConcrete({ ...options, type: 'reinforced' });
        
        // إضافة تأثير حديد التسليح
        material.userData.reinforced = true;
        material.userData.rebarDensity = options.rebarDensity || 0.1;
        
        return material;
    }
    
    createWeatherConcrete(options = {}) {
        const material = this.createConcrete({ ...options, type: 'rough', finish: 'exposed_aggregate' });
        
        material.color.setHex(0x6a6a6a);
        material.roughness = 0.9;
        material.userData.weathered = true;
        material.userData.weatheringLevel = options.weatheringLevel || 0.5;
        
        return material;
    }
    
    createColoredConcrete(color, options = {}) {
        const material = this.createConcrete(options);
        material.color.setHex(color);
        material.userData.colored = true;
        material.userData.originalColor = color;
        
        return material;
    }
    
    // ========== AGING EFFECTS ==========
    
    applyAging(material, ageYears = 0) {
        if (ageYears <= 0) return material;
        
        const agingFactor = Math.min(1, ageYears / 50);
        
        material.color.setHex(this.darkenColor(material.color.getHex(), agingFactor * 0.3));
        material.roughness += agingFactor * 0.2;
        
        if (material.userData) {
            material.userData.aged = true;
            material.userData.ageYears = ageYears;
        }
        
        return material;
    }
    
    applyCracks(material, crackDensity = 0.1) {
        material.userData.cracks = true;
        material.userData.crackDensity = crackDensity;
        return material;
    }
    
    darkenColor(hex, factor) {
        const r = ((hex >> 16) & 255) * (1 - factor);
        const g = ((hex >> 8) & 255) * (1 - factor);
        const b = (hex & 255) * (1 - factor);
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
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
            if (texture.normalMap) texture.normalMap.dispose();
        }
        this.materials.clear();
        this.textureCache.clear();
        console.log('♻️ ConcreteMaterial disposed');
    }
}

export default ConcreteMaterial;