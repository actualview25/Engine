// modules/Concrete/ConcreteMaterial.js

export class ConcreteMaterial {
    constructor(grade = 'C30') {
        this.grade = grade;
        this.strength = this.getStrength(grade);
        this.density = 2.5; // طن/م³
        this.color = 0x888888;
    }
    
    getStrength(grade) {
        const strengths = {
            'C20': 20, // MPa
            'C25': 25,
            'C30': 30,
            'C35': 35,
            'C40': 40
        };
        return strengths[grade] || 30;
    }
    
    get mixRatio() {
        const ratios = {
            'C20': '1:2:4',
            'C25': '1:1.5:3',
            'C30': '1:1:2',
            'C35': '1:0.5:1.5',
            'C40': '1:0.5:1'
        };
        return ratios[this.grade] || '1:1:2';
    }
}