// ============================================
// EXCEL EXPORTER - تصدير البيانات إلى Excel
// يدعم: جداول بيانات، تقارير، إحصائيات، تنسيق متقدم
// ============================================

export class ExcelExporter {
    constructor() {
        this.version = '1.0';
        
        // إعدادات التصدير
        this.settings = {
            autoWidth: true,
            freezeHeader: true,
            dateFormat: 'YYYY-MM-DD HH:mm:ss',
            numberFormat: '#,##0.00'
        };
        
        // الأنماط
        this.styles = {
            header: {
                fill: { fgColor: { rgb: '4472C4' } },
                font: { color: { rgb: 'FFFFFF' }, bold: true },
                alignment: { horizontal: 'center', vertical: 'center' }
            },
            title: {
                font: { bold: true, size: 14 },
                alignment: { horizontal: 'center' }
            },
            total: {
                font: { bold: true },
                fill: { fgColor: { rgb: 'E6E6E6' } }
            }
        };
        
        console.log('📊 ExcelExporter initialized');
    }
    
    // ========== MAIN EXPORT ==========
    
    exportToExcel(data, filename = 'report', options = {}) {
        const workbook = this.createWorkbook();
        const worksheet = workbook.addWorksheet('Sheet1');
        
        // إضافة البيانات
        if (Array.isArray(data)) {
            this.addArrayData(worksheet, data, options);
        } else if (data.type === 'clash_report') {
            this.addClashReport(worksheet, data, options);
        } else if (data.type === 'boq_report') {
            this.addBOQReport(worksheet, data, options);
        } else {
            this.addGenericData(worksheet, data, options);
        }
        
        // تطبيق التنسيق
        this.applyFormatting(worksheet, options);
        
        // تصدير الملف
        this.downloadWorkbook(workbook, filename);
        
        return workbook;
    }
    
    createWorkbook() {
        // إنشاء مصنف Excel بتنسيق CSV مؤقتاً
        // للاستخدام الكامل يفضل استخدام xlsx library
        return {
            sheets: [],
            addWorksheet: (name) => {
                const sheet = { name, rows: [], cols: [] };
                this.sheets.push(sheet);
                return sheet;
            }
        };
    }
    
    addArrayData(worksheet, data, options) {
        if (data.length === 0) return;
        
        // إضافة الرؤوس
        const headers = Object.keys(data[0]);
        worksheet.rows.push(headers);
        
        // إضافة البيانات
        for (const row of data) {
            const rowData = headers.map(h => row[h]);
            worksheet.rows.push(rowData);
        }
    }
    
    addClashReport(worksheet, data, options) {
        // الرؤوس
        const headers = ['ID', 'Type', 'Severity', 'Element A', 'Element B', 'Volume/Depth', 'Point X', 'Point Y', 'Point Z', 'Status'];
        worksheet.rows.push(headers);
        
        // البيانات
        for (const clash of data.clashes || []) {
            worksheet.rows.push([
                clash.id,
                clash.type,
                clash.severity?.level || 'medium',
                clash.elementA?.name || clash.elementA?.id,
                clash.elementB?.name || clash.elementB?.id,
                clash.volume || clash.depth || '-',
                clash.point?.x?.toFixed(2) || '-',
                clash.point?.y?.toFixed(2) || '-',
                clash.point?.z?.toFixed(2) || '-',
                clash.status || 'open'
            ]);
        }
        
        // إضافة ملخص
        if (data.summary) {
            worksheet.rows.push([]);
            worksheet.rows.push(['SUMMARY']);
            worksheet.rows.push(['Total Clashes', data.summary.totalClashes]);
            worksheet.rows.push(['High Severity', data.summary.bySeverity?.high || 0]);
            worksheet.rows.push(['Medium Severity', data.summary.bySeverity?.medium || 0]);
            worksheet.rows.push(['Low Severity', data.summary.bySeverity?.low || 0]);
        }
    }
    
    addBOQReport(worksheet, data, options) {
        const headers = ['Item Code', 'Description', 'Category', 'Quantity', 'Unit', 'Unit Price', 'Total Price'];
        worksheet.rows.push(headers);
        
        let total = 0;
        
        for (const item of data.items || []) {
            const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
            total += itemTotal;
            
            worksheet.rows.push([
                item.code,
                item.description,
                item.category,
                item.quantity,
                item.unit,
                item.unitPrice?.toFixed(2) || '-',
                itemTotal.toFixed(2)
            ]);
        }
        
        worksheet.rows.push([]);
        worksheet.rows.push(['GRAND TOTAL', '', '', '', '', '', total.toFixed(2)]);
    }
    
    addGenericData(worksheet, data, options) {
        if (typeof data === 'object') {
            worksheet.rows.push(['Field', 'Value']);
            for (const [key, value] of Object.entries(data)) {
                worksheet.rows.push([key, JSON.stringify(value)]);
            }
        } else {
            worksheet.rows.push([String(data)]);
        }
    }
    
    applyFormatting(worksheet, options) {
        // حساب عرض الأعمدة
        if (this.settings.autoWidth && worksheet.rows.length > 0) {
            const colCount = worksheet.rows[0].length;
            for (let i = 0; i < colCount; i++) {
                let maxWidth = 10;
                for (const row of worksheet.rows) {
                    if (row[i]) {
                        const width = String(row[i]).length;
                        if (width > maxWidth) maxWidth = Math.min(50, width);
                    }
                }
                worksheet.cols[i] = { width: maxWidth + 2 };
            }
        }
    }
    
    downloadWorkbook(workbook, filename) {
        // تحويل إلى CSV
        let csv = '';
        
        for (const sheet of this.sheets || [workbook]) {
            for (const row of sheet.rows) {
                csv += row.map(cell => this.escapeCSV(cell)).join(',') + '\n';
            }
        }
        
        // تحميل الملف
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log(`📥 Excel file downloaded: ${filename}.csv`);
    }
    
    escapeCSV(cell) {
        if (cell === undefined || cell === null) return '';
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
    
    // ========== EXPORT OPTIONS ==========
    
    setAutoWidth(enabled) {
        this.settings.autoWidth = enabled;
    }
    
    setDateFormat(format) {
        this.settings.dateFormat = format;
    }
    
    // ========== MULTI SHEET ==========
    
    createMultiSheetWorkbook() {
        this.sheets = [];
        return this;
    }
    
    addSheet(name, data, options = {}) {
        const sheet = { name, rows: [], cols: [] };
        
        if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]);
            sheet.rows.push(headers);
            for (const row of data) {
                sheet.rows.push(headers.map(h => row[h]));
            }
        }
        
        this.sheets.push(sheet);
        return this;
    }
    
    // ========== TEMPLATES ==========
    
    exportClashReport(clashData, filename = 'clash_report') {
        return this.exportToExcel({
            type: 'clash_report',
            clashes: clashData.clashes || clashData,
            summary: clashData.summary
        }, filename);
    }
    
    exportBOQReport(boqData, filename = 'boq_report') {
        return this.exportToExcel({
            type: 'boq_report',
            items: boqData.items || boqData
        }, filename);
    }
    
    exportTasksReport(tasks, filename = 'tasks_report') {
        const data = tasks.map(task => ({
            'Task ID': task.id,
            'Title': task.title,
            'Status': task.status,
            'Priority': task.priority,
            'Assigned To': task.assignedTo,
            'Due Date': task.dueDate ? new Date(task.dueDate).toLocaleString() : '-',
            'Progress': `${task.progress || 0}%`
        }));
        
        return this.exportToExcel(data, filename);
    }
    
    exportIssuesReport(issues, filename = 'issues_report') {
        const data = issues.map(issue => ({
            'Issue ID': issue.id,
            'Title': issue.title,
            'Severity': issue.severity,
            'Status': issue.status,
            'Reported By': issue.reportedBy,
            'Reported At': new Date(issue.reportedAt).toLocaleString(),
            'Location': issue.location ? `${issue.location.x}, ${issue.location.y}` : '-'
        }));
        
        return this.exportToExcel(data, filename);
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.sheets = [];
        console.log('♻️ ExcelExporter disposed');
    }
}

export default ExcelExporter;