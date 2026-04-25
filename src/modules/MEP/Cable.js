// =======================================
// ACTUAL CONSTRUCTION OS - MEP CABLE
// =======================================

export class Cable {
    constructor(options = {}) {
        this.id = options.id || `cable-${Date.now()}-${Math.random()}`;
        this.type = options.type || 'power'; // power, data, control
        this.material = options.material || 'copper'; // copper, aluminum
        this.size = options.size || 2.5; // mm²
        this.cores = options.cores || 3;
        this.voltage = options.voltage || 220;
        this.current = options.current || 16;
        this.color = options.color || this.getColor();
        this.startPoint = options.start || { x: 0, y: 0, z: 0 };
        this.endPoint = options.end || { x: 0, y: 0, z: 0 };
        this.path = options.path || [];
        this.mesh = null;
    }

    getColor() {
        const colors = {
            'power': 0xffaa00,
            'data': 0x00aaff,
            'control': 0x44ff44
        };
        return colors[this.type] || 0xcccccc;
    }

    calculateLength() {
        if (this.path.length > 0) {
            let length = 0;
            for (let i = 0; i < this.path.length - 1; i++) {
                length += this.distance(this.path[i], this.path[i + 1]);
            }
            return length;
        }
        return this.distance(this.startPoint, this.endPoint);
    }

    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2) +
            Math.pow(p2.z - p1.z, 2)
        );
    }

    createMesh() {
        const points = this.getPoints();
        if (points.length < 2) return null;

        const group = new THREE.Group();
        
        // إنشاء مسار الكابل
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            
            const direction = new THREE.Vector3().subVectors(end, start);
            const distance = direction.length();
            
            if (distance < 0.1) continue;

            // جسم الكابل
            const cableGeo = new THREE.CylinderGeometry(0.05, 0.05, distance, 8);
            const cableMat = new THREE.MeshStandardMaterial({ 
                color: this.color,
                emissive: 0x221100
            });
            const cable = new THREE.Mesh(cableGeo, cableMat);
            
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                direction.clone().normalize()
            );
            cable.applyQuaternion(quaternion);
            
            const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            cable.position.copy(center);
            
            group.add(cable);

            // إضافة طبقة عزل للكابلات الكبيرة
            if (this.size >= 10) {
                const insulationGeo = new THREE.CylinderGeometry(0.06, 0.06, distance, 8);
                const insulationMat = new THREE.MeshStandardMaterial({ 
                    color: 0x333333,
                    transparent: true,
                    opacity: 0.3
                });
                const insulation = new THREE.Mesh(insulationGeo, insulationMat);
                insulation.applyQuaternion(quaternion);
                insulation.position.copy(center);
                group.add(insulation);
            }
        }

        // إضافة نقاط التوصيل
        points.forEach((point, index) => {
            const connectorGeo = new THREE.SphereGeometry(0.1, 8);
            const connectorMat = new THREE.MeshStandardMaterial({ 
                color: 0xffaa44,
                emissive: 0x442200
            });
            const connector = new THREE.Mesh(connectorGeo, connectorMat);
            connector.position.copy(point);
            
            if (index === 0 || index === points.length - 1) {
                connector.scale.set(1.5, 1.5, 1.5); // أطراف أكبر
            }
            
            group.add(connector);
        });

        this.mesh = group;
        return group;
    }

    getPoints() {
        if (this.path.length > 0) {
            return this.path.map(p => new THREE.Vector3(p.x, p.y, p.z));
        }
        return [
            new THREE.Vector3(this.startPoint.x, this.startPoint.y, this.startPoint.z),
            new THREE.Vector3(this.endPoint.x, this.endPoint.y, this.endPoint.z)
        ];
    }

    getSpecs() {
        const resistance = this.material === 'copper' ? 0.0172 : 0.0282; // أوم/متر/مم²
        
        return {
            material: this.material,
            size: this.size + ' mm²',
            cores: this.cores,
            voltage: this.voltage + 'V',
            current: this.current + 'A',
            resistance: (resistance * this.calculateLength() / this.size).toFixed(4) + ' Ω',
            weight: (this.calculateLength() * (this.material === 'copper' ? 8.9 : 2.7) * this.size / 1000).toFixed(2) + ' kg'
        };
    }

    getBOQ() {
        const specs = this.getSpecs();
        const length = this.calculateLength();
        
        return {
            type: this.type,
            material: this.material,
            size: this.size + ' mm²',
            length: length.toFixed(2) + ' m',
            cores: this.cores,
            specs: Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(', ')
        };
    }

    static getStandardSizes() {
        return [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
    }

    static getCurrentCapacity(size, material = 'copper') {
        const capacities = {
            'copper': {
                1.5: 15, 2.5: 20, 4: 27, 6: 34, 10: 46, 16: 61, 25: 80, 35: 99, 50: 119
            },
            'aluminum': {
                1.5: 11, 2.5: 15, 4: 20, 6: 25, 10: 34, 16: 45, 25: 59, 35: 73, 50: 88
            }
        };
        
        return capacities[material]?.[size] || 0;
    }
}