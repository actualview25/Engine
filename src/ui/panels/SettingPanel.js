// ============================================
// SETTINGS PANEL - لوحة الإعدادات
// تتحكم في إعدادات التطبيق: العرض، الأداء، اللغة، الخ
// ============================================

export class SettingsPanel {
    constructor(engine = null) {
        this.engine = engine;
        this.panel = null;
        this.isVisible = false;
        
        // الإعدادات
        this.settings = {
            graphics: {
                quality: 'high',
                shadows: true,
                antialiasing: true,
                bloom: true,
                fpsLimit: 60
            },
            camera: {
                sensitivity: 1.0,
                invertY: false,
                autoRotate: false,
                fov: 75
            },
            ui: {
                language: 'ar',
                theme: 'dark',
                showTutorial: true,
                tooltips: true
            },
            audio: {
                enabled: true,
                volume: 0.7,
                ambientVolume: 0.5,
                uiVolume: 0.6
            }
        };
        
        console.log('⚙️ SettingsPanel initialized');
    }
    
    show() {
        if (this.isVisible) return;
        this.createPanel();
        this.isVisible = true;
    }
    
    hide() {
        if (this.panel && this.panel.remove) {
            this.panel.remove();
        }
        this.isVisible = false;
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    createPanel() {
        if (this.panel) this.panel.remove();
        
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-width: 90%;
            max-height: 80vh;
            background: #1e1e2e;
            border-radius: 12px;
            border: 1px solid #ffaa44;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        this.panel.innerHTML = `
            <div style="padding: 15px 20px; background: #2a2a3a; border-bottom: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 20px;">⚙️ Settings</span>
                    </div>
                    <button id="settingsCloseBtn" style="background:transparent; border:none; color:#ff4444; cursor:pointer; font-size:22px;">✕</button>
                </div>
            </div>
            
            <div style="display: flex; height: 100%;">
                <div style="width: 120px; background: #2a2a3a; border-right: 1px solid #333;">
                    <div class="settings-tab" data-tab="graphics" style="padding:12px 15px; cursor:pointer; border-left:3px solid #ffaa44;">🎮 Graphics</div>
                    <div class="settings-tab" data-tab="camera" style="padding:12px 15px; cursor:pointer;">📷 Camera</div>
                    <div class="settings-tab" data-tab="ui" style="padding:12px 15px; cursor:pointer;">🎨 Interface</div>
                    <div class="settings-tab" data-tab="audio" style="padding:12px 15px; cursor:pointer;">🔊 Audio</div>
                </div>
                
                <div id="settingsContent" style="flex:1; padding: 20px; overflow-y: auto;">
                    <!-- Content loaded dynamically -->
                </div>
            </div>
            
            <div style="padding: 15px 20px; background: #2a2a3a; border-top: 1px solid #333; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="settingsSaveBtn" style="padding:8px 20px; background:#44aa44; border:none; border-radius:6px; color:white; cursor:pointer;">💾 Save</button>
                <button id="settingsCancelBtn" style="padding:8px 16px; background:#444; border:none; border-radius:6px; color:white; cursor:pointer;">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(this.panel);
        
        // ربط الأحداث
        document.getElementById('settingsCloseBtn')?.addEventListener('click', () => this.hide());
        document.getElementById('settingsSaveBtn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('settingsCancelBtn')?.addEventListener('click', () => this.hide());
        
        // ربط علامات التبويب
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.settings-tab').forEach(t => {
                    t.style.borderLeftColor = 'transparent';
                    t.style.color = '#888';
                });
                tab.style.borderLeftColor = '#ffaa44';
                tab.style.color = 'white';
                this.loadTabContent(tab.dataset.tab);
            });
        });
        
        this.loadTabContent('graphics');
    }
    
    loadTabContent(tab) {
        const container = document.getElementById('settingsContent');
        if (!container) return;
        
        let html = '';
        
        if (tab === 'graphics') {
            html = `
                <h3 style="color:#ffaa44; margin-bottom:20px;">Graphics Settings</h3>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Graphics Quality</span>
                        <select id="settingQuality" style="background:#2a2a3a; border:1px solid #444; border-radius:6px; padding:5px 10px; color:white;">
                            <option value="low" ${this.settings.graphics.quality === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${this.settings.graphics.quality === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${this.settings.graphics.quality === 'high' ? 'selected' : ''}>High</option>
                            <option value="ultra" ${this.settings.graphics.quality === 'ultra' ? 'selected' : ''}>Ultra</option>
                        </select>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Shadows</span>
                        <input type="checkbox" id="settingShadows" ${this.settings.graphics.shadows ? 'checked' : ''}>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Anti-Aliasing</span>
                        <input type="checkbox" id="settingAA" ${this.settings.graphics.antialiasing ? 'checked' : ''}>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Bloom Effect</span>
                        <input type="checkbox" id="settingBloom" ${this.settings.graphics.bloom ? 'checked' : ''}>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>FPS Limit</span>
                        <select id="settingFPS" style="background:#2a2a3a; border:1px solid #444; border-radius:6px; padding:5px 10px; color:white;">
                            <option value="30" ${this.settings.graphics.fpsLimit === 30 ? 'selected' : ''}>30 FPS</option>
                            <option value="60" ${this.settings.graphics.fpsLimit === 60 ? 'selected' : ''}>60 FPS</option>
                            <option value="120" ${this.settings.graphics.fpsLimit === 120 ? 'selected' : ''}>120 FPS</option>
                            <option value="unlimited" ${this.settings.graphics.fpsLimit === 'unlimited' ? 'selected' : ''}>Unlimited</option>
                        </select>
                    </label>
                </div>
            `;
        } else if (tab === 'camera') {
            html = `
                <h3 style="color:#ffaa44; margin-bottom:20px;">Camera Settings</h3>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Mouse Sensitivity</span>
                        <input type="range" id="settingSensitivity" min="0.2" max="2.0" step="0.05" value="${this.settings.camera.sensitivity}" style="width:150px;">
                        <span id="sensitivityVal">${this.settings.camera.sensitivity.toFixed(2)}</span>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Invert Y-Axis</span>
                        <input type="checkbox" id="settingInvertY" ${this.settings.camera.invertY ? 'checked' : ''}>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Auto Rotate</span>
                        <input type="checkbox" id="settingAutoRotate" ${this.settings.camera.autoRotate ? 'checked' : ''}>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Field of View (FOV)</span>
                        <input type="range" id="settingFOV" min="45" max="120" step="1" value="${this.settings.camera.fov}" style="width:150px;">
                        <span id="fovVal">${this.settings.camera.fov}°</span>
                    </label>
                </div>
            `;
        } else if (tab === 'ui') {
            html = `
                <h3 style="color:#ffaa44; margin-bottom:20px;">Interface Settings</h3>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Language</span>
                        <select id="settingLanguage" style="background:#2a2a3a; border:1px solid #444; border-radius:6px; padding:5px 10px; color:white;">
                            <option value="ar" ${this.settings.ui.language === 'ar' ? 'selected' : ''}>العربية</option>
                            <option value="en" ${this.settings.ui.language === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Theme</span>
                        <select id="settingTheme" style="background:#2a2a3a; border:1px solid #444; border-radius:6px; padding:5px 10px; color:white;">
                            <option value="dark" ${this.settings.ui.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${this.settings.ui.theme === 'light' ? 'selected' : ''}>Light</option>
                        </select>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Show Tutorial</span>
                        <input type="checkbox" id="settingTutorial" ${this.settings.ui.showTutorial ? 'checked' : ''}>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Show Tooltips</span>
                        <input type="checkbox" id="settingTooltips" ${this.settings.ui.tooltips ? 'checked' : ''}>
                    </label>
                </div>
            `;
        } else if (tab === 'audio') {
            html = `
                <h3 style="color:#ffaa44; margin-bottom:20px;">Audio Settings</h3>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Enable Audio</span>
                        <input type="checkbox" id="settingAudioEnabled" ${this.settings.audio.enabled ? 'checked' : ''}>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Master Volume</span>
                        <input type="range" id="settingVolume" min="0" max="1" step="0.01" value="${this.settings.audio.volume}" style="width:150px;">
                        <span id="volumeVal">${Math.round(this.settings.audio.volume * 100)}%</span>
                    </label>
                </div>
                
                <div style="margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between;">
                        <span>Ambient Volume</span>
                        <input type="range" id="settingAmbient" min="0" max="1" step="0.01" value="${this.settings.audio.ambientVolume}" style="width:150px;">
                        <span id="ambientVal">${Math.round(this.settings.audio.ambientVolume * 100)}%</span>
                    </label>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // ربط أحداث العناصر
        this.bindSettingEvents(tab);
    }
    
    bindSettingEvents(tab) {
        if (tab === 'graphics') {
            document.getElementById('settingQuality')?.addEventListener('change', (e) => this.settings.graphics.quality = e.target.value);
            document.getElementById('settingShadows')?.addEventListener('change', (e) => this.settings.graphics.shadows = e.target.checked);
            document.getElementById('settingAA')?.addEventListener('change', (e) => this.settings.graphics.antialiasing = e.target.checked);
            document.getElementById('settingBloom')?.addEventListener('change', (e) => this.settings.graphics.bloom = e.target.checked);
            document.getElementById('settingFPS')?.addEventListener('change', (e) => this.settings.graphics.fpsLimit = e.target.value === 'unlimited' ? 'unlimited' : parseInt(e.target.value));
        } else if (tab === 'camera') {
            const sensitivity = document.getElementById('settingSensitivity');
            const sensitivityVal = document.getElementById('sensitivityVal');
            sensitivity?.addEventListener('input', (e) => {
                this.settings.camera.sensitivity = parseFloat(e.target.value);
                sensitivityVal.textContent = this.settings.camera.sensitivity.toFixed(2);
            });
            
            document.getElementById('settingInvertY')?.addEventListener('change', (e) => this.settings.camera.invertY = e.target.checked);
            document.getElementById('settingAutoRotate')?.addEventListener('change', (e) => this.settings.camera.autoRotate = e.target.checked);
            
            const fov = document.getElementById('settingFOV');
            const fovVal = document.getElementById('fovVal');
            fov?.addEventListener('input', (e) => {
                this.settings.camera.fov = parseInt(e.target.value);
                fovVal.textContent = `${this.settings.camera.fov}°`;
            });
        } else if (tab === 'ui') {
            document.getElementById('settingLanguage')?.addEventListener('change', (e) => this.settings.ui.language = e.target.value);
            document.getElementById('settingTheme')?.addEventListener('change', (e) => this.settings.ui.theme = e.target.value);
            document.getElementById('settingTutorial')?.addEventListener('change', (e) => this.settings.ui.showTutorial = e.target.checked);
            document.getElementById('settingTooltips')?.addEventListener('change', (e) => this.settings.ui.tooltips = e.target.checked);
        } else if (tab === 'audio') {
            document.getElementById('settingAudioEnabled')?.addEventListener('change', (e) => this.settings.audio.enabled = e.target.checked);
            
            const volume = document.getElementById('settingVolume');
            const volumeVal = document.getElementById('volumeVal');
            volume?.addEventListener('input', (e) => {
                this.settings.audio.volume = parseFloat(e.target.value);
                volumeVal.textContent = `${Math.round(this.settings.audio.volume * 100)}%`;
            });
            
            const ambient = document.getElementById('settingAmbient');
            const ambientVal = document.getElementById('ambientVal');
            ambient?.addEventListener('input', (e) => {
                this.settings.audio.ambientVolume = parseFloat(e.target.value);
                ambientVal.textContent = `${Math.round(this.settings.audio.ambientVolume * 100)}%`;
            });
        }
    }
    
    saveSettings() {
        // تطبيق الإعدادات على المحرك
        if (this.engine) {
            if (this.engine.effectsManager && this.settings.graphics.bloom !== undefined) {
                this.engine.effectsManager.setBloomEnabled(this.settings.graphics.bloom);
            }
            
            if (this.engine.camera && this.settings.camera.fov) {
                this.engine.camera.fov = this.settings.camera.fov;
                this.engine.camera.updateProjectionMatrix();
            }
        }
        
        // حفظ في localStorage
        localStorage.setItem('app_settings', JSON.stringify(this.settings));
        
        console.log('Settings saved:', this.settings);
        this.hide();
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem('app_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsed };
                console.log('Settings loaded from storage');
            } catch(e) {}
        }
    }
    
    getSetting(category, key) {
        return this.settings[category]?.[key];
    }
    
    setSetting(category, key, value) {
        if (this.settings[category]) {
            this.settings[category][key] = value;
        }
    }
    
    dispose() {
        this.hide();
    }
}

export default SettingsPanel;