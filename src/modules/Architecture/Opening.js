// =======================================
// ACTUAL CONSTRUCTION OS - ARCHITECTURE OPENING
// =======================================

export class Opening {
    constructor(options = {}) {
        this.id = options.id || `opening-${Date.now()}-${Math.random()}`;
        this.type = options.type || 'door'; // door, window, arch
        this.width = options.width || 0.9;
        this.height = options.height || 2.1;
        this.thickness = options.thickness || 0.15;
        this.position = options.position || { x: 0, y: 0, z: 0 };
        this.rotation = options.rotation || 0;
        this.wallThickness = options.wallThickness || 0.2;
        this.frameMaterial = options.frameMaterial || 'wood';
        this.glassMaterial = options.glassMaterial || 'clear';
        this.hasFrame = options.hasFrame !== false;
        this.hasGlass = options.hasGlass || false;
        this.swingDirection = options.swingDirection || 'in'; // in, out
        this.sillHeight = options.sillHeight || 0.9; // for windows
        this.mesh = null;
    }

    createMesh() {
        const group = new THREE.Group();

        switch (this.type) {
            case 'door':
                this.createDoor(group);
                break;
            case 'window':
                this.createWindow(group);
                break;
            case 'arch':
                this.createArch(group);
                break;
        }

        group.position.set(this.position.x, this.position.y, this.position.z);
        group.rotation.y = this.rotation;

        this.mesh = group;
        return group;
    }

    createDoor(group) {
        // إطار الباب
        if (this.hasFrame) {
            const frameColor = this.frameMaterial === 'wood' ? 0x8B4513 : 0xcccccc;
            
            // إطار علوي
            const topFrameGeo = new THREE.BoxGeometry(this.width, 0.1, this.thickness);
            const topFrameMat = new THREE.MeshStandardMaterial({ color: frameColor });
            const topFrame = new THREE.Mesh(topFrameGeo, topFrameMat);
            topFrame.position.y = this.height - 0.05;
            group.add(topFrame);

            // إطار جانبي أيسر
            const leftFrameGeo = new THREE.BoxGeometry(0.1, this.height, this.thickness);
            const leftFrameMat = new THREE.MeshStandardMaterial({ color: frameColor });
            const leftFrame = new THREE.Mesh(leftFrameGeo, leftFrameMat);
            leftFrame.position.x = -this.width/2 + 0.05;
            leftFrame.position.y = this.height/2;
            group.add(leftFrame);

            // إطار جانبي أيمن
            const rightFrameGeo = new THREE.BoxGeometry(0.1, this.height, this.thickness);
            const rightFrameMat = new THREE.MeshStandardMaterial({ color: frameColor });
            const rightFrame = new THREE.Mesh(rightFrameGeo, rightFrameMat);
            rightFrame.position.x = this.width/2 - 0.05;
            rightFrame.position.y = this.height/2;
            group.add(rightFrame);
        }

        // جسم الباب
        const doorGeo = new THREE.BoxGeometry(this.width - 0.02, this.height - 0.02, this.thickness - 0.02);
        const doorMat = new THREE.MeshStandardMaterial({ 
            color: this.frameMaterial === 'wood' ? 0xDEB887 : 0xffffff,
            roughness: 0.7
        });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.y = this.height/2;
        group.add(door);

        // مقبض الباب
        const handleGeo = new THREE.SphereGeometry(0.03, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xffaa44 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(this.width/4, this.height/2, this.thickness/2);
        group.add(handle);
    }

    createWindow(group) {
        // إطار النافذة
        const frameColor = 0xffffff;
        
        // الإطار الخارجي
        const frameGeo = new THREE.BoxGeometry(this.width, this.height, 0.1);
        const frameMat = new THREE.MeshStandardMaterial({ color: frameColor });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.y = this.height/2;
        group.add(frame);

        // زجاج
        if (this.hasGlass) {
            const glassGeo = new THREE.BoxGeometry(this.width - 0.1, this.height - 0.1, 0.02);
            const glassMat = new THREE.MeshStandardMaterial({ 
                color: 0x88ccff,
                transparent: true,
                opacity: 0.3,
                emissive: 0x112233
            });
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.position.y = this.height/2;
            group.add(glass);
        }

        // تقسيمات النافذة
        const dividerColor = 0xcccccc;
        
        // تقسيم أفقي
        const hDividerGeo = new THREE.BoxGeometry(this.width - 0.1, 0.02, 0.05);
        const hDividerMat = new THREE.MeshStandardMaterial({ color: dividerColor });
        const hDivider = new THREE.Mesh(hDividerGeo, hDividerMat);
        hDivider.position.y = this.height/2;
        group.add(hDivider);

        // تقسيم رأسي
        const vDividerGeo = new THREE.BoxGeometry(0.02, this.height - 0.1, 0.05);
        const vDividerMat = new THREE.MeshStandardMaterial({ color: dividerColor });
        const vDivider = new THREE.Mesh(vDividerGeo, vDividerMat);
        vDivider.position.y = this.height/2;
        group.add(vDivider);

        // عتبة النافذة
        const sillGeo = new THREE.BoxGeometry(this.width + 0.1, 0.05, 0.2);
        const sillMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const sill = new THREE.Mesh(sillGeo, sillMat);
        sill.position.y = -0.025;
        group.add(sill);
    }

    createArch(group) {
        // قوس
        const points = [];
        const segments = 32;
        
        for (let i = 0; i <= segments; i++) {
            const angle = Math.PI * i / segments;
            const x = (this.width/2) * Math.cos(angle);
            const y = (this.height/2) * Math.sin(angle) + this.height/2;
            points.push(new THREE.Vector2(x, y));
        }

        const shape = new THREE.Shape(points);
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: this.thickness,
            bevelEnabled: false
        });

        const material = new THREE.MeshStandardMaterial({ 
            color: 0xDEB887,
            roughness: 0.6
        });

        const arch = new THREE.Mesh(geometry, material);
        arch.rotation.y = Math.PI / 2;
        group.add(arch);
    }

    getOpeningArea() {
        return this.width * this.height;
    }

    getBOQ() {
        const area = this.getOpeningArea();
        
        return {
            type: this.type,
            dimensions: `${this.width} × ${this.height}`,
            area: area.toFixed(2) + ' م²',
            frameMaterial: this.frameMaterial,
            hasGlass: this.hasGlass ? 'نعم' : 'لا'
        };
    }

    static getStandardDoorSizes() {
        return [
            { width: 0.8, height: 2.1, name: 'باب مفرد صغير' },
            { width: 0.9, height: 2.1, name: 'باب مفرد قياسي' },
            { width: 1.0, height: 2.1, name: 'باب مفرد كبير' },
            { width: 1.2, height: 2.1, name: 'باب مزدوج صغير' },
            { width: 1.5, height: 2.1, name: 'باب مزدوج قياسي' },
            { width: 1.8, height: 2.1, name: 'باب مزدوج كبير' }
        ];
    }

    static getStandardWindowSizes() {
        return [
            { width: 1.0, height: 1.0, name: 'شباك مربع صغير' },
            { width: 1.2, height: 1.2, name: 'شباك مربع قياسي' },
            { width: 1.5, height: 1.2, name: 'شباك مستطيل' },
            { width: 1.8, height: 1.5, name: 'شباك كبير' },
            { width: 2.0, height: 1.5, name: 'شباك بانورامي' }
        ];
    }
}