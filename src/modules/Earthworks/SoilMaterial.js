// =======================================
// ACTUAL VIEW CONSTRUCTION OS - SOIL MATERIAL
// =======================================

import * as THREE from 'three';

export class SoilMaterial {
    constructor(type, properties = {}) {
        this.type = type; // 'topsoil', 'sand', 'gravel', 'rock', 'fill', 'selected'
        this.name = this.getMaterialName(type);
        this.color = this.getMaterialColor(type);
        this.density = properties.density || this.getDefaultDensity(type);
        this.compactionRatio = properties.compactionRatio || 0.95;
        this.unitWeight = properties.unitWeight || 18;
    }

    getMaterialName(type) {
        const names = {
            'topsoil': 'تربة سطحية',
            'sand': 'رمل',
            'gravel': 'حصى',
            'rock': 'صخور',
            'fill': 'ردم',
            'selected': 'تربة مختارة'
        };
        return names[type] || type;
    }

    getMaterialColor(type) {
        const colors = {
            'topsoil': 0x8B4513,
            'sand': 0xF4E542,
            'gravel': 0x808080,
            'rock': 0x555555,
            'fill': 0xCD853F,
            'selected': 0xCD853F
        };
        return colors[type] || 0x964B00;
    }

    getDefaultDensity(type) {
        const densities = {
            'topsoil': 1.3,
            'sand': 1.6,
            'gravel': 1.8,
            'rock': 2.2,
            'fill': 1.7,
            'selected': 1.7
        };
        return densities[type] || 1.6;
    }

    // حساب الحجم بعد الدمك
    getCompactedVolume(looseVolume) {
        return looseVolume * this.compactionRatio;
    }
}