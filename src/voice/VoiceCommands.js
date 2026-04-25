// ============================================
// VOICE COMMANDS - نظام الأوامر الصوتية
// تنفيذ أوامر صوتية للتحكم في التطبيق والتنقل
// ============================================

import SpeechRecognizer from './SpeechRecognizer.js';
import TextToSpeech from './TextToSpeech.js';

export class VoiceCommands {
    constructor(engine = null) {
        this.engine = engine;
        
        // مكونات الصوت
        this.recognizer = new SpeechRecognizer();
        this.tts = new TextToSpeech();
        
        // حالة النظام
        this.isActive = false;
        this.isListening = false;
        this.confirmationRequired = true;
        
        // الأوامر المسجلة
        this.commands = new Map();
        
        // سجل الأوامر
        this.commandHistory = [];
        this.maxHistorySize = 50;
        
        // معالج الأحداث
        this.listeners = new Map();
        
        // تسجيل الأوامر الافتراضية
        this.registerDefaultCommands();
        
        // ربط أحداث التعرف
        this.setupRecognizerEvents();
        
        console.log('🎙️ VoiceCommands initialized');
    }
    
    // ========== COMMAND REGISTRATION ==========
    
    registerDefaultCommands() {
        // أوامر التنقل
        this.registerCommand('go to', (params) => this.navigateTo(params), {
            description: 'انتقل إلى مشهد معين',
            examples: ['go to entrance', 'go to lobby', 'انتقل إلى المدخل']
        });
        
        this.registerCommand('zoom in', () => this.zoomIn(), {
            description: 'تكبير العرض',
            examples: ['zoom in', 'تكبير']
        });
        
        this.registerCommand('zoom out', () => this.zoomOut(), {
            description: 'تصغير العرض',
            examples: ['zoom out', 'تصغير']
        });
        
        this.registerCommand('rotate left', () => this.rotateLeft(), {
            description: 'تدوير لليسار',
            examples: ['rotate left', 'left', 'يسار']
        });
        
        this.registerCommand('rotate right', () => this.rotateRight(), {
            description: 'تدوير لليمين',
            examples: ['rotate right', 'right', 'يمين']
        });
        
        // أوامر القياس
        this.registerCommand('measure distance', () => this.startDistanceMeasurement(), {
            description: 'بدء قياس المسافة',
            examples: ['measure distance', 'قياس المسافة']
        });
        
        this.registerCommand('measure area', () => this.startAreaMeasurement(), {
            description: 'بدء قياس المساحة',
            examples: ['measure area', 'قياس المساحة']
        });
        
        this.registerCommand('stop measurement', () => this.stopMeasurement(), {
            description: 'إيقاف القياس',
            examples: ['stop measurement', 'إيقاف القياس']
        });
        
        // أوامر الإضافة
        this.registerCommand('add note', (params) => this.addNote(params), {
            description: 'إضافة ملاحظة',
            examples: ['add note this is important', 'إضافة ملاحظة هذا مهم']
        });
        
        this.registerCommand('add hotspot', () => this.addHotspot(), {
            description: 'إضافة نقطة تفاعل',
            examples: ['add hotspot', 'إضافة نقطة']
        });
        
        // أوامر التطبيق
        this.registerCommand('help', () => this.showHelp(), {
            description: 'عرض المساعدة',
            examples: ['help', 'مساعدة']
        });
        
        this.registerCommand('status', () => this.showStatus(), {
            description: 'عرض الحالة',
            examples: ['status', 'حالة النظام']
        });
        
        this.registerCommand('export report', () => this.exportReport(), {
            description: 'تصدير تقرير',
            examples: ['export report', 'تصدير تقرير']
        });
        
        this.registerCommand('save project', () => this.saveProject(), {
            description: 'حفظ المشروع',
            examples: ['save project', 'حفظ المشروع']
        });
        
        // أوامر التحكم الصوتي
        this.registerCommand('start listening', () => this.startListening(), {
            description: 'بدء الاستماع للأوامر',
            examples: ['start listening', 'ابدأ الاستماع']
        });
        
        this.registerCommand('stop listening', () => this.stopListening(), {
            description: 'إيقاف الاستماع',
            examples: ['stop listening', 'أوقف الاستماع']
        });
        
        this.registerCommand('repeat', () => this.repeatLastCommand(), {
            description: 'تكرار آخر أمر',
            examples: ['repeat', 'كرر']
        });
    }
    
    registerCommand(phrase, action, metadata = {}) {
        this.commands.set(phrase.toLowerCase(), {
            phrase: phrase.toLowerCase(),
            action: action,
            metadata: metadata,
            registeredAt: Date.now()
        });
        
        console.log(`🎙️ Command registered: "${phrase}"`);
    }
    
    unregisterCommand(phrase) {
        return this.commands.delete(phrase.toLowerCase());
    }
    
    // ========== RECOGNIZER SETUP ==========
    
    setupRecognizerEvents() {
        this.recognizer.on('result', (result) => {
            if (result.isFinal) {
                this.processCommand(result.final);
            }
        });
        
        this.recognizer.on('started', () => {
            this.isListening = true;
            this.notifyListeners('listeningStarted');
        });
        
        this.recognizer.on('stopped', () => {
            this.isListening = false;
            this.notifyListeners('listeningStopped');
        });
        
        this.recognizer.on('error', (error) => {
            this.notifyListeners('error', error);
            this.tts.speakMessage('حدث خطأ في التعرف على الصوت', 'error');
        });
    }
    
    // ========== COMMAND PROCESSING ==========
    
    processCommand(text) {
        if (!text || !this.isActive) return;
        
        const lowerText = text.toLowerCase().trim();
        let matchedCommand = null;
        let matchedParams = null;
        
        // البحث عن أمر مطابق
        for (const [phrase, command] of this.commands) {
            if (lowerText.includes(phrase)) {
                matchedCommand = command;
                // استخراج المعاملات (ما بعد الأمر)
                const afterCommand = lowerText.replace(phrase, '').trim();
                matchedParams = afterCommand || null;
                break;
            }
        }
        
        if (matchedCommand) {
            this.executeCommand(matchedCommand, matchedParams, text);
        } else {
            this.notifyListeners('commandNotFound', { text });
            if (this.isActive) {
                this.tts.speakMessage('لم يتم التعرف على الأمر', 'warning');
            }
        }
    }
    
    async executeCommand(command, params, originalText) {
        // إضافة إلى السجل
        this.addToHistory({
            text: originalText,
            command: command.phrase,
            params: params,
            timestamp: Date.now(),
            executed: false
        });
        
        // تأكيد الأمر إذا لزم الأمر
        if (this.confirmationRequired) {
            const confirmed = await this.confirmCommand(command.phrase);
            if (!confirmed) {
                this.tts.speakMessage('تم إلغاء الأمر', 'info');
                return;
            }
        }
        
        try {
            const result = await command.action(params);
            
            // تحديث السجل
            const lastCommand = this.commandHistory[this.commandHistory.length - 1];
            if (lastCommand) lastCommand.executed = true;
            
            this.notifyListeners('commandExecuted', {
                command: command.phrase,
                params: params,
                result: result
            });
            
        } catch (error) {
            console.error('Command execution error:', error);
            this.notifyListeners('commandError', { command: command.phrase, error });
            this.tts.speakMessage('حدث خطأ في تنفيذ الأمر', 'error');
        }
    }
    
    confirmCommand(commandPhrase) {
        return new Promise((resolve) => {
            // نطق طلب التأكيد
            const confirmText = this.recognizer.settings.language.startsWith('ar')
                ? `هل تريد تنفيذ أمر ${commandPhrase}؟`
                : `Do you want to execute ${commandPhrase}?`;
            
            this.tts.speak(confirmText);
            
            // انتظار رد المستخدم لمدة 5 ثوان
            let timeoutId;
            const handler = (result) => {
                if (result.isFinal) {
                    const text = result.final.toLowerCase();
                    const isConfirm = text.includes('نعم') || text.includes('yes') || text.includes('ok');
                    clearTimeout(timeoutId);
                    this.recognizer.off('result', handler);
                    resolve(isConfirm);
                }
            };
            
            this.recognizer.on('result', handler);
            
            timeoutId = setTimeout(() => {
                this.recognizer.off('result', handler);
                resolve(false);
            }, 5000);
        });
    }
    
    // ========== COMMAND ACTIONS ==========
    
    async navigateTo(target) {
        if (!target) {
            this.tts.speakMessage('يرجى تحديد الوجهة', 'warning');
            return false;
        }
        
        // البحث عن المشهد المطلوب
        const scenes = this.engine?.sceneExplorer?.scenes || [];
        const matchedScene = scenes.find(s => 
            s.name.toLowerCase().includes(target)
        );
        
        if (matchedScene && this.engine?.navigationHandler) {
            await this.engine.navigationHandler.navigateToNode(matchedScene.id);
            this.tts.speakMessage(`تم الانتقال إلى ${matchedScene.name}`, 'success');
            return true;
        }
        
        this.tts.speakMessage(`لم يتم العثور على المشهد: ${target}`, 'warning');
        return false;
    }
    
    zoomIn() {
        if (this.engine?.camera) {
            const newZoom = Math.max(1, (this.engine.camera.fov || 75) - 10);
            this.engine.camera.fov = newZoom;
            this.engine.camera.updateProjectionMatrix();
            this.tts.speakMessage('تم التكبير', 'success');
        }
    }
    
    zoomOut() {
        if (this.engine?.camera) {
            const newZoom = Math.min(120, (this.engine.camera.fov || 75) + 10);
            this.engine.camera.fov = newZoom;
            this.engine.camera.updateProjectionMatrix();
            this.tts.speakMessage('تم التصغير', 'success');
        }
    }
    
    rotateLeft() {
        if (this.engine?.controls) {
            const target = this.engine.controls.target;
            target.x -= 2;
            this.engine.controls.update();
            this.tts.speakMessage('تم التدوير لليسار', 'success');
        }
    }
    
    rotateRight() {
        if (this.engine?.controls) {
            const target = this.engine.controls.target;
            target.x += 2;
            this.engine.controls.update();
            this.tts.speakMessage('تم التدوير لليمين', 'success');
        }
    }
    
    startDistanceMeasurement() {
        if (this.engine?.toolbar) {
            this.engine.toolbar.activateTool('distance');
            this.tts.speakMessage('وضع قياس المسافة نشط. اضغط على نقطتين للقياس', 'info');
        }
    }
    
    startAreaMeasurement() {
        if (this.engine?.toolbar) {
            this.engine.toolbar.activateTool('area');
            this.tts.speakMessage('وضع قياس المساحة نشط. اضغط على ثلاث نقاط للقياس', 'info');
        }
    }
    
    stopMeasurement() {
        if (this.engine?.toolbar) {
            this.engine.toolbar.activateTool('navigate');
            this.tts.speakMessage('تم إيقاف القياس', 'success');
        }
    }
    
    addNote(params) {
        if (params && this.engine?.workerMode) {
            this.engine.workerMode.addNote(params);
            this.tts.speakMessage('تم إضافة الملاحظة', 'success');
        } else {
            this.tts.speakMessage('يرجى كتابة نص الملاحظة بعد الأمر', 'warning');
        }
    }
    
    addHotspot() {
        if (this.engine?.toolbar) {
            this.engine.toolbar.activateTool('hotspotInfo');
            this.tts.speakMessage('وضع إضافة نقاط المعلومات نشط. اضغط على المشهد للإضافة', 'info');
        }
    }
    
    showHelp() {
        const commandsList = Array.from(this.commands.values()).map(cmd => 
            `- ${cmd.phrase}: ${cmd.metadata.description || 'بدون وصف'}`
        ).join('\n');
        
        console.log('Available voice commands:\n', commandsList);
        
        const helpText = this.recognizer.settings.language.startsWith('ar')
            ? `الأوامر الصوتية المتاحة: ${Array.from(this.commands.keys()).join(', ')}`
            : `Available voice commands: ${Array.from(this.commands.keys()).join(', ')}`;
        
        this.tts.speakQueued(helpText);
        this.notifyListeners('help', { commands: Array.from(this.commands.keys()) });
    }
    
    showStatus() {
        const status = {
            active: this.isActive,
            listening: this.isListening,
            commandCount: this.commands.size,
            historySize: this.commandHistory.length
        };
        
        const statusText = this.recognizer.settings.language.startsWith('ar')
            ? `النظام الصوتي ${this.isActive ? 'نشط' : 'غير نشط'}. عدد الأوامر: ${this.commands.size}`
            : `Voice system is ${this.isActive ? 'active' : 'inactive'}. Commands: ${this.commands.size}`;
        
        this.tts.speakQueued(statusText);
        this.notifyListeners('status', status);
    }
    
    exportReport() {
        if (this.engine?.reportGenerator) {
            this.engine.reportGenerator.generateSiteReport({});
            this.tts.speakMessage('تم تصدير التقرير', 'success');
        }
    }
    
    saveProject() {
        if (this.engine?.projectManager) {
            this.engine.projectManager.saveProject();
            this.tts.speakMessage('تم حفظ المشروع', 'success');
        }
    }
    
    // ========== CONTROL METHODS ==========
    
    startListening() {
        if (!this.isActive) {
            this.isActive = true;
            this.tts.speakWelcome();
        }
        
        this.recognizer.start();
        this.tts.speakMessage('أنا في انتظار أوامرك', 'info');
    }
    
    stopListening() {
        this.recognizer.stop();
        this.tts.speakMessage('تم إيقاف الاستماع', 'info');
    }
    
    activate() {
        this.isActive = true;
        this.startListening();
    }
    
    deactivate() {
        this.isActive = false;
        this.stopListening();
    }
    
    repeatLastCommand() {
        if (this.commandHistory.length === 0) {
            this.tts.speakMessage('لا توجد أوامر سابقة', 'warning');
            return;
        }
        
        const lastCommand = this.commandHistory[this.commandHistory.length - 1];
        if (lastCommand && !lastCommand.executed) {
            this.processCommand(lastCommand.text);
        } else {
            this.tts.speakMessage('آخر أمر تم تنفيذه بالفعل', 'info');
        }
    }
    
    // ========== HISTORY ==========
    
    addToHistory(entry) {
        this.commandHistory.push(entry);
        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory.shift();
        }
    }
    
    getCommandHistory() {
        return [...this.commandHistory];
    }
    
    clearHistory() {
        this.commandHistory = [];
    }
    
    // ========== SETTINGS ==========
    
    setLanguage(language) {
        this.recognizer.setLanguage(language);
        this.tts.setLanguage(language);
    }
    
    setConfirmationRequired(required) {
        this.confirmationRequired = required;
    }
    
    getCommands() {
        return Array.from(this.commands.entries()).map(([phrase, cmd]) => ({
            phrase: phrase,
            description: cmd.metadata.description,
            examples: cmd.metadata.examples
        }));
    }
    
    getStatus() {
        return {
            isActive: this.isActive,
            isListening: this.isListening,
            commandsCount: this.commands.size,
            historySize: this.commandHistory.length,
            confirmationRequired: this.confirmationRequired,
            language: this.recognizer.settings.language
        };
    }
    
    // ========== EVENT SYSTEM ==========
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const filtered = this.listeners.get(event).filter(cb => cb !== callback);
            if (filtered.length === 0) {
                this.listeners.delete(event);
            } else {
                this.listeners.set(event, filtered);
            }
        }
    }
    
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('VoiceCommands listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.deactivate();
        this.recognizer.dispose();
        this.tts.dispose();
        this.commands.clear();
        this.commandHistory = [];
        this.listeners.clear();
        console.log('♻️ VoiceCommands disposed');
    }
}

export default VoiceCommands;