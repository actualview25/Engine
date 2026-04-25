// =======================================
// GLOBAL ELECTRICAL - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalElectrical {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.electricalData = {
            voltage: options.voltage || 220,
            phase: options.phase || 'single', // single, three
            frequency: options.frequency || 50,
            circuits: [],
            cableColor: options.cableColor || 0xffaa44,
            pointColor: options.pointColor || 0xffaa44
        };
        
        this.id = `electrical_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.totalLength = 0;
        this.totalPoints = 0;
        
        if (this.eventBus) {
            this.eventBus.on('electrical:createCircuit', (data) => this.createCircuit(data.circuitType, data.sceneId));
            this.eventBus.on('electrical:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    createCircuit(circuitType, sceneId = null) {
        const circuitData = {
            id: `circuit_${Date.now()}_${this.electricalData.circuits.length}`,
            type: circuitType,
            createdAt: Date.now(),
            cables: [],
            points: []
        };
        
        this.electricalData.circuits.push(circuitData);
        
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId, circuitType, circuitData);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('electrical:circuitCreated', {
                id: this.id,
                circuitId: circuitData.id,
                circuitType: circuitType,
                sceneId: sceneId
            });
        }
        
        console.log(`⚡ Electrical circuit created: ${circuitType}, ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId, circuitType, circuitData) {
        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            circuitId: circuitData.id,
            circuitType: circuitType,
            cables: [],
            points: [],
            createdAt: Date.now()
        };

        this.segments.push(segmentData);
        
        if (this.eventBus) {
            this.eventBus.emit('electrical:segmentAdded', segmentData);
        }
        
        return segmentData;
    }

    // إضافة كابل
    addCable(sceneId, startPoint, endPoint, cableType = 'cu_2.5', segmentId = null) {
        // تحويل إلى إحداثيات عالمية
        let globalStart = { ...startPoint };
        let globalEnd = { ...endPoint };
        if (this.geoReferencing) {
            globalStart = this.geoReferencing.localToWorld(startPoint);
            globalEnd = this.geoReferencing.localToWorld(endPoint);
        }
        
        const length = this.calculateLength(globalStart, globalEnd);
        
        const cableData = {
            id: `cable_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            start: globalStart,
            end: globalEnd,
            localStart: startPoint,
            localEnd: endPoint,
            type: cableType,
            length: length,
            createdAt: Date.now()
        };

        // البحث عن الجزء المناسب
        let targetSegment = segmentId 
            ? this.segments.find(s => s.id === segmentId && s.sceneId === sceneId)
            : this.segments.find(s => s.sceneId === sceneId);
            
        if (targetSegment) {
            targetSegment.cables.push(cableData);
            this.totalLength += length;
        } else {
            // إنشاء جزء جديد
            const newSegment = {
                id: `segment_${Date.now()}_${this.segments.length}`,
                sceneId: sceneId,
                cables: [cableData],
                points: [],
                createdAt: Date.now()
            };
            this.segments.push(newSegment);
            this.totalLength += length;
        }
        
        if (this.eventBus) {
            this.eventBus.emit('electrical:cableAdded', {
                electricalId: this.id,
                cableData: cableData,
                sceneId: sceneId
            });
        }
        
        console.log(`⚡ Cable added: ${cableType}, length: ${length.toFixed(2)}m`);
        return cableData;
    }

    // إضافة نقطة كهرباء
    addPoint(sceneId, position, pointType = 'socket', segmentId = null) {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const pointData = {
            id: `point_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            position: globalPos,
            localPosition: position,
            type: pointType,
            createdAt: Date.now()
        };

        let targetSegment = segmentId 
            ? this.segments.find(s => s.id === segmentId && s.sceneId === sceneId)
            : this.segments.find(s => s.sceneId === sceneId);
            
        if (targetSegment) {
            targetSegment.points.push(pointData);
        } else {
            const newSegment = {
                id: `segment_${Date.now()}_${this.segments.length}`,
                sceneId: sceneId,
                cables: [],
                points: [pointData],
                createdAt: Date.now()
            };
            this.segments.push(newSegment);
        }
        
        this.totalPoints++;
        
        if (this.eventBus) {
            this.eventBus.emit('electrical:pointAdded', {
                electricalId: this.id,
                pointData: pointData,
                sceneId: sceneId
            });
        }
        
        console.log(`⚡ Electrical point added: ${pointType}`);
        return pointData;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('electrical:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        const cableMat = new THREE.LineBasicMaterial({ color: this.electricalData.cableColor });
        
        // رسم الكابلات
        for (const cable of segment.cables) {
            const start = new THREE.Vector3(cable.start.x, cable.start.y, cable.start.z);
            const end = new THREE.Vector3(cable.end.x, cable.end.y, cable.end.z);
            const points = [start, end];
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, cableMat);
            threeScene.add(line);
            meshes.push(line);
        }
        
        // رسم النقاط الكهربائية
        const pointMat = new THREE.MeshStandardMaterial({ 
            color: this.electricalData.pointColor,
            emissive: this.electricalData.pointColor,
            emissiveIntensity: 0.3
        });
        
        for (const point of segment.points) {
            const pointMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), pointMat);
            pointMesh.position.set(point.position.x, point.position.y, point.position.z);
            pointMesh.userData = { type: 'electrical_point', pointType: point.type, pointId: point.id };
            threeScene.add(pointMesh);
            meshes.push(pointMesh);
            
            // إضافة علامة دائرية حول النقطة
            const circleMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, side: THREE.DoubleSide });
            const circle = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 16), circleMat);
            circle.position.set(point.position.x, point.position.y + 0.02, point.position.z);
            circle.lookAt(0, 1, 0);
            threeScene.add(circle);
            meshes.push(circle);
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
    
    // تحديث الجهد
    updateVoltage(voltage) {
        this.electricalData.voltage = voltage;
        this.eventBus?.emit('electrical:voltageUpdated', { id: this.id, voltage });
        console.log(`⚡ Voltage updated to: ${voltage}V`);
    }
    
    // تحديث لون الكابلات
    updateCableColor(color) {
        this.electricalData.cableColor = color;
        for (const mesh of this.meshes) {
            if (mesh.isLine && mesh.material) {
                mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('electrical:cableColorUpdated', { id: this.id, color });
    }
    
    // حذف كابل
    removeCable(cableId) {
        for (const segment of this.segments) {
            const cableIndex = segment.cables.findIndex(c => c.id === cableId);
            if (cableIndex !== -1) {
                const removed = segment.cables.splice(cableIndex, 1)[0];
                this.totalLength -= removed.length;
                
                this.eventBus?.emit('electrical:cableRemoved', { id: this.id, cableId });
                console.log(`⚡ Cable removed: ${cableId}`);
                return true;
            }
        }
        return false;
    }
    
    // حذف نقطة كهرباء
    removePoint(pointId) {
        for (const segment of this.segments) {
            const pointIndex = segment.points.findIndex(p => p.id === pointId);
            if (pointIndex !== -1) {
                segment.points.splice(pointIndex, 1);
                this.totalPoints--;
                
                this.eventBus?.emit('electrical:pointRemoved', { id: this.id, pointId });
                console.log(`⚡ Electrical point removed: ${pointId}`);
                return true;
            }
        }
        return false;
    }

    getTotalQuantities() {
        return {
            id: this.id,
            totalCableLength: this.totalLength.toFixed(2),
            totalPoints: this.totalPoints,
            circuits: this.electricalData.circuits.length,
            voltage: this.electricalData.voltage,
            phase: this.electricalData.phase,
            frequency: this.electricalData.frequency,
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    getCircuitDetails() {
        return this.electricalData.circuits.map(circuit => ({
            id: circuit.id,
            type: circuit.type,
            cableCount: circuit.cables?.length || 0,
            pointCount: circuit.points?.length || 0,
            createdAt: circuit.createdAt
        }));
    }
    
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            
            // تحديث الإجماليات
            for (const cable of removed.cables) {
                this.totalLength -= cable.length;
            }
            this.totalPoints -= removed.points.length;
            
            this.eventBus?.emit('electrical:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ Electrical segment removed: ${segmentId}`);
            return true;
        }
        return false;
    }

    generateReport() {
        const totals = this.getTotalQuantities();
        
        return `
📋 تقرير النظام الكهربائي
═══════════════════════════════════
⚡ المعرف: ${totals.id}
⚡ الجهد: ${totals.voltage}V
🔄 الطور: ${totals.phase === 'single' ? 'أحادي' : 'ثلاثي'}
📡 التردد: ${totals.frequency}Hz
═══════════════════════════════════
📊 الإجماليات:
• طول الكابلات: ${totals.totalCableLength} م
• عدد النقاط: ${totals.totalPoints}
• عدد الدوائر: ${totals.circuits}
• عدد الأجزاء: ${totals.segments}
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
        this.electricalData.circuits = [];
        this.totalLength = 0;
        this.totalPoints = 0;
        this.eventBus?.emit('electrical:disposed', { id: this.id });
        console.log(`♻️ GlobalElectrical disposed: ${this.id}`);
    }
}

export default GlobalElectrical;