// =======================================
// GLOBAL REPORTER - نسخة المحرك الجديد
// =======================================

export class GlobalReporter {
    constructor(globalBOQ) {
        this.globalBOQ = globalBOQ;
        this.results = null;
        this.refresh();
    }

    refresh() {
        this.results = this.globalBOQ.calculateAll();
        return this.results;
    }

    generateFullReport() {
        if (!this.results) this.refresh();
        const summary = this.results.grandTotals;
        
        return `
═══════════════════════════════════════════
🏗️  ACTUAL CONSTRUCTION OS - التقرير النهائي
═══════════════════════════════════════════

🏛️  الأعمال المعمارية
─────────────────────────────
• الجدران: ${this.results.architecture.walls.count}
  - الطول الإجمالي: ${this.results.architecture.walls.totalLength} م
  - الحجم: ${this.results.architecture.walls.totalVolume} م³
  - المساحة: ${this.results.architecture.walls.totalArea} م²

• الأرضيات: ${this.results.architecture.floors.count}
  - المساحة: ${this.results.architecture.floors.totalArea} م²
  - الحجم: ${this.results.architecture.floors.totalVolume} م³

🧱  الخرسانة المسلحة
─────────────────────────────
• الكمرات: ${this.results.concrete.beams.count}
  - الطول: ${this.results.concrete.beams.totalLength} م
  - الحجم: ${this.results.concrete.beams.totalVolume} م³
  - الحديد: ${this.results.concrete.beams.totalRebar} كجم

• الأعمدة: ${this.results.concrete.columns.count}
  - الحجم: ${this.results.concrete.columns.totalVolume} م³
  - الحديد: ${this.results.concrete.columns.totalRebar} كجم

• الأسقف: ${this.results.concrete.slabs.count}
  - المساحة: ${this.results.concrete.slabs.totalArea} م²
  - الحجم: ${this.results.concrete.slabs.totalVolume} م³
  - الحديد: ${this.results.concrete.slabs.totalRebar} كجم

⛏️  الأعمال الترابية
─────────────────────────────
• الحفريات: ${this.results.earthworks.excavations.totalVolume} م³
• الردم: ${this.results.earthworks.compactions.totalVolume} م³
• صافي الحفر: ${this.results.earthworks.netVolume} م³

⚡  التمديدات
─────────────────────────────
• الكهرباء:
  - دوائر: ${this.results.mep.electrical.circuits}
  - كابلات: ${this.results.mep.electrical.totalCables} م
  - نقاط: ${this.results.mep.electrical.totalPoints}

• السباكة:
  - أنظمة: ${this.results.mep.plumbing.systems}
  - مواسير: ${this.results.mep.plumbing.totalPipes} م
  - تركيبات: ${this.results.mep.plumbing.totalFixtures}

• التكييف:
  - أنظمة: ${this.results.mep.hvac.systems}
  - سعة: ${this.results.mep.hvac.totalCapacity} BTU
  - مجاري: ${this.results.mep.hvac.totalDucts} م

═══════════════════════════════════════════
📊  الملخص النهائي
─────────────────────────────
• إجمالي العناصر: ${summary.totalElements}
• إجمالي الخرسانة: ${summary.totalConcreteVolume} م³
• إجمالي الحديد: ${summary.totalRebarWeight} كجم
═══════════════════════════════════════════
        `;
    }

    generateHTMLReport() {
        if (!this.results) this.refresh();
        
        return `
<!DOCTYPE html>
<html dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>التقرير النهائي - ACTUAL CONSTRUCTION OS</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 40px; background: #f5f5f5; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        th { background: #3498db; color: white; padding: 12px; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .summary { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .summary td { background: #34495e; color: white; }
        .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <h1>🏗️ ACTUAL CONSTRUCTION OS - التقرير النهائي</h1>
    
    <h2>🏛️ الأعمال المعمارية</h2>
    <table>
        <tr><th>العنصر</th><th>العدد</th><th>الكمية</th></tr>
        <tr><td>الجدران</td><td>${this.results.architecture.walls.count}</td><td>${this.results.architecture.walls.totalVolume} م³</td></tr>
        <tr><td>الأرضيات</td><td>${this.results.architecture.floors.count}</td><td>${this.results.architecture.floors.totalArea} م²</td></tr>
    </table>
    
    <h2>🧱 الخرسانة المسلحة</h2>
    <table>
        <tr><th>العنصر</th><th>العدد</th><th>الحجم (م³)</th><th>الحديد (كجم)</th></tr>
        <tr><td>كمرات</td><td>${this.results.concrete.beams.count}</td><td>${this.results.concrete.beams.totalVolume}</td><td>${this.results.concrete.beams.totalRebar}</td></tr>
        <tr><td>أعمدة</td><td>${this.results.concrete.columns.count}</td><td>${this.results.concrete.columns.totalVolume}</td><td>${this.results.concrete.columns.totalRebar}</td></tr>
        <tr><td>أسقف</td><td>${this.results.concrete.slabs.count}</td><td>${this.results.concrete.slabs.totalVolume}</td><td>${this.results.concrete.slabs.totalRebar}</td></tr>
    </table>
    
    <div class="summary">
        <h2>📊 الملخص النهائي</h2>
        <table style="background:#34495e">
            <tr><td>إجمالي العناصر</td><td>${this.results.grandTotals.totalElements}</td></tr>
            <tr><td>إجمالي الخرسانة</td><td>${this.results.grandTotals.totalConcreteVolume} م³</td></tr>
            <tr><td>إجمالي الحديد</td><td>${this.results.grandTotals.totalRebarWeight} كجم</td></tr>
        </table>
    </div>
    
    <div class="footer">
        تم الإنشاء بواسطة ACTUAL CONSTRUCTION OS | ${new Date().toLocaleString()}
    </div>
</body>
</html>
        `;
    }

    generateCSV() {
        if (!this.results) this.refresh();
        
        let csv = "التصنيف,العنصر,العدد,الكمية\n";
        
        csv += `معماري,جدران,${this.results.architecture.walls.count},${this.results.architecture.walls.totalVolume} م³\n`;
        csv += `معماري,أرضيات,${this.results.architecture.floors.count},${this.results.architecture.floors.totalArea} م²\n`;
        csv += `خرسانة,كمرات,${this.results.concrete.beams.count},${this.results.concrete.beams.totalVolume} م³\n`;
        csv += `خرسانة,أعمدة,${this.results.concrete.columns.count},${this.results.concrete.columns.totalVolume} م³\n`;
        csv += `خرسانة,أسقف,${this.results.concrete.slabs.count},${this.results.concrete.slabs.totalVolume} م³\n`;
        csv += `ترابية,حفريات,1,${this.results.earthworks.excavations.totalVolume} م³\n`;
        csv += `ترابية,ردم,1,${this.results.earthworks.compactions.totalVolume} م³\n`;
        
        return csv;
    }
    
    // دوال مساعدة إضافية
    saveAsHTML(filename = 'report.html') {
        const html = this.generateHTMLReport();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    saveAsCSV(filename = 'report.csv') {
        const csv = this.generateCSV();
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    print() {
        const html = this.generateHTMLReport();
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.print();
    }
}

export default GlobalReporter;