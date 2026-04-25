// ============================================
// VOICE ASSISTANT - نظام تعليمات صوتية وتحكم
// يدعم: Text-to-Speech, Speech Recognition, Voice Commands
// ============================================

export class VoiceAssistant {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // إعدادات الصوت
        this.synthesis = window.speechSynthesis;
        this.recognition = null;
        this.isListening = false;
        this.voices = [];
        this.selectedVoice = null;
        this.language = 'ar-SA'; // العربية
        
        // الأوامر الصوتية المدعومة
        this.commands = {
            'تصفح': () => this.eventBus.emit('tool:activate', 'navigate'),
            'قياس المسافة': () => this.eventBus.emit('tool:activate', 'distance'),
            'قياس المساحة': () => this.eventBus.emit('tool:activate', 'area'),
            'قياس الحجم': () => this.eventBus.emit('tool:activate', 'volume'),
            'قياس الزاوية': () => this.eventBus.emit('tool:activate', 'angle'),
            'إضافة نقطة': () => this.eventBus.emit('tool:activate', 'hotspot-info'),
            'تصدير المشروع': () => this.eventBus.emit('project:export'),
            'إعادة تعيين': () => this.eventBus.emit('camera:reset'),
            'حساب الكميات': () => this.eventBus.emit('boq:calculate'),
            'استيراد CAD': () => this.eventBus.emit('ui:importCAD'),
            'مساعدة': () => this.speak('الأوامر المتاحة: تصفح، قياس المسافة، قياس المساحة، قياس الحجم، قياس الزاوية، إضافة نقطة، تصدير المشروع، إعادة تعيين، حساب الكميات'),
            'إخفاء الشبكة': () => this.eventBus.emit('grid:hide'),
            'إظهار الشبكة': () => this.eventBus.emit('grid:show'),
            'وضع الواقع': () => this.eventBus.emit('mode:reality'),
            'وضع التصميم': () => this.eventBus.emit('mode:design'),
        };
        
        this.setupSpeechRecognition();
        this.loadVoices();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('voice:speak', (message) => {
            this.speak(message);
        });
        
        this.eventBus.on('voice:startListening', () => {
            this.startListening();
        });
        
        this.eventBus.on('voice:stopListening', () => {
            this.stopListening();
        });
        
        // ترحيب تلقائي
        setTimeout(() => {
            this.speak('مرحباً بك في نظام الواقع التفاعلي، يمكنك استخدام الأوامر الصوتية');
        }, 2000);
    }
    
    setupSpeechRecognition() {
        // التحقق من دعم المتصفح
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = this.language;
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            
            this.recognition.onresult = (event) => {
                const command = event.results[0][0].transcript;
                console.log('🎤 تم التعرف على:', command);
                this.processCommand(command);
            };
            
            this.recognition.onerror = (event) => {
                console.error('🎤 خطأ في التعرف:', event.error);
                this.eventBus.emit('ui:status', '🎤 لم يتم التعرف على الأمر، حاول مرة أخرى');
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.eventBus.emit('voice:listeningStopped');
            };
        } else {
            console.warn('Speech recognition not supported');
        }
    }
    
    loadVoices() {
        this.synthesis.onvoiceschanged = () => {
            this.voices = this.synthesis.getVoices();
            // اختيار صوت عربي إذا وجد
            this.selectedVoice = this.voices.find(v => v.lang === 'ar' || v.lang === 'ar-SA');
        };
    }
    
    speak(message, onEnd = null) {
        if (!this.synthesis) {
            console.warn('Text-to-speech not supported');
            return;
        }
        
        // إيقاف أي كلام سابق
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = this.language;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }
        
        if (onEnd) {
            utterance.onend = onEnd;
        }
        
        this.synthesis.speak(utterance);
        
        this.eventBus.emit('voice:speaking', { message });
    }
    
    processCommand(command) {
        const lowerCommand = command.toLowerCase().trim();
        
        // البحث عن أمر مطابق
        for (const [cmd, action] of Object.entries(this.commands)) {
            if (lowerCommand.includes(cmd.toLowerCase())) {
                this.speak(`تم تنفيذ الأمر: ${cmd}`);
                action();
                this.eventBus.emit('voice:commandExecuted', { command: cmd, original: command });
                return;
            }
        }
        
        // إذا لم يتم التعرف على الأمر
        this.speak('عذراً، لم أتعرف على هذا الأمر');
        this.eventBus.emit('voice:commandUnknown', { command });
    }
    
    startListening() {
        if (!this.recognition) {
            this.speak('عذراً، خاصية التعرف على الصوت غير مدعومة في متصفحك');
            return;
        }
        
        if (this.isListening) {
            this.stopListening();
        }
        
        this.isListening = true;
        this.recognition.start();
        this.eventBus.emit('voice:listeningStarted');
        this.eventBus.emit('ui:status', '🎤 جاري الاستماع... تحدث الآن');
        
        // تشغيل صوت تنبيه
        this.speak('تحدث الآن', () => {});
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }
    
    addCustomCommand(command, action, description) {
        this.commands[command] = action;
        this.speak(`تم إضافة أمر جديد: ${description || command}`);
    }
    
    removeCustomCommand(command) {
        delete this.commands[command];
    }
    
    getAvailableCommands() {
        return Object.keys(this.commands);
    }
    
    setLanguage(lang) {
        this.language = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
        this.speak(`تم تغيير اللغة إلى ${lang}`);
    }
}