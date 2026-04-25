// ============================================
// TOOLBAR - شريط الأدوات الرئيسي
// يحتوي على أدوات الرسم، القياس، الهوتسبوت، والتحكم
// ============================================

export class Toolbar {
    constructor(engine = null) {
        this.engine = engine;
        this.toolbar = null;
        this.isVisible = true;
        
        // الأدوات المتاحة
        this.tools = {
            navigate: { icon: '🗺️', name: 'Navigate', shortcut: 'V', active: true },
            distance: { icon: '📏', name: 'Distance', shortcut: 'D', active: false },
            area: { icon: '📐', name: 'Area', shortcut: 'A', active: false },
            volume: { icon: '🧊', name: 'Volume', shortcut: 'L', active: false },
            hotspotInfo: { icon: 'ℹ️', name: 'Info Point', shortcut: 'I', active: false },
            hotspotScene: { icon: '🔗', name: 'Scene Link', shortcut: 'S', active: false },
            path: { icon: '🛤️', name: 'Draw Path', shortcut: 'P', active: false },
            measure3d: { icon: '📊', name: '3D Measure', shortcut: 'M', active: false }
        };
        
        this.activeTool = 'navigate';
        
        console.log('🛠️ Toolbar initialized');
    }
    
    show() {
        if (this.isVisible) return;
        this.createToolbar();
        this.isVisible = true;
    }
    
    hide() {
        if (this.toolbar && this.toolbar.remove) {
            this.toolbar.remove();
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
    
    createToolbar() {
        if (this.toolbar) this.toolbar.remove();
        
        this.toolbar = document.createElement('div');
        this.toolbar.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(30,30,46,0.95);
            backdrop-filter: blur(10px);
            border-radius: 50px;
            padding: 8px 16px;
            display: flex;
            gap: 8px;
            z-index: 1000;
            border: 1px solid rgba(255,170,68,0.3);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        let html = '';
        
        for (const [key, tool] of Object.entries(this.tools)) {
            const isActive = this.activeTool === key;
            html += `
                <button class="tool-btn" data-tool="${key}" style="
                    background: ${isActive ? '#ffaa44' : 'transparent'};
                    border: none;
                    border-radius: 40px;
                    padding: 10px 16px;
                    color: ${isActive ? '#1e1e2e' : '#ccc'};
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: ${isActive ? 'bold' : 'normal'};
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s;
                ">
                    <span style="font-size: 18px;">${tool.icon}</span>
                    <span>${tool.name}</span>
                    <span style="font-size: 10px; color: ${isActive ? '#1e1e2e' : '#888'};">${tool.shortcut}</span>
                </button>
            `;
        }
        
        // إضافة أزرار إضافية
        html += `
            <div style="width:1px; height:30px; background:#444; margin:0 8px;"></div>
            <button id="toolbarSettingsBtn" style="background:transparent; border:none; border-radius:40px; padding:10px 12px; color:#ccc; cursor:pointer;">
                ⚙️
            </button>
            <button id="toolbarHideBtn" style="background:transparent; border:none; border-radius:40px; padding:10px 12px; color:#ff4444; cursor:pointer;">
                ✕
            </button>
        `;
        
        this.toolbar.innerHTML = html;
        document.body.appendChild(this.toolbar);
        
        // ربط الأحداث
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.activateTool(tool);
            });
        });
        
        document.getElementById('toolbarSettingsBtn')?.addEventListener('click', () => {
            if (this.engine?.settingsPanel) {
                this.engine.settingsPanel.toggle();
            }
        });
        
        document.getElementById('toolbarHideBtn')?.addEventListener('click', () => {
            this.hide();
        });
        
        // إضافة اختصارات لوحة المفاتيح
        this.setupKeyboardShortcuts();
    }
    
    activateTool(toolKey) {
        if (!this.tools[toolKey]) return;
        
        // إلغاء تنشيط الأداة السابقة
        if (this.activeTool !== toolKey && this.engine?.eventBus) {
            this.engine.eventBus.emit('tool:deactivated', this.activeTool);
        }
        
        this.activeTool = toolKey;
        
        // تحديث التمييز البصري
        document.querySelectorAll('.tool-btn').forEach(btn => {
            const isActive = btn.dataset.tool === toolKey;
            btn.style.background = isActive ? '#ffaa44' : 'transparent';
            btn.style.color = isActive ? '#1e1e2e' : '#ccc';
            btn.style.fontWeight = isActive ? 'bold' : 'normal';
            
            const shortcutSpan = btn.querySelector('span:last-child');
            if (shortcutSpan) {
                shortcutSpan.style.color = isActive ? '#1e1e2e' : '#888';
            }
        });
        
        // إرسال حدث تنشيط الأداة
        if (this.engine?.eventBus) {
            this.engine.eventBus.emit('tool:activated', toolKey);
        }
        
        console.log(`Tool activated: ${toolKey}`);
    }
    
    setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toUpperCase();
            
            const toolEntry = Object.entries(this.tools).find(([_, tool]) => tool.shortcut === key);
            if (toolEntry) {
                e.preventDefault();
                this.activateTool(toolEntry[0]);
            }
            
            // اختصارات إضافية
            switch(key) {
                case 'H':
                    this.toggle();
                    break;
                case 'ESC':
                    this.activateTool('navigate');
                    break;
            }
        });
    }
    
    getActiveTool() {
        return this.activeTool;
    }
    
    setToolActive(toolKey, active) {
        if (this.tools[toolKey]) {
            this.tools[toolKey].active = active;
            if (active) {
                this.activateTool(toolKey);
            } else if (this.activeTool === toolKey) {
                this.activateTool('navigate');
            }
        }
    }
    
    addCustomTool(key, tool) {
        this.tools[key] = tool;
        if (this.isVisible) {
            this.createToolbar();
        }
    }
    
    removeCustomTool(key) {
        delete this.tools[key];
        if (this.isVisible) {
            this.createToolbar();
        }
    }
    
    dispose() {
        this.hide();
    }
}

export default Toolbar;