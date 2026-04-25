// ============================================
// EXPORT DIALOG - حوار تصدير المشروع والبيانات
// يدعم: تنسيقات متعددة، خيارات التصدير، معاينة
// ============================================

export class ExportDialog {
    constructor(onExport = null) {
        this.onExport = onExport;
        
        this.dialog = null;
        this.isOpen = false;
        
        // خيارات التصدير
        this.options = {
            format: 'json',
            includeNodes: true,
            includeElements: true,
            includeHotspots: true,
            includeMeasurements: true,
            includeGeoData: true,
            quality: 0.92,
            compression: false
        };
        
        // التنسيقات المتاحة
        this.formats = [
            { id: 'json', name: 'JSON', icon: '📄', extension: '.json' },
            { id: 'actualview', name: 'Actual View', icon: '🏗️', extension: '.actualview' },
            { id: 'gltf', name: 'GLTF', icon: '🎨', extension: '.gltf' },
            { id: 'obj', name: 'OBJ', icon: '📦', extension: '.obj' },
            { id: 'csv', name: 'CSV', icon: '📊', extension: '.csv' },
            { id: 'html', name: 'HTML Report', icon: '🌐', extension: '.html' }
        ];
        
        console.log('📤 ExportDialog initialized');
    }
    
    // ========== DIALOG CONTROLS ==========
    
    open() {
        if (this.isOpen) return;
        
        this.createDialog();
        this.isOpen = true;
    }
    
    close() {
        if (this.dialog && this.dialog.remove) {
            this.dialog.remove();
        }
        this.isOpen = false;
    }
    
    createDialog() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        this.dialog = document.createElement('div');
        this.dialog.style.cssText = `
            background: #1e1e2e;
            border-radius: 12px;
            width: 550px;
            max-width: 90%;
            max-height: 80%;
            overflow: auto;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            border: 1px solid #44aaff;
        `;
        
        // إنشاء قائمة التنسيقات
        let formatsHtml = '';
        this.formats.forEach(f => {
            formatsHtml += `
                <div class="formatOption" data-format="${f.id}" style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 12px 15px;
                    margin: 5px 0;
                    background: ${this.options.format === f.id ? '#2a2a3a' : 'transparent'};
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                    border: 1px solid ${this.options.format === f.id ? '#44aaff' : 'transparent'};
                ">
                    <span style="font-size: 24px;">${f.icon}</span>
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${f.name}</div>
                        <div style="font-size:11px; color:#888;">${f.extension}</div>
                    </div>
                    <span style="color:#44aaff;">${this.options.format === f.id ? '✓' : ''}</span>
                </div>
            `;
        });
        
        this.dialog.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #333;">
                <h2 style="margin:0; color:#44aaff;">📤 Export Project</h2>
                <p style="margin:5px 0 0; color:#888; font-size:12px;">Choose format and export options</p>
            </div>
            
            <div style="padding: 20px;">
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 180px;">
                        <div style="color:#aaa; margin-bottom: 10px; font-size:12px;">Format</div>
                        <div id="formatsList">
                            ${formatsHtml}
                        </div>
                    </div>
                    
                    <div style="flex: 1.5; min-width: 200px;">
                        <div style="color:#aaa; margin-bottom: 10px; font-size:12px;">Export Options</div>
                        <div id="exportOptions">
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <input type="checkbox" id="includeNodes" ${this.options.includeNodes ? 'checked' : ''}>
                                <span>Include Nodes / Scenes</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <input type="checkbox" id="includeElements" ${this.options.includeElements ? 'checked' : ''}>
                                <span>Include Elements / Objects</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <input type="checkbox" id="includeHotspots" ${this.options.includeHotspots ? 'checked' : ''}>
                                <span>Include Hotspots</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <input type="checkbox" id="includeMeasurements" ${this.options.includeMeasurements ? 'checked' : ''}>
                                <span>Include Measurements</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <input type="checkbox" id="includeGeoData" ${this.options.includeGeoData ? 'checked' : ''}>
                                <span>Include Geo-Referencing Data</span>
                            </label>
                            <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 10px;">
                                <label style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" id="compression" ${this.options.compression ? 'checked' : ''}>
                                    <span>Compress output</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 15px 20px; border-top: 1px solid #333; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="exportBtn" style="padding:8px 20px; background:#44aaff; border:none; border-radius:6px; color:#1e1e2e; font-weight:bold; cursor:pointer;">💾 Export</button>
                <button id="cancelBtn" style="padding:8px 16px; background:#444; border:none; border-radius:6px; color:white; cursor:pointer;">Cancel</button>
            </div>
        `;
        
        overlay.appendChild(this.dialog);
        document.body.appendChild(overlay);
        
        // ربط الأحداث
        this.bindEvents(overlay);
        
        // حفظ المراجع
        this.elements = {
            formatsList: this.dialog.querySelector('#formatsList'),
            exportBtn: this.dialog.querySelector('#exportBtn'),
            cancelBtn: this.dialog.querySelector('#cancelBtn'),
            includeNodes: this.dialog.querySelector('#includeNodes'),
            includeElements: this.dialog.querySelector('#includeElements'),
            includeHotspots: this.dialog.querySelector('#includeHotspots'),
            includeMeasurements: this.dialog.querySelector('#includeMeasurements'),
            includeGeoData: this.dialog.querySelector('#includeGeoData'),
            compression: this.dialog.querySelector('#compression')
        };
        
        // ربط أحداث الخيارات
        this.elements.includeNodes.onchange = (e) => this.options.includeNodes = e.target.checked;
        this.elements.includeElements.onchange = (e) => this.options.includeElements = e.target.checked;
        this.elements.includeHotspots.onchange = (e) => this.options.includeHotspots = e.target.checked;
        this.elements.includeMeasurements.onchange = (e) => this.options.includeMeasurements = e.target.checked;
        this.elements.includeGeoData.onchange = (e) => this.options.includeGeoData = e.target.checked;
        this.elements.compression.onchange = (e) => this.options.compression = e.target.checked;
        
        // ربط أحداث التنسيقات
        this.dialog.querySelectorAll('.formatOption').forEach(opt => {
            opt.onclick = () => {
                const format = opt.dataset.format;
                this.options.format = format;
                this.updateFormatSelection();
            };
        });
    }
    
    bindEvents(overlay) {
        this.elements.exportBtn.onclick = () => {
            this.doExport();
        };
        
        this.elements.cancelBtn.onclick = () => {
            this.close();
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };
    }
    
    updateFormatSelection() {
        const options = this.dialog.querySelectorAll('.formatOption');
        options.forEach(opt => {
            const format = opt.dataset.format;
            opt.style.background = this.options.format === format ? '#2a2a3a' : 'transparent';
            opt.style.borderColor = this.options.format === format ? '#44aaff' : 'transparent';
            const checkSpan = opt.querySelector('span:last-child');
            if (checkSpan) checkSpan.textContent = this.options.format === format ? '✓' : '';
        });
    }
    
    doExport() {
        const exportData = {
            format: this.options.format,
            options: {
                includeNodes: this.options.includeNodes,
                includeElements: this.options.includeElements,
                includeHotspots: this.options.includeHotspots,
                includeMeasurements: this.options.includeMeasurements,
                includeGeoData: this.options.includeGeoData,
                compression: this.options.compression
            },
            timestamp: new Date().toISOString()
        };
        
        if (this.onExport) {
            this.onExport(exportData);
        }
        
        this.close();
        
        console.log(`Export triggered: ${this.options.format}`, exportData);
    }
    
    // ========== UTILITY ==========
    
    setFormat(format) {
        if (this.formats.find(f => f.id === format)) {
            this.options.format = format;
            if (this.isOpen) this.updateFormatSelection();
        }
    }
    
    getOptions() {
        return { ...this.options };
    }
}

export default ExportDialog;