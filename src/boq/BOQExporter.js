// ============================================
// BOQ EXPORTER - تصدير جداول الكميات
// يدعم: CSV, Excel, PDF, JSON, HTML
// ============================================

export class BOQExporter {
    constructor(eventBus, boqCalculator) {
        this.eventBus = eventBus;
        this.boqCalculator = boqCalculator;
    }
    
    // تصدير إلى CSV
    exportToCSV(boqData, filename = 'BOQ_Report') {
        this.eventBus.emit('ui:status', '📊 جاري تصدير BOQ إلى CSV...');
        
        try {
            const rows = [];
            
            // رأس الجدول
            rows.push(['ID', 'الاسم', 'الفئة', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي', 'الوصف']);
            
            // البيانات
            for (const item of boqData.items || []) {
                rows.push([
                    item.id || '',
                    item.name || '',
                    item.category || '',
                    item.quantity || 0,
                    item.unit || '',
                    item.unitPrice || 0,
                    item.totalCost || (item.quantity * item.unitPrice) || 0,
                    item.description || ''
                ]);
            }
            
            // إضافة سطر فارغ ثم الإجمالي
            rows.push([]);
            rows.push(['الإجمالي الكلي', '', '', '', '', '', this.calculateTotalCost(boqData.items), '']);
            
            // تحويل إلى CSV
            const csv = rows.map(row => 
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            ).join('\n');
            
            // تحميل الملف
            this.downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
            
            this.eventBus.emit('ui:success', '✅ تم تصدير BOQ إلى CSV');
            this.eventBus.emit('boq:exported', { format: 'csv', filename });
            
            return csv;
            
        } catch (error) {
            console.error('CSV export error:', error);
            this.eventBus.emit('ui:error', '❌ فشل تصدير CSV');
            return null;
        }
    }
    
    // تصدير إلى Excel (XLSX)
    async exportToExcel(boqData, filename = 'BOQ_Report') {
        this.eventBus.emit('ui:status', '📊 جاري تصدير BOQ إلى Excel...');
        
        try {
            // محاولة استيراد مكتبة XLSX
            const XLSX = await import('xlsx');
            
            // إعداد البيانات للورقة الأولى
            const sheetData = [];
            
            // الرأس
            sheetData.push(['تقرير كميات المواد']);
            sheetData.push(['تاريخ التصدير:', new Date().toLocaleString('ar-SA')]);
            sheetData.push([]);
            sheetData.push(['#', 'الاسم', 'الفئة', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي']);
            
            // البيانات
            let totalCost = 0;
            for (let i = 0; i < (boqData.items || []).length; i++) {
                const item = boqData.items[i];
                const itemTotal = item.totalCost || (item.quantity * item.unitPrice) || 0;
                totalCost += itemTotal;
                
                sheetData.push([
                    i + 1,
                    item.name || '',
                    item.category || '',
                    item.quantity || 0,
                    item.unit || '',
                    item.unitPrice || 0,
                    itemTotal
                ]);
            }
            
            sheetData.push([]);
            sheetData.push(['الإجمالي الكلي:', '', '', '', '', '', totalCost]);
            
            // إنشاء ورقة عمل
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            
            // تعيين عرض الأعمدة
            ws['!cols'] = [
                { wch: 5 },   // #
                { wch: 25 },  // الاسم
                { wch: 20 },  // الفئة
                { wch: 12 },  // الكمية
                { wch: 10 },  // الوحدة
                { wch: 15 },  // سعر الوحدة
                { wch: 15 }   // الإجمالي
            ];
            
            // إنشاء ملف Excel
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'BOQ');
            
            // حفظ الملف
            XLSX.writeFile(wb, `${filename}.xlsx`);
            
            this.eventBus.emit('ui:success', '✅ تم تصدير BOQ إلى Excel');
            this.eventBus.emit('boq:exported', { format: 'excel', filename });
            
            return true;
            
        } catch (error) {
            console.warn('Excel export requires xlsx library:', error);
            // Fallback إلى CSV
            this.exportToCSV(boqData, filename);
            return false;
        }
    }
    
    // تصدير إلى JSON
    exportToJSON(boqData, filename = 'BOQ_Data') {
        this.eventBus.emit('ui:status', '📊 جاري تصدير BOQ إلى JSON...');
        
        try {
            const jsonData = {
                metadata: {
                    exportedAt: new Date().toISOString(),
                    version: '1.0',
                    source: 'Actual View Engine'
                },
                items: boqData.items || [],
                summary: boqData.summary || this.boqCalculator?.calculateTotal(),
                categories: boqData.categories || {}
            };
            
            const jsonString = JSON.stringify(jsonData, null, 2);
            this.downloadFile(jsonString, `${filename}.json`, 'application/json');
            
            this.eventBus.emit('ui:success', '✅ تم تصدير BOQ إلى JSON');
            this.eventBus.emit('boq:exported', { format: 'json', filename });
            
            return jsonData;
            
        } catch (error) {
            console.error('JSON export error:', error);
            this.eventBus.emit('ui:error', '❌ فشل تصدير JSON');
            return null;
        }
    }
    
    // تصدير إلى HTML
    exportToHTML(boqData, filename = 'BOQ_Report') {
        this.eventBus.emit('ui:status', '📊 جاري تصدير BOQ إلى HTML...');
        
        try {
            const totalCost = this.calculateTotalCost(boqData.items);
            
            let html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>تقرير كميات المواد</title>
    <style>
        body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #ffaa44;
            border-bottom: 3px solid #ffaa44;
            padding-bottom: 10px;
        }
        .info {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: right;
        }
        th {
            background: #ffaa44;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        .total {
            font-size: 18px;
            font-weight: bold;
            color: #ffaa44;
            text-align: left;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px solid #ddd;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; padding: 20px; }
            .container { box-shadow: none; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 تقرير كميات المواد</h1>
        <div class="info">
            <p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleString('ar-SA')}</p>
            <p><strong>عدد البنود:</strong> ${boqData.items?.length || 0}</p>
        </div>
        
        <table>
            <thead>
                <tr><th>#</th><th>الاسم</th><th>الفئة</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة (ريال)</th><th>الإجمالي (ريال)</th></tr>
            </thead>
            <tbody>`;
            
            for (let i = 0; i < (boqData.items || []).length; i++) {
                const item = boqData.items[i];
                const itemTotal = item.totalCost || (item.quantity * item.unitPrice) || 0;
                html += `<tr>
                    <td>${i + 1}</td>
                    <td>${item.name || ''}</td>
                    <td>${item.category || ''}</td>
                    <td>${item.quantity || 0}</td>
                    <td>${item.unit || ''}</td>
                    <td>${(item.unitPrice || 0).toFixed(2)}</td>
                    <td>${itemTotal.toFixed(2)}</td>
                </tr>`;
            }
            
            html += `
            </tbody>
        <table>
        <div class="total">
            الإجمالي الكلي: ${totalCost.toFixed(2)} ريال
        </div>
        <div class="footer">
            تم إنشاء هذا التقرير بواسطة Actual View Engine<br>
            ${new Date().toLocaleString('ar-SA')}
        </div>
    </div>
</body>
</html>`;
            
            this.downloadFile(html, `${filename}.html`, 'text/html');
            
            this.eventBus.emit('ui:success', '✅ تم تصدير BOQ إلى HTML');
            this.eventBus.emit('boq:exported', { format: 'html', filename });
            
            return html;
            
        } catch (error) {
            console.error('HTML export error:', error);
            this.eventBus.emit('ui:error', '❌ فشل تصدير HTML');
            return null;
        }
    }
    
    // تصدير إلى PDF (يتطلب jsPDF)
    async exportToPDF(boqData, filename = 'BOQ_Report') {
        this.eventBus.emit('ui:status', '📊 جاري تصدير BOQ إلى PDF...');
        
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // عنوان التقرير
            doc.setFontSize(20);
            doc.text('تقرير كميات المواد', 148, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.text(`تاريخ التصدير: ${new Date().toLocaleString('ar-SA')}`, 148, 30, { align: 'center' });
            
            // جدول البيانات
            const headers = [['#', 'الاسم', 'الفئة', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي']];
            const rows = [];
            
            for (let i = 0; i < (boqData.items || []).length; i++) {
                const item = boqData.items[i];
                const itemTotal = item.totalCost || (item.quantity * item.unitPrice) || 0;
                rows.push([
                    (i + 1).toString(),
                    (item.name || '').substring(0, 30),
                    (item.category || '').substring(0, 20),
                    (item.quantity || 0).toString(),
                    item.unit || '',
                    ((item.unitPrice || 0).toFixed(2)),
                    itemTotal.toFixed(2)
                ]);
            }
            
            // إضافة الجدول (يتطلب jspdf-autotable في الإصدار الكامل)
            doc.autoTable({
                head: headers,
                body: rows,
                startY: 40,
                theme: 'grid',
                styles: { font: 'helvetica', fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [255, 170, 68], textColor: [0, 0, 0] }
            });
            
            // الإجمالي
            const totalCost = this.calculateTotalCost(boqData.items);
            doc.setFontSize(12);
            doc.text(`الإجمالي الكلي: ${totalCost.toFixed(2)} ريال`, 148, doc.lastAutoTable.finalY + 10, { align: 'center' });
            
            // حفظ PDF
            doc.save(`${filename}.pdf`);
            
            this.eventBus.emit('ui:success', '✅ تم تصدير BOQ إلى PDF');
            this.eventBus.emit('boq:exported', { format: 'pdf', filename });
            
            return true;
            
        } catch (error) {
            console.warn('PDF export requires jspdf with autotable:', error);
            // Fallback إلى HTML
            this.exportToHTML(boqData, filename);
            return false;
        }
    }
    
    // تصدير جميع التنسيقات
    async exportAll(boqData, baseFilename = 'BOQ_Report') {
        this.exportToCSV(boqData, baseFilename);
        this.exportToJSON(boqData, baseFilename);
        this.exportToHTML(boqData, baseFilename);
        await this.exportToExcel(boqData, baseFilename);
        await this.exportToPDF(boqData, baseFilename);
        
        this.eventBus.emit('ui:success', '✅ تم تصدير جميع التنسيقات');
    }
    
    // حساب الإجمالي الكلي
    calculateTotalCost(items) {
        if (!items || items.length === 0) return 0;
        
        return items.reduce((total, item) => {
            const itemTotal = item.totalCost || (item.quantity * item.unitPrice) || 0;
            return total + itemTotal;
        }, 0);
    }
    
    // تحميل ملف
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}