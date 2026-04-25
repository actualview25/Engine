// ============================================
// PDF EXPORTER - تصدير التقارير إلى PDF
// يدعم: طباعة، حفظ، معاينة قبل الطباعة
// ============================================

export class PDFExporter {
    constructor() {
        this.settings = {
            pageSize: 'A4',
            orientation: 'portrait',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            scale: 1.0
        };
        
        console.log('📑 PDFExporter initialized');
    }
    
    // ========== MAIN EXPORT ==========
    
    async exportToPDF(element, filename = 'report', options = {}) {
        const settings = { ...this.settings, ...options };
        
        // استخدام print كحل بسيط للـ PDF
        // للتصدير المتقدم يوصى باستخدام html2pdf أو jsPDF
        
        const originalTitle = document.title;
        document.title = filename;
        
        // إنشاء نسخة للطباعة
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    @media print {
                        body { margin: 0; padding: ${settings.margins.top}px; }
                        .page-break { page-break-before: always; }
                        .no-break { page-break-inside: avoid; }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        direction: rtl;
                        margin: 0;
                        padding: 20px;
                    }
                    ${options.extraStyles || ''}
                </style>
            </head>
            <body>
                ${element instanceof HTMLElement ? element.outerHTML : element}
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
        
        setTimeout(() => {
            printWindow.close();
        }, 1000);
        
        document.title = originalTitle;
        
        console.log(`📑 PDF export initiated: ${filename}`);
    }
    
    async exportHTMLToPDF(html, filename = 'report', options = {}) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);
        
        await this.exportToPDF(tempDiv, filename, options);
        
        document.body.removeChild(tempDiv);
    }
    
    async exportElementToPDF(elementId, filename = 'report', options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element "${elementId}" not found`);
            return;
        }
        
        await this.exportToPDF(element, filename, options);
    }
    
    // ========== PRINT STYLES ==========
    
    addPrintStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @media print {
                .no-print { display: none !important; }
                .print-only { display: block !important; }
                .page-break { page-break-before: always; }
                .break-inside-avoid { page-break-inside: avoid; }
                
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; }
                th { background: #f0f0f0; }
                
                .header, .footer { position: running(header); }
                @page { 
                    size: ${this.settings.pageSize};
                    margin: ${this.settings.margins.top}mm ${this.settings.margins.right}mm ${this.settings.margins.bottom}mm ${this.settings.margins.left}mm;
                }
            }
        `;
        document.head.appendChild(style);
        return style;
    }
    
    removePrintStyles(style) {
        if (style && style.remove) style.remove();
    }
    
    // ========== PAGE SETUP ==========
    
    setPageSize(size) {
        this.settings.pageSize = size;
    }
    
    setOrientation(orientation) {
        this.settings.orientation = orientation;
    }
    
    setMargins(margins) {
        this.settings.margins = { ...this.settings.margins, ...margins };
    }
    
    // ========== UTILITY ==========
    
    async captureAsPDF(element, filename) {
        // استخدام html2canvas + jsPDF يفضل للحصول على جودة أفضل
        // هذا حل بسيط باستخدام print
        return this.exportToPDF(element, filename);
    }
    
    printElement(element) {
        const originalContents = document.body.innerHTML;
        const printContents = element.cloneNode(true);
        
        document.body.innerHTML = printContents.outerHTML;
        window.print();
        document.body.innerHTML = originalContents;
        window.location.reload();
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        console.log('♻️ PDFExporter disposed');
    }
}

export default PDFExporter;