// ============================================
// SPEECH RECOGNIZER - التعرف على الكلام
// تحويل الصوت إلى نص، دعم متعدد اللغات، أوامر مخصصة
// ============================================

export class SpeechRecognizer {
    constructor(options = {}) {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        
        // إعدادات
        this.settings = {
            language: options.language || 'ar-SA', // العربية السعودية
            continuous: options.continuous !== false,
            interimResults: options.interimResults !== false,
            maxAlternatives: options.maxAlternatives || 1
        };
        
        // النتائج
        this.finalTranscript = '';
        this.interimTranscript = '';
        
        // معالج الأحداث
        this.listeners = new Map();
        
        // تهيئة التعرف
        this.init();
        
        console.log('🎤 SpeechRecognizer initialized');
    }
    
    // ========== INITIALIZATION ==========
    
    init() {
        // التحقق من دعم المتصفح
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            this.isSupported = false;
            return;
        }
        
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        
        // تطبيق الإعدادات
        this.recognition.lang = this.settings.language;
        this.recognition.continuous = this.settings.continuous;
        this.recognition.interimResults = this.settings.interimResults;
        this.recognition.maxAlternatives = this.settings.maxAlternatives;
        
        // ربط الأحداث
        this.recognition.onstart = () => this.onStart();
        this.recognition.onend = () => this.onEnd();
        this.recognition.onerror = (event) => this.onError(event);
        this.recognition.onresult = (event) => this.onResult(event);
        
        console.log('✅ Speech recognition initialized');
    }
    
    // ========== CONTROL METHODS ==========
    
    start() {
        if (!this.isSupported) {
            this.notifyListeners('error', { message: 'Speech recognition not supported' });
            return false;
        }
        
        if (this.isListening) {
            this.stop();
        }
        
        try {
            this.recognition.start();
            this.isListening = true;
            this.finalTranscript = '';
            this.interimTranscript = '';
            this.notifyListeners('started');
            console.log('🎤 Listening started');
            return true;
        } catch (error) {
            console.error('Failed to start recognition:', error);
            this.notifyListeners('error', { error });
            return false;
        }
    }
    
    stop() {
        if (!this.isSupported || !this.isListening) return false;
        
        try {
            this.recognition.stop();
            this.isListening = false;
            this.notifyListeners('stopped');
            console.log('🎤 Listening stopped');
            return true;
        } catch (error) {
            console.error('Failed to stop recognition:', error);
            return false;
        }
    }
    
    abort() {
        if (!this.isSupported || !this.recognition) return false;
        
        try {
            this.recognition.abort();
            this.isListening = false;
            this.notifyListeners('aborted');
            return true;
        } catch (error) {
            return false;
        }
    }
    
    // ========== EVENT HANDLERS ==========
    
    onStart() {
        this.notifyListeners('start');
    }
    
    onEnd() {
        this.isListening = false;
        this.notifyListeners('end');
    }
    
    onError(event) {
        console.error('Speech recognition error:', event.error);
        this.notifyListeners('error', { 
            error: event.error, 
            message: this.getErrorMessage(event.error) 
        });
    }
    
    onResult(event) {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;
            
            if (event.results[i].isFinal) {
                final += transcript;
                this.notifyListeners('finalResult', { transcript: final, confidence });
            } else {
                interim += transcript;
                this.notifyListeners('interimResult', { transcript: interim, confidence });
            }
        }
        
        if (final) {
            this.finalTranscript += final;
            this.notifyListeners('result', { 
                final: this.finalTranscript, 
                interim: interim,
                isFinal: true
            });
        } else if (interim) {
            this.notifyListeners('result', { 
                final: this.finalTranscript, 
                interim: interim,
                isFinal: false
            });
        }
    }
    
    // ========== SETTINGS ==========
    
    setLanguage(language) {
        this.settings.language = language;
        if (this.recognition) {
            this.recognition.lang = language;
        }
        this.notifyListeners('languageChanged', { language });
    }
    
    setContinuous(continuous) {
        this.settings.continuous = continuous;
        if (this.recognition) {
            this.recognition.continuous = continuous;
        }
    }
    
    setInterimResults(enabled) {
        this.settings.interimResults = enabled;
        if (this.recognition) {
            this.recognition.interimResults = enabled;
        }
    }
    
    // ========== UTILITY ==========
    
    getErrorMessage(error) {
        const messages = {
            'no-speech': 'No speech detected. Please try again.',
            'audio-capture': 'No microphone found. Please check your microphone.',
            'not-allowed': 'Microphone access denied. Please allow microphone access.',
            'network': 'Network error. Please check your connection.',
            'aborted': 'Recognition aborted.',
            'language-not-supported': 'Language not supported.'
        };
        return messages[error] || `Error: ${error}`;
    }
    
    getSupportedLanguages() {
        return [
            { code: 'ar-SA', name: 'العربية (السعودية)' },
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'fr-FR', name: 'Français' },
            { code: 'de-DE', name: 'Deutsch' },
            { code: 'es-ES', name: 'Español' },
            { code: 'it-IT', name: 'Italiano' },
            { code: 'ja-JP', name: '日本語' },
            { code: 'ko-KR', name: '한국어' },
            { code: 'zh-CN', name: '中文' }
        ];
    }
    
    isRecognitionSupported() {
        return this.isSupported;
    }
    
    resetTranscript() {
        this.finalTranscript = '';
        this.interimTranscript = '';
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
                    console.error('SpeechRecognizer listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        if (this.isListening) {
            this.stop();
        }
        this.recognition = null;
        this.listeners.clear();
        console.log('♻️ SpeechRecognizer disposed');
    }
}

export default SpeechRecognizer;