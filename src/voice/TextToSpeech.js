// ============================================
// TEXT TO SPEECH - تحويل النص إلى كلام
// دعم متعدد اللغات، أصوات مختلفة، تحكم في السرعة والنبرة
// ============================================

export class TextToSpeech {
    constructor(options = {}) {
        this.synthesis = null;
        this.isSpeaking = false;
        this.isSupported = false;
        self.currentUtterance = null;
        
        // إعدادات
        this.settings = {
            language: options.language || 'ar-SA',
            voice: null,
            rate: options.rate || 1.0,
            pitch: options.pitch || 1.0,
            volume: options.volume || 1.0
        };
        
        // قائمة الأصوات المتاحة
        this.voices = [];
        self.voicesLoaded = false;
        
        // قائمة الانتظار
        self.queue = [];
        
        // معالج الأحداث
        this.listeners = new Map();
        
        // تهيئة
        this.init();
        
        console.log('🔊 TextToSpeech initialized');
    }
    
    // ========== INITIALIZATION ==========
    
    init() {
        if (!window.speechSynthesis) {
            console.warn('Text-to-speech not supported in this browser');
            this.isSupported = false;
            return;
        }
        
        this.isSupported = true;
        this.synthesis = window.speechSynthesis;
        
        // تحميل الأصوات
        this.loadVoices();
        
        // تحديث الأصوات عند التحميل
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
        
        console.log('✅ Text-to-speech initialized');
    }
    
    loadVoices() {
        this.voices = this.synthesis.getVoices();
        this.voicesLoaded = true;
        
        // تحديث الصوت المحدد
        if (this.settings.voice) {
            this.settings.voice = this.findVoice(this.settings.voice.name);
        }
        
        this.notifyListeners('voicesLoaded', this.voices);
    }
    
    // ========== SPEAK METHODS ==========
    
    speak(text, options = {}) {
        if (!this.isSupported) {
            this.notifyListeners('error', { message: 'Text-to-speech not supported' });
            return false;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // تطبيق الإعدادات
        utterance.lang = options.language || this.settings.language;
        utterance.rate = options.rate || this.settings.rate;
        utterance.pitch = options.pitch || this.settings.pitch;
        utterance.volume = options.volume || this.settings.volume;
        
        // اختيار الصوت
        const voice = options.voice || this.settings.voice;
        if (voice) {
            utterance.voice = voice;
        }
        
        // ربط الأحداث
        utterance.onstart = () => {
            this.isSpeaking = true;
            this.notifyListeners('start', { text });
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            this.notifyListeners('end', { text });
            this.processQueue();
        };
        
        utterance.onerror = (event) => {
            this.isSpeaking = false;
            this.notifyListeners('error', { error: event.error, text });
            this.processQueue();
        };
        
        utterance.onpause = () => {
            this.notifyListeners('paused');
        };
        
        utterance.onresume = () => {
            this.notifyListeners('resumed');
        };
        
        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
        
        this.notifyListeners('speaking', { text, options });
        
        return true;
    }
    
    speakQueued(text, options = {}) {
        if (this.isSpeaking) {
            this.queue.push({ text, options });
            this.notifyListeners('queued', { text, queueLength: this.queue.length });
            return false;
        }
        
        return this.speak(text, options);
    }
    
    processQueue() {
        if (this.queue.length > 0 && !this.isSpeaking) {
            const next = this.queue.shift();
            this.speak(next.text, next.options);
        }
    }
    
    // ========== CONTROL METHODS ==========
    
    stop() {
        if (!this.isSupported) return false;
        
        this.synthesis.cancel();
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.queue = [];
        
        this.notifyListeners('stopped');
        return true;
    }
    
    pause() {
        if (!this.isSupported || !this.isSpeaking) return false;
        
        this.synthesis.pause();
        this.notifyListeners('paused');
        return true;
    }
    
    resume() {
        if (!this.isSupported) return false;
        
        this.synthesis.resume();
        this.notifyListeners('resumed');
        return true;
    }
    
    clearQueue() {
        this.queue = [];
        this.notifyListeners('queueCleared');
    }
    
    // ========== VOICE MANAGEMENT ==========
    
    getVoices() {
        return this.voices;
    }
    
    getVoicesByLanguage(language) {
        return this.voices.filter(voice => voice.lang.startsWith(language));
    }
    
    findVoice(nameOrId) {
        return this.voices.find(voice => 
            voice.name === nameOrId || 
            voice.voiceURI === nameOrId
        );
    }
    
    setVoice(voice) {
        if (typeof voice === 'string') {
            voice = this.findVoice(voice);
        }
        
        if (voice) {
            this.settings.voice = voice;
            this.settings.language = voice.lang;
            this.notifyListeners('voiceChanged', { voice });
            return true;
        }
        
        return false;
    }
    
    setVoiceByLanguage(language, gender = null) {
        let voices = this.getVoicesByLanguage(language);
        
        if (gender) {
            voices = voices.filter(voice => 
                voice.name.toLowerCase().includes(gender.toLowerCase())
            );
        }
        
        if (voices.length > 0) {
            return this.setVoice(voices[0]);
        }
        
        return false;
    }
    
    // ========== SETTINGS ==========
    
    setRate(rate) {
        this.settings.rate = Math.max(0.5, Math.min(2, rate));
        this.notifyListeners('rateChanged', { rate: this.settings.rate });
    }
    
    setPitch(pitch) {
        this.settings.pitch = Math.max(0.5, Math.min(2, pitch));
        this.notifyListeners('pitchChanged', { pitch: this.settings.pitch });
    }
    
    setVolume(volume) {
        this.settings.volume = Math.max(0, Math.min(1, volume));
        this.notifyListeners('volumeChanged', { volume: this.settings.volume });
    }
    
    setLanguage(language) {
        this.settings.language = language;
        this.notifyListeners('languageChanged', { language });
    }
    
    // ========== SPEAKING UTILITIES ==========
    
    speakWelcome() {
        const welcomeText = this.settings.language.startsWith('ar') 
            ? 'مرحباً بك في منصة Actual View'
            : 'Welcome to Actual View platform';
        this.speakQueued(welcomeText);
    }
    
    speakMessage(message, type = 'info') {
        const prefix = this.getPrefixByType(type);
        const fullMessage = prefix ? `${prefix} ${message}` : message;
        this.speakQueued(fullMessage);
    }
    
    getPrefixByType(type) {
        if (!this.settings.language.startsWith('ar')) return '';
        
        const prefixes = {
            success: 'تم بنجاح:',
            error: 'خطأ:',
            warning: 'تنبيه:',
            info: 'ملاحظة:'
        };
        return prefixes[type] || '';
    }
    
    // ========== UTILITY ==========
    
    isSpeakingSupported() {
        return this.isSupported;
    }
    
    getQueueLength() {
        return this.queue.length;
    }
    
    getStatus() {
        return {
            isSpeaking: this.isSpeaking,
            isSupported: this.isSupported,
            queueLength: this.queue.length,
            currentLanguage: this.settings.language,
            currentRate: this.settings.rate,
            currentPitch: this.settings.pitch
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
                    console.error('TextToSpeech listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.stop();
        this.listeners.clear();
        console.log('♻️ TextToSpeech disposed');
    }
}

export default TextToSpeech;