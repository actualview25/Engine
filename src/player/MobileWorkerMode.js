// ============================================
// MOBILE WORKER MODE - وضعية العامل على الأجهزة المحمولة
// يدعم: واجهة مبسطة، تحكم باللمس، وضع عدم الاتصال، مزامنة
// ============================================

import WorkerMode from './WorkerMode.js';

export class MobileWorkerMode extends WorkerMode {
    constructor(engine = null) {
        super(engine);
        
        this.workerRole = 'mobile';
        
        // إعدادات الجوال
        this.settings = {
            ...this.settings,
            touchEnabled: true,
            offlineMode: false,
            syncOnReconnect: true,
            lowQualityMode: true,
            batteryOptimization: true,
            dataSaverMode: false,
            autoSyncInterval: 60000 // 1 minute
        };
        
        // حالة الاتصال
        this.isOnline = navigator.onLine;
        this.offlineQueue = [];
        this.syncInterval = null;
        self.lastSyncTime = null;
        
        // تحسينات الجوال
        self.batteryLevel = null;
        self.networkType = 'unknown';
        self.screenOrientation = screen.orientation?.type || 'portrait';
        
        // إيماءات اللمس
        self.touchGestures = {
            tap: null,
            doubleTap: null,
            longPress: null,
            swipe: null,
            pinch: null
        };
        
        // أحداث الجوال
        this.setupMobileListeners();
        
        console.log('📱 MobileWorkerMode initialized');
    }
    
    // ========== MOBILE SETUP ==========
    
    setupMobileListeners() {
        // مراقبة حالة الاتصال
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // مراقبة البطارية
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                this.updateBatteryInfo(battery);
                battery.addEventListener('levelchange', () => this.updateBatteryInfo(battery));
                battery.addEventListener('chargingchange', () => this.updateBatteryInfo(battery));
            });
        }
        
        // مراقبة الشبكة
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.updateNetworkInfo(connection);
            connection.addEventListener('change', () => this.updateNetworkInfo(connection));
        }
        
        // مراقبة اتجاه الشاشة
        screen.orientation?.addEventListener('change', () => {
            this.screenOrientation = screen.orientation.type;
            this.notifyListeners('orientationChanged', this.screenOrientation);
        });
        
        // إيماءات اللمس
        this.setupTouchGestures();
    }
    
    setupTouchGestures() {
        let touchStart = null;
        let touchStartTime = null;
        let lastTap = 0;
        
        const element = this.engine?.renderer?.domElement || document.body;
        
        element.addEventListener('touchstart', (e) => {
            touchStart = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            };
            touchStartTime = Date.now();
        });
        
        element.addEventListener('touchend', (e) => {
            if (!touchStart) return;
            
            const touchEnd = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY,
                time: Date.now()
            };
            
            const duration = touchEnd.time - touchStart.time;
            const distance = Math.hypot(touchEnd.x - touchStart.x, touchEnd.y - touchStart.y);
            
            // Tap
            if (duration < 200 && distance < 10) {
                const now = Date.now();
                if (now - lastTap < 300) {
                    this.handleDoubleTap(touchEnd);
                    lastTap = 0;
                } else {
                    this.handleTap(touchEnd);
                    lastTap = now;
                }
            }
            // Long press
            else if (duration > 500 && distance < 20) {
                this.handleLongPress(touchStart);
            }
            // Swipe
            else if (duration < 300 && distance > 50) {
                const dx = touchEnd.x - touchStart.x;
                const dy = touchEnd.y - touchStart.y;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.handleSwipe(dx > 0 ? 'right' : 'left', dx);
                } else {
                    this.handleSwipe(dy > 0 ? 'down' : 'up', dy);
                }
            }
            
            touchStart = null;
        });
        
        // Pinch gesture
        element.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && this.touchGestures.pinch) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.hypot(dx, dy);
                
                if (this.lastPinchDistance) {
                    const delta = distance - this.lastPinchDistance;
                    this.touchGestures.pinch(delta > 0 ? 'zoomIn' : 'zoomOut', Math.abs(delta));
                }
                this.lastPinchDistance = distance;
            }
        });
        
        element.addEventListener('touchend', () => {
            this.lastPinchDistance = null;
        });
    }
    
    handleTap(position) {
        if (this.touchGestures.tap) {
            this.touchGestures.tap(position);
        }
        this.notifyListeners('tap', position);
    }
    
    handleDoubleTap(position) {
        if (this.touchGestures.doubleTap) {
            this.touchGestures.doubleTap(position);
        }
        this.notifyListeners('doubleTap', position);
    }
    
    handleLongPress(position) {
        if (this.touchGestures.longPress) {
            this.touchGestures.longPress(position);
        }
        this.notifyListeners('longPress', position);
    }
    
    handleSwipe(direction, distance) {
        if (this.touchGestures.swipe) {
            this.touchGestures.swipe(direction, distance);
        }
        this.notifyListeners('swipe', { direction, distance });
    }
    
    registerGesture(gesture, callback) {
        if (this.touchGestures.hasOwnProperty(gesture)) {
            this.touchGestures[gesture] = callback;
        }
    }
    
    // ========== OFFLINE MODE ==========
    
    handleOnline() {
        this.isOnline = true;
        this.settings.offlineMode = false;
        
        this.notifyListeners('online', { timestamp: Date.now() });
        
        if (this.settings.syncOnReconnect) {
            this.syncOfflineData();
        }
        
        if (this.engine && this.engine.eventBus) {
            this.engine.eventBus.emit('mobile:online');
        }
    }
    
    handleOffline() {
        this.isOnline = false;
        
        if (this.settings.offlineMode) {
            this.settings.offlineMode = true;
            this.notifyListeners('offline', { timestamp: Date.now() });
            
            if (this.engine && this.engine.eventBus) {
                this.engine.eventBus.emit('mobile:offline');
            }
        }
    }
    
    queueOfflineAction(action) {
        this.offlineQueue.push({
            ...action,
            queuedAt: Date.now()
        });
        
        this.saveOfflineQueue();
        
        this.notifyListeners('actionQueued', action);
    }
    
    async syncOfflineData() {
        if (!this.isOnline) return;
        if (this.offlineQueue.length === 0) return;
        
        this.notifyListeners('syncStart', { count: this.offlineQueue.length });
        
        const success = [];
        const failed = [];
        
        for (const action of this.offlineQueue) {
            try {
                await this.processOfflineAction(action);
                success.push(action);
            } catch (error) {
                failed.push({ action, error });
            }
        }
        
        this.offlineQueue = failed.map(f => f.action);
        this.saveOfflineQueue();
        this.lastSyncTime = Date.now();
        
        this.notifyListeners('syncComplete', { success: success.length, failed: failed.length });
        
        return { success, failed };
    }
    
    async processOfflineAction(action) {
        switch(action.type) {
            case 'add_note':
                return this.addNote(action.data.text, action.data.location, action.data.category);
            case 'complete_task':
                return this.completeTask(action.data.taskId, action.data.note);
            case 'report_issue':
                return this.reportIssue(action.data.issue, action.data.location, action.data.severity);
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }
    
    saveOfflineQueue() {
        const key = `mobile_${this.workerId}_offline_queue`;
        localStorage.setItem(key, JSON.stringify(this.offlineQueue));
    }
    
    loadOfflineQueue() {
        const key = `mobile_${this.workerId}_offline_queue`;
        const saved = localStorage.getItem(key);
        if (saved) {
            this.offlineQueue = JSON.parse(saved);
        }
    }
    
    // ========== MOBILE OPTIMIZATIONS ==========
    
    updateBatteryInfo(battery) {
        this.batteryLevel = battery.level * 100;
        this.isCharging = battery.charging;
        
        // تحسينات البطارية
        if (this.settings.batteryOptimization) {
            if (this.batteryLevel < 20 && !this.isCharging) {
                this.enableLowPowerMode();
            } else {
                this.disableLowPowerMode();
            }
        }
        
        this.notifyListeners('batteryUpdate', {
            level: this.batteryLevel,
            charging: this.isCharging
        });
    }
    
    updateNetworkInfo(connection) {
        this.networkType = connection.effectiveType || 'unknown';
        
        if (this.settings.dataSaverMode) {
            if (this.networkType === 'slow-2g' || this.networkType === '2g') {
                this.enableDataSaverMode();
            } else {
                this.disableDataSaverMode();
            }
        }
        
        this.notifyListeners('networkUpdate', { type: this.networkType });
    }
    
    enableLowPowerMode() {
        if (this.isLowPowerMode) return;
        
        this.isLowPowerMode = true;
        
        // تقليل جودة العرض
        if (this.engine && this.engine.renderer) {
            this.engine.renderer.setPixelRatio(1);
        }
        
        // تقليل FPS
        if (this.engine && this.engine.setFrameRate) {
            this.engine.setFrameRate(30);
        }
        
        this.notifyListeners('lowPowerModeEnabled');
    }
    
    disableLowPowerMode() {
        if (!this.isLowPowerMode) return;
        
        this.isLowPowerMode = false;
        
        if (this.engine && this.engine.renderer) {
            this.engine.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        }
        
        if (this.engine && this.engine.setFrameRate) {
            this.engine.setFrameRate(60);
        }
        
        this.notifyListeners('lowPowerModeDisabled');
    }
    
    enableDataSaverMode() {
        if (this.isDataSaverMode) return;
        
        this.isDataSaverMode = true;
        
        // تقليل جودة التحميل
        this.settings.lowQualityMode = true;
        
        // تقليل مزامنة البيانات
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = setInterval(() => this.syncOfflineData(), 300000); // 5 minutes
        }
        
        this.notifyListeners('dataSaverModeEnabled');
    }
    
    disableDataSaverMode() {
        if (!this.isDataSaverMode) return;
        
        this.isDataSaverMode = false;
        
        this.settings.lowQualityMode = false;
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.startAutoSync();
        }
        
        this.notifyListeners('dataSaverModeDisabled');
    }
    
    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.isOnline && this.offlineQueue.length > 0) {
                this.syncOfflineData();
            }
        }, this.settings.autoSyncInterval);
    }
    
    // ========== MOBILE ACTIONS ==========
    
    takePhoto() {
        return new Promise((resolve, reject) => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                reject(new Error('Camera not supported'));
                return;
            }
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        resolve({
                            data: event.target.result,
                            name: file.name,
                            size: file.size,
                            timestamp: Date.now()
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error('No photo taken'));
                }
            };
            
            input.click();
        });
    }
    
    recordVoice() {
        return new Promise((resolve, reject) => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                reject(new Error('Microphone not supported'));
                return;
            }
            
            // تبسيط: استخدام ملف صوتي
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        resolve({
                            data: event.target.result,
                            name: file.name,
                            size: file.size,
                            timestamp: Date.now()
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error('No recording'));
                }
            };
            
            input.click();
        });
    }
    
    async addNoteWithPhoto(note, location = null) {
        try {
            const photo = await this.takePhoto();
            
            const newNote = {
                text: note,
                location: location || this.currentLocation,
                photo: photo.data,
                photoName: photo.name,
                timestamp: Date.now()
            };
            
            if (this.isOnline) {
                return this.addNote(note, location);
            } else {
                this.queueOfflineAction({
                    type: 'add_note',
                    data: newNote
                });
                return { queued: true, data: newNote };
            }
        } catch (error) {
            console.error('Failed to add note with photo:', error);
            throw error;
        }
    }
    
    // ========== VOICE COMMANDS ==========
    
    startVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return null;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'ar-SA'; // Arabic
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            this.processVoiceCommand(command);
        };
        
        recognition.onerror = (event) => {
            console.warn('Voice recognition error:', event.error);
            this.notifyListeners('voiceError', event.error);
        };
        
        recognition.start();
        
        return recognition;
    }
    
    processVoiceCommand(command) {
        this.notifyListeners('voiceCommand', command);
        
        // أوامر مبسطة
        if (command.includes('تسجيل ملاحظة') || command.includes('note')) {
            const note = command.replace(/تسجيل ملاحظة|note/i, '').trim();
            if (note) {
                this.addNote(note);
            }
        } else if (command.includes('إكمال مهمة') || command.includes('complete task')) {
            // البحث عن المهمة النشطة وإكمالها
            const activeTasks = this.getActiveTasks();
            if (activeTasks.length > 0) {
                this.completeTask(activeTasks[0].id);
            }
        } else if (command.includes('الموقع') || command.includes('location')) {
            this.notifyListeners('voiceCommandResult', {
                command: 'location',
                result: this.currentLocation
            });
        }
    }
    
    // ========== UTILITY ==========
    
    setTouchEnabled(enabled) {
        this.settings.touchEnabled = enabled;
    }
    
    getMobileStatus() {
        return {
            isOnline: this.isOnline,
            offlineMode: this.settings.offlineMode,
            offlineQueueSize: this.offlineQueue.length,
            lastSyncTime: this.lastSyncTime,
            batteryLevel: this.batteryLevel,
            isCharging: this.isCharging,
            networkType: this.networkType,
            screenOrientation: this.screenOrientation,
            lowPowerMode: this.isLowPowerMode,
            dataSaverMode: this.isDataSaverMode
        };
    }
    
    dispose() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        super.dispose();
        this.offlineQueue = [];
        this.touchGestures = {};
        console.log('♻️ MobileWorkerMode disposed');
    }
}

export default MobileWorkerMode;