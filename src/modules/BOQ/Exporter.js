// modules/BOQ/Exporter.js

export class BOQExporter {
    constructor(reporter) {
        this.reporter = reporter;
    }
    
    // تصدير إلى CSV (Excel)
    exportToCSV() {
        const data = this.reporter.calculator.toJSON();
        let csv = 'الفئة,النوع,الكمية,الوحدة\n';
        
        Object.keys(data.categories).forEach(category => {
            data.categories[category].forEach(item => {
                const boq = item.getBOQ ? item.getBOQ() : {};
                csv += `${category},${boq.نوع || 'عنصر'},${this.extractNumber(boq.حجم || '0')},م³\n`;
            });
        });
        
        return csv;
    }
    
    // تصدير إلى PDF (سنطورها لاحقاً)
    exportToPDF() {
        // تحتاج مكتبة jsPDF
        console.log('PDF export coming soon...');
    }
    
    // تصدير إلى JSON
    exportToJSON() {
        return JSON.stringify(this.reporter.calculator.toJSON(), null, 2);
    }
    
    // استخراج الرقم من النص
    extractNumber(text) {
        const match = text.match(/[\d.]+/);
        return match ? match[0] : '0';
    }
    
    // حفظ الملف
    download(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
}