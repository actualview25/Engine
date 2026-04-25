// modules/BOQ/Reporter.js

export class BOQReporter {
    constructor(calculator) {
        this.calculator = calculator;
        this.template = this.loadTemplate('arabic');
    }
    
    loadTemplate(lang = 'arabic') {
        // قالب عربي
        if (lang === 'arabic') {
            return {
                title: 'جدول الكميات',
                project: 'المشروع',
                date: 'التاريخ',
                categories: {
                    earthworks: 'الأعمال الترابية',
                    concrete: 'الخرسانة المسلحة',
                    architecture: 'الأعمال المعمارية',
                    mep: 'التمديدات'
                }
            };
        }
        
        // قالب إنجليزي
        return {
            title: 'Bill of Quantities',
            project: 'Project',
            date: 'Date',
            categories: {
                earthworks: 'Earthworks',
                concrete: 'Reinforced Concrete',
                architecture: 'Architecture',
                mep: 'MEP'
            }
        };
    }
    
    // تقرير مفصل
    generateDetailed() {
        let report = [];
        
        // عنوان التقرير
        report.push('='.repeat(60));
        report.push(`📊 ${this.template.title}`);
        report.push('='.repeat(60));
        report.push(`${this.template.project}: ${this.calculator.project?.name || 'مشروع جديد'}`);
        report.push(`${this.template.date}: ${new Date().toLocaleDateString('ar-SA')}`);
        report.push('-'.repeat(60));
        
        // كل فئة
        Object.keys(this.calculator.categories).forEach(category => {
            const items = this.calculator.categories[category];
            if (items.length === 0) return;
            
            report.push(`\n🏗️ ${this.template.categories[category]}:`);
            report.push('-'.repeat(40));
            
            items.forEach((item, index) => {
                const boq = item.getBOQ ? item.getBOQ() : {};
                report.push(`\n  ${index + 1}. ${boq.نوع || 'عنصر'}:`);
                
                Object.keys(boq).forEach(key => {
                    if (key !== 'نوع' && key !== 'type') {
                        report.push(`     • ${key}: ${boq[key]}`);
                    }
                });
            });
        });
        
        // الملخص
        report.push('\n' + '='.repeat(60));
        report.push('📈 الملخص النهائي:');
        report.push('-'.repeat(40));
        
        const summary = this.calculator.getSummary();
        Object.keys(summary).forEach(key => {
            report.push(`   ${key}: ${summary[key]}`);
        });
        
        report.push('='.repeat(60));
        
        return report.join('\n');
    }
    
    // تقرير موجز
    generateSummary() {
        const summary = this.calculator.getSummary();
        const items = this.calculator.getTotalItems();
        
        return `
📊 ملخص المشروع
══════════════════════════════
📦 إجمالي العناصر: ${items}
🧱 ${summary.إجمالي_الخرسانة}
⚙️ ${summary.إجمالي_الحديد}
📐 ${summary.إجمالي_المساحات}
📏 ${summary.إجمالي_الأطوال}
══════════════════════════════
        `;
    }
    
    // تقرير HTML
    generateHTML() {
        const summary = this.calculator.getSummary();
        
        return `
<!DOCTYPE html>
<html dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>جدول الكميات</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 40px; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #3498db; color: white; padding: 12px; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .total { font-size: 1.2em; color: #27ae60; }
    </style>
</head>
<body>
    <h1>📊 جدول الكميات</h1>
    <p>المشروع: ${this.calculator.project?.name || 'مشروع جديد'}</p>
    <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
    
    <div class="summary">
        <h3>📈 الملخص النهائي</h3>
        <table>
            <tr><th>البيان</th><th>الكمية</th></tr>
            <tr><td>🧱 إجمالي الخرسانة</td><td class="total">${summary.إجمالي_الخرسانة}</td></tr>
            <tr><td>⚙️ إجمالي الحديد</td><td class="total">${summary.إجمالي_الحديد}</td></tr>
            <tr><td>📐 إجمالي المساحات</td><td class="total">${summary.إجمالي_المساحات}</td></tr>
            <tr><td>📏 إجمالي الأطوال</td><td class="total">${summary.إجمالي_الأطوال}</td></tr>
        </table>
    </div>
</body>
</html>
        `;
    }
}