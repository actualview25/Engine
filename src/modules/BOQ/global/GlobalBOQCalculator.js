// =======================================
// GLOBAL BOQ CALCULATOR - نسخة المحرك الجديد
// =======================================

export class GlobalBOQCalculator {
    constructor(eventBus = null, nodeSystem = null) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        
        // تخزين العناصر محلياً
        this.elements = {
            walls: [],
            floors: [],
            beams: [],
            columns: [],
            slabs: [],
            foundations: [],
            excavations: [],
            compactions: [],
            electrical: [],
            plumbing: [],
            hvac: []
        };
        
        this.results = {
            architecture: {},
            concrete: {},
            earthworks: {},
            mep: {}
        };
        
        // الاستماع للأحداث
        if (this.eventBus) {
            this.eventBus.on('element:created', (element) => this.addElement(element));
            this.eventBus.on('element:deleted', (elementId) => this.removeElement(elementId));
        }
        
        console.log('📊 GlobalBOQCalculator initialized');
    }
    
    // إضافة عنصر جديد
    addElement(element) {
        const type = element.type || this.getTypeFromElement(element);
        
        if (this.elements[type]) {
            this.elements[type].push(element);
            this.eventBus?.emit('boq:elementAdded', { type, element });
        }
    }
    
    removeElement(elementId) {
        for (const [type, list] of Object.entries(this.elements)) {
            const index = list.findIndex(e => e.id === elementId);
            if (index !== -1) {
                list.splice(index, 1);
                this.eventBus?.emit('boq:elementRemoved', { type, elementId });
                break;
            }
        }
    }
    
    getTypeFromElement(element) {
        if (element.wallData) return 'walls';
        if (element.floorData) return 'floors';
        if (element.beamData) return 'beams';
        if (element.columnData) return 'columns';
        if (element.slabData) return 'slabs';
        return 'unknown';
    }
    
    // الحصول على الكميات من NodeSystem إذا كان متاحاً
    fetchFromNodeSystem() {
        if (!this.nodeSystem) return;
        
        // البحث عن العناصر في العقد
        const nodes = this.nodeSystem.getAllNodes();
        for (const node of nodes) {
            if (node.elements) {
                for (const element of node.elements) {
                    this.addElement(element);
                }
            }
        }
    }

    calculateAll() {
        this.fetchFromNodeSystem();
        this.calculateArchitecture();
        this.calculateConcrete();
        this.calculateEarthworks();
        this.calculateMEP();
        
        const summary = this.getSummary();
        this.eventBus?.emit('boq:calculated', summary);
        
        return summary;
    }

    calculateArchitecture() {
        const walls = this.elements.walls;
        const floors = this.elements.floors;

        this.results.architecture = {
            walls: this.summarizeWalls(walls),
            floors: this.summarizeFloors(floors)
        };
    }

    summarizeWalls(walls) {
        let totalLength = 0;
        let totalVolume = 0;
        let totalArea = 0;
        
        walls.forEach(wall => {
            totalLength += wall.totalLength || wall.length || 0;
            totalVolume += wall.totalVolume || wall.volume || 0;
            totalArea += wall.totalArea || wall.area || 0;
        });

        return {
            count: walls.length,
            totalLength: totalLength.toFixed(2),
            totalVolume: totalVolume.toFixed(2),
            totalArea: totalArea.toFixed(2),
            byMaterial: this.groupByMaterial(walls)
        };
    }

    summarizeFloors(floors) {
        let totalArea = 0;
        let totalVolume = 0;
        
        floors.forEach(floor => {
            totalArea += floor.totalArea || floor.area || 0;
            totalVolume += floor.totalVolume || floor.volume || 0;
        });

        return {
            count: floors.length,
            totalArea: totalArea.toFixed(2),
            totalVolume: totalVolume.toFixed(2)
        };
    }

    calculateConcrete() {
        const beams = this.elements.beams;
        const columns = this.elements.columns;
        const slabs = this.elements.slabs;
        const foundations = this.elements.foundations;

        this.results.concrete = {
            beams: this.summarizeBeams(beams),
            columns: this.summarizeColumns(columns),
            slabs: this.summarizeSlabs(slabs),
            foundations: this.summarizeFoundations(foundations),
            totals: this.calculateConcreteTotals(beams, columns, slabs, foundations)
        };
    }

    summarizeBeams(beams) {
        let totalLength = 0;
        let totalVolume = 0;
        let totalRebar = 0;
        
        beams.forEach(beam => {
            totalLength += beam.length || 0;
            totalVolume += beam.volume || 0;
            totalRebar += beam.rebarWeight || 0;
        });

        return {
            count: beams.length,
            totalLength: totalLength.toFixed(2),
            totalVolume: totalVolume.toFixed(2),
            totalRebar: totalRebar.toFixed(2)
        };
    }

    summarizeColumns(columns) {
        let totalVolume = 0;
        let totalRebar = 0;
        
        columns.forEach(column => {
            totalVolume += column.volume || 0;
            totalRebar += column.rebarWeight || 0;
        });

        return {
            count: columns.length,
            totalVolume: totalVolume.toFixed(2),
            totalRebar: totalRebar.toFixed(2),
            byShape: this.groupByShape(columns)
        };
    }

    summarizeSlabs(slabs) {
        let totalArea = 0;
        let totalVolume = 0;
        let totalRebar = 0;
        
        slabs.forEach(slab => {
            totalArea += slab.area || 0;
            totalVolume += slab.volume || 0;
            totalRebar += slab.rebarWeight || 0;
        });

        return {
            count: slabs.length,
            totalArea: totalArea.toFixed(2),
            totalVolume: totalVolume.toFixed(2),
            totalRebar: totalRebar.toFixed(2)
        };
    }

    summarizeFoundations(foundations) {
        let totalVolume = 0;
        let totalRebar = 0;
        
        foundations.forEach(foundation => {
            totalVolume += foundation.volume || 0;
            totalRebar += foundation.rebarWeight || 0;
        });

        return {
            count: foundations.length,
            totalVolume: totalVolume.toFixed(2),
            totalRebar: totalRebar.toFixed(2)
        };
    }

    calculateConcreteTotals(beams, columns, slabs, foundations) {
        let totalVolume = 0;
        let totalRebar = 0;
        
        [...beams, ...columns, ...slabs, ...foundations].forEach(item => {
            totalVolume += item.volume || 0;
            totalRebar += item.rebarWeight || 0;
        });

        return {
            totalVolume: totalVolume.toFixed(2),
            totalRebar: totalRebar.toFixed(2)
        };
    }

    calculateEarthworks() {
        const excavations = this.elements.excavations;
        const compactions = this.elements.compactions;

        let totalExcavation = 0;
        let totalCompaction = 0;
        
        excavations.forEach(ex => {
            totalExcavation += ex.volume || 0;
        });
        
        compactions.forEach(co => {
            totalCompaction += co.volume || 0;
        });

        this.results.earthworks = {
            excavations: {
                count: excavations.length,
                totalVolume: totalExcavation.toFixed(2)
            },
            compactions: {
                count: compactions.length,
                totalVolume: totalCompaction.toFixed(2)
            },
            netVolume: (totalExcavation - totalCompaction).toFixed(2)
        };
    }

    calculateMEP() {
        const electrical = this.elements.electrical;
        const plumbing = this.elements.plumbing;
        const hvac = this.elements.hvac;

        this.results.mep = {
            electrical: this.summarizeElectrical(electrical),
            plumbing: this.summarizePlumbing(plumbing),
            hvac: this.summarizeHVAC(hvac)
        };
    }

    summarizeElectrical(electrical) {
        let totalCables = 0;
        let totalPoints = 0;
        
        electrical.forEach(e => {
            totalCables += e.totalCableLength || 0;
            totalPoints += e.totalPoints || 0;
        });

        return {
            circuits: electrical.length,
            totalCables: totalCables.toFixed(2),
            totalPoints: totalPoints
        };
    }

    summarizePlumbing(plumbing) {
        let totalPipes = 0;
        let totalFixtures = 0;
        
        plumbing.forEach(p => {
            totalPipes += p.totalPipeLength || 0;
            totalFixtures += p.fixturesCount || 0;
        });

        return {
            systems: plumbing.length,
            totalPipes: totalPipes.toFixed(2),
            totalFixtures: totalFixtures
        };
    }

    summarizeHVAC(hvac) {
        let totalCapacity = 0;
        let totalDucts = 0;
        
        hvac.forEach(h => {
            totalCapacity += h.totalCapacity || 0;
            totalDucts += h.totalDuctLength || 0;
        });

        return {
            systems: hvac.length,
            totalCapacity: totalCapacity,
            totalDucts: totalDucts.toFixed(2)
        };
    }

    groupByMaterial(elements) {
        const groups = {};
        elements.forEach(element => {
            const material = element.material || element.wallData?.material || 'unknown';
            if (!groups[material]) {
                groups[material] = {
                    count: 0,
                    volume: 0
                };
            }
            groups[material].count++;
            groups[material].volume += element.volume || 0;
        });
        return groups;
    }

    groupByShape(columns) {
        const groups = {};
        columns.forEach(col => {
            const shape = col.shape || 'rectangular';
            if (!groups[shape]) {
                groups[shape] = {
                    count: 0,
                    volume: 0
                };
            }
            groups[shape].count++;
            groups[shape].volume += col.volume || 0;
        });
        return groups;
    }

    getSummary() {
        return {
            architecture: this.results.architecture,
            concrete: this.results.concrete,
            earthworks: this.results.earthworks,
            mep: this.results.mep,
            grandTotals: this.calculateGrandTotals(),
            calculatedAt: new Date().toISOString()
        };
    }

    calculateGrandTotals() {
        let totalVolume = 0;
        let totalRebar = 0;
        
        // جمع من الخرسانة
        if (this.results.concrete.totals) {
            totalVolume += parseFloat(this.results.concrete.totals.totalVolume) || 0;
            totalRebar += parseFloat(this.results.concrete.totals.totalRebar) || 0;
        }
        
        // جمع من العمارة (الجدران)
        if (this.results.architecture.walls) {
            totalVolume += parseFloat(this.results.architecture.walls.totalVolume) || 0;
        }
        
        // جمع من الأرضيات
        if (this.results.architecture.floors) {
            totalVolume += parseFloat(this.results.architecture.floors.totalVolume) || 0;
        }

        return {
            totalConcreteVolume: totalVolume.toFixed(2),
            totalRebarWeight: totalRebar.toFixed(2),
            totalElements: this.countAllElements()
        };
    }

    countAllElements() {
        let count = 0;
        for (const type in this.elements) {
            count += this.elements[type].length;
        }
        return count;
    }
    
    // تقرير نصي مبسط
    generateTextReport() {
        const summary = this.calculateAll();
        
        let report = '═══════════════════════════════════════\n';
        report += '📊 تقرير كميات الأعمال (BOQ)\n';
        report += '═══════════════════════════════════════\n\n';
        
        report += '🏗️ الخرسانة:\n';
        report += `• الحجم الكلي: ${summary.grandTotals.totalConcreteVolume} م³\n`;
        report += `• حديد التسليح: ${summary.grandTotals.totalRebarWeight} طن\n\n`;
        
        report += '🧱 الجدران:\n';
        report += `• العدد: ${summary.architecture.walls?.count || 0}\n`;
        report += `• الطول الكلي: ${summary.architecture.walls?.totalLength || 0} م\n`;
        report += `• المساحة: ${summary.architecture.walls?.totalArea || 0} م²\n\n`;
        
        report += '⚡ أنظمة MEP:\n';
        report += `• كابلات الكهرباء: ${summary.mep.electrical?.totalCables || 0} م\n`;
        report += `• مواسير السباكة: ${summary.mep.plumbing?.totalPipes || 0} م\n`;
        report += `• مجاري الهواء: ${summary.mep.hvac?.totalDucts || 0} م\n\n`;
        
        report += '═══════════════════════════════════════\n';
        report += `🕐 تاريخ التقرير: ${new Date().toLocaleString()}\n`;
        report += '═══════════════════════════════════════\n';
        
        return report;
    }
    
    // تصدير إلى JSON
    exportToJSON() {
        return JSON.stringify(this.calculateAll(), null, 2);
    }
    
    // إعادة تعيين
    reset() {
        for (const type in this.elements) {
            this.elements[type] = [];
        }
        this.results = {
            architecture: {},
            concrete: {},
            earthworks: {},
            mep: {}
        };
        this.eventBus?.emit('boq:reset');
    }
    
    dispose() {
        this.reset();
        console.log('♻️ GlobalBOQCalculator disposed');
    }
}

export default GlobalBOQCalculator;