// ============================================
// PANORAMA RENDERER - إدارة الكرات 360
// من Studio مطور
// ============================================

import * as THREE from 'three';

export class PanoramaRenderer {
    constructor(scene, eventBus) {
        this.scene = scene;
        this.eventBus = eventBus;
        this.currentSphere = null;
        this.currentTexture = null;
        this.isLoading = false;
        this.loadingProgress = 0;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('panorama:load', (url) => {
            this.loadPanorama(url);
        });
        
        this.eventBus.on('panorama:unload', () => {
            this.unloadPanorama();
        });
    }
    
    async loadPanorama(url) {
        if (this.isLoading) {
            console.warn('Already loading a panorama');
            return;
        }
        
        this.isLoading = true;
        this.eventBus.emit('panorama:loading', { url });
        
        try {
            const texture = await this.loadTexture(url);
            
            // تطبيق إعدادات النسيج
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.repeat.x = -1; // عكس الاتجاه لبعض الصور
            
            // إنشاء أو تحديث الكرة
            if (this.currentSphere) {
                this.currentSphere.material.map = texture;
                this.currentSphere.material.needsUpdate = true;
            } else {
                const geometry = new THREE.SphereGeometry(500, 64, 64);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide,
                    depthWrite: false,
                    transparent: true
                });
                
                this.currentSphere = new THREE.Mesh(geometry, material);
                this.currentSphere.renderOrder = -1;
                this.scene.add(this.currentSphere);
            }
            
            this.currentTexture = texture;
            this.isLoading = false;
            
            this.eventBus.emit('panorama:loaded', { url, success: true });
            
        } catch (error) {
            this.isLoading = false;
            console.error('Failed to load panorama:', error);
            this.eventBus.emit('panorama:error', { url, error });
        }
    }
    
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            // دعم URL objects
            const finalUrl = url instanceof File ? URL.createObjectURL(url) : url;
            
            const loader = new THREE.TextureLoader();
            loader.load(
                finalUrl,
                (texture) => {
                    if (url instanceof File) {
                        URL.revokeObjectURL(finalUrl);
                    }
                    resolve(texture);
                },
                (progress) => {
                    this.loadingProgress = progress.loaded / progress.total;
                    this.eventBus.emit('panorama:progress', this.loadingProgress);
                },
                (error) => reject(error)
            );
        });
    }
    
    unloadPanorama() {
        if (this.currentSphere) {
            if (this.currentSphere.material) {
                this.currentSphere.material.dispose();
            }
            this.scene.remove(this.currentSphere);
            this.currentSphere = null;
        }
        
        if (this.currentTexture) {
            this.currentTexture.dispose();
            this.currentTexture = null;
        }
        
        this.eventBus.emit('panorama:unloaded');
    }
    
    setOpacity(opacity) {
        if (this.currentSphere && this.currentSphere.material) {
            this.currentSphere.material.transparent = opacity < 1;
            this.currentSphere.material.opacity = opacity;
        }
    }
    
    getCurrentPanorama() {
        return this.currentTexture ? this.currentTexture.image?.src : null;
    }
}