// =======================================
// GLOBAL PLUMBING - نسخة المحرك الجديد
// =======================================

import * as THREE from 'three';

export class GlobalPlumbing {
    constructor(eventBus = null, nodeSystem = null, geoReferencing = null, options = {}) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.geoReferencing = geoReferencing;
        
        this.plumbingData = {
            systemType: options.systemType || 'cold', // cold, hot, mixed
            pressure: options.pressure || 4, // bar
            material: options.material || 'ppr', // ppr, copper, pvc
            color: options.color || 0x44aaff,
            pipeColor: options.pipeColor || 0x88aaff
        };
        
        this.id = `plumbing_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.segments = [];
        this.meshes = [];
        this.totalLength = 0;
        this.fixtures = [];
        
        if (this.eventBus) {
            this.eventBus.on('plumbing:create', (data) => this.create(data.sceneId));
            this.eventBus.on('plumbing:render', (data) => this.renderInScene(data.sceneId, data.scene));
        }
    }

    create(sceneId = null) {
        if (sceneId && this.nodeSystem) {
            this.addSegment(sceneId);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('plumbing:created', {
                id: this.id,
                sceneId: sceneId,
                plumbingData: this.plumbingData
            });
        }
        
        console.log(`💧 Plumbing system created with ID: ${this.id}`);
        return this.id;
    }

    addSegment(sceneId) {
        const segmentData = {
            id: `segment_${Date.now()}_${this.segments.length}`,
            sceneId: sceneId,
            pipes: [],
            fixtures: [],
            createdAt: Date.now()
        };

        this.segments.push(segmentData);
        
        if (this.eventBus) {
            this.eventBus.emit('plumbing:segmentAdded', segmentData);
        }
        
        return segmentData;
    }

    addPipe(sceneId, startPoint, endPoint, diameter = 25, material = null, segmentId = null) {
        // تحويل إلى إحداثيات عالمية
        let globalStart = { ...startPoint };
        let globalEnd = { ...endPoint };
        if (this.geoReferencing) {
            globalStart = this.geoReferencing.localToWorld(startPoint);
            globalEnd = this.geoReferencing.localToWorld(endPoint);
        }
        
        const length = this.calculateLength(globalStart, globalEnd);
        const pipeMaterial = material || this.plumbingData.material;
        
        // حساب الحجم الداخلي للمواسير
        const radius = diameter / 2000; // mm to m
        const volumePerMeter = Math.PI * Math.pow(radius, 2);
        const waterVolume = length * volumePerMeter;

        const pipeData = {
            id: `pipe_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            start: globalStart,
            end: globalEnd,
            localStart: startPoint,
            localEnd: endPoint,
            diameter: diameter,
            material: pipeMaterial,
            length: length,
            waterVolume: waterVolume,
            createdAt: Date.now()
        };

        let targetSegment = segmentId 
            ? this.segments.find(s => s.id === segmentId && s.sceneId === sceneId)
            : this.segments.find(s => s.sceneId === sceneId);
            
        if (targetSegment) {
            targetSegment.pipes.push(pipeData);
        } else {
            const newSegment = {
                id: `segment_${Date.now()}_${this.segments.length}`,
                sceneId: sceneId,
                pipes: [pipeData],
                fixtures: [],
                createdAt: Date.now()
            };
            this.segments.push(newSegment);
        }
        
        this.totalLength += length;
        
        if (this.eventBus) {
            this.eventBus.emit('plumbing:pipeAdded', {
                plumbingId: this.id,
                pipeData: pipeData,
                sceneId: sceneId
            });
        }
        
        console.log(`💧 Pipe added: ${pipeMaterial}, diameter: ${diameter}mm, length: ${length.toFixed(2)}m`);
        return pipeData;
    }

    addFixture(sceneId, position, fixtureType = 'sink', segmentId = null) {
        let globalPos = { ...position };
        if (this.geoReferencing) {
            globalPos = this.geoReferencing.localToWorld(position);
        }
        
        const fixtureData = {
            id: `fixture_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            position: globalPos,
            localPosition: position,
            type: fixtureType,
            createdAt: Date.now()
        };

        let targetSegment = segmentId 
            ? this.segments.find(s => s.id === segmentId && s.sceneId === sceneId)
            : this.segments.find(s => s.sceneId === sceneId);
            
        if (targetSegment) {
            targetSegment.fixtures.push(fixtureData);
        } else {
            const newSegment = {
                id: `segment_${Date.now()}_${this.segments.length}`,
                sceneId: sceneId,
                pipes: [],
                fixtures: [fixtureData],
                createdAt: Date.now()
            };
            this.segments.push(newSegment);
        }
        
        this.fixtures.push(fixtureData);
        
        if (this.eventBus) {
            this.eventBus.emit('plumbing:fixtureAdded', {
                plumbingId: this.id,
                fixtureData: fixtureData,
                sceneId: sceneId
            });
        }
        
        console.log(`💧 Plumbing fixture added: ${fixtureType}`);
        return fixtureData;
    }

    renderInScene(sceneId, threeScene) {
        const segmentsForScene = this.segments.filter(s => s.sceneId === sceneId);
        
        for (const segment of segmentsForScene) {
            const meshes = this.renderSegment(segment, threeScene);
            this.meshes.push(...meshes);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('plumbing:rendered', { sceneId, segments: segmentsForScene.length });
        }
    }

    renderSegment(segment, threeScene) {
        const meshes = [];
        
        // رسم المواسير
        for (const pipe of segment.pipes) {
            const start = new THREE.Vector3(pipe.start.x, pipe.start.y, pipe.start.z);
            const end = new THREE.Vector3(pipe.end.x, pipe.end.y, pipe.end.z);
            const direction = new THREE.Vector3().subVectors(end, start);
            const length = direction.length();
            
            if (length < 0.1) continue;
            
            const radius = pipe.diameter / 2000;
            const cylinderGeo = new THREE.CylinderGeometry(radius, radius, length, 12);
            
            const materialColors = {
                ppr: 0x88aaff,
                copper: 0xcc8866,
                pvc: 0xaaccaa
            };
            
            const pipeMat = new THREE.MeshStandardMaterial({ 
                color: materialColors[pipe.material] || this.plumbingData.pipeColor,
                metalness: pipe.material === 'copper' ? 0.7 : 0.1,
                roughness: 0.4
            });
            
            const cylinder = new THREE.Mesh(cylinderGeo, pipeMat);
            const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            cylinder.position.copy(center);
            
            cylinder.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                direction.clone().normalize()
            );
            
            cylinder.userData = { type: 'plumbing_pipe', pipeId: pipe.id, diameter: pipe.diameter };
            threeScene.add(cylinder);
            meshes.push(cylinder);
        }
        
        // رسم التركيبات
        const fixtureMat = new THREE.MeshStandardMaterial({ color: this.plumbingData.color, metalness: 0.5 });
        
        const fixtureGeometries = {
            sink: new THREE.BoxGeometry(0.6, 0.2, 0.5),
            toilet: new THREE.BoxGeometry(0.4, 0.45, 0.7),
            shower: new THREE.BoxGeometry(0.8, 0.05, 0.8),
            faucet: new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8),
            waterHeater: new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12)
        };
        
        for (const fixture of segment.fixtures) {
            let geometry = fixtureGeometries[fixture.type] || fixtureGeometries.sink;
            const fixtureMesh = new THREE.Mesh(geometry, fixtureMat);
            fixtureMesh.position.set(fixture.position.x, fixture.position.y, fixture.position.z);
            fixtureMesh.userData = { type: 'plumbing_fixture', fixtureType: fixture.type, fixtureId: fixture.id };
            threeScene.add(fixtureMesh);
            meshes.push(fixtureMesh);
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
    
    // تحديث ضغط المياه
    updatePressure(pressure) {
        this.plumbingData.pressure = pressure;
        this.eventBus?.emit('plumbing:pressureUpdated', { id: this.id, pressure });
        console.log(`💧 Water pressure updated to: ${pressure} bar`);
    }
    
    // تحديث لون المواسير
    updatePipeColor(color) {
        this.plumbingData.pipeColor = color;
        for (const mesh of this.meshes) {
            if (mesh.userData.type === 'plumbing_pipe') {
                if (mesh.material) mesh.material.color.setHex(color);
            }
        }
        this.eventBus?.emit('plumbing:pipeColorUpdated', { id: this.id, color });
    }
    
    // حذف ماسورة
    removePipe(pipeId) {
        for (const segment of this.segments) {
            const pipeIndex = segment.pipes.findIndex(p => p.id === pipeId);
            if (pipeIndex !== -1) {
                const removed = segment.pipes.splice(pipeIndex, 1)[0];
                this.totalLength -= removed.length;
                
                this.eventBus?.emit('plumbing:pipeRemoved', { id: this.id, pipeId });
                console.log(`💧 Pipe removed: ${pipeId}`);
                return true;
            }
        }
        return false;
    }
    
    // حذف تركيب
    removeFixture(fixtureId) {
        for (const segment of this.segments) {
            const fixtureIndex = segment.fixtures.findIndex(f => f.id === fixtureId);
            if (fixtureIndex !== -1) {
                segment.fixtures.splice(fixtureIndex, 1);
                this.fixtures = this.fixtures.filter(f => f.id !== fixtureId);
                
                this.eventBus?.emit('plumbing:fixtureRemoved', { id: this.id, fixtureId });
                console.log(`💧 Fixture removed: ${fixtureId}`);
                return true;
            }
        }
        return false;
    }

    getTotalQuantities() {
        // تجميع الأطوال حسب القطر والمادة
        const pipesByDiameter = {};
        const pipesByMaterial = {};
        let totalWaterVolume = 0;
        
        for (const segment of this.segments) {
            for (const pipe of segment.pipes) {
                pipesByDiameter[pipe.diameter] = (pipesByDiameter[pipe.diameter] || 0) + pipe.length;
                pipesByMaterial[pipe.material] = (pipesByMaterial[pipe.material] || 0) + pipe.length;
                totalWaterVolume += pipe.waterVolume;
            }
        }
        
        return {
            id: this.id,
            systemType: this.plumbingData.systemType,
            pressure: this.plumbingData.pressure,
            material: this.plumbingData.material,
            totalPipeLength: this.totalLength.toFixed(2),
            totalWaterVolume: totalWaterVolume.toFixed(3),
            fixturesCount: this.fixtures.length,
            pipesByDiameter: pipesByDiameter,
            pipesByMaterial: pipesByMaterial,
            segments: this.segments.length,
            scenes: [...new Set(this.segments.map(s => s.sceneId))],
            createdAt: this.segments[0]?.createdAt || null
        };
    }
    
    getFixtureTypes() {
        const fixtureTypes = {};
        for (const fixture of this.fixtures) {
            fixtureTypes[fixture.type] = (fixtureTypes[fixture.type] || 0) + 1;
        }
        return fixtureTypes;
    }
    
    removeSegment(segmentId) {
        const index = this.segments.findIndex(s => s.id === segmentId);
        if (index !== -1) {
            const removed = this.segments.splice(index, 1)[0];
            
            // تحديث الإجماليات
            for (const pipe of removed.pipes) {
                this.totalLength -= pipe.length;
            }
            this.fixtures = this.fixtures.filter(f => !removed.fixtures.some(rf => rf.id === f.id));
            
            this.eventBus?.emit('plumbing:segmentRemoved', { id: this.id, segmentId });
            console.log(`🗑️ Plumbing segment removed: ${segmentId}`);
            return true;
        }
        return false;
    }

    generateReport() {
        const totals = this.getTotalQuantities();
        const fixtureTypes = this.getFixtureTypes();
        
        let fixtureText = '';
        for (const [type, count] of Object.entries(fixtureTypes)) {
            fixtureText += `  • ${type}: ${count}\n`;
        }
        
        const systemTypes = {
            cold: 'مياه باردة',
            hot: 'مياه ساخنة',
            mixed: 'مياه مختلطة'
        };
        
        const materialNames = {
            ppr: 'PPR بولي بروبلين',
            copper: 'نحاس',
            pvc: 'PVC'
        };
        
        return `
📋 تقرير نظام السباكة (Plumbing)
═══════════════════════════════════
💧 المعرف: ${totals.id}
🏭 نوع النظام: ${systemTypes[totals.systemType] || totals.systemType}
💪 الضغط: ${totals.pressure} bar
📦 المادة: ${materialNames[totals.material] || totals.material}
═══════════════════════════════════
📊 المواسير:
• الطول الكلي: ${totals.totalPipeLength} م
• حسب القطر:
${Object.entries(totals.pipesByDiameter).map(([d, l]) => `  - ${d}mm: ${l.toFixed(2)} م`).join('\n')}
═══════════════════════════════════
🚰 التركيبات:
• العدد: ${totals.fixturesCount}
${fixtureText}
═══════════════════════════════════
💧 كمية المياه داخل المواسير: ${totals.totalWaterVolume} م³
📐 الأجزاء: ${totals.segments}
🏞️ المشاهد: ${totals.scenes.length}
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
        this.fixtures = [];
        this.totalLength = 0;
        this.eventBus?.emit('plumbing:disposed', { id: this.id });
        console.log(`♻️ GlobalPlumbing disposed: ${this.id}`);
    }
}

export default GlobalPlumbing;