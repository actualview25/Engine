// ============================================
// EFFECTS MANAGER - مدير المؤثرات البصرية
// يدعم: Bloom, DOF, Motion Blur, Vignette, Color Correction
// ============================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

export class EffectsManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // Effect Composer
        this.composer = null;
        this.passes = new Map();
        
        // إعدادات المؤثرات
        this.settings = {
            bloom: {
                enabled: true,
                strength: 1.2,
                radius: 0.4,
                threshold: 0.1
            },
            dof: {
                enabled: false,
                focusDistance: 5,
                aperture: 0.1,
                maxBlur: 1
            },
            motionBlur: {
                enabled: false,
                velocityScale: 1
            },
            vignette: {
                enabled: true,
                intensity: 0.5,
                darkness: 1.2
            },
            colorCorrection: {
                enabled: true,
                brightness: 1.0,
                contrast: 1.0,
                saturation: 1.0,
                exposure: 1.2
            },
            antiAliasing: {
                enabled: true,
                quality: 'high' // low, medium, high
            },
            afterimage: {
                enabled: false,
                damp: 0.96
            }
        };
        
        // مؤثرات مخصصة
        this.customEffects = new Map();
        
        // حالة المؤثرات
        this.isInitialized = false;
        
        console.log('✨ EffectsManager initialized');
    }
    
    // ========== INITIALIZATION ==========
    
    initialize() {
        if (this.isInitialized) return;
        
        // إنشاء EffectComposer
        this.composer = new EffectComposer(this.renderer);
        
        // Render Pass (أساسي)
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        this.passes.set('render', renderPass);
        
        // إضافة المؤثرات حسب الإعدادات
        this.setupBloom();
        this.setupVignette();
        this.setupColorCorrection();
        this.setupAntiAliasing();
        
        this.isInitialized = true;
        console.log('✅ EffectsManager initialized');
    }
    
    // ========== BLOOM EFFECT ==========
    
    setupBloom() {
        if (!this.settings.bloom.enabled) return;
        
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.settings.bloom.strength,
            this.settings.bloom.radius,
            this.settings.bloom.threshold
        );
        
        bloomPass.renderToScreen = false;
        this.composer.addPass(bloomPass);
        this.passes.set('bloom', bloomPass);
        
        console.log('✨ Bloom effect enabled');
    }
    
    updateBloom(strength = null, radius = null, threshold = null) {
        const bloomPass = this.passes.get('bloom');
        if (!bloomPass) return;
        
        if (strength !== null) {
            this.settings.bloom.strength = strength;
            bloomPass.strength = strength;
        }
        if (radius !== null) {
            this.settings.bloom.radius = radius;
            bloomPass.radius = radius;
        }
        if (threshold !== null) {
            this.settings.bloom.threshold = threshold;
            bloomPass.threshold = threshold;
        }
        
        this.notifyListeners('bloomUpdated', this.settings.bloom);
    }
    
    setBloomEnabled(enabled) {
        this.settings.bloom.enabled = enabled;
        
        if (enabled && !this.passes.has('bloom')) {
            this.setupBloom();
        } else if (!enabled && this.passes.has('bloom')) {
            const bloomPass = this.passes.get('bloom');
            this.composer.removePass(bloomPass);
            this.passes.delete('bloom');
        }
        
        this.notifyListeners('bloomToggled', enabled);
    }
    
    // ========== VIGNETTE EFFECT ==========
    
    setupVignette() {
        if (!this.settings.vignette.enabled) return;
        
        // Shader مخصص للـ Vignette
        const vignetteShader = {
            uniforms: {
                tDiffuse: { value: null },
                intensity: { value: this.settings.vignette.intensity },
                darkness: { value: this.settings.vignette.darkness }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float intensity;
                uniform float darkness;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    vec2 uv = vUv - 0.5;
                    float dist = length(uv);
                    float vignette = 1.0 - intensity * dist;
                    vignette = pow(vignette, darkness);
                    color.rgb *= vignette;
                    gl_FragColor = color;
                }
            `
        };
        
        const vignettePass = new ShaderPass(vignetteShader);
        vignettePass.renderToScreen = false;
        this.composer.addPass(vignettePass);
        this.passes.set('vignette', vignettePass);
        
        console.log('🎨 Vignette effect enabled');
    }
    
    updateVignette(intensity = null, darkness = null) {
        const vignettePass = this.passes.get('vignette');
        if (!vignettePass) return;
        
        if (intensity !== null) {
            this.settings.vignette.intensity = intensity;
            vignettePass.uniforms.intensity.value = intensity;
        }
        if (darkness !== null) {
            this.settings.vignette.darkness = darkness;
            vignettePass.uniforms.darkness.value = darkness;
        }
        
        this.notifyListeners('vignetteUpdated', this.settings.vignette);
    }
    
    setVignetteEnabled(enabled) {
        this.settings.vignette.enabled = enabled;
        
        if (enabled && !this.passes.has('vignette')) {
            this.setupVignette();
        } else if (!enabled && this.passes.has('vignette')) {
            const vignettePass = this.passes.get('vignette');
            this.composer.removePass(vignettePass);
            this.passes.delete('vignette');
        }
        
        this.notifyListeners('vignetteToggled', enabled);
    }
    
    // ========== COLOR CORRECTION ==========
    
    setupColorCorrection() {
        if (!this.settings.colorCorrection.enabled) return;
        
        // Shader لتصحيح الألوان
        const colorCorrectionShader = {
            uniforms: {
                tDiffuse: { value: null },
                brightness: { value: this.settings.colorCorrection.brightness },
                contrast: { value: this.settings.colorCorrection.contrast },
                saturation: { value: this.settings.colorCorrection.saturation },
                exposure: { value: this.settings.colorCorrection.exposure }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float brightness;
                uniform float contrast;
                uniform float saturation;
                uniform float exposure;
                varying vec2 vUv;
                
                vec3 adjustBrightness(vec3 color, float value) {
                    return color + value;
                }
                
                vec3 adjustContrast(vec3 color, float value) {
                    return (color - 0.5) * value + 0.5;
                }
                
                vec3 adjustSaturation(vec3 color, float value) {
                    float gray = dot(color, vec3(0.299, 0.587, 0.114));
                    return mix(vec3(gray), color, value);
                }
                
                vec3 adjustExposure(vec3 color, float value) {
                    return color * pow(2.0, value);
                }
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    vec3 result = color.rgb;
                    
                    result = adjustBrightness(result, brightness - 1.0);
                    result = adjustContrast(result, contrast);
                    result = adjustSaturation(result, saturation);
                    result = adjustExposure(result, exposure);
                    
                    gl_FragColor = vec4(result, color.a);
                }
            `
        };
        
        const colorPass = new ShaderPass(colorCorrectionShader);
        colorPass.renderToScreen = false;
        this.composer.addPass(colorPass);
        this.passes.set('colorCorrection', colorPass);
        
        console.log('🎨 Color correction enabled');
    }
    
    updateColorCorrection(options) {
        const colorPass = this.passes.get('colorCorrection');
        if (!colorPass) return;
        
        if (options.brightness !== undefined) {
            this.settings.colorCorrection.brightness = options.brightness;
            colorPass.uniforms.brightness.value = options.brightness;
        }
        if (options.contrast !== undefined) {
            this.settings.colorCorrection.contrast = options.contrast;
            colorPass.uniforms.contrast.value = options.contrast;
        }
        if (options.saturation !== undefined) {
            this.settings.colorCorrection.saturation = options.saturation;
            colorPass.uniforms.saturation.value = options.saturation;
        }
        if (options.exposure !== undefined) {
            this.settings.colorCorrection.exposure = options.exposure;
            colorPass.uniforms.exposure.value = options.exposure;
        }
        
        this.notifyListeners('colorCorrectionUpdated', this.settings.colorCorrection);
    }
    
    // ========== ANTI-ALIASING ==========
    
    setupAntiAliasing() {
        if (!this.settings.antiAliasing.enabled) return;
        
        const pixelRatio = this.renderer.getPixelRatio();
        const quality = this.settings.antiAliasing.quality;
        
        // إعدادات FXAA
        const fxaaPass = new ShaderPass(FXAAShader);
        
        const pixelWidth = 1 / (window.innerWidth * pixelRatio);
        const pixelHeight = 1 / (window.innerHeight * pixelRatio);
        
        fxaaPass.uniforms['resolution'].value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
        fxaaPass.renderToScreen = false;
        
        this.composer.addPass(fxaaPass);
        this.passes.set('antialiasing', fxaaPass);
        
        console.log(`🔍 Anti-aliasing enabled (${quality} quality)`);
    }
    
    setAntiAliasingQuality(quality) {
        this.settings.antiAliasing.quality = quality;
        
        // إعادة تهيئة الـ Anti-aliasing
        const aaPass = this.passes.get('antialiasing');
        if (aaPass) {
            this.composer.removePass(aaPass);
            this.passes.delete('antialiasing');
        }
        
        this.setupAntiAliasing();
        
        this.notifyListeners('aaQualityChanged', quality);
    }
    
    // ========== AFTERIMAGE EFFECT ==========
    
    setupAfterimage(damp = 0.96) {
        const afterimagePass = new AfterimagePass(damp);
        afterimagePass.renderToScreen = false;
        this.composer.addPass(afterimagePass);
        this.passes.set('afterimage', afterimagePass);
        
        console.log('👻 Afterimage effect enabled');
    }
    
    setAfterimageEnabled(enabled, damp = 0.96) {
        this.settings.afterimage.enabled = enabled;
        
        if (enabled && !this.passes.has('afterimage')) {
            this.setupAfterimage(damp);
        } else if (!enabled && this.passes.has('afterimage')) {
            const afterimagePass = this.passes.get('afterimage');
            this.composer.removePass(afterimagePass);
            this.passes.delete('afterimage');
        }
        
        this.notifyListeners('afterimageToggled', enabled);
    }
    
    // ========== CUSTOM EFFECTS ==========
    
    addCustomEffect(name, shader, renderToScreen = false) {
        const pass = new ShaderPass(shader);
        pass.renderToScreen = renderToScreen;
        
        // إضافة قبل آخر Pass إذا كان موجوداً
        const passes = this.composer.passes;
        const lastIndex = passes.length - 1;
        
        if (lastIndex >= 0) {
            this.composer.addPass(pass, lastIndex);
        } else {
            this.composer.addPass(pass);
        }
        
        this.passes.set(name, pass);
        this.customEffects.set(name, { shader, pass });
        
        console.log(`✨ Custom effect "${name}" added`);
        
        return pass;
    }
    
    removeCustomEffect(name) {
        const effect = this.customEffects.get(name);
        if (effect) {
            this.composer.removePass(effect.pass);
            this.passes.delete(name);
            this.customEffects.delete(name);
            console.log(`🗑️ Custom effect "${name}" removed`);
            return true;
        }
        return false;
    }
    
    updateCustomEffectUniform(name, uniformName, value) {
        const effect = this.customEffects.get(name);
        if (effect && effect.pass.uniforms[uniformName]) {
            effect.pass.uniforms[uniformName].value = value;
            return true;
        }
        return false;
    }
    
    // ========== DEPTH OF FIELD (DOF) ==========
    
    setupDOF() {
        // يتطلب إعدادات إضافية - يمكن إضافة لاحقاً
        console.log('DOF effect requires additional setup');
    }
    
    setDOFEnabled(enabled) {
        this.settings.dof.enabled = enabled;
        this.notifyListeners('dofToggled', enabled);
    }
    
    // ========== MOTION BLUR ==========
    
    setupMotionBlur() {
        // يتطلب velocity buffer - يمكن إضافة لاحقاً
        console.log('Motion blur requires velocity buffer setup');
    }
    
    setMotionBlurEnabled(enabled) {
        this.settings.motionBlur.enabled = enabled;
        this.notifyListeners('motionBlurToggled', enabled);
    }
    
    // ========== RENDERING ==========
    
    render(deltaTime = null) {
        if (!this.composer) {
            this.initialize();
        }
        
        if (this.composer) {
            this.composer.render(deltaTime);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    setSize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        
        // تحديث قياسات الـ FXAA
        const aaPass = this.passes.get('antialiasing');
        if (aaPass && aaPass.uniforms && aaPass.uniforms.resolution) {
            const pixelRatio = this.renderer.getPixelRatio();
            aaPass.uniforms.resolution.value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio));
        }
    }
    
    // ========== SCREENSHOT ==========
    
    takeScreenshot() {
        return new Promise((resolve) => {
            if (!this.renderer) {
                resolve(null);
                return;
            }
            
            // تعطيل المؤثرات مؤقتاً للحصول على صورة نظيفة
            const originalBloom = this.settings.bloom.enabled;
            const originalVignette = this.settings.vignette.enabled;
            
            this.setBloomEnabled(false);
            this.setVignetteEnabled(false);
            
            // إعادة الرسم
            this.render();
            
            // التقاط الصورة
            const canvas = this.renderer.domElement;
            const dataURL = canvas.toDataURL('image/png');
            
            // إعادة تفعيل المؤثرات
            this.setBloomEnabled(originalBloom);
            this.setVignetteEnabled(originalVignette);
            
            resolve(dataURL);
        });
    }
    
    // ========== PRESETS ==========
    
    applyPreset(presetName) {
        const presets = {
            default: {
                bloom: { enabled: true, strength: 1.2, radius: 0.4, threshold: 0.1 },
                vignette: { enabled: true, intensity: 0.5, darkness: 1.2 },
                colorCorrection: { brightness: 1.0, contrast: 1.0, saturation: 1.0, exposure: 1.2 }
            },
            cinematic: {
                bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.05 },
                vignette: { enabled: true, intensity: 0.7, darkness: 1.5 },
                colorCorrection: { brightness: 0.95, contrast: 1.1, saturation: 0.9, exposure: 1.0 }
            },
            dreamy: {
                bloom: { enabled: true, strength: 2.0, radius: 0.8, threshold: 0.0 },
                vignette: { enabled: true, intensity: 0.3, darkness: 1.0 },
                colorCorrection: { brightness: 1.1, contrast: 0.9, saturation: 1.2, exposure: 1.3 }
            },
            realistic: {
                bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
                vignette: { enabled: true, intensity: 0.3, darkness: 1.1 },
                colorCorrection: { brightness: 1.0, contrast: 1.0, saturation: 1.0, exposure: 1.0 }
            },
            vibrant: {
                bloom: { enabled: true, strength: 1.0, radius: 0.3, threshold: 0.2 },
                vignette: { enabled: false },
                colorCorrection: { brightness: 1.05, contrast: 1.15, saturation: 1.3, exposure: 1.1 }
            }
        };
        
        const preset = presets[presetName];
        if (!preset) {
            console.warn(`Preset "${presetName}" not found`);
            return false;
        }
        
        // تطبيق الإعدادات
        if (preset.bloom) {
            this.setBloomEnabled(preset.bloom.enabled);
            if (preset.bloom.enabled) {
                this.updateBloom(preset.bloom.strength, preset.bloom.radius, preset.bloom.threshold);
            }
        }
        
        if (preset.vignette) {
            this.setVignetteEnabled(preset.vignette.enabled);
            if (preset.vignette.enabled && preset.vignette.intensity) {
                this.updateVignette(preset.vignette.intensity, preset.vignette.darkness);
            }
        }
        
        if (preset.colorCorrection) {
            this.updateColorCorrection(preset.colorCorrection);
        }
        
        this.notifyListeners('presetApplied', presetName);
        console.log(`🎨 Preset "${presetName}" applied`);
        
        return true;
    }
    
   // ========== UTILITY ==========
    
    getPass(name) {
        return this.passes.get(name);
    }
    
    getSettings() {
        return { ...this.settings };
    }
    
    resetToDefault() {
        this.applyPreset('default');
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
                    console.error('EffectsManager listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        if (this.composer) {
            for (const [name, pass] of this.passes) {
                this.composer.removePass(pass);
            }
            this.composer = null;
        }
        
        this.passes.clear();
        this.customEffects.clear();
        this.listeners?.clear();
        
        console.log('♻️ EffectsManager disposed');
    }
}

export default EffectsManager;