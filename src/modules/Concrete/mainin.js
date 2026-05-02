// main.js - إضافة الخرسانة
import { Foundation } from './modules/Concrete/Foundation.js';
import { Column } from './modules/Concrete/Column.js';
import { Beam } from './modules/Concrete/Beam.js';
import { Slab } from './modules/Concrete/Slab.js';

class ConstructionOS {
    constructor() {
        // ... الكود السابق ...
        this.concreteElements = [];
    }
    
    addFoundation(options) {
        const foundation = new Foundation(options);
        this.scene.add(foundation.createMesh());
        this.concreteElements.push(foundation);
        return foundation;
    }
    
    addColumn(options) {
        const column = new Column(options);
        this.scene.add(column.createMesh());
        this.concreteElements.push(column);
        return column;
    }
    
    addBeam(options) {
        const beam = new Beam(options);
        this.scene.add(beam.createMesh());
        this.concreteElements.push(beam);
        return beam;
    }
    
    addSlab(options) {
        const slab = new Slab(options);
        this.scene.add(slab.createMesh());
        this.concreteElements.push(slab);
        return slab;
    }
    
    calculateTotalConcreteBOQ() {
        let totalVolume = 0;
        let totalSteel = 0;
        
        this.concreteElements.forEach(element => {
            const boq = element.getBOQ();
            totalVolume += parseFloat(boq.حجم_الخرسانة);
            totalSteel += parseFloat(boq.وزن_الحديد || 0);
        });
        
        return {
            إجمالي_الخرسانة: totalVolume.toFixed(2) + ' م³',
            إجمالي_الحديد: totalSteel.toFixed(2) + ' كجم',
            عدد_العناصر: this.concreteElements.length
        };
    }
}

// مثال للاستخدام
const app = new ConstructionOS();

// إضافة القواعد
app.addFoundation({
    type: 'isolated',
    width: 1.2,
    length: 1.2,
    height: 0.6,
    position: { x: 2, y: 0, z: 2 }
});

app.addFoundation({
    type: 'strip',
    width: 0.8,
    length: 5,
    height: 0.5,
    position: { x: 0, y: 0, z: 0 },
    rotation: Math.PI/2
});

// إضافة الأعمدة
app.addColumn({
    shape: 'rectangular',
    width: 0.3,
    depth: 0.3,
    height: 3.0,
    position: { x: 2, y: 0, z: 2 }
});

app.addColumn({
    shape: 'circular',
    diameter: 0.4,
    height: 3.0,
    position: { x: -2, y: 0, z: -2 }
});

// إضافة الكمرات
app.addBeam({
    width: 0.2,
    depth: 0.5,
    length: 4,
    position: { x: 2, y: 3, z: 2 }
});

// إضافة السقف
app.addSlab({
    width: 8,
    length: 8,
    thickness: 0.15,
    position: { x: 0, y: 3.5, z: 0 }
});

// حساب الكميات
console.log('📊 جدول الكميات الإجمالي:', app.calculateTotalConcreteBOQ());
