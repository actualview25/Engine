// في المحرك الجديد
import { GlobalEarthworksBOQ } from './modules/boq/GlobalEarthworksBOQ.js';

const boq = new GlobalEarthworksBOQ();

// جمع البيانات من مصادرها (من NodeSystem أو EventBus)
const excavations = [
    { totalVolume: 150 },
    { totalVolume: 200 }
];

const compactions = [
    { totalVolume: 50 },
    { totalVolume: 30 }
];

// حساب الكميات
const result = boq.calculate(excavations, compactions);
console.log(result);
// { totalExcavation: "350.00", totalCompaction: "80.00", netVolume: "270.00" }