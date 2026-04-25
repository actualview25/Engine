// ============================================
// SNAPSHOT CAPTURE - التقاط صور للمشهد
// يدعم: لقطات شاشة، تسجيل فيديو، تصدير مع تعليقات
// ============================================

export class SnapshotCapture {
    constructor(renderer = null, scene = null, camera = null) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // إعدادات
        this.settings = {
            format: 'image/png',
            quality: 0.92,
            scale: 1.0,
            includeUI: true,
            timestamp: true,
            autoDownload: true
        };
        
        // تسجيلات الفيديو
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        
        // معاينة
        this.previewElement = null;
        
        console.log('📸 SnapshotCapture initialized');
    }
    
    // ========== SCREENSHOT ==========
    
    captureScreenshot(options = {}) {
        const settings = { ...this.settings, ...options };
        
        if (!this.renderer) {
            console.warn('No renderer available');
            return this.captureFromCanvas(options);
        }
        
        const canvas = this.renderer.domElement;
        return this.captureFromCanvas(canvas, settings);
    }
    
    captureFromCanvas(canvas, options = {}) {
        const settings = { ...this.settings, ...options };
        
        // معالجة canvas
        let targetCanvas = canvas;
        
        if (settings.scale !== 1.0) {
            targetCanvas = this.resizeCanvas(canvas, settings.scale);
        }
        
        const dataURL = targetCanvas.toDataURL(settings.format, settings.quality);
        
        if (settings.autoDownload) {
            this.downloadSnapshot(dataURL, this.generateFilename());
        }
        
        this.notifyListeners('captured', { dataURL, settings });
        
        return dataURL;
    }
    
    captureWithTimestamp(options = {}) {
        const settings = { ...this.settings, ...options, timestamp: true };
        
        return new Promise((resolve) => {
            const dataURL = this.captureScreenshot(settings);
            
            // إضافة طابع زمني على الصورة
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.width = img.height;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0);
                
                // إضافة النص
                ctx.font = '16px monospace';
                ctx.fillStyle = 'white';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                const timestamp = new Date().toLocaleString();
                ctx.fillText(timestamp, 10, canvas.height - 20);
                
                const finalDataURL = canvas.toDataURL(settings.format, settings.quality);
                resolve(finalDataURL);
            };
            img.src = dataURL;
        });
    }
    
    captureRegion(x, y, width, height, options = {}) {
        const settings = { ...this.settings, ...options };
        
        if (!this.renderer) return null;
        
        const canvas = this.renderer.domElement;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
        
        const dataURL = tempCanvas.toDataURL(settings.format, settings.quality);
        
        if (settings.autoDownload) {
            this.downloadSnapshot(dataURL, this.generateFilename('region'));
        }
        
        return dataURL;
    }
    
    // ========== VIDEO RECORDING ==========
    
    async startRecording(options = {}) {
        if (!this.renderer) {
            console.error('Cannot start recording: no renderer');
            return false;
        }
        
        const settings = { fps: 30, ...options };
        const canvas = this.renderer.domElement;
        const stream = canvas.captureStream(settings.fps);
        
        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm',
            videoBitsPerSecond: settings.bitrate || 2500000
        });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            if (options.autoDownload !== false) {
                this.downloadVideo(url, this.generateFilename('video'));
            }
            
            this.notifyListeners('recordingStopped', { url, blob });
        };
        
        this.mediaRecorder.start(1000); // جمع البيانات كل ثانية
        this.isRecording = true;
        
        this.notifyListeners('recordingStarted');
        
        return true;
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            return true;
        }
        return false;
    }
    
    // ========== EXPORT WITH ANNOTATIONS ==========
    
    captureWithAnnotations(annotations, options = {}) {
        const dataURL = this.captureScreenshot(options);
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0);
                
                // رسم التعليقات
                for (const annotation of annotations) {
                    this.drawAnnotation(ctx, annotation);
                }
                
                const finalDataURL = canvas.toDataURL(this.settings.format, this.settings.quality);
                resolve(finalDataURL);
            };
            img.src = dataURL;
        });
    }
    
    drawAnnotation(ctx, annotation) {
        ctx.save();
        
        switch(annotation.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(annotation.x, annotation.y, annotation.radius || 20, 0, 2 * Math.PI);
                ctx.strokeStyle = annotation.color || '#ff0000';
                ctx.lineWidth = annotation.lineWidth || 3;
                ctx.stroke();
                break;
                
            case 'rectangle':
                ctx.strokeStyle = annotation.color || '#ff0000';
                ctx.lineWidth = annotation.lineWidth || 3;
                ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
                break;
                
            case 'line':
                ctx.beginPath();
                ctx.moveTo(annotation.x1, annotation.y1);
                ctx.lineTo(annotation.x2, annotation.y2);
                ctx.strokeStyle = annotation.color || '#ff0000';
                ctx.lineWidth = annotation.lineWidth || 3;
                ctx.stroke();
                break;
                
            case 'text':
                ctx.font = `${annotation.fontSize || 16}px ${annotation.font || 'Arial'}`;
                ctx.fillStyle = annotation.color || '#ffffff';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 3;
                ctx.fillText(annotation.text, annotation.x, annotation.y);
                break;
                
            case 'arrow':
                this.drawArrow(ctx, annotation);
                break;
        }
        
        ctx.restore();
    }
    
    drawArrow(ctx, annotation) {
        const angle = Math.atan2(annotation.y2 - annotation.y1, annotation.x2 - annotation.x1);
        const headSize = annotation.headSize || 15;
        
        ctx.beginPath();
        ctx.moveTo(annotation.x1, annotation.y1);
        ctx.lineTo(annotation.x2, annotation.y2);
        ctx.strokeStyle = annotation.color || '#ff0000';
        ctx.lineWidth = annotation.lineWidth || 3;
        ctx.stroke();
        
        // رأس السهم
        ctx.beginPath();
        ctx.moveTo(annotation.x2, annotation.y2);
        ctx.lineTo(
            annotation.x2 - headSize * Math.cos(angle - Math.PI / 6),
            annotation.y2 - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            annotation.x2 - headSize * Math.cos(angle + Math.PI / 6),
            annotation.y2 - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.fillStyle = annotation.color || '#ff0000';
        ctx.fill();
    }
    
    // ========== UTILITY ==========
    
    resizeCanvas(canvas, scale) {
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = canvas.width * scale;
        resizedCanvas.height = canvas.height * scale;
        
        const ctx = resizedCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
        
        return resizedCanvas;
    }
    
    generateFilename(prefix = 'screenshot') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${prefix}_${timestamp}`;
    }
    
    downloadSnapshot(dataURL, filename) {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = dataURL;
        link.click();
        
        console.log(`📸 Snapshot saved: ${filename}.png`);
    }
    
    downloadVideo(url, filename) {
        const link = document.createElement('a');
        link.download = `${filename}.webm`;
        link.href = url;
        link.click();
        
        console.log(`🎥 Video saved: ${filename}.webm`);
    }
    
    createPreview(dataURL) {
        if (this.previewElement) {
            this.previewElement.remove();
        }
        
        this.previewElement = document.createElement('img');
        this.previewElement.src = dataURL;
        this.previewElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-width: 200px;
            border: 2px solid #ffaa44;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            cursor: pointer;
        `;
        
        this.previewElement.onclick = () => {
            window.open(dataURL);
        };
        
        document.body.appendChild(this.previewElement);
        
        setTimeout(() => {
            if (this.previewElement) {
                this.previewElement.remove();
                this.previewElement = null;
            }
        }, 5000);
        
        return this.previewElement;
    }
    
    // ========== BATCH CAPTURE ==========
    
    async captureBatch(count = 5, interval = 1000, options = {}) {
        const captures = [];
        
        for (let i = 0; i < count; i++) {
            const dataURL = this.captureScreenshot(options);
            captures.push(dataURL);
            
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        
        this.notifyListeners('batchComplete', { count, captures });
        
        return captures;
    }
    
    createGIF(captures, options = {}) {
        // GIF creation requires external library (gif.js)
        console.warn('GIF creation requires external library');
        return null;
    }
    
    // ========== SETUP ==========
    
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    
    setScene(scene) {
        this.scene = scene;
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    setSettings(settings) {
        this.settings = { ...this.settings, ...settings };
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
                    console.error('SnapshotCapture listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        if (this.isRecording) {
            this.stopRecording();
        }
        
        if (this.previewElement) {
            this.previewElement.remove();
            this.previewElement = null;
        }
        
        this.listeners?.clear();
        
        console.log('♻️ SnapshotCapture disposed');
    }
}

export default SnapshotCapture;