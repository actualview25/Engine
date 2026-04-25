// ============================================
// FILE UTILS - أدوات معالجة الملفات
// قراءة، كتابة، تحويل، وضغط الملفات
// ============================================

export class FileUtils {
    constructor() {
        console.log('📁 FileUtils initialized');
    }
    
    // ========== FILE READING ==========
    
    static readAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsText(file);
        });
    }
    
    static readAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsDataURL(file);
        });
    }
    
    static readAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsArrayBuffer(file);
        });
    }
    
    static readAsBinaryString(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsBinaryString(file);
        });
    }
    
    static readJSON(file) {
        return this.readAsText(file).then(text => JSON.parse(text));
    }
    
    // ========== FILE WRITING ==========
    
    static download(content, filename, mimeType = 'application/octet-stream') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    static downloadJSON(data, filename = 'data.json') {
        const json = JSON.stringify(data, null, 2);
        this.download(json, filename, 'application/json');
    }
    
    static downloadCSV(data, filename = 'data.csv') {
        let csv = '';
        if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]);
            csv += headers.join(',') + '\n';
            for (const row of data) {
                csv += headers.map(h => JSON.stringify(row[h] || '')).join(',') + '\n';
            }
        }
        this.download(csv, filename, 'text/csv');
    }
    
    static downloadImage(dataURL, filename = 'image.png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;
        link.click();
    }
    
    // ========== FILE VALIDATION ==========
    
    static getExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }
    
    static getSizeString(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
    
    static isValidImage(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
        return validTypes.includes(file.type);
    }
    
    static isValidModel(file) {
        const validExtensions = ['gltf', 'glb', 'obj', 'stl', 'fbx', '3ds'];
        const ext = this.getExtension(file.name);
        return validExtensions.includes(ext);
    }
    
    static isValidCAD(file) {
        const validExtensions = ['dwg', 'dxf', 'svg', 'pdf'];
        const ext = this.getExtension(file.name);
        return validExtensions.includes(ext);
    }
    
    static isValidArchive(file) {
        const validExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
        const ext = this.getExtension(file.name);
        return validExtensions.includes(ext);
    }
    
    // ========== FILE PROCESSING ==========
    
    static async compressImage(file, maxWidth = 1920, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();
            
            reader.onload = (e) => {
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', quality);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    static async createThumbnail(file, size = 200) {
        const compressed = await this.compressImage(file, size, 0.7);
        return URL.createObjectURL(compressed);
    }
    
    static async readMultipleFiles(files, readAs = 'text') {
        const results = [];
        for (const file of files) {
            let data;
            if (readAs === 'text') data = await this.readAsText(file);
            else if (readAs === 'dataURL') data = await this.readAsDataURL(file);
            else if (readAs === 'arrayBuffer') data = await this.readAsArrayBuffer(file);
            else data = await this.readAsText(file);
            
            results.push({
                name: file.name,
                size: file.size,
                type: file.type,
                data: data
            });
        }
        return results;
    }
    
    // ========== DATA CONVERSION ==========
    
    static arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const buffer = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return buffer;
    }
    
    static dataURLToBlob(dataURL) {
        const parts = dataURL.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const base64 = parts[1];
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return new Blob([array], { type: mime });
    }
    
    static blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsDataURL(blob);
        });
    }
    
    // ========== FILE DIALOGS ==========
    
    static openFileDialog(accept = '*/*', multiple = false) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.multiple = multiple;
            
            input.onchange = () => {
                if (multiple) {
                    resolve(Array.from(input.files));
                } else {
                    resolve(input.files[0] || null);
                }
            };
            
            input.click();
        });
    }
    
    static openImageDialog(multiple = false) {
        return this.openFileDialog('image/*', multiple);
    }
    
    static openModelDialog(multiple = false) {
        return this.openFileDialog('.gltf,.glb,.obj,.stl,.fbx', multiple);
    }
    
    static openCADDialog(multiple = false) {
        return this.openFileDialog('.dwg,.dxf,.svg', multiple);
    }
    
    // ========== CACHE MANAGEMENT ==========
    
    static getCacheSize() {
        return new Promise((resolve) => {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                navigator.storage.estimate().then(estimate => {
                    resolve(estimate.usage || 0);
                });
            } else {
                resolve(0);
            }
        });
    }
    
    static async clearCache() {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }
    }
}

export default FileUtils;