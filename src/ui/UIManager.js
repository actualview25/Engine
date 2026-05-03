// ============================================
// UI MANAGER - واجهة المستخدم
// خفيفة ومرنة، بدون اعتماد على window
// ============================================

export class UIManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.activeTool = 'navigate';
        this.statusElement = null;
        this.buttons = {};
        
        this.setupEventListeners();
    }
    
    init() {
        this.bindElements();
        this.bindEvents();
        this.updateActiveButton();
    }
    
    setupEventListeners() {
        this.eventBus.on('ui:status', (message) => {
            this.updateStatus(message);
        });
        
        this.eventBus.on('ui:loading', (show) => {
            this.showLoading(show);
        });
        
        this.eventBus.on('tool:activate', (tool) => {
            this.setActiveTool(tool);
        });
        
        this.eventBus.on('tool:deactivate', () => {
            this.setActiveTool('navigate');
        });
    }
    
    bindElements() {
        // البحث عن الأزرار في DOM
        this.buttons = {
            navigate: document.getElementById('btnNavigate'),
            distance: document.getElementById('btnDistance'),
            area: document.getElementById('btnArea'),
            hotspotInfo: document.getElementById('btnHotspotInfo'),
            hotspotScene: document.getElementById('btnHotspotScene'),
            export: document.getElementById('btnExport'),
            reset: document.getElementById('btnReset')
        };
        
        this.statusElement = document.getElementById('toolStatus');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }
    
    bindEvents() {
        // تصفح
        if (this.buttons.navigate) {
            this.buttons.navigate.addEventListener('click', () => {
                this.setActiveTool('navigate');
                this.eventBus.emit('tool:activate', 'navigate');
                this.eventBus.emit('ui:status', '🟢 وضع التصفح');
            });
        }
        
        // قياس المسافة
        if (this.buttons.distance) {
            this.buttons.distance.addEventListener('click', () => {
                this.setActiveTool('distance');
                this.eventBus.emit('tool:activate', 'distance');
                this.eventBus.emit('ui:status', '📏 اضغط على نقطتين لقياس المسافة');
            });
        }
        
        // قياس المساحة
        if (this.buttons.area) {
            this.buttons.area.addEventListener('click', () => {
                this.setActiveTool('area');
                this.eventBus.emit('tool:activate', 'area');
                this.eventBus.emit('ui:status', '📐 اضغط على 3 نقاط على الأقل لقياس المساحة');
            });
        }
        
        // إضافة نقطة معلومات
        if (this.buttons.hotspotInfo) {
            this.buttons.hotspotInfo.addEventListener('click', () => {
                this.setActiveTool('hotspot-info');
                this.eventBus.emit('tool:activate', 'hotspot-info');
                this.eventBus.emit('ui:status', 'ℹ️ اضغط على المشهد لإضافة نقطة معلومات');
            });
        }
        
        // إضافة نقطة انتقال
        if (this.buttons.hotspotScene) {
            this.buttons.hotspotScene.addEventListener('click', () => {
                this.setActiveTool('hotspot-scene');
                this.eventBus.emit('tool:activate', 'hotspot-scene');
                this.eventBus.emit('ui:status', '🔗 اضغط على المشهد لإضافة نقطة انتقال');
            });
        }
        
        // تصدير المشروع
        if (this.buttons.export) {
            this.buttons.export.addEventListener('click', () => {
                this.eventBus.emit('project:export');
                this.updateStatus('💾 جاري تصدير المشروع...');
            });
        }
        
        // إعادة تعيين
        if (this.buttons.reset) {
            this.buttons.reset.addEventListener('click', () => {
                this.eventBus.emit('camera:reset');
                this.updateStatus('🔄 تم إعادة تعيين الكاميرا');
            });
        }
    }
    
    setActiveTool(tool) {
        this.activeTool = tool;
        this.updateActiveButton();
    }
    
    getActiveTool() {
        return this.activeTool;
    }
    
    updateActiveButton() {
        // إزالة الكلاس active من جميع الأزرار
        for (const [key, button] of Object.entries(this.buttons)) {
            if (button) {
                button.classList.remove('active');
            }
        }
        
        // إضافة الكلاس active للزر النشط
        const activeButton = this.buttons[this.activeTool.replace('-', '')];
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    updateStatus(message) {
        if (this.statusElement) {
            this.statusElement.innerHTML = message;
            
            // إخفاء الرسالة بعد 3 ثوانٍ إذا لم تكن حالة أداة
            if (!message.includes('وضع') && !message.includes('اضغط')) {
                setTimeout(() => {
                    if (this.statusElement.innerHTML === message) {
                        const modeNames = {
                            'navigate': '🟢 التصفح',
                            'distance': '📏 قياس المسافة',
                            'area': '📐 قياس المساحة',
                            'hotspot-info': 'ℹ️ إضافة معلومات',
                            'hotspot-scene': '🔗 ربط مشهد'
                        };
                        this.statusElement.innerHTML = `${modeNames[this.activeTool] || '🟢 جاهز'}`;
                    }
                }, 3000);
            }
        }
    }
    
    showLoading(show) {
        if (this.loadingOverlay) {
            if (show) {
                this.loadingOverlay.style.opacity = '1';
                this.loadingOverlay.style.pointerEvents = 'auto';
            } else {
                this.loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (this.loadingOverlay) {
                        this.loadingOverlay.style.pointerEvents = 'none';
                    }
                }, 500);
            }
        }
    }
    
    showSuccess(message) {
        this.updateStatus(`✅ ${message}`);
        
        // تأثير بصري إضافي يمكن إضافته
        const status = this.statusElement;
        if (status) {
            status.style.background = 'rgba(0,0,0,0.9)';
            status.style.color = '#44ff44';
            setTimeout(() => {
                if (status) {
                    status.style.background = 'rgba(0,0,0,0.7)';
                    status.style.color = '#ffaa44';
                }
            }, 1000);
        }
    }
    
    showError(message) {
        this.updateStatus(`❌ ${message}`);
        
        const status = this.statusElement;
        if (status) {
            status.style.background = 'rgba(255,0,0,0.3)';
            setTimeout(() => {
                if (status) {
                    status.style.background = 'rgba(0,0,0,0.7)';
                }
            }, 2000);
        }
    }
}
