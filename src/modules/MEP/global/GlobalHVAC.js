// =======================================
// GLOBAL HVAC - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalHVAC {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.hvacData = {
            systemType: options.systemType || 'split', // split, ducted, vrf
            capacity: options.capacity || 18000, // BTU
            efficiency: options.efficiency || 3.5, // COP
            refrigerant: options.refrigerant || 'R410A',
            color: options.color || 0xccccdd,
            ductColor: options.ductColor || 0xaaaaff
        };
        
        this.id = `hvac_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.units = [];
        this.ducts = [];
        
        if (this.eventBus) {
            this.eventBus.on('hvac:create', (data) => this.create(data.sceneId));
            this.eventBus.on('hvac:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('hvac:created', {
                id: this.id,
                sceneId: sceneId,
                hvacData: this.hvacData
            });
        }
        
        console.log(`❄️ HVAC system created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId) {
        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            units: [],
            ducts: [],
            createdAt: Date.now()
        };

        this.segments.push(segmentData);
        
        if (this.eventBus) {
            this.eventBus.emit('hvac:segmentAdded', segmentData);
        }
        
        return segmentData;
    }

    addUnit(sceneId, position, unitType = 'indoor', capacity = null, segmentId = null) {
        // تحويل إلى إحداثيات عالمية
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const unitData = {
            id: `hvac_unit_${Date.now()}_${this.units.length}`,
            position: globalPos,
            localPosition: position,
            type: unitType,
            capacity: capacity || this.hvacData.capacity,
            createdAt: Date.now()
        };

        let targetSegment = segmentId 
            ? this.segments.find(s => s.id === segmentId && s.sceneId === sceneId)
            : this.segments.find(s => s.sceneId === sceneId);
            
        if (targetSegment) {
            targetSegment.units.push(unitData);
        } else {
            const newSegment = {
                id: `segment_${Date.now()}_${this.segments.length}`,
                sceneId: sceneId,
                units: [unitData],
                ducts: [],
                createdAt: Date.now()
            };
            this.segments.push(newSegment);
            targetSegment = newSegment;
        }
        
        this.units.push(unitData);
        
        if (this.eventBus) {
            this.eventBus.emit('hvac:unitAdded', {
                hvacId: this.id,
                unitData: unitData,
                sceneId: sceneId
            });
        }
        
        console.log(`❄️ HVAC ${unitType} unit added, capacity: ${capacity || this.hvacData.capacity} BTU`);
        return unitData;
    }

    addDuct(sceneId, startPoint, endPoint, diameter = 200, segmentId = null) {
        let globalStart = { ...startPoint };
        let globalEnd = { ...endPoint };
        if (this.geoReferencing) {
            globalStart = this.geoReferencing.localToWorld(startPoint);
            globalEnd = this.geoReferencing.localToWorld(endPoint);
        }
        
        const length = this.calculateLength(globalStart, globalEnd);
        
        const ductData = {
            id: `duct_${Date.now()}_${this.ducts.length}`,
            start: globalStart,
            end: globalEnd,
            localStart: startPoint,
            localEnd: endPoint,
            diameter: diameter,
            length: length,
            crossSectionalArea: Math.PI * Math.pow(diameter / 2000, 2), // m²
            createdAt: Date.now()
        };

        let targetSegment = segmentId 
            ? this.segments.find(s => s.id === segmentId && s.sceneId === sceneId)
            : this.segments.find(s => s.sceneId === sceneId);
            
        if (targetSegment) {
            targetSegment.ducts.push(ductData);
        } else {
            const newSegment = {
                id: `segment_${Date.now()}_${this.segments.length}`,
                sceneId: sceneId,
                units: [],
                ducts: [ductData],
                createdAt: Date.now()
            };
            this.segments.push(newSegment);
        }
        
        this.ducts.push(ductData);
        
        if (this.eventBus) {
            this.eventBus.emit('hvac:ductAdded', {
                hvacId: this.id,
                ductData: ductData,
                sceneId: sceneId
            });
        }
        
        console.log(`❄️ Duct added: diameter ${diameter}mm, length: ${length.toFixed(2)}m`);
        return ductData;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('hvac:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        const unitMat = new THREE.MeshStandardMaterial({ 
            color: this.hvacData.color, 
            metalness: 0.6, 
            roughness: 0.3 
        });
        
        const ductMat = new THREE.MeshStandardMaterial({ 
            color: this.hvacData.ductColor, 
            metalness: 0.5, 
            roughness: 0.4 
        });
        
        // رسم الوحدات
        for (const unit of segment.units) {
            let geometry;
            if (unit.type === 'indoor') {
                geometry = new THREE.BoxGeometry(0.8, 0.25, 0.4);
            } else {
                geometry = new THREE.BoxGeometry(0.9, 0.7, 0.4);
            }
            
            const unitMesh = new THREE.Mesh(geometry, unitMat);
            unitMesh.position.set(unit.position.x, unit.position.y, unit.position.z);
            unitMesh.userData = { type: 'hvac_unit', unitType: unit.type, unitId: unit.id };
            threeScene.add(unitMesh);
            meshes.push(unitMesh);
            
            // إضافة مؤشر الهواء (فوهة)
            const ventMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.3 });
            const vent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.1), ventMat);
            vent.position.set(unit.position.x, unit.position.y - 0.1, unit.position.z + 0.22);
            threeScene.add(vent);
            meshes.push(vent);
        }
        
        // رسم المجاري
        for (const duct of segment.ducts) {
            const start = new THREE.Vector3(duct.start.x, duct.start.y, duct.start.z);
            const end = new THREE.Vector3(duct.end.x, duct.end.y, duct.end.z);
            const direction = new THREE.Vector3().subVectors(end, start);
            const length = direction.length();
            
            if (length < 0.1) continue;
            
            const radius = duct.diameter / 2000; // تحويل mm إلى m
            const cylinderGeo = new THREE.CylinderGeometry(radius, radius, length, 12);
            const cylinder = new THREE.Mesh(cylinderGeo, ductMat);
            
            const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            cylinder.position.copy(center);
            
            cylinder.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                direction.clone().normalize()
            );
            
            cylinder.userData = { type: 'hvac_duct', ductId: duct.id };
            threeScene.add(cylinder);
            meshes.push(cylinder);
        }
        
        return meshes;
    }

    calculateLength(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) +
            Math.pow(point2.y - point1.y, 2) +
            Math.pow(point2.z - point1.z, 2)
        );
    }
    
    // تحديث نوع النظام
    updateSystemType(systemType) {
        this.hvacData.systemType = systemType;
        this.eventBus?.emit('hvac:systemTypeUpdated', { id: this.id, systemType });
        console.log(`❄️ System type updated to: ${systemType}`);
    }
    
    // تحديث السعة
    updateCapacity(capacity) {
        this.hvacData.capacity = capacity;
        
        for (const unit of this.units) {
            unit.capacity = capacity;
        }
        
        this.eventBus?.emit('hvac:capacityUpdated', { id: this.id, capacity });
        console.log(`❄️ System capacity updated to: ${capacity} BTU`);
    }
    
    // تحديث اللون
    updateColor(color) {
        this.hvacData.color = color;
        for (const mesh of this.meshes) {
            if (mesh.userData.type === 'hvac_unit') {
                if (mesh.material) mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('hvac:colorUpdated', { id: this.id, color });
    }
    
    // حذف وحدة
    removeUnit(unitId) {
        for (const segment of this.segments) {
            const unitIndex = segment.units.findIndex(u => u.id === unitId);
            if (unitIndex !== -1) {
                segment.units.splice(unitIndex, 1);
                this.units = this.units.filter(u => u.id !== unitId);
                
                this.eventBus?.emit('hvac:unitRemoved', { id: this.id, unitId });
                console.log(`❄️ HVAC unit removed: ${unitId}`);
                return true;
            }
        }
        return false;
    }
    
    // حذف مجرى
    removeDuct(ductId) {
        for (const segment of this.segments) {
            const ductIndex = segment.ducts.findIndex(d => d.id === ductId);
            if (ductIndex !== -1) {
                segment.ducts.splice(ductIndex, 1);
                this.ducts = this.ducts.filter(d => d.id !== ductId);
                
                this.eventBus?.emit('hvac:ductRemoved', { id: this.id, ductId });
                console.log(`❄️ Duct removed: ${ductId}`);
                return true;
            }
        }
        return false;
    }

    calculateTotalCapacity() {
        return this.units.reduce((sum, unit) => sum + (unit.capacity || 0), 0);
    }
    
    calculateTotalDuctLength() {
        return this.ducts.reduce((sum, d) => sum + d.length, 0);
    }
    
    calculateTotalDuctArea() {
        return this.ducts.reduce((sum, d) => sum + d.crossSectionalArea, 0);
    }

    getTotalQuantities() {
        const totalDuctLength = this.calculateTotalDuctLength();
        
        return {
            id: this.id,
            systemType: this.hvacData.systemType,
            totalCapacity: this.calculateTotalCapacity(),
            unitsCount: this.units.length,
            indoorUnits: this.units.filter(u => u.type === 'indoor').length,
            outdoorUnits: this.units.filter(u => u.type === 'outdoor').length,
            totalDuctLength: totalDuctLength.toFixed(2),
            totalDuctArea: this.calculateTotalDuctArea().toFixed(2),
            efficiency: this.hvacData.efficiency,
            refrigerant: this.hvacData.refrigerant,
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            
            // تحديث القوائم
            this.units = this.units.filter(u => !removed.units.some(ru => ru.id === u.id));
            this.ducts = this.ducts.filter(d => !removed.ducts.some(rd => rd.id === d.id));
            
            this.eventBus?.emit('hvac:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ HVAC segment removed: ${segmentId}`);
            return true;
        }
        return false;
    }

    generateReport() {
        const totals = this.getTotalQuantities();
        
        const systemTypes = {
            split: 'سبليت',
            ducted: 'مركزي بقنوات',
            vrf: 'VRF متغير التدفق'
        };
        
        return `
📋 تقرير نظام التكييف (HVAC)
═══════════════════════════════════
❄️ المعرف: ${totals.id}
🏭 نوع النظام: ${systemTypes[totals.systemType] || totals.systemType}
💪 السعة: ${totals.totalCapacity.toLocaleString()} BTU
⚡ كفاءة: ${totals.efficiency} COP
🔄 وسيط التبريد: ${totals.refrigerant}
═══════════════════════════════════
📊 الإجماليات:
• عدد الوحدات: ${totals.unitsCount}
  - داخلية: ${totals.indoorUnits}
  - خارجية: ${totals.outdoorUnits}
• طول المجاري: ${totals.totalDuctLength} م
• مساحة المجاري: ${totals.totalDuctArea} م²
• الأجزاء: ${totals.segments}
• المشاهد: ${totals.scenes.length}
═══════════════════════════════════
        `;
    }
    
    dispose() {
        for (const mesh of this.meshes) {
            if (mesh.parent) mesh.parent.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.meshes = [];
        this.segments = [];
        this.units = [];
        this.ducts = [];
        this.eventBus?.emit('hvac:disposed', { id: this.id });
        console.log(`♻️ GlobalHVAC disposed: ${this.id}`);
    }
}

export default GlobalHVAC;