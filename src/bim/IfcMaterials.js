// ============================================
// IFC MATERIALS - مواد IFC الافتراضية
// يدعم: مواد الخرسانة، الفولاذ، الخشب، الزجاج، الطوب
// ============================================

import * as THREE from 'three';

export const IfcMaterials = {
    // مواد خرسانية
    concrete: new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.6,
        metalness: 0.1,
        bumpScale: 0.3
    }),
    
    reinforcedConcrete: new THREE.MeshStandardMaterial({
        color: 0x7a7a7a,
        roughness: 0.5,
        metalness: 0.15,
        bumpScale: 0.4
    }),
    
    // مواد معدنية
    steel: new THREE.MeshStandardMaterial({
        color: 0xccccdd,
        roughness: 0.3,
        metalness: 0.85,
        emissive: 0x000000
    }),
    
    aluminum: new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        roughness: 0.4,
        metalness: 0.9
    }),
    
    // مواد خشبية
    wood: new THREE.MeshStandardMaterial({
        color: 0xc4a882,
        roughness: 0.7,
        metalness: 0.05
    }),
    
    // مواد زجاجية
    glass: new THREE.MeshStandardMaterial({
        color: 0xaaddff,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.6
    }),
    
    clearGlass: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.05,
        metalness: 0.95,
        transparent: true,
        opacity: 0.4
    }),
    
    // مواد الطوب والجدران
    brick: new THREE.MeshStandardMaterial({
        color: 0xb85c38,
        roughness: 0.65,
        metalness: 0.02,
        bumpScale: 0.5
    }),
    
    blockwork: new THREE.MeshStandardMaterial({
        color: 0xc0c0c0,
        roughness: 0.7,
        metalness: 0.02
    }),
    
    // مواد التشطيب
    plaster: new THREE.MeshStandardMaterial({
        color: 0xe8e0d0,
        roughness: 0.55,
        metalness: 0.01
    }),
    
    tile: new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        roughness: 0.3,
        metalness: 0.05,
        bumpScale: 0.2
    }),
    
    marble: new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        roughness: 0.2,
        metalness: 0.1,
        bumpScale: 0.1
    }),
    
    // مواد العزل
    insulation: new THREE.MeshStandardMaterial({
        color: 0xd4c4a8,
        roughness: 0.8,
        metalness: 0.0
    }),
    
    // مواد الأرضيات
    flooring: new THREE.MeshStandardMaterial({
        color: 0xaa9988,
        roughness: 0.6,
        metalness: 0.02
    }),
    
    carpet: new THREE.MeshStandardMaterial({
        color: 0x8a7a6a,
        roughness: 0.9,
        metalness: 0.0
    })
};

// دالة للحصول على مادة حسب النوع
export function getMaterialByType(type) {
    const materialMap = {
        'IFCWALL': IfcMaterials.blockwork,
        'IFCWALLSTANDARDCASE': IfcMaterials.brick,
        'IFCSLAB': IfcMaterials.concrete,
        'IFCCOLUMN': IfcMaterials.reinforcedConcrete,
        'IFCBEAM': IfcMaterials.steel,
        'IFCDOOR': IfcMaterials.wood,
        'IFCWINDOW': IfcMaterials.glass,
        'IFCSTAIR': IfcMaterials.concrete,
        'IFCROOF': IfcMaterials.concrete,
        'IFCFLOOR': IfcMaterials.flooring,
        'IFCCURTAINWALL': IfcMaterials.glass,
        'IFCPLATE': IfcMaterials.steel,
        'IFCMEMBER': IfcMaterials.steel,
        'IFCCOVERING': IfcMaterials.plaster,
        'IFCFURNITURE': IfcMaterials.wood
    };
    
    return materialMap[type] || IfcMaterials.concrete;
}

// دالة لإنشاء مادة مخصصة
export function createCustomMaterial(color, roughness = 0.5, metalness = 0.1, transparent = false, opacity = 1) {
    return new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness,
        metalness: metalness,
        transparent: transparent,
        opacity: opacity
    });
}

// دالة لاستنساخ مادة
export function cloneMaterial(material) {
    return material.clone();
}

// دالة لتحويل المادة إلى JSON
export function materialToJSON(material) {
    return {
        color: material.color.getHex(),
        roughness: material.roughness,
        metalness: material.metalness,
        transparent: material.transparent,
        opacity: material.opacity,
        emissive: material.emissive?.getHex(),
        bumpScale: material.bumpScale
    };
}

// دالة لإنشاء مادة من JSON
export function materialFromJSON(json) {
    return new THREE.MeshStandardMaterial({
        color: json.color,
        roughness: json.roughness,
        metalness: json.metalness,
        transparent: json.transparent,
        opacity: json.opacity,
        emissive: json.emissive,
        bumpScale: json.bumpScale
    });
}