// ============================================
// BOQ PANEL - لوحة كميات الأعمال
// يعرض: قائمة المواد، الكميات، الأسعار، الإجماليات
// ============================================

export class BOQPanel {
    constructor(engine = null) {
        this.engine = engine;
        this.panel = null;
        this.isVisible = false;
        
        // بيانات BOQ
        this.items = [];
        this.categories = new Map();
        this.totalCost = 0;
        
        // الفلاتر
        this.filters = {
            category: 'all',
            search: '',
            minPrice: 0,
            maxPrice: Infinity
        };
        
        console.log('📦 BOQPanel initialized');
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
            right: 20px;
            width: 380px;
            max-height: calc(100vh - 100px);
            background: #1e1e2e;
            border-radius: 12px;
            border-left: 3px solid #44ffaa;
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
                        <span style="font-size: 18px;">📦 Bill of Quantities</span>
                        <span id="boqItemCount" style="background:#44ffaa; color:#1e1e2e; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:8px;">0</span>
                    </div>
                    <div>
                        <button id="boqRefreshBtn" style="background:transparent; border:none; color:#44ffaa; cursor:pointer; font-size:16px;">🔄</button>
                        <button id="boqCloseBtn" style="background:transparent; border:none; color:#ff4444; cursor:pointer; font-size:18px;">✕</button>
                    </div>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 8px;">
                    <select id="boqCategoryFilter" style="flex:1; background:#1e1e2e; border:1px solid #444; border-radius:6px; padding:6px; color:white;">
                        <option value="all">All Categories</option>
                    </select>
                    <input type="text" id="boqSearchInput" placeholder="Search..." style="flex:1; background:#1e1e2e; border:1px solid #444; border-radius:6px; padding:6px; color:white;">
                </div>
            </div>
            
            <div id="boqListContainer" style="flex:1; overflow-y: auto; padding: 10px;">
                <div style="text-align:center; padding:40px; color:#666;">No items loaded</div>
            </div>
            
            <div id="boqFooter" style="padding: 12px; background: #2a2a3a; border-top: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color:#aaa;">Total Items:</span>
                    <span id="boqTotalItems" style="color:#44ffaa;">0</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color:#aaa;">Total Cost:</span>
                    <span id="boqTotalCost" style="color:#44ffaa; font-size:18px; font-weight:bold;">$0.00</span>
                </div>
                <div style="margin-top: 10px;">
                    <button id="boqExportBtn" style="width:100%; padding:8px; background:#44ffaa; border:none; border-radius:6px; color:#1e1e2e; font-weight:bold; cursor:pointer;">📊 Export Report</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.panel);
        
        // جعل السحب ممكناً
        this.makeDraggable(this.panel);
        
        // ربط الأحداث
        this.bindEvents();
        
        // تحميل البيانات
        this.loadData();
    }
    
    bindEvents() {
        document.getElementById('boqCloseBtn')?.addEventListener('click', () => this.hide());
        document.getElementById('boqRefreshBtn')?.addEventListener('click', () => this.loadData());
        document.getElementById('boqCategoryFilter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.renderList();
        });
        document.getElementById('boqSearchInput')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.renderList();
        });
        document.getElementById('boqExportBtn')?.addEventListener('click', () => this.exportReport());
    }
    
    loadData() {
        // بيانات تجريبية - يمكن استبدالها ببيانات حقيقية من المشروع
        this.items = [
            { id: 1, code: 'CON-001', name: 'Concrete Grade C30', category: 'concrete', quantity: 150, unit: 'm³', unitPrice: 120, total: 18000 },
            { id: 2, code: 'STL-001', name: 'Steel Rebar 16mm', category: 'steel', quantity: 5000, unit: 'kg', unitPrice: 1.2, total: 6000 },
            { id: 3, code: 'WOD-001', name: 'Oak Wood', category: 'wood', quantity: 200, unit: 'm²', unitPrice: 45, total: 9000 },
            { id: 4, code: 'GLS-001', name: 'Tempered Glass 10mm', category: 'glass', quantity: 80, unit: 'm²', unitPrice: 85, total: 6800 },
            { id: 5, code: 'ELC-001', name: 'Electrical Wire 2.5mm²', category: 'electrical', quantity: 1000, unit: 'm', unitPrice: 0.8, total: 800 },
            { id: 6, code: 'PLB-001', name: 'PVC Pipe 50mm', category: 'plumbing', quantity: 300, unit: 'm', unitPrice: 3.5, total: 1050 },
            { id: 7, code: 'HVC-001', name: 'Ductwork', category: 'hvac', quantity: 150, unit: 'm²', unitPrice: 25, total: 3750 }
        ];
        
        // تجميع الفئات
        this.categories.clear();
        this.totalCost = 0;
        for (const item of this.items) {
            if (!this.categories.has(item.category)) {
                this.categories.set(item.category, { name: item.category, count: 0, total: 0 });
            }
            const cat = this.categories.get(item.category);
            cat.count++;
            cat.total += item.total;
            this.totalCost += item.total;
        }
        
        this.updateCategoryFilter();
        this.renderList();
    }
    
    updateCategoryFilter() {
        const select = document.getElementById('boqCategoryFilter');
        if (!select) return;
        
        let options = '<option value="all">All Categories</option>';
        for (const [key, cat] of this.categories) {
            options += `<option value="${key}">${cat.name.toUpperCase()} (${cat.count})</option>`;
        }
        select.innerHTML = options;
    }
    
    renderList() {
        const container = document.getElementById('boqListContainer');
        const totalItemsSpan = document.getElementById('boqTotalItems');
        const totalCostSpan = document.getElementById('boqTotalCost');
        const itemCountSpan = document.getElementById('boqItemCount');
        
        let filtered = [...this.items];
        
        // فلتر حسب الفئة
        if (this.filters.category !== 'all') {
            filtered = filtered.filter(i => i.category === this.filters.category);
        }
        
        // فلتر حسب البحث
        if (this.filters.search) {
            filtered = filtered.filter(i => 
                i.name.toLowerCase().includes(this.filters.search) ||
                i.code.toLowerCase().includes(this.filters.search)
            );
        }
        
        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">No items found</div>';
            totalItemsSpan.textContent = '0';
            totalCostSpan.textContent = '$0.00';
            itemCountSpan.textContent = '0';
            return;
        }
        
        const filteredTotal = filtered.reduce((sum, i) => sum + i.total, 0);
        
        let html = '';
        let currentCategory = '';
        
        for (const item of filtered) {
            if (currentCategory !== item.category) {
                currentCategory = item.category;
                const catInfo = this.categories.get(item.category);
                html += `
                    <div style="background:#2a2a3a; padding:8px 12px; margin:10px 0 5px 0; border-radius:6px;">
                        <span style="color:#44ffaa; font-weight:bold;">📁 ${item.category.toUpperCase()}</span>
                        <span style="float:right; color:#888; font-size:11px;">${catInfo?.count || 0} items</span>
                    </div>
                `;
            }
            
            html += `
                <div style="padding:10px; border-bottom:1px solid #333; cursor:pointer;" data-id="${item.id}">
                    <div style="display:flex; justify-content:space-between;">
                        <div>
                            <span style="color:#ffaa44; font-size:12px;">${item.code}</span>
                            <div style="font-weight:bold;">${item.name}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="color:#44ffaa;">$${item.total.toFixed(2)}</div>
                            <div style="font-size:11px; color:#888;">${item.quantity} ${item.unit} × $${item.unitPrice}</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        totalItemsSpan.textContent = filtered.length;
        totalCostSpan.textContent = `$${filteredTotal.toFixed(2)}`;
        itemCountSpan.textContent = filtered.length;
        
        // إضافة حدث النقر على العنصر
        container.querySelectorAll('[data-id]').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.id);
                this.selectItem(id);
            });
        });
    }
    
    selectItem(id) {
        const item = this.items.find(i => i.id === id);
        if (item && this.engine?.eventBus) {
            this.engine.eventBus.emit('boq:itemSelected', item);
        }
    }
    
    exportReport() {
        let csv = 'Code,Name,Category,Quantity,Unit,Unit Price,Total\n';
        for (const item of this.items) {
            csv += `${item.code},${item.name},${item.category},${item.quantity},${item.unit},${item.unitPrice},${item.total}\n`;
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boq_export_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = element.querySelector('div:first-child');
        
        header.style.cursor = 'move';
        header.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + 'px';
            element.style.left = (element.offsetLeft - pos1) + 'px';
            element.style.right = 'auto';
        }
        
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
    
    setData(items) {
        this.items = items;
        this.loadData();
    }
    
    dispose() {
        this.hide();
    }
}

export default BOQPanel;