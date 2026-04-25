// ============================================
// SCENE EXPLORER - مستكشف المشهد
// يعرض هيكل المشهد، المشاهد، العناصر، مع إمكانية التحديد
// ============================================

export class SceneExplorer {
    constructor(engine = null) {
        this.engine = engine;
        this.panel = null;
        this.isVisible = false;
        
        // بيانات المشهد
        this.scenes = [];
        this.elements = [];
        this.selectedId = null;
        
        console.log('🗂️ SceneExplorer initialized');
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
            width: 300px;
            max-height: calc(100vh - 100px);
            background: #1e1e2e;
            border-radius: 12px;
            border-left: 3px solid #44aaff;
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
                        <span style="font-size: 18px;">🗂️ Scene Explorer</span>
                        <span id="sceneCount" style="background:#44aaff; color:#1e1e2e; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:8px;">0</span>
                    </div>
                    <button id="explorerCloseBtn" style="background:transparent; border:none; color:#ff4444; cursor:pointer; font-size:18px;">✕</button>
                </div>
                <div style="margin-top: 10px;">
                    <input type="text" id="explorerSearch" placeholder="Search scenes/elements..." style="width:100%; background:#1e1e2e; border:1px solid #444; border-radius:6px; padding:8px; color:white;">
                </div>
            </div>
            
            <div id="explorerTree" style="flex:1; overflow-y: auto; padding: 10px;">
                <div style="text-align:center; padding:40px; color:#666;">Loading...</div>
            </div>
        `;
        
        document.body.appendChild(this.panel);
        
        this.makeDraggable(this.panel);
        
        document.getElementById('explorerCloseBtn')?.addEventListener('click', () => this.hide());
        document.getElementById('explorerSearch')?.addEventListener('input', (e) => {
            this.filterTree(e.target.value.toLowerCase());
        });
        
        this.loadData();
    }
    
    loadData() {
        // بيانات تجريبية
        this.scenes = [
            { id: 'scene_1', name: 'Main Entrance', type: 'panorama', thumbnail: null, elementCount: 12 },
            { id: 'scene_2', name: 'Lobby', type: 'panorama', thumbnail: null, elementCount: 8 },
            { id: 'scene_3', name: 'Office Area', type: 'panorama', thumbnail: null, elementCount: 15 },
            { id: 'scene_4', name: 'Meeting Room', type: 'panorama', thumbnail: null, elementCount: 6 },
            { id: 'scene_5', name: 'Restroom', type: 'panorama', thumbnail: null, elementCount: 4 }
        ];
        
        this.elements = [
            { id: 'elem_1', name: 'Electrical Panel', type: 'mep', sceneId: 'scene_3', position: { x: 5, y: 1.5, z: 3 } },
            { id: 'elem_2', name: 'HVAC Duct', type: 'mep', sceneId: 'scene_3', position: { x: 2, y: 2.5, z: 4 } },
            { id: 'elem_3', name: 'Water Pipe', type: 'plumbing', sceneId: 'scene_2', position: { x: 1, y: 0.5, z: 2 } },
            { id: 'elem_4', name: 'Fire Extinguisher', type: 'safety', sceneId: 'scene_1', position: { x: 8, y: 1.2, z: 2 } }
        ];
        
        this.renderTree();
    }
    
    renderTree() {
        const container = document.getElementById('explorerTree');
        if (!container) return;
        
        let html = `
            <div style="margin-bottom: 10px;">
                <div class="tree-header" style="background:#2a2a3a; padding:8px; border-radius:6px; cursor:pointer;">
                    <span>🏠 Project Root</span>
                    <span style="float:right;">📁 ${this.scenes.length + this.elements.length}</span>
                </div>
                <div class="tree-children" style="margin-left: 15px;">
        `;
        
        // عرض المشاهد
        html += `<div style="margin: 8px 0;"><div style="color:#44aaff; margin-bottom:5px;">📷 PANORAMAS (${this.scenes.length})</div>`;
        for (const scene of this.scenes) {
            html += `
                <div class="tree-item" data-id="${scene.id}" data-type="scene" style="display:flex; align-items:center; gap:8px; padding:6px 8px; margin:2px 0; border-radius:6px; cursor:pointer;">
                    <span>🖼️</span>
                    <span style="flex:1;">${scene.name}</span>
                    <span style="font-size:10px; color:#888;">${scene.elementCount} elements</span>
                </div>
            `;
        }
        html += `</div>`;
        
        // عرض العناصر
        html += `<div style="margin: 8px 0;"><div style="color:#ffaa44; margin-bottom:5px;">🔧 ELEMENTS (${this.elements.length})</div>`;
        for (const element of this.elements) {
            const icon = this.getElementIcon(element.type);
            html += `
                <div class="tree-item" data-id="${element.id}" data-type="element" style="display:flex; align-items:center; gap:8px; padding:6px 8px; margin:2px 0; border-radius:6px; cursor:pointer;">
                    <span>${icon}</span>
                    <span style="flex:1;">${element.name}</span>
                    <span style="font-size:10px; color:#888;">${element.type}</span>
                </div>
            `;
        }
        html += `</div>`;
        
        html += `</div></div>`;
        
        container.innerHTML = html;
        
        // ربط الأحداث
        container.querySelectorAll('.tree-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                const type = el.dataset.type;
                this.selectItem(id, type);
            });
        });
        
        // ربط توسيع/طي الأقسام
        const headers = container.querySelectorAll('.tree-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const children = header.nextElementSibling;
                if (children) {
                    children.style.display = children.style.display === 'none' ? 'block' : 'none';
                }
            });
        });
    }
    
    getElementIcon(type) {
        const icons = {
            mep: '⚡',
            plumbing: '💧',
            hvac: '❄️',
            safety: '🧯',
            architecture: '🏛️',
            furniture: '🪑',
            default: '📦'
        };
        return icons[type] || icons.default;
    }
    
    filterTree(searchTerm) {
        if (!searchTerm) {
            document.querySelectorAll('.tree-item').forEach(el => {
                el.style.display = 'flex';
            });
            return;
        }
        
        document.querySelectorAll('.tree-item').forEach(el => {
            const text = el.textContent.toLowerCase();
            el.style.display = text.includes(searchTerm) ? 'flex' : 'none';
        });
    }
    
    selectItem(id, type) {
        this.selectedId = id;
        
        // تحديث التمييز
        document.querySelectorAll('.tree-item').forEach(el => {
            el.style.background = 'transparent';
        });
        
        const selectedEl = document.querySelector(`.tree-item[data-id="${id}"]`);
        if (selectedEl) {
            selectedEl.style.background = '#2a2a3a';
        }
        
        // إرسال حدث التحديد
        if (this.engine?.eventBus) {
            this.engine.eventBus.emit('explorer:itemSelected', { id, type });
        }
        
        console.log(`Selected: ${type} - ${id}`);
    }
    
    addScene(scene) {
        this.scenes.push(scene);
        this.renderTree();
    }
    
    removeScene(sceneId) {
        this.scenes = this.scenes.filter(s => s.id !== sceneId);
        this.renderTree();
    }
    
    addElement(element) {
        this.elements.push(element);
        this.renderTree();
    }
    
    removeElement(elementId) {
        this.elements = this.elements.filter(e => e.id !== elementId);
        this.renderTree();
    }
    
    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = element.querySelector('div:first-child');
        header.style.cursor = 'move';
        
        header.onmousedown = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
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

export default SceneExplorer;