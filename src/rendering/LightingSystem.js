// ============================================
// LIGHTING SYSTEM - نظام الإضاءة المتقدم
// يدعم: إضاءة الشمس، الإضاءة الاصطناعية، الظلال، الإضاءة الديناميكية
// ============================================

import * as THREE from 'three';

export class LightingSystem {
    constructor(scene = null) {
        this.scene = scene;
        
        // مجموعات الإضاءة
        this.lightGroups = {
            ambient: null,
            directional: null,
            point: new Map(),
            spot: new Map(),
            hemisphere: null
        };
        
        // إعدادات الإضاءة
        this.settings = {
            sun: {
                enabled: true,
                intensity: 1.2,
                color: 0xfff5e6,
                position: { x: 30, y: 50, z: 30 },
                castShadow: true,
                shadowMapSize: 2048
            },
            ambient: {
                enabled: true,
                intensity: 0.5,
                color: 0x404060
            },
            hemisphere: {
                enabled: false,
                skyColor: 0x88aaff,
                groundColor: 0x442200,
                intensity: 0.6
            },
            fill: {
                enabled: true,
                intensity: 0.3,
                color: 0x88aaff,
                position: { x: -20, y: 20, z: -30 }
            },
            shadows: {
                enabled: true,
                bias: -0.0005,
                normalBias: 0.05
            }
        };
        
        // إضاءات ديناميكية
        this.dynamicLights = new Map();
        this.timeOfDay = 12; // 0-24 hours
        this.currentSeason = 'summer'; // summer, winter, spring, autumn
        
        // مؤثرات إضافية
        this.fog = null;
        this.tonemapping = {
            exposure: 1.2,
            whitePoint: 1.0
        };
        
        console.log('💡 LightingSystem initialized');
    }
    
    // ========== INITIALIZATION ==========
    
    setup() {
        if (!this.scene) return;
        
        // إضاءة Ambient
        if (this.settings.ambient.enabled) {
            this.setupAmbientLight();
        }
        
        // إضاءة Directional (الشمس)
        if (this.settings.sun.enabled) {
            this.setupSunLight();
        }
        
        // إضاءة Fill
        if (this.settings.fill.enabled) {
            this.setupFillLight();
        }
        
        // إضاءة Hemisphere (اختيارية)
        if (this.settings.hemisphere.enabled) {
            this.setupHemisphereLight();
        }
        
        // إعدادات الظلال العامة
        this.setupShadows();
        
        console.log('✅ Lighting system setup complete');
    }
    
    // ========== LIGHT SETUP ==========
    
    setupAmbientLight() {
        const ambientLight = new THREE.AmbientLight(
            this.settings.ambient.color,
            this.settings.ambient.intensity
        );
        this.scene.add(ambientLight);
        this.lightGroups.ambient = ambientLight;
        
        console.log('💡 Ambient light added');
    }
    
    setupSunLight() {
        const sunLight = new THREE.DirectionalLight(
            this.settings.sun.color,
            this.settings.sun.intensity
        );
        
        sunLight.position.set(
            this.settings.sun.position.x,
            this.settings.sun.position.y,
            this.settings.sun.position.z
        );
        
        if (this.settings.sun.castShadow) {
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = this.settings.sun.shadowMapSize;
            sunLight.shadow.mapSize.height = this.settings.sun.shadowMapSize;
            sunLight.shadow.bias = this.settings.shadows.bias;
            sunLight.shadow.normalBias = this.settings.shadows.normalBias;
            
            // ضبط منطقة الظل
            const shadowSize = 50;
            sunLight.shadow.camera.left = -shadowSize;
            sunLight.shadow.camera.right = shadowSize;
            sunLight.shadow.camera.top = shadowSize;
            sunLight.shadow.camera.bottom = -shadowSize;
            sunLight.shadow.camera.near = 0.5;
            sunLight.shadow.camera.far = 200;
        }
        
        this.scene.add(sunLight);
        this.lightGroups.directional = sunLight;
        
        // إضافة مساعد للتصحيح (اختياري)
        if (this.debugHelper) {
            const helper = new THREE.DirectionalLightHelper(sunLight, 1);
            this.scene.add(helper);
        }
        
        console.log('☀️ Sun light added');
    }
    
    setupFillLight() {
        const fillLight = new THREE.DirectionalLight(
            this.settings.fill.color,
            this.settings.fill.intensity
        );
        fillLight.position.set(
            this.settings.fill.position.x,
            this.settings.fill.position.y,
            this.settings.fill.position.z
        );
        
        this.scene.add(fillLight);
        this.lightGroups.fill = fillLight;
        
        console.log('💡 Fill light added');
    }
    
    setupHemisphereLight() {
        const hemiLight = new THREE.HemisphereLight(
            this.settings.hemisphere.skyColor,
            this.settings.hemisphere.groundColor,
            this.settings.hemisphere.intensity
        );
        
        this.scene.add(hemiLight);
        this.lightGroups.hemisphere = hemiLight;
        
        console.log('🌍 Hemisphere light added');
    }
    
    setupShadows() {
        if (!this.settings.shadows.enabled) return;
        
        // إعدادات الظلال العامة للمشهد
        this.scene.shadowMap.enabled = true;
        this.scene.shadowMap.type = THREE.PCFSoftShadowMap;
        
        console.log('🌑 Shadows enabled');
    }
    
    // ========== POINT LIGHTS ==========
    
    addPointLight(id, options = {}) {
        const defaults = {
            color: 0xffaa44,
            intensity: 1.0,
            distance: 20,
            decay: 1,
            position: { x: 0, y: 2, z: 0 },
            castShadow: true,
            shadowMapSize: 512
        };
        
        const config = { ...defaults, ...options };
        const light = new THREE.PointLight(config.color, config.intensity, config.distance, config.decay);
        
        light.position.set(config.position.x, config.position.y, config.position.z);
        
        if (config.castShadow) {
            light.castShadow = true;
            light.shadow.mapSize.width = config.shadowMapSize;
            light.shadow.mapSize.height = config.shadowMapSize;
        }
        
        this.scene.add(light);
        this.lightGroups.point.set(id, light);
        
        // إضافة مساعد للتصحيح
        if (options.showHelper) {
            const helper = new THREE.PointLightHelper(light, 0.5);
            this.scene.add(helper);
            light.userData.helper = helper;
        }
        
        console.log(`💡 Point light "${id}" added`);
        
        return light;
    }
    
    removePointLight(id) {
        const light = this.lightGroups.point.get(id);
        if (light) {
            if (light.userData.helper) {
                this.scene.remove(light.userData.helper);
            }
            this.scene.remove(light);
            this.lightGroups.point.delete(id);
            console.log(`🗑️ Point light "${id}" removed`);
            return true;
        }
        return false;
    }
    
    updatePointLight(id, options) {
        const light = this.lightGroups.point.get(id);
        if (!light) return false;
        
        if (options.color !== undefined) light.color.setHex(options.color);
        if (options.intensity !== undefined) light.intensity = options.intensity;
        if (options.distance !== undefined) light.distance = options.distance;
        if (options.position !== undefined) {
            light.position.set(options.position.x, options.position.y, options.position.z);
        }
        
        return true;
    }
    
    // ========== SPOT LIGHTS ==========
    
    addSpotLight(id, options = {}) {
        const defaults = {
            color: 0xffaa66,
            intensity: 1.0,
            distance: 30,
            angle: Math.PI / 4,
            penumbra: 0.3,
            decay: 1,
            position: { x: 0, y: 5, z: 0 },
            target: { x: 0, y: 0, z: 0 },
            castShadow: true,
            shadowMapSize: 1024
        };
        
        const config = { ...defaults, ...options };
        const light = new THREE.SpotLight(
            config.color,
            config.intensity,
            config.distance,
            config.angle,
            config.penumbra,
            config.decay
        );
        
        light.position.set(config.position.x, config.position.y, config.position.z);
        
        const targetObject = new THREE.Object3D();
        targetObject.position.set(config.target.x, config.target.y, config.target.z);
        this.scene.add(targetObject);
        light.target = targetObject;
        
        if (config.castShadow) {
            light.castShadow = true;
            light.shadow.mapSize.width = config.shadowMapSize;
            light.shadow.mapSize.height = config.shadowMapSize;
        }
        
        this.scene.add(light);
        this.lightGroups.spot.set(id, { light, target: targetObject });
        
        if (options.showHelper) {
            const helper = new THREE.SpotLightHelper(light);
            this.scene.add(helper);
            light.userData.helper = helper;
        }
        
        console.log(`🔦 Spot light "${id}" added`);
        
        return light;
    }
    
    removeSpotLight(id) {
        const data = this.lightGroups.spot.get(id);
        if (data) {
            if (data.light.userData.helper) {
                this.scene.remove(data.light.userData.helper);
            }
            this.scene.remove(data.light);
            this.scene.remove(data.target);
            this.lightGroups.spot.delete(id);
            console.log(`🗑️ Spot light "${id}" removed`);
            return true;
        }
        return false;
    }
    
    // ========== DYNAMIC LIGHTING ==========
    
    updateTimeOfDay(hour) {
        this.timeOfDay = Math.max(0, Math.min(24, hour));
        
        // حساب زاوية الشمس
        const sunAngle = (this.timeOfDay - 12) * 15 * Math.PI / 180;
        const sunHeight = Math.sin(sunAngle);
        const sunIntensity = Math.max(0, Math.min(1.2, sunHeight * 1.5));
        
        // تحديث إضاءة الشمس
        if (this.lightGroups.directional) {
            const radius = 50;
            const x = Math.cos(sunAngle) * radius;
            const z = Math.sin(sunAngle) * radius;
            const y = Math.sin(sunAngle) * radius * 0.8;
            
            this.lightGroups.directional.position.set(x, y + 20, z);
            this.lightGroups.directional.intensity = sunIntensity;
            
            // تغيير لون الشمس حسب الوقت
            if (this.timeOfDay < 6 || this.timeOfDay > 18) {
                // غروب/شروق - لون دافئ
                this.lightGroups.directional.color.setHex(0xff8866);
            } else if (this.timeOfDay < 8 || this.timeOfDay > 16) {
                // الصباح الباكر/العصر
                this.lightGroups.directional.color.setHex(0xffccaa);
            } else {
                // منتصف النهار
                this.lightGroups.directional.color.setHex(0xfff5e6);
            }
        }
        
        // تحديث الإضاءة المحيطة حسب الوقت
        if (this.lightGroups.ambient) {
            const ambientIntensity = 0.3 + (sunIntensity * 0.3);
            this.lightGroups.ambient.intensity = Math.min(0.8, ambientIntensity);
            
            // تغيير لون الإضاءة المحيطة
            if (this.timeOfDay < 6 || this.timeOfDay > 18) {
                this.lightGroups.ambient.color.setHex(0x334455);
            } else {
                this.lightGroups.ambient.color.setHex(0x404060);
            }
        }
        
        this.notifyListeners('timeOfDayChanged', { hour: this.timeOfDay, intensity: sunIntensity });
        
        return { hour: this.timeOfDay, intensity: sunIntensity };
    }
    
    updateSeason(season) {
        this.currentSeason = season;
        
        // تغيير الإضاءة حسب الفصل
        let intensityMultiplier = 1.0;
        let colorShift = 0;
        
        switch(season) {
            case 'summer':
                intensityMultiplier = 1.2;
                colorShift = 0xffeecc;
                break;
            case 'winter':
                intensityMultiplier = 0.7;
                colorShift = 0xccddff;
                break;
            case 'spring':
                intensityMultiplier = 1.0;
                colorShift = 0xddffcc;
                break;
            case 'autumn':
                intensityMultiplier = 0.9;
                colorShift = 0xffccaa;
                break;
        }
        
        if (this.lightGroups.directional) {
            this.lightGroups.directional.intensity = this.settings.sun.intensity * intensityMultiplier;
            if (colorShift) {
                this.lightGroups.directional.color.setHex(colorShift);
            }
        }
        
        this.notifyListeners('seasonChanged', season);
    }
    
    // ========== ANIMATION ==========
    
    animateDayNightCycle(speed = 0.1) {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
        
        this.animationInterval = setInterval(() => {
            let newTime = this.timeOfDay + (speed / 3600);
            if (newTime >= 24) newTime -= 24;
            this.updateTimeOfDay(newTime);
        }, 100);
        
        console.log(`🔄 Day/night cycle started (speed: ${speed}x)`);
    }
    
    stopDayNightCycle() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        console.log('⏹️ Day/night cycle stopped');
    }
    
    // ========== FOG & ATMOSPHERE ==========
    
    addFog(type = 'exponential', options = {}) {
        if (this.fog) {
            this.scene.fog = null;
        }
        
        const defaults = {
            color: 0x88aaff,
            density: 0.02,
            near: 50,
            far: 300
        };
        
        const config = { ...defaults, ...options };
        
        if (type === 'linear') {
            this.fog = new THREE.Fog(config.color, config.near, config.far);
        } else {
            this.fog = new THREE.FogExp2(config.color, config.density);
        }
        
        this.scene.fog = this.fog;
        
        console.log(`🌫️ Fog added (${type})`);
        
        return this.fog;
    }
    
    removeFog() {
        this.scene.fog = null;
        this.fog = null;
        console.log('🌫️ Fog removed');
    }
    
    updateFog(options) {
        if (!this.fog) return;
        
        if (options.color !== undefined) this.fog.color.setHex(options.color);
        if (this.fog.isFogExp2 && options.density !== undefined) this.fog.density = options.density;
        if (this.fog.isFog && options.near !== undefined) this.fog.near = options.near;
        if (this.fog.isFog && options.far !== undefined) this.fog.far = options.far;
    }
    
    // ========== INTENSITY CONTROL ==========
    
    setGlobalIntensity(multiplier) {
        multiplier = Math.max(0, Math.min(2, multiplier));
        
        if (this.lightGroups.ambient) {
            this.lightGroups.ambient.intensity = this.settings.ambient.intensity * multiplier;
        }
        
        if (this.lightGroups.directional) {
            this.lightGroups.directional.intensity = this.settings.sun.intensity * multiplier;
        }
        
        for (const [_, light] of this.lightGroups.point) {
            light.intensity = light.userData.originalIntensity || light.intensity;
            light.intensity *= multiplier;
        }
        
        this.notifyListeners('globalIntensityChanged', multiplier);
    }
    
    setTonemapping(exposure = 1.2, whitePoint = 1.0) {
        this.tonemapping.exposure = exposure;
        this.tonemapping.whitePoint = whitePoint;
        
        if (this.scene && this.scene.renderer) {
            this.scene.renderer.toneMappingExposure = exposure;
            this.scene.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        }
        
        this.notifyListeners('tonemappingChanged', { exposure, whitePoint });
    }
    
    // ========== DEBUG ==========
    
    enableDebugHelpers() {
        this.debugHelper = true;
        
        if (this.lightGroups.directional) {
            const helper = new THREE.DirectionalLightHelper(this.lightGroups.directional, 1);
            this.scene.add(helper);
            this.lightGroups.directional.userData.debugHelper = helper;
        }
        
        for (const [id, light] of this.lightGroups.point) {
            const helper = new THREE.PointLightHelper(light, 0.5);
            this.scene.add(helper);
            light.userData.debugHelper = helper;
        }
        
        console.log('🐛 Lighting debug helpers enabled');
    }
    
    disableDebugHelpers() {
        this.debugHelper = false;
        
        if (this.lightGroups.directional?.userData.debugHelper) {
            this.scene.remove(this.lightGroups.directional.userData.debugHelper);
        }
        
        for (const [_, light] of this.lightGroups.point) {
            if (light.userData.debugHelper) {
                this.scene.remove(light.userData.debugHelper);
            }
        }
        
        console.log('🐛 Lighting debug helpers disabled');
    }
    
  // ========== PRESETS ==========
    
    applyPreset(presetName) {
        const presets = {
            daylight: {
                sun: { intensity: 1.2, color: 0xfff5e6, position: { x: 30, y: 50, z: 30 } },
                ambient: { intensity: 0.5, color: 0x404060 },
                fill: { intensity: 0.3, color: 0x88aaff }
            },
            sunset: {
                sun: { intensity: 0.6, color: 0xff6633, position: { x: 40, y: 10, z: 30 } },
                ambient: { intensity: 0.3, color: 0x663355 },
                fill: { intensity: 0.5, color: 0xffaa88 }
            },
            night: {
                sun: { intensity: 0.05, color: 0x335588, position: { x: -30, y: -10, z: 30 } },
                ambient: { intensity: 0.15, color: 0x112233 },
                fill: { intensity: 0.1, color: 0x88aaff }
            },
            studio: {
                sun: { intensity: 0.8, color: 0xffffff, position: { x: 10, y: 30, z: 20 } },
                ambient: { intensity: 0.6, color: 0xffffff },
                fill: { intensity: 0.4, color: 0xaaccff }
            }
        };
        
        const preset = presets[presetName];
        if (!preset) {
            console.warn(`Preset "${presetName}" not found`);
            return false;
        }
        
        if (preset.sun && this.lightGroups.directional) {
            this.lightGroups.directional.intensity = preset.sun.intensity;
            this.lightGroups.directional.color.setHex(preset.sun.color);
            if (preset.sun.position) {
                this.lightGroups.directional.position.set(
                    preset.sun.position.x,
                    preset.sun.position.y,
                    preset.sun.position.z
                );
            }
        }
        
        if (preset.ambient && this.lightGroups.ambient) {
            this.lightGroups.ambient.intensity = preset.ambient.intensity;
            this.lightGroups.ambient.color.setHex(preset.ambient.color);
        }
        
        if (preset.fill && this.lightGroups.fill) {
            this.lightGroups.fill.intensity = preset.fill.intensity;
            this.lightGroups.fill.color.setHex(preset.fill.color);
        }
        
        this.notifyListeners('presetApplied', presetName);
        console.log(`💡 Lighting preset "${presetName}" applied`);
        
        return true;
    }
    
    // ========== UTILITY ==========
    
    getLights() {
        return {
            ambient: this.lightGroups.ambient,
            directional: this.lightGroups.directional,
            point: Array.from(this.lightGroups.point.entries()),
            spot: Array.from(this.lightGroups.spot.entries())
        };
    }
    
    getSunIntensity() {
        return this.lightGroups.directional?.intensity || 0;
    }
    
    getAmbientIntensity() {
        return this.lightGroups.ambient?.intensity || 0;
    }
    
    // ========== EVENT SYSTEM ==========
    
    on(event, callback) {
        if (!this.listeners) this.listeners = new Map();
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners && this.listeners.has(event)) {
            const filtered = this.listeners.get(event).filter(cb => cb !== callback);
            if (filtered.length === 0) {
                this.listeners.delete(event);
            } else {
                this.listeners.set(event, filtered);
            }
        }
    }
    
    notifyListeners(event, data) {
        if (this.listeners && this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('LightingSystem listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        if (this.lightGroups.ambient) this.scene?.remove(this.lightGroups.ambient);
        if (this.lightGroups.directional) this.scene?.remove(this.lightGroups.directional);
        if (this.lightGroups.hemisphere) this.scene?.remove(this.lightGroups.hemisphere);
        if (this.lightGroups.fill) this.scene?.remove(this.lightGroups.fill);
        
        for (const [_, light] of this.lightGroups.point) {
            this.scene?.remove(light);
        }
        
        for (const [_, data] of this.lightGroups.spot) {
            this.scene?.remove(data.light);
            this.scene?.remove(data.target);
        }
        
        this.stopDayNightCycle();
        this.listeners?.clear();
        
        console.log('♻️ LightingSystem disposed');
    }
}

export default LightingSystem;