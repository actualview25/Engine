// ============================================
// REPORT GENERATOR - نظام تقارير متقدم
// يدعم: PDF, Excel, 3D Snapshots, HTML
// ============================================

export class ReportGenerator {
    constructor(eventBus, scene, camera, boqManager, nodeSystem) {
        this.eventBus = eventBus;
        this.scene = scene;
        this.camera = camera;
        this.boqManager = boqManager;
        this.nodeSystem = nodeSystem;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('report:generate', (type) => {
            this.generateReport(type);
        });
        
        this.eventBus.on('report:snapshot', () => {
            this.takeSnapshot();
        });
        
        this.eventBus.on('report:exportBOQ', () => {
            this.exportBOQReport();
        });
    }
    
    async generateReport(type = 'full') {
        this.eventBus.emit('ui:loading', true);
        this.eventBus.emit('ui:status', '📊 جاري إنشاء التقرير...');
        
        try {
            const reportData = {
                title: 'تقرير المشروع',
                date: new Date().toLocaleString('ar-SA'),
                version: '1.0.0',
                project: {
                    name: this.nodeSystem?.currentNode?.metadata?.name || 'مشروع غير مسمى',
                    nodes: this.nodeSystem?.getNodeCount() || 0,
                    type: 'Reality Navigation Project'
                },
                boq: this.boqManager?.calculateAll() || null,
                summary: this.generateSummary(),
                snapshots: []
            };
            
            // التقاط صور للمشروع
            reportData.snapshots.push(await this.captureSnapshot('منظر عام'));
            
            switch(type) {
                case 'pdf':
                    await this.exportToPDF(reportData);
                    break;
                case 'excel':
                    this.exportToExcel(reportData);
                    break;
                case 'html':
                    this.exportToHTML(reportData);
                    break;
                case 'full':
                default:
                    await this.exportToPDF(reportData);
                    this.exportToExcel(reportData);
                    this.exportToHTML(reportData);
                    break;
            }
            
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:success', '✅ تم إنشاء التقرير بنجاح');
            
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل إنشاء التقرير: ${error.message}`);
            console.error('Report generation error:', error);
        }
    }
    
    generateSummary() {
        const boq = this.boqManager?.calculateAll();
        
        return {
            totalNodes: this.nodeSystem?.getNodeCount() || 0,
            totalHotspots: 0, // يمكن إضافة من HotspotSystem
            totalCost: boq?.totalCost || 0,
            totalQuantity: boq?.totalQuantity || 0,
            categoriesCount: Object.keys(boq?.byCategory || {}).length
        };
    }
    
    async captureSnapshot(name) {
        return new Promise((resolve) => {
            // التقاط صورة من الكاميرا الحالية
            if (!this.renderer) {
                // الحصول على الـ renderer من الحدث
                this.eventBus.once('renderer:get', (renderer) => {
                    this.renderer = renderer;
                    this.doScreenshot(name, resolve);
                });
                this.eventBus.emit('renderer:request');
            } else {
                this.doScreenshot(name, resolve);
            }
        });
    }
    
    doScreenshot(name, resolve) {
        // تحويل canvas إلى صورة
        const canvas = this.renderer.domElement;
        const dataURL = canvas.toDataURL('image/png');
        
        resolve({
            name: name,
            timestamp: new Date().toISOString(),
            image: dataURL
        });
    }
    
    takeSnapshot() {
        this.captureSnapshot('لقطة سريعة').then(snapshot => {
            // عرض الصورة أو حفظها
            const link = document.createElement('a');
            link.download = `snapshot_${Date.now()}.png`;
            link.href = snapshot.image;
            link.click();
            
            this.eventBus.emit('ui:success', '📸 تم التقاط لقطة للمشروع');
        });
    }
    
    async exportToPDF(reportData) {
        // استخدام مكتبة jsPDF
        // ملاحظة: يتطلب تثبيت jspdf
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            // عنوان التقرير
            doc.setFontSize(20);
            doc.text(reportData.title, 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text(`التاريخ: ${reportData.date}`, 20, 40);
            doc.text(`المشروع: ${reportData.project.name}`, 20, 50);
            
            // معلومات المشروع
            doc.setFontSize(14);
            doc.text('ملخص المشروع', 20, 70);
            
            doc.setFontSize(10);
            doc.text(`عدد العقد: ${reportData.project.nodes}`, 30, 85);
            doc.text(`عدد النقاط: ${reportData.summary.totalHotspots}`, 30, 95);
            
            // معلومات BOQ
            if (reportData.boq) {
                doc.text('كميات المواد', 20, 115);
                doc.text(`الإجمالي: ${reportData.boq.totalCost.toFixed(2)} ريال`, 30, 130);
                doc.text(`الكمية الإجمالية: ${reportData.boq.totalQuantity.toFixed(2)} وحدة`, 30, 140);
                
                let y = 160;
                for (const [cat, data] of Object.entries(reportData.boq.byCategory)) {
                    if (y > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.text(`${data.name}: ${data.cost.toFixed(2)} ريال`, 30, y);
                    y += 10;
                }
            }
            
            // حفظ PDF
            doc.save(`report_${Date.now()}.pdf`);
            
        } catch (error) {
            console.warn('PDF export requires jspdf library:', error);
            this.eventBus.emit('ui:warning', '⚠️ لتنسيق PDF، قم بتثبيت مكتبة jspdf');
        }
    }
    
    exportToExcel(reportData) {
        // إنشاء ملف Excel (CSV مع تنسيق)
        let csv = 'التقرير,القيمة\n';
        csv += `عنوان التقرير,${reportData.title}\n`;
        csv += `التاريخ,${reportData.date}\n`;
        csv += `المشروع,${reportData.project.name}\n`;
        csv += `عدد العقد,${reportData.project.nodes}\n`;
        csv += '\nبنود الكميات\n';
        csv += 'البند,الكمية,الوحدة,السعر/وحدة,الإجمالي\n';
        
        if (reportData.boq) {
            for (const item of reportData.boq.items) {
                csv += `"${item.name}",${item.quantity},${item.unit},${item.rate},${item.total}\n`;
            }
            csv += `\nالإجمالي الكلي,,,,"${reportData.boq.totalCost.toFixed(2)}"\n`;
        }
        
        // تحميل الملف
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    exportToHTML(reportData) {
        let html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>${reportData.title}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #ffaa44; border-bottom: 3px solid #ffaa44; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .info-card { background: #f9f9f9; padding: 15px; border-radius: 8px; border-right: 3px solid #ffaa44; }
        .info-label { font-weight: bold; color: #666; font-size: 12px; }
        .info-value { font-size: 20px; color: #333; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
        th { background: #ffaa44; color: white; }
        .total { font-size: 18px; font-weight: bold; color: #ffaa44; text-align: left; margin-top: 20px; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 ${reportData.title}</h1>
        <p>التاريخ: ${reportData.date}</p>
        
        <div class="info-grid">
            <div class="info-card">
                <div class="info-label">📁 اسم المشروع</div>
                <div class="info-value">${reportData.project.name}</div>
            </div>
            <div class="info-card">
                <div class="info-label">📍 عدد العقد</div>
                <div class="info-value">${reportData.project.nodes}</div>
            </div>
            <div class="info-card">
                <div class="info-label">💰 التكلفة الإجمالية</div>
                <div class="info-value">${reportData.summary.totalCost.toLocaleString()} ريال</div>
            </div>
            <div class="info-card">
                <div class="info-label">📦 الكمية الإجمالية</div>
                <div class="info-value">${reportData.summary.totalQuantity.toFixed(2)} وحدة</div>
            </div>
        </div>
        
        <h2>🧾 بنود الكميات</h2>
        <table>
            <thead>
                <tr><th>البند</th><th>الكمية</th><th>الوحدة</th><th>السعر/وحدة</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>`;
        
        if (reportData.boq) {
            for (const item of reportData.boq.items) {
                html += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.unit}</td><td>${item.rate}</td><td>${item.total.toFixed(2)}</td></tr>`;
            }
        }
        
        html += `
            </tbody>
        </table>
        
        <div class="total">الإجمالي الكلي: ${reportData.summary.totalCost.toLocaleString()} ريال</div>
        
        <div class="footer">
            تم إنشاء هذا التقرير بواسطة Actual View Engine v1.0<br>
            ${new Date().toLocaleString('ar-SA')}
        </div>
    </div>
</body>
</html>`;
        
        // حفظ كملف HTML
        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `report_${Date.now()}.html`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    exportBOQReport() {
        const boqData = this.boqManager?.calculateAll();
        if (!boqData) {
            this.eventBus.emit('ui:warning', 'لا توجد بيانات BOQ لتصديرها');
            return;
        }
        
        this.exportToExcel({ 
            title: 'تقرير الكميات', 
            date: new Date().toLocaleString('ar-SA'),
            boq: boqData,
            project: { name: 'BOQ Report' }
        });
    }
}
