// ============================================
// WOOD MATERIAL - مادة الخشب
// يدعم: أنواع الخشب، تشطيبات، حبيبات، شيخوخة
// ============================================

import * as THREE from 'three';

export class WoodMaterial {
    constructor() {
        this.materials = new Map();
        this.textureCache = new Map();
        
        // أنواع الخشب
        this.woodTypes = {
            oak: { color: 0xc8a87c, roughness: 0.6, metalness: 0.05, grainScale: 1.0 },
            walnut: { color: 0x5c3a21, roughness: 0.55, metalness: 0.04, grainScale: 0.8 },
            maple: { color: 0xe8d8a8, roughness: 0.5, metalness: 0.03, grainScale: 1.2 },
            cherry: { color: 0xa0522d, roughness: 0.58, metalness: 0.04, grainScale: 0.9 },
            pine: { color: 0xe8cf9e, roughness: 0.65, metalness: 0.02, grainScale: 1.1 },
            mahogany: { color: 0x6b2e1a, roughness: 0.52, metalness: 0.06, grainScale: 0.7 },
            teak: { color: 0x8b5a2b, roughness: 0.6, metalness: 0.05, grainScale: 0.9 },
            bamboo: { color: 0xd4c87c, roughness: 0.45, metalness: 0.03, grainScale: 1.5 },
            plywood: { color: 0xc8b898, roughness: 0.55, metalness: 0.02, grainScale: 0.5 },
            mdf: { color: 0xb8a888, roughness: 0.6, metalness: 0.01, grainScale: 0.3 }
        };
        
        // تشطيبات الخشب
        this.finishes = {
            raw: { roughness: 0.7, clearcoat: 0 },
            varnished: { roughness: 0.25, clearcoat: 0.9 },
            oiled: { roughness: 0.35, clearcoat: 0.5 },
            waxed: { roughness: 0.3, clearcoat: 0.6 },
            painted: { roughness: 0.4, clearcoat: 0.2 },
            weathered: { roughness: 0.8, clearcoat: 0 }
        };
        
        console.log('🪵 WoodMaterial library initialized');
    }
    
    // ========== MAIN MATERIAL CREATION ==========
    
    createWood(options = {}) {
        const type = options.type || 'oak';
        const finish = options.finish || 'raw';
        const quality = options.quality || 'standard';
        
        const woodType = this.woodTypes[type];
        const woodFinish = this.finishes[finish];
        
        if (!woodType) {
            console.warn(`Unknown wood type: ${type}, using oak`);
            return this.createOakWood(options);
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: options.color || woodType.color,
            roughness: options.roughness || woodFinish.roughness,
            metalness: options.metalness || woodType.metalness,
            clearcoat: woodFinish.clearcoat,
            clearcoatRoughness: 0.25,
            side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide
        });
        
        if (quality !== 'low') {
            this.addWoodTextures(material, type, finish, quality);
        }
        
        material.userData = {
            type: 'wood',
            woodType: type,
            finish: finish,
            quality: quality,
            createdAt: Date.now()
        };
        
        this.materials.set(`${type}_${finish}_${quality}`, material);
        
        return material;
    }
    
    createOakWood(options = {}) {
        const material = new THREE.MeshStandardMaterial({
            color: 0xc8a87c,
            roughness: 0.6,
            metalness: 0.05,
            side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide
        });
        
        return material;
    }
    
    // ========== TEXTURES ==========
    
    async addWoodTextures(material, type, finish, quality) {
        const textureKey = `wood_${type}_${finish}_${quality}`;
        
        if (this.textureCache.has(textureKey)) {
            const textures = this.textureCache.get(textureKey);
            material.map = textures.map;
            material.normalMap = textures.normalMap;
            material.roughnessMap = textures.roughnessMap;
            return;
        }
        
        try {
            const textures = this.generateWoodTextures(type, finish, quality);
            this.textureCache.set(textureKey, textures);
            
            material.map = textures.map;
            material.normalMap = textures.normalMap;
            material.roughnessMap = textures.roughnessMap;
            
        } catch (error) {
            console.warn('Failed to generate wood textures:', error);
        }
    }
    
    generateWoodTextures(type, finish, quality) {
        const size = quality === 'high' ? 1024 : 512;
        const woodType = this.woodTypes[type];
        const grainScale = woodType?.grainScale || 1.0;
        
        const mapCanvas = this.createWoodGrainTexture(size, type, grainScale);
        const normalCanvas = this.createWoodNormalMap(mapCanvas);
        const roughnessCanvas = this.createWoodRoughnessTexture(size, finish);
        
        const mapTexture = new THREE.CanvasTexture(mapCanvas);
        mapTexture.wrapS = THREE.RepeatWrapping;
        mapTexture.wrapT = THREE.RepeatWrapping;
        mapTexture.repeat.set(2, 2);
        
        const normalTexture = new THREE.CanvasTexture(normalCanvas);
        normalTexture.wrapS = THREE.RepeatWrapping;
        normalTexture.wrapT = THREE.RepeatWrapping;
        normalTexture.repeat.set(2, 2);
        
        const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
        roughnessTexture.wrapS = THREE.RepeatWrapping;
        roughnessTexture.wrapT = THREE.RepeatWrapping;
        roughnessTexture.repeat.set(2, 2);
        
        return {
            map: mapTexture,
            normalMap: normalTexture,
            roughnessMap: roughnessTexture
        };
    }
    
    createWoodGrainTexture(size, type, grainScale) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        let baseColor;
        switch(type) {
            case 'walnut': baseColor = '#5c3a21'; break;
            case 'maple': baseColor = '#e8d8a8'; break;
            case 'cherry': baseColor = '#a0522d'; break;
            case 'pine': baseColor = '#e8cf9e'; break;
            case 'mahogany': baseColor = '#6b2e1a'; break;
            default: baseColor = '#c8a87c';
        }
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);
        
        // رسم حبيبات الخشب
        const grainCount = 30 * grainScale;
        for (let i = 0; i < grainCount; i++) {
            const y = (i / grainCount) * size;
            ctx.beginPath();
            
            let x = 0;
            const amplitude = size * 0.05 * Math.sin(i * 0.5);
            
            while (x < size) {
                const offset = Math.sin(x * 0.02) * amplitude + Math.cos(i * 0.3) * amplitude * 0.5;
                ctx.lineTo(x, y + offset);
                x += 5;
            }
            
            const brightness = 30 + Math.sin(i) * 15;
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.15})`;
            ctx.lineWidth = 2 + Math.random() * 3;
            ctx.stroke();
        }
        
        // إضافة عقد الخشب
        const knotCount = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < knotCount; i++) {
            const knotX = Math.random() * size;
            const knotY = Math.random() * size;
            
            ctx.beginPath();
            ctx.arc(knotX, knotY, size * 0.02 + Math.random() * size * 0.01, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
            ctx.fill();
            
            for (let r = 1; r <= 3; r++) {
                ctx.beginPath();
                ctx.arc(knotX, knotY, size * 0.02 * r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 / r})`;
                ctx.stroke();
            }
        }
        
        return canvas;
    }
    
    createWoodNormalMap(sourceCanvas) {
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
                let dx = 0, dy = 0;
                
                if (x > 0 && x < size - 1) {
                    const left = this.getLuminance(sourceData, x - 1, y);
                    const right = this.getLuminance(sourceData, x + 1, y);
                    dx = (right - left) / 255;
                }
                
                if (y > 0 && y < size - 1) {
                    const up = this.getLuminance(sourceData, x, y - 1);
                    const down = this.getLuminance(sourceData, x, y + 1);
                    dy = (down - up) / 255;
                }
                
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
    
    createWoodRoughnessTexture(size, finish) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        let roughness = 128;
        switch(finish) {
            case 'varnished': roughness = 60; break;
            case 'oiled': roughness = 90; break;
            case 'waxed': roughness = 80; break;
            case 'painted': roughness = 100; break;
            case 'weathered': roughness = 200; break;
            default: roughness = 160;
        }
        
        ctx.fillStyle = `rgb(${roughness}, ${roughness}, ${roughness})`;
        ctx.fillRect(0, 0, size, size);
        
        return canvas;
    }
    
    getLuminance(data, x, y) {
        const size = Math.sqrt(data.data.length / 4);
        const idx = (y * size + x) * 4;
        return (data.data[idx] + data.data[idx + 1] + data.data[idx + 2]) / 3;
    }
    
    // ========== SPECIALIZED WOOD ==========
    
    createWalnutWood(options = {}) {
        return this.createWood({ ...options, type: 'walnut', finish: 'varnished' });
    }
    
    createWeatheredWood(options = {}) {
        const material = this.createWood({ ...options, type: 'pine', finish: 'weathered' });
        material.color.setHex(0xb8a080);
        material.roughness = 0.85;
        material.userData.weathered = true;
        return material;
    }
    
    createPlywood(options = {}) {
        return this.createWood({ ...options, type: 'plywood', finish: 'raw' });
    }
    
    // ========== AGING EFFECTS ==========
    
    applyAging(material, ageYears = 0) {
        if (ageYears <= 0) return material;
        
        const agingFactor = Math.min(1, ageYears / 100);
        
        const originalColor = material.userData.originalColor || material.color.getHex();
        const r = ((originalColor >> 16) & 255) * (1 - agingFactor * 0.3);
        const g = ((originalColor >> 8) & 255) * (1 - agingFactor * 0.4);
        const b = (originalColor & 255) * (1 - agingFactor * 0.5);
        
        material.color.setRGB(r / 255, g / 255, b / 255);
        material.roughness += agingFactor * 0.2;
        
        material.userData.aged = true;
        material.userData.ageYears = ageYears;
        
        return material;
    }
    
    applyStain(material, stainColor, intensity = 0.5) {
        const originalColor = material.color.getHex();
        
        const r = ((originalColor >> 16) & 255) * (1 - intensity) + ((stainColor >> 16) & 255) * intensity;
        const g = ((originalColor >> 8) & 255) * (1 - intensity) + ((stainColor >> 8) & 255) * intensity;
        const b = (originalColor & 255) * (1 - intensity) + (stainColor & 255) * intensity;
        
        material.color.setRGB(r / 255, g / 255, b / 255);
        material.userData.stained = true;
        material.userData.stainColor = stainColor;
        
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
            if (texture.normalMap) texture.normalMap.dispose();
            if (texture.roughnessMap) texture.roughnessMap.dispose();
        }
        this.materials.clear();
        this.textureCache.clear();
        console.log('♻️ WoodMaterial disposed');
    }
}

export default WoodMaterial;