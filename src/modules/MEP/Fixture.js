// =======================================
// ACTUAL CONSTRUCTION OS - MEP FIXTURE
// =======================================

export class Fixture {
    constructor(options = {}) {
        this.id = options.id || `fixture-${Date.now()}-${Math.random()}`;
        this.type = options.type || 'sink'; // sink, toilet, shower, faucet
        this.system = options.system || 'plumbing'; // plumbing, electrical, hvac
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        this.connections = options.connections || [];
        this.specs = options.specs || {};
        this.mesh = null;
    }

    createMesh() {
        const group = new THREE.Group();

        switch (this.type) {
            case 'sink':
                this.createSink(group);
                break;
            case 'toilet':
                this.createToilet(group);
                break;
            case 'shower':
                this.createShower(group);
                break;
            case 'faucet':
                this.createFaucet(group);
                break;
            case 'light':
                this.createLight(group);
                break;
            case 'socket':
                this.createSocket(group);
                break;
            case 'ac_unit':
                this.createACUnit(group);
                break;
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;

        this.mesh = group;
        return group;
    }

    createSink(group) {
        // حوض المغسلة
        const baseGeo = new THREE.BoxGeometry(0.6, 0.1, 0.5);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.05;
        group.add(base);

        // الحوض
        const bowlGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
        const bowlMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const bowl = new THREE.Mesh(bowlGeo, bowlMat);
        bowl.position.set(0.1, 0.175, 0);
        group.add(bowl);

        // الصنبور
        const faucetGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        const faucetMat = new THREE.MeshStandardMaterial({ color: 0xffaa44 });
        const faucet = new THREE.Mesh(faucetGeo, faucetMat);
        faucet.position.set(0.2, 0.225, 0.15);
        group.add(faucet);
    }

    createToilet(group) {
        // قاعدة المرحاض
        const baseGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.05;
        group.add(base);

        // جسم المرحاض
        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 0.25, -0.1);
        group.add(body);

        // خزان المياه
        const tankGeo = new THREE.BoxGeometry(0.35, 0.3, 0.2);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.set(0, 0.4, 0.15);
        group.add(tank);
    }

    createShower(group) {
        // قاعدة الدش
        const baseGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.025;
        group.add(base);

        // عمود الدش
        const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.0);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(0.3, 1.0, 0);
        group.add(pole);

        // رأس الدش
        const headGeo = new THREE.SphereGeometry(0.08);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0.3, 2.0, 0);
        group.add(head);
    }

    createFaucet(group) {
        // قاعدة الصنبور
        const baseGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xffaa44 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.05;
        group.add(base);

        // جسم الصنبور
        const bodyGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffaa44 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0.05, 0.125, 0);
        group.add(body);

        // مقبض
        const handleGeo = new THREE.BoxGeometry(0.04, 0.04, 0.06);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(-0.05, 0.125, 0.05);
        group.add(handle);
    }

    createLight(group) {
        // قاعدة اللمبة
        const baseGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.05);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        // اللمبة
        const bulbGeo = new THREE.SphereGeometry(0.1, 16, 16);
        const bulbMat = new THREE.MeshStandardMaterial({ 
            color: 0xffaa00,
            emissive: 0x442200,
            emissiveIntensity: 0.5
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.y = 0.1;
        group.add(bulb);

        // إضاءة
        const light = new THREE.PointLight(0xffaa00, 1, 5);
        light.position.y = 0.1;
        group.add(light);
    }

    createSocket(group) {
        // قاعدة البريزة
        const baseGeo = new THREE.BoxGeometry(0.08, 0.08, 0.03);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        // فتحات
        const holeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8);
        const holeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        const hole1 = new THREE.Mesh(holeGeo, holeMat);
        hole1.position.set(0.02, 0.02, 0.02);
        group.add(hole1);
        
        const hole2 = new THREE.Mesh(holeGeo, holeMat);
        hole2.position.set(-0.02, -0.02, 0.02);
        group.add(hole2);
    }

    createACUnit(group) {
        // جسم المكيف
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.3, 0.2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // فتحات التهوية
        const ventGeo = new THREE.BoxGeometry(0.6, 0.1, 0.05);
        const ventMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
        const vent = new THREE.Mesh(ventGeo, ventMat);
        vent.position.set(0, 0, 0.11);
        group.add(vent);

        // شعار
        const logoGeo = new THREE.BoxGeometry(0.1, 0.1, 0.02);
        const logoMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const logo = new THREE.Mesh(logoGeo, logoMat);
        logo.position.set(0.3, 0.1, 0.11);
        group.add(logo);
    }

    getSpecs() {
        const specs = {
            sink: {
                waterConsumption: '6 L/min',
                material: 'ceramic',
                warranty: '5 years'
            },
            toilet: {
                waterConsumption: '4.5 L/flush',
                material: 'ceramic',
                type: 'dual flush'
            },
            shower: {
                waterConsumption: '9 L/min',
                material: 'chrome',
                headType: 'rain'
            },
            light: {
                power: '10W',
                lumens: '800 lm',
                colorTemp: '3000K'
            },
            socket: {
                voltage: '220V',
                current: '16A',
                type: 'Type G'
            }
        };

        return specs[this.type] || {};
    }

    getBOQ() {
        const specs = this.getSpecs();
        
        return {
            type: this.type,
            system: this.system,
            quantity: 1,
            specs: Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(', ')
        };
    }
}