// ============================================
// HOTSPOT DIALOG - حوار إدارة نقاط التفاعل
// يدعم: إضافة، تعديل، حذف النقاط، ربط المشاهد
// ============================================

export class HotspotDialog {
    constructor(onAdd = null, onEdit = null) {
        this.onAdd = onAdd;
        this.onEdit = onEdit;
        
        this.dialog = null;
        this.isOpen = false;
        this.mode = 'add'; // add, edit
        this.currentHotspot = null;
        
        // البيانات المؤقتة
        this.tempData = {
            type: 'info',
            title: '',
            content: '',
            targetSceneId: '',
            targetSceneName: '',
            position: null
        };
        
        // المشاهد المتاحة (للربط)
        this.availableScenes = [];
        
        console.log('📍 HotspotDialog initialized');
    }
    
    // ========== DIALOG CONTROLS ==========
    
    openAddDialog(position, scenes = []) {
        this.mode = 'add';
        this.currentHotspot = null;
        this.availableScenes = scenes;
        this.tempData = {
            type: 'info',
            title: '',
            content: '',
            targetSceneId: '',
            targetSceneName: '',
            position: position
        };
        
        this.createDialog();
        this.isOpen = true;
    }
    
    openEditDialog(hotspot, scenes = []) {
        this.mode = 'edit';
        this.currentHotspot = hotspot;
        this.availableScenes = scenes;
        this.tempData = {
            type: hotspot.type || 'info',
            title: hotspot.data?.title || '',
            content: hotspot.data?.content || '',
            targetSceneId: hotspot.data?.targetSceneId || '',
            targetSceneName: hotspot.data?.targetSceneName || '',
            position: hotspot.position
        };
        
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
        // إزالة الحوار القديم إذا وجد
        if (this.dialog && this.dialog.remove) {
            this.dialog.remove();
        }
        
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
            width: 450px;
            max-width: 90%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            border: 1px solid ${this.tempData.type === 'info' ? '#ffaa44' : '#44aaff'};
        `;
        
        const title = this.mode === 'add' ? 'Add Hotspot' : 'Edit Hotspot';
        const icon = this.tempData.type === 'info' ? 'ℹ️' : '🔗';
        
        // خيارات نوع الهوتسبوت
        const typeOptions = `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button id="typeInfoBtn" style="flex:1; padding:10px; background:${this.tempData.type === 'info' ? '#ffaa44' : '#333'}; border:none; border-radius:8px; color:${this.tempData.type === 'info' ? '#1e1e2e' : '#aaa'}; cursor:pointer; font-weight:bold;">
                    ℹ️ Information
                </button>
                <button id="typeSceneBtn" style="flex:1; padding:10px; background:${this.tempData.type === 'scene' ? '#44aaff' : '#333'}; border:none; border-radius:8px; color:${this.tempData.type === 'scene' ? '#1e1e2e' : '#aaa'}; cursor:pointer; font-weight:bold;">
                    🔗 Scene Link
                </button>
            </div>
        `;
        
        // حقل ربط المشهد (يظهر فقط للنوع scene)
        const sceneField = this.tempData.type === 'scene' ? `
            <div id="sceneField" style="margin-bottom: 15px;">
                <label style="display:block; color:#aaa; margin-bottom:5px; font-size:12px;">Target Scene</label>
                <select id="targetScene" style="width:100%; padding:10px; background:#2a2a3a; border:1px solid #444; border-radius:6px; color:white;">
                    <option value="">Select scene...</option>
                    ${this.availableScenes.map(s => `<option value="${s.id}" ${this.tempData.targetSceneId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                </select>
            </div>
        ` : '';
        
        this.dialog.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #333;">
                <h2 style="margin:0; color:${this.tempData.type === 'info' ? '#ffaa44' : '#44aaff'};">${icon} ${title}</h2>
            </div>
            
            <div style="padding: 20px;">
                ${typeOptions}
                
                <div id="infoField" style="display: ${this.tempData.type === 'info' ? 'block' : 'none'};">
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; color:#aaa; margin-bottom:5px; font-size:12px;">Title</label>
                        <input type="text" id="titleInput" value="${this.escapeHtml(this.tempData.title)}" style="width:100%; padding:10px; background:#2a2a3a; border:1px solid #444; border-radius:6px; color:white;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; color:#aaa; margin-bottom:5px; font-size:12px;">Content / Description</label>
                        <textarea id="contentInput" rows="4" style="width:100%; padding:10px; background:#2a2a3a; border:1px solid #444; border-radius:6px; color:white;">${this.escapeHtml(this.tempData.content)}</textarea>
                    </div>
                </div>
                
                <div id="sceneField" style="display: ${this.tempData.type === 'scene' ? 'block' : 'none'};">
                    ${sceneField}
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; color:#aaa; margin-bottom:5px; font-size:12px;">Description (optional)</label>
                        <input type="text" id="sceneDescInput" value="${this.escapeHtml(this.tempData.content)}" style="width:100%; padding:10px; background:#2a2a3a; border:1px solid #444; border-radius:6px; color:white;">
                    </div>
                </div>
                
                <div style="background:#2a2a3a; border-radius:6px; padding:10px; margin-top:10px;">
                    <div style="color:#888; font-size:11px;">📍 Position</div>
                    <div style="color:#aaa; font-family:monospace; font-size:12px;">
                        X: ${this.tempData.position?.x?.toFixed(2) || 0}<br>
                        Y: ${this.tempData.position?.y?.toFixed(2) || 0}<br>
                        Z: ${this.tempData.position?.z?.toFixed(2) || 0}
                    </div>
                </div>
            </div>
            
            <div style="padding: 15px 20px; border-top: 1px solid #333; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="saveBtn" style="padding:8px 20px; background:${this.tempData.type === 'info' ? '#ffaa44' : '#44aaff'}; border:none; border-radius:6px; color:#1e1e2e; font-weight:bold; cursor:pointer;">💾 Save</button>
                <button id="cancelBtn" style="padding:8px 16px; background:#444; border:none; border-radius:6px; color:white; cursor:pointer;">Cancel</button>
                ${this.mode === 'edit' ? '<button id="deleteBtn" style="padding:8px 16px; background:#ff4444; border:none; border-radius:6px; color:white; cursor:pointer;">🗑️ Delete</button>' : ''}
            </div>
        `;
        
        overlay.appendChild(this.dialog);
        document.body.appendChild(overlay);
        
        // ربط الأحداث
        this.bindEvents(overlay);
        
        // حفظ المراجع
        this.elements = {
            typeInfoBtn: this.dialog.querySelector('#typeInfoBtn'),
            typeSceneBtn: this.dialog.querySelector('#typeSceneBtn'),
            infoField: this.dialog.querySelector('#infoField'),
            sceneField: this.dialog.querySelector('#sceneField'),
            titleInput: this.dialog.querySelector('#titleInput'),
            contentInput: this.dialog.querySelector('#contentInput'),
            targetScene: this.dialog.querySelector('#targetScene'),
            sceneDescInput: this.dialog.querySelector('#sceneDescInput'),
            saveBtn: this.dialog.querySelector('#saveBtn'),
            cancelBtn: this.dialog.querySelector('#cancelBtn'),
            deleteBtn: this.dialog.querySelector('#deleteBtn')
        };
    }
    
    bindEvents(overlay) {
        // تبديل نوع الهوتسبوت
        this.elements.typeInfoBtn.onclick = () => {
            this.tempData.type = 'info';
            this.updateTypeUI();
        };
        
        this.elements.typeSceneBtn.onclick = () => {
            this.tempData.type = 'scene';
            this.updateTypeUI();
        };
        
        // حفظ
        this.elements.saveBtn.onclick = () => {
            this.saveHotspot();
        };
        
        // إلغاء
        this.elements.cancelBtn.onclick = () => {
            this.close();
        };
        
        // حذف (في وضع التعديل)
        if (this.elements.deleteBtn) {
            this.elements.deleteBtn.onclick = () => {
                if (confirm('Are you sure you want to delete this hotspot?')) {
                    this.deleteHotspot();
                }
            };
        }
        
        // إغلاق عند الضغط على الخلفية
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };
    }
    
    updateTypeUI() {
        // تحديث ألوان الحوار
        this.dialog.style.borderColor = this.tempData.type === 'info' ? '#ffaa44' : '#44aaff';
        const headerH2 = this.dialog.querySelector('h2');
        if (headerH2) {
            headerH2.style.color = this.tempData.type === 'info' ? '#ffaa44' : '#44aaff';
        }
        
        // تحديث ألوان الأزرار
        if (this.elements.typeInfoBtn) {
            this.elements.typeInfoBtn.style.background = this.tempData.type === 'info' ? '#ffaa44' : '#333';
            this.elements.typeInfoBtn.style.color = this.tempData.type === 'info' ? '#1e1e2e' : '#aaa';
        }
        if (this.elements.typeSceneBtn) {
            this.elements.typeSceneBtn.style.background = this.tempData.type === 'scene' ? '#44aaff' : '#333';
            this.elements.typeSceneBtn.style.color = this.tempData.type === 'scene' ? '#1e1e2e' : '#aaa';
        }
        
        // إظهار/إخفاء الحقول
        if (this.elements.infoField) {
            this.elements.infoField.style.display = this.tempData.type === 'info' ? 'block' : 'none';
        }
        if (this.elements.sceneField) {
            this.elements.sceneField.style.display = this.tempData.type === 'scene' ? 'block' : 'none';
        }
        
        // تحديث لون زر الحفظ
        if (this.elements.saveBtn) {
            this.elements.saveBtn.style.background = this.tempData.type === 'info' ? '#ffaa44' : '#44aaff';
        }
    }
    
    saveHotspot() {
        let hotspotData;
        
        if (this.tempData.type === 'info') {
            const title = this.elements.titleInput?.value.trim();
            const content = this.elements.contentInput?.value.trim();
            
            if (!title) {
                alert('Please enter a title');
                return;
            }
            
            hotspotData = {
                type: 'info',
                title: title,
                content: content || '',
                position: this.tempData.position
            };
        } else {
            const targetSceneId = this.elements.targetScene?.value;
            const description = this.elements.sceneDescInput?.value.trim() || '';
            
            if (!targetSceneId) {
                alert('Please select a target scene');
                return;
            }
            
            const targetScene = this.availableScenes.find(s => s.id === targetSceneId);
            
            hotspotData = {
                type: 'scene',
                targetSceneId: targetSceneId,
                targetSceneName: targetScene?.name || '',
                description: description,
                position: this.tempData.position
            };
        }
        
        if (this.mode === 'add') {
            if (this.onAdd) this.onAdd(hotspotData);
        } else {
            if (this.onEdit) this.onEdit(this.currentHotspot?.id, hotspotData);
        }
        
        this.close();
    }
    
    deleteHotspot() {
        if (this.onDelete) {
            this.onDelete(this.currentHotspot?.id);
        }
        this.close();
    }
    
    onDelete(callback) {
        this.onDelete = callback;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    // ========== UTILITY ==========
    
    setScenes(scenes) {
        this.availableScenes = scenes;
        if (this.isOpen && this.elements.targetScene) {
            const currentValue = this.elements.targetScene.value;
            this.elements.targetScene.innerHTML = `
                <option value="">Select scene...</option>
                ${scenes.map(s => `<option value="${s.id}" ${currentValue === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            `;
        }
    }
}

export default HotspotDialog;