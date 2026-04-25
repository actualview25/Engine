// ============================================
// PROPERTIES PANEL - لوحة الخصائص
// تعرض خصائص العنصر المحدد وتسمح بتعديلها
// ============================================

export class PropertiesPanel {
    constructor(engine = null) {
        this.engine = engine;
        this.panel = null;
        this.isVisible = false;
        this.selectedObject = null;
        
        // الحقول القابلة للتعديل
        this.editableFields = ['name', 'position', 'rotation', 'scale', 'color', 'material'];
        
        console.log('🔧 PropertiesPanel initialized');
    }
    
    show() {
        if (this.isVisible) return;
        this.createPanel();
        this.isVisible = true;
    }
    
    hide() {
        if (this.panel && this.panel.remove) {
            this.panel.remove();
        }
        this.isVisible = false;
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    createPanel() {
        if (this.panel) this.panel.remove();
        
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            width: 320px;
            max-height: calc(100vh - 100px);
            background: #1e1e2e;
            border-radius: 12px;
            border-left: 3px solid #ffaa44;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        this.panel.innerHTML = `
            <div style="padding: 15px; background: #2a2a3a; cursor: move;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 18px;">🔧 Properties</span>
                        <span id="propObjectType" style="background:#ffaa44; color:#1e1e2e; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:8px;">None</span>
                    </div>
                    <button id="propCloseBtn" style="background:transparent; border:none; color:#ff4444; cursor:pointer; font-size:18px;">✕</button>
                </div>
            </div>
            
            <div id="propContent" style="flex:1; overflow-y: auto; padding: 15px;">
                <div style="text-align:center; padding:40px; color:#666;">
                    🔍 No object selected<br>
                    <span style="font-size:12px;">Click on an object to view properties</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.panel);
        
        this.makeDraggable(this.panel);
        
        document.getElementById('propCloseBtn')?.addEventListener('click', () => this.hide());
    }
    
    updateSelection(object) {
        this.selectedObject = object;
        this.renderProperties();
    }
    
    renderProperties() {
        const container = document.getElementById('propContent');
        if (!container) return;
        
        if (!this.selectedObject) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#666;">
                    🔍 No object selected<br>
                    <span style="font-size:12px;">Click on an object to view properties</span>
                </div>
            `;
            return;
        }
        
        const obj = this.selectedObject;
        const type = obj.userData?.type || obj.constructor?.name || 'Object';
        const name = obj.name || obj.userData?.name || 'Unnamed';
        const id = obj.userData?.id || obj.id || 'N/A';
        
        let html = `
            <div id="propHeader" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #333;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:#ffaa44; font-weight:bold;">📌 ${name}</div>
                        <div style="font-size:11px; color:#888;">Type: ${type} | ID: ${id}</div>
                    </div>
                    <button id="propFocusBtn" style="background:#ffaa44; border:none; border-radius:6px; padding:4px 10px; cursor:pointer;">🎯 Focus</button>
                </div>
            </div>
            
            <div id="propGeneral" style="margin-bottom: 15px;">
                <div style="color:#aaa; font-size:12px; margin-bottom:8px;">📋 General</div>
                <div class="propRow" style="display:flex; margin-bottom:8px;">
                    <span style="width:80px; color:#888;">Name:</span>
                    <input type="text" id="propName" value="${name}" style="flex:1; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px 8px; color:white;">
                </div>
                <div class="propRow" style="display:flex; margin-bottom:8px;">
                    <span style="width:80px; color:#888;">Visible:</span>
                    <input type="checkbox" id="propVisible" ${obj.visible !== false ? 'checked' : ''} style="margin-left:4px;">
                </div>
            </div>
        `;
        
        // إضافة خصائص الموقع
        if (obj.position) {
            html += `
                <div id="propPosition" style="margin-bottom: 15px;">
                    <div style="color:#aaa; font-size:12px; margin-bottom:8px;">📍 Position</div>
                    <div style="display:flex; gap:8px; margin-bottom:4px;">
                        <div style="flex:1;"><span style="color:#888;">X:</span> <input type="number" id="propPosX" value="${obj.position.x.toFixed(2)}" step="0.1" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                        <div style="flex:1;"><span style="color:#888;">Y:</span> <input type="number" id="propPosY" value="${obj.position.y.toFixed(2)}" step="0.1" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                        <div style="flex:1;"><span style="color:#888;">Z:</span> <input type="number" id="propPosZ" value="${obj.position.z.toFixed(2)}" step="0.1" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                    </div>
                </div>
            `;
        }
        
        // إضافة خصائص الدوران
        if (obj.rotation) {
            html += `
                <div id="propRotation" style="margin-bottom: 15px;">
                    <div style="color:#aaa; font-size:12px; margin-bottom:8px;">🔄 Rotation</div>
                    <div style="display:flex; gap:8px; margin-bottom:4px;">
                        <div style="flex:1;"><span style="color:#888;">X:</span> <input type="number" id="propRotX" value="${(obj.rotation.x * 180 / Math.PI).toFixed(0)}" step="15" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                        <div style="flex:1;"><span style="color:#888;">Y:</span> <input type="number" id="propRotY" value="${(obj.rotation.y * 180 / Math.PI).toFixed(0)}" step="15" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                        <div style="flex:1;"><span style="color:#888;">Z:</span> <input type="number" id="propRotZ" value="${(obj.rotation.z * 180 / Math.PI).toFixed(0)}" step="15" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                    </div>
                </div>
            `;
        }
        
        // إضافة خصائص المقياس
        if (obj.scale) {
            html += `
                <div id="propScale" style="margin-bottom: 15px;">
                    <div style="color:#aaa; font-size:12px; margin-bottom:8px;">📏 Scale</div>
                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;"><span style="color:#888;">X:</span> <input type="number" id="propScaleX" value="${obj.scale.x.toFixed(2)}" step="0.1" min="0.1" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                        <div style="flex:1;"><span style="color:#888;">Y:</span> <input type="number" id="propScaleY" value="${obj.scale.y.toFixed(2)}" step="0.1" min="0.1" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                        <div style="flex:1;"><span style="color:#888;">Z:</span> <input type="number" id="propScaleZ" value="${obj.scale.z.toFixed(2)}" step="0.1" min="0.1" style="width:100%; background:#2a2a3a; border:1px solid #444; border-radius:4px; padding:4px; color:white;"></div>
                    </div>
                </div>
            `;
        }
        
        // إضافة خصائص المادة
        if (obj.material) {
            const color = obj.material.color?.getHexString() || 'ffffff';
            html += `
                <div id="propMaterial" style="margin-bottom: 15px;">
                    <div style="color:#aaa; font-size:12px; margin-bottom:8px;">🎨 Material</div>
                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;">
                            <span style="color:#888;">Color:</span>
                            <input type="color" id="propColor" value="#${color}" style="width:100%; height:36px; background:#2a2a3a; border:1px solid #444; border-radius:4px; cursor:pointer;">
                        </div>
                        <div style="flex:1;">
                            <span style="color:#888;">Opacity:</span>
                            <input type="range" id="propOpacity" min="0" max="1" step="0.01" value="${obj.material.opacity || 1}" style="width:100%;">
                            <span id="propOpacityVal" style="color:#888; font-size:11px;">${(obj.material.opacity || 1).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // ربط الأحداث
        this.bindPropertyEvents();
    }
    
    bindPropertyEvents() {
        const nameInput = document.getElementById('propName');
        const visibleCheck = document.getElementById('propVisible');
        const posX = document.getElementById('propPosX');
        const posY = document.getElementById('propPosY');
        const posZ = document.getElementById('propPosZ');
        const rotX = document.getElementById('propRotX');
        const rotY = document.getElementById('propRotY');
        const rotZ = document.getElementById('propRotZ');
        const scaleX = document.getElementById('propScaleX');
        const scaleY = document.getElementById('propScaleY');
        const scaleZ = document.getElementById('propScaleZ');
        const colorInput = document.getElementById('propColor');
        const opacityInput = document.getElementById('propOpacity');
        const opacityVal = document.getElementById('propOpacityVal');
        const focusBtn = document.getElementById('propFocusBtn');
        
        if (nameInput && this.selectedObject) {
            nameInput.onchange = () => {
                this.selectedObject.name = nameInput.value;
                this.selectedObject.userData.name = nameInput.value;
            };
        }
        
        if (visibleCheck && this.selectedObject) {
            visibleCheck.onchange = () => {
                this.selectedObject.visible = visibleCheck.checked;
            };
        }
        
        if (posX && posY && posZ && this.selectedObject?.position) {
            const updatePos = () => {
                this.selectedObject.position.set(
                    parseFloat(posX.value),
                    parseFloat(posY.value),
                    parseFloat(posZ.value)
                );
            };
            posX.onchange = updatePos;
            posY.onchange = updatePos;
            posZ.onchange = updatePos;
        }
        
        if (rotX && rotY && rotZ && this.selectedObject?.rotation) {
            const updateRot = () => {
                this.selectedObject.rotation.set(
                    parseFloat(rotX.value) * Math.PI / 180,
                    parseFloat(rotY.value) * Math.PI / 180,
                    parseFloat(rotZ.value) * Math.PI / 180
                );
            };
            rotX.onchange = updateRot;
            rotY.onchange = updateRot;
            rotZ.onchange = updateRot;
        }
        
        if (scaleX && scaleY && scaleZ && this.selectedObject?.scale) {
            const updateScale = () => {
                this.selectedObject.scale.set(
                    parseFloat(scaleX.value),
                    parseFloat(scaleY.value),
                    parseFloat(scaleZ.value)
                );
            };
            scaleX.onchange = updateScale;
            scaleY.onchange = updateScale;
            scaleZ.onchange = updateScale;
        }
        
        if (colorInput && this.selectedObject?.material) {
            colorInput.onchange = () => {
                this.selectedObject.material.color.setHex(parseInt(colorInput.value.slice(1), 16));
            };
        }
        
        if (opacityInput && opacityVal && this.selectedObject?.material) {
            opacityInput.oninput = () => {
                const val = parseFloat(opacityInput.value);
                opacityVal.textContent = val.toFixed(2);
                this.selectedObject.material.opacity = val;
                this.selectedObject.material.transparent = val < 1;
            };
        }
        
        if (focusBtn && this.selectedObject && this.engine?.camera) {
            focusBtn.onclick = () => {
                const pos = this.selectedObject.position.clone();
                this.engine.camera.position.copy(pos.clone().add(new THREE.Vector3(5, 5, 5)));
                this.engine.camera.lookAt(pos);
                if (this.engine.controls) this.engine.controls.target.copy(pos);
            };
        }
    }
    
    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = element.querySelector('div:first-child');
        header.style.cursor = 'move';
        
        header.onmousedown = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = () => {
                document.onmouseup = null;
                document.onmousemove = null;
            };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                element.style.top = (element.offsetTop - pos2) + 'px';
                element.style.left = (element.offsetLeft - pos1) + 'px';
                element.style.right = 'auto';
            };
        };
    }
    
    dispose() {
        this.hide();
    }
}

export default PropertiesPanel;