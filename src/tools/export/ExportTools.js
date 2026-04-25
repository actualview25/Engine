// ============================================
// EXPORT TOOLS - أدوات التصدير المتكاملة
// يدعم: تصدير المشاريع، الصور، النماذج، البيانات، التقارير
// ============================================

export class ExportTools {
    constructor(engine = null) {
        this.engine = engine;
        
        // إعدادات التصدير
        this.settings = {
            defaultFormat: 'json',
            compression: false,
            includeMetadata: true,
            includeThumbnail: true,
            quality: 0.92
        };
        
        // تنسيقات التصدير المدعومة
        this.supportedFormats = {
            project: ['json', 'zip', 'actualview'],
            model: ['gltf', 'glb', 'obj', 'stl'],
            image: ['png', 'jpg', 'webp'],
            data: ['json', 'csv', 'xml'],
            report: ['html', 'pdf', 'csv']
        };
        
        console.log('📤 ExportTools initialized');
    }
    
    // ========== PROJECT EXPORT ==========
    
    exportProject(projectData, format = 'json', options = {}) {
        const settings = { ...this.settings, ...options };
        
        switch(format.toLowerCase()) {
            case 'json':
                return this.exportToJSON(projectData, settings);
            case 'zip':
                return this.exportToZIP(projectData, settings);
            case 'actualview':
                return this.exportToActualView(projectData, settings);
            default:
                console.warn(`Unsupported format: ${format}`);
                return null;
        }
    }
    
    exportToJSON(data, options = {}) {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            generator: 'ActualViewEngine',
            ...data
        };
        
        if (options.includeMetadata) {
            exportData.metadata = {
                exportedBy: options.user || 'Unknown',
                source: options.source || 'ActualView',
                settings: options
            };
        }
        
        const jsonString = JSON.stringify(exportData, null, 2);
        
        if (options.autoDownload !== false) {
            this.downloadFile(jsonString, 'project.json', 'application/json');
        }
        
        return jsonString;
    }
    
    exportToZIP(data, options = {}) {
        // تجميع الملفات في ZIP
        const files = [];
        
        // الملف الرئيسي
        files.push({
            name: 'project.json',
            content: JSON.stringify(data, null, 2)
        });
        
        // الصورة المصغرة
        if (options.includeThumbnail && this.engine?.snapshotCapture) {
            // التقاط صورة مصغرة
            const thumbnail = this.engine.snapshotCapture.captureScreenshot({ autoDownload: false });
            files.push({
                name: 'thumbnail.png',
                content: thumbnail.split(',')[1],
                encoding: 'base64'
            });
        }
        
        // إنشاء ZIP (تبسيط - في الإنتاج يفضل استخدام JSZip)
        console.warn('ZIP export requires JSZip library');
        
        return this.createSimpleArchive(files, 'project.zip');
    }
    
    exportToActualView(projectData, options = {}) {
        // تنسيق خاص بـ Actual View
        const actualViewData = {
            format: 'actualview',
            version: '2.0',
            engine: 'ActualViewEngine',
            project: {
                name: projectData.name || 'Untitled Project',
                createdAt: projectData.createdAt || new Date().toISOString(),
                nodes: projectData.nodes || [],
                scenes: projectData.scenes || [],
                elements: projectData.elements || [],
                settings: projectData.settings || {}
            },
            geoData: projectData.geoData || null,
            metadata: projectData.metadata || {}
        };
        
        const jsonString = JSON.stringify(actualViewData, null, 2);
        
        if (options.autoDownload !== false) {
            this.downloadFile(jsonString, `${projectData.name || 'project'}.actualview`, 'application/json');
        }
        
        return jsonString;
    }
    
    // ========== MODEL EXPORT ==========
    
    exportModel(model, format = 'gltf', options = {}) {
        switch(format.toLowerCase()) {
            case 'gltf':
            case 'glb':
                return this.exportToGLTF(model, options);
            case 'obj':
                return this.exportToOBJ(model, options);
            case 'stl':
                return this.exportToSTL(model, options);
            default:
                console.warn(`Unsupported model format: ${format}`);
                return null;
        }
    }
    
    exportToGLTF(model, options = {}) {
        // يتطلب THREE.GLTFExporter
        if (typeof THREE !== 'undefined' && THREE.GLTFExporter) {
            const exporter = new THREE.GLTFExporter();
            
            exporter.parse(model, (result) => {
                const output = options.binary ? result : JSON.stringify(result, null, 2);
                const ext = options.binary ? 'glb' : 'gltf';
                const mime = options.binary ? 'model/gltf-binary' : 'model/gltf+json';
                
                if (options.autoDownload !== false) {
                    this.downloadFile(output, `model.${ext}`, mime);
                }
                
                return output;
            }, options);
        } else {
            console.warn('GLTFExporter not available');
            return null;
        }
    }
    
    exportToOBJ(model, options = {}) {
        // تحويل النموذج إلى صيغة OBJ
        let objContent = '';
        
        const vertices = [];
        const faces = [];
        
        // جمع البيانات من النموذج
        model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const geometry = child.geometry;
                const positionAttribute = geometry.attributes.position;
                
                if (positionAttribute) {
                    // جمع الرؤوس
                    for (let i = 0; i < positionAttribute.count; i++) {
                        const x = positionAttribute.getX(i);
                        const y = positionAttribute.getY(i);
                        const z = positionAttribute.getZ(i);
                        vertices.push([x, y, z]);
                    }
                    
                    // جمع الوجوه
                    if (geometry.index) {
                        for (let i = 0; i < geometry.index.count; i += 3) {
                            const i1 = geometry.index.getX(i) + 1;
                            const i2 = geometry.index.getX(i + 1) + 1;
                            const i3 = geometry.index.getX(i + 2) + 1;
                            faces.push([i1, i2, i3]);
                        }
                    }
                }
            }
        });
        
        // بناء ملف OBJ
        objContent += '# Exported from ActualViewEngine\n';
        objContent += `# Generated: ${new Date().toISOString()}\n\n`;
        
        for (const v of vertices) {
            objContent += `v ${v[0]} ${v[1]} ${v[2]}\n`;
        }
        
        objContent += '\n';
        
        for (const f of faces) {
            objContent += `f ${f[0]} ${f[1]} ${f[2]}\n`;
        }
        
        if (options.autoDownload !== false) {
            this.downloadFile(objContent, 'model.obj', 'text/plain');
        }
        
        return objContent;
    }
    
    exportToSTL(model, options = {}) {
        // تحويل النموذج إلى صيغة STL (ASCII)
        let stlContent = 'solid ExportedModel\n';
        
        model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const geometry = child.geometry;
                const positionAttribute = geometry.attributes.position;
                
                if (positionAttribute && geometry.index) {
                    for (let i = 0; i < geometry.index.count; i += 3) {
                        const i1 = geometry.index.getX(i);
                        const i2 = geometry.index.getX(i + 1);
                        const i3 = geometry.index.getX(i + 2);
                        
                        const v1 = {
                            x: positionAttribute.getX(i1),
                            y: positionAttribute.getY(i1),
                            z: positionAttribute.getZ(i1)
                        };
                        const v2 = {
                            x: positionAttribute.getX(i2),
                            y: positionAttribute.getY(i2),
                            z: positionAttribute.getZ(i2)
                        };
                        const v3 = {
                            x: positionAttribute.getX(i3),
                            y: positionAttribute.getY(i3),
                            z: positionAttribute.getZ(i3)
                        };
                        
                        // حساب العمودي (normal)
                        const normal = this.calculateNormal(v1, v2, v3);
                        
                        stlContent += `facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
                        stlContent += '  outer loop\n';
                        stlContent += `    vertex ${v1.x} ${v1.y} ${v1.z}\n`;
                        stlContent += `    vertex ${v2.x} ${v2.y} ${v2.z}\n`;
                        stlContent += `    vertex ${v3.x} ${v3.y} ${v3.z}\n`;
                        stlContent += '  endloop\n';
                        stlContent += 'endfacet\n';
                    }
                }
            }
        });
        
        stlContent += 'endsolid ExportedModel\n';
        
        if (options.autoDownload !== false) {
            this.downloadFile(stlContent, 'model.stl', 'text/plain');
        }
        
        return stlContent;
    }
    
    calculateNormal(v1, v2, v3) {
        const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
        const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
        
        let nx = u.y * v.z - u.z * v.y;
        let ny = u.z * v.x - u.x * v.z;
        let nz = u.x * v.y - u.y * v.x;
        
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 0) {
            nx /= len;
            ny /= len;
            nz /= len;
        }
        
        return { x: nx, y: ny, z: nz };
    }
    
    // ========== IMAGE EXPORT ==========
    
    exportImage(dataURL, format = 'png', filename = 'image') {
        const ext = format.toLowerCase();
        let mimeType = 'image/png';
        
        switch(ext) {
            case 'jpg':
            case 'jpeg':
                mimeType = 'image/jpeg';
                break;
            case 'webp':
                mimeType = 'image/webp';
                break;
            default:
                mimeType = 'image/png';
        }
        
        this.downloadFile(this.dataURLToBlob(dataURL), `${filename}.${ext}`, mimeType);
    }
    
    exportCanvasAsImage(canvas, format = 'png', filename = 'canvas') {
        const dataURL = canvas.toDataURL(`image/${format}`, this.settings.quality);
        this.exportImage(dataURL, format, filename);
    }
    
    exportScreenshot(filename = 'screenshot') {
        if (this.engine?.snapshotCapture) {
            return this.engine.snapshotCapture.captureScreenshot({
                autoDownload: true,
                format: 'image/png'
            });
        }
        
        console.warn('SnapshotCapture not available');
        return null;
    }
    
    // ========== DATA EXPORT ==========
    
    exportData(data, format = 'json', filename = 'data') {
        switch(format.toLowerCase()) {
            case 'json':
                return this.exportToJSON(data, { filename });
            case 'csv':
                return this.exportToCSV(data, filename);
            case 'xml':
                return this.exportToXML(data, filename);
            default:
                console.warn(`Unsupported data format: ${format}`);
                return null;
        }
    }
    
    exportToCSV(data, filename = 'data') {
        if (!Array.isArray(data) || data.length === 0) {
            console.warn('Data must be a non-empty array for CSV export');
            return null;
        }
        
        const headers = Object.keys(data[0]);
        const rows = [headers];
        
        for (const item of data) {
            const row = headers.map(h => {
                let value = item[h];
                if (typeof value === 'object') value = JSON.stringify(value);
                if (value === undefined || value === null) value = '';
                return String(value).replace(/,/g, ';');
            });
            rows.push(row);
        }
        
        const csvContent = rows.map(row => row.join(',')).join('\n');
        const bom = '\uFEFF';
        
        if (filename) {
            this.downloadFile(bom + csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
        }
        
        return csvContent;
    }
    
    exportToXML(data, filename = 'data') {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<data>\n';
        
        const convertToXML = (obj, indent = '  ') => {
            let result = '';
            for (const [key, value] of Object.entries(obj)) {
                if (Array.isArray(value)) {
                    for (const item of value) {
                        result += `${indent}<${key}>\n`;
                        result += convertToXML(item, indent + '  ');
                        result += `${indent}</${key}>\n`;
                    }
                } else if (typeof value === 'object' && value !== null) {
                    result += `${indent}<${key}>\n`;
                    result += convertToXML(value, indent + '  ');
                    result += `${indent}</${key}>\n`;
                } else {
                    const escapedValue = String(value).replace(/[&<>]/g, (m) => {
                        if (m === '&') return '&amp;';
                        if (m === '<') return '&lt;';
                        if (m === '>') return '&gt;';
                        return m;
                    });
                    result += `${indent}<${key}>${escapedValue}</${key}>\n`;
                }
            }
            return result;
        };
        
        xml += convertToXML(data);
        xml += '</data>';
        
        if (filename) {
            this.downloadFile(xml, `${filename}.xml`, 'application/xml');
        }
        
        return xml;
    }
    
    // ========== REPORT EXPORT ==========
    
    exportReport(reportData, format = 'html', filename = 'report') {
        switch(format.toLowerCase()) {
            case 'html':
                return this.exportHTMLReport(reportData, filename);
            case 'pdf':
                return this.exportPDFReport(reportData, filename);
            case 'csv':
                return this.exportData(reportData, 'csv', filename);
            default:
                console.warn(`Unsupported report format: ${format}`);
                return null;
        }
    }
    
    exportHTMLReport(data, filename = 'report') {
        const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>${data.title || 'Export Report'}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; direction: rtl; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #1a1a2e; border-bottom: 3px solid #ffaa44; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
        th { background: #1a1a2e; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .summary { background: #f0f2f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .date { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${data.title || 'Export Report'}</h1>
        <div class="date">Generated: ${new Date().toLocaleString()}</div>
        
        <div class="summary">
            <strong>Summary</strong><br>
            ${data.summary ? JSON.stringify(data.summary, null, 2) : 'No summary available'}
        </div>
        
        <table>
            <thead>
                <tr>
                    ${data.headers ? data.headers.map(h => `<th>${h}</th>`).join('') : '<th>Data</th>'}
                 </tr>
            </thead>
            <tbody>
                ${data.rows ? data.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('') : '<tr><td>No data available</td></tr>'}
            </tbody>
        </table>
    </div>
</body>
</html>
        `;
        
        this.downloadFile(html, `${filename}.html`, 'text/html');
        return html;
    }
    
    exportPDFReport(data, filename = 'report') {
        // استخدام print كحل بسيط
        const html = this.exportHTMLReport(data, null);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        
        setTimeout(() => printWindow.close(), 1000);
        
        return true;
    }
    
    // ========== UTILITY FUNCTIONS ==========
    
    downloadFile(content, filename, mimeType = 'application/octet-stream') {
        let blob;
        
        if (typeof content === 'string') {
            blob = new Blob([content], { type: mimeType });
        } else if (content instanceof Blob) {
            blob = content;
        } else if (content instanceof ArrayBuffer) {
            blob = new Blob([content], { type: mimeType });
        } else {
            blob = new Blob([JSON.stringify(content)], { type: mimeType });
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`📥 File downloaded: ${filename}`);
    }
    
    dataURLToBlob(dataURL) {
        const parts = dataURL.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const base64 = atob(parts[1]);
        const array = new Uint8Array(base64.length);
        
        for (let i = 0; i < base64.length; i++) {
            array[i] = base64.charCodeAt(i);
        }
        
        return new Blob([array], { type: mime });
    }
    
    createSimpleArchive(files, filename = 'archive.zip') {
        // تبسيط - إنشاء ملف نصي يحتوي على قائمة الملفات
        let manifest = 'Files in archive:\n';
        for (const file of files) {
            manifest += `- ${file.name}\n`;
        }
        
        this.downloadFile(manifest, filename, 'text/plain');
        
        return manifest;
    }
    
   // ========== BATCH EXPORT ==========
    
    async exportMultiple(items, options = {}) {
        const results = [];
        
        for (const item of items) {
            let result;
            
            switch(item.type) {
                case 'model':
                    result = this.exportModel(item.data, item.format, { autoDownload: false });
                    break;
                case 'data':
                    result = this.exportData(item.data, item.format, null);
                    break;
                case 'image':
                    result = item.data;
                    break;
                default:
                    result = null;
            }
            
            results.push({
                name: item.name,
                type: item.type,
                format: item.format,
                success: result !== null,
                data: result
            });
        }
        
        if (options.combine) {
            const combined = {
                exportedAt: new Date().toISOString(),
                items: results
            };
            this.exportToJSON(combined, { filename: 'batch_export' });
        }
        
        return results;
    }
    
    // ========== SETTINGS ==========
    
    setDefaultFormat(format) {
        if (this.supportedFormats.project.includes(format) ||
            this.supportedFormats.data.includes(format)) {
            this.settings.defaultFormat = format;
        }
    }
    
    setCompression(enabled) {
        this.settings.compression = enabled;
    }
    
    setQuality(quality) {
        this.settings.quality = Math.min(1, Math.max(0, quality));
    }
    
    getSupportedFormats() {
        return this.supportedFormats;
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        console.log('♻️ ExportTools disposed');
    }
}

export default ExportTools;