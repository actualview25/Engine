// ============================================
// CALIBRATION WIZARD - معالج معايرة CAD مع صور 360
// يربط بين إحداثيات CAD ونقاط الصور البانورامية
// ============================================

import * as THREE from 'three';

export class CalibrationWizard {
    constructor(geoReferencing, sceneConnector = null) {
        this.geoRef = geoReferencing;
        this.sceneConnector = sceneConnector;
        
        // حالة المعايرة
        this.isActive = false;
        this.gcpPairs = []; // Ground Control Points pairs: { imagePoint, realPoint }
        this.currentStep = 1; // 1: add points, 2: verify, 3: apply
        this.previewMarkers = [];
        this.errorThreshold = 0.05; // 5 cm error tolerance
        
        // عناصر واجهة المعايرة
        this.calibrationPoints = [];
        this.transformMatrix = null;
        this.residuals = [];
        
        // إعدادات Three.js للمعايرة
        this.raycaster = null;
        this.sphereMesh = null;
        
        console.log('🔧 CalibrationWizard initialized');
    }
    
    // ========== MAIN CALIBRATION FLOW ==========
    
    startWizard(sphereMesh, camera, rendererDom) {
        this.isActive = true;
        this.currentStep = 1;
        this.gcpPairs = [];
        this.clearPreviewMarkers();
        
        // إعداد Raycaster للتفاعل مع الكرة
        this.raycaster = new THREE.Raycaster();
        this.sphereMesh = sphereMesh;
        this.camera = camera;
        
        // إضافة مستمع النقر
        this.onClickHandler = this.handleSphereClick.bind(this);
        rendererDom.addEventListener('click', this.onClickHandler);
        
        this.updateStatus('🔍 Step 1: Click on the 360 image to add calibration points');
        
        return this;
    }
    
    handleSphereClick(event) {
        if (!this.isActive || this.currentStep !== 1) return;
        
        // حساب نقطة التقاطع مع الكرة
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / this.camera.renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(event.clientY / this.camera.renderer.domElement.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.sphereMesh);
        
        if (intersects.length > 0) {
            const hitPoint = intersects[0].point.clone();
            const normalizedPoint = hitPoint.clone().normalize();
            
            // تحويل إلى إحداثيات كروية (theta, phi)
            const spherical = this.cartesianToSpherical(normalizedPoint);
            
            // فتح حوار لإدخال الإحداثيات الحقيقية
            this.promptForRealCoordinates(spherical, hitPoint);
        }
    }
    
    promptForRealCoordinates(imagePoint, worldPoint3D) {
        const realX = prompt('📍 أدخل الإحداثي X (متر):', '0');
        const realY = prompt('📍 أدخل الإحداثي Y (متر):', '0');
        const realZ = prompt('📍 أدخل الإحداثي Z (متر):', '0');
        
        if (realX === null || realY === null || realZ === null) return;
        
        const realPoint = {
            x: parseFloat(realX),
            y: parseFloat(realY),
            z: parseFloat(realZ)
        };
        
        this.addCalibrationPoint({
            imagePoint: {
                theta: imagePoint.theta,
                phi: imagePoint.phi,
                world3D: worldPoint3D
            },
            realPoint: realPoint
        });
    }
    
    addCalibrationPoint(pair) {
        this.gcpPairs.push(pair);
        
        // إضافة علامة مرئية على الكرة
        this.addPreviewMarker(pair.imagePoint.world3D, this.gcpPairs.length);
        
        this.updateStatus(`✅ Added point ${this.gcpPairs.length}. Need at least 3 points.`);
        
        // إذا وصلنا لـ 3 نقاط، ننتقل للخطوة التالية تلقائياً
        if (this.gcpPairs.length >= 3) {
            this.currentStep = 2;
            this.updateStatus(`✅ ${this.gcpPairs.length} points collected. Click "Calculate" to compute transformation.`);
        }
    }
    
    addPreviewMarker(position, index) {
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff4444, 
            emissive: 0x441111,
            emissiveIntensity: 0.5
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        marker.userData = { type: 'calibration', index: index };
        
        this.sphereMesh.parent.add(marker);
        this.previewMarkers.push(marker);
        
        // إضافة نص رقم
        this.addNumberLabel(position, index);
    }
    
    addNumberLabel(position, number) {
        const div = document.createElement('div');
        div.textContent = `${number}`;
        div.style.cssText = `
            background: #ff4444;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            font-family: monospace;
            border: 2px solid white;
            box-shadow: 0 0 5px black;
        `;
        
        import('three/addons/renderers/CSS2DRenderer.js').then(({ CSS2DObject }) => {
            const label = new CSS2DObject(div);
            // إزاحة النص قليلاً للأعلى
            label.position.copy(position.clone().multiplyScalar(1.05));
            this.sphereMesh.parent.add(label);
            this.previewMarkers.push(label);
        });
    }
    
    // ========== TRANSFORMATION CALCULATION ==========
    
    calculateTransformation() {
        if (this.gcpPairs.length < 3) {
            console.warn('Need at least 3 calibration points');
            return null;
        }
        
        // استخدام طريقة المربعات الصغرى لحساب matrix 4x4
        const A = [];
        const B = [];
        
        for (const pair of this.gcpPairs) {
            // تحويل نقطة الصورة إلى اتجاه (ray direction)
            const ray = this.sphericalToDirection(pair.imagePoint.theta, pair.imagePoint.phi);
            
            // بناء المعادلات: realPoint = M * ray
            A.push([ray.x, ray.y, ray.z, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
            A.push([0, 0, 0, 0, ray.x, ray.y, ray.z, 1, 0, 0, 0, 0]);
            A.push([0, 0, 0, 0, 0, 0, 0, 0, ray.x, ray.y, ray.z, 1]);
            
            B.push(pair.realPoint.x);
            B.push(pair.realPoint.y);
            B.push(pair.realPoint.z);
        }
        
        // حل المعادلات (least squares)
        const AT = this.transposeMatrix(A);
        const ATA = this.multiplyMatrices(AT, A);
        const ATB = this.multiplyMatrixVector(AT, B);
        
        // حل النظام الخطي (Gaussian elimination)
        const solution = this.solveLinearSystem(ATA, ATB);
        
        // بناء matrix 4x4 من الحل
        this.transformMatrix = [
            [solution[0], solution[1], solution[2], solution[3]],
            [solution[4], solution[5], solution[6], solution[7]],
            [solution[8], solution[9], solution[10], solution[11]],
            [0, 0, 0, 1]
        ];
        
        // حساب residuals (أخطاء المعايرة)
        this.calculateResiduals();
        
        // تحديث GeoReferencing
        if (this.geoRef) {
            this.geoRef.setTransformMatrix(this.transformMatrix);
            this.geoRef.setCalibrationPoints(this.gcpPairs);
        }
        
        this.currentStep = 3;
        this.updateStatus(`✅ Calibration complete. RMS error: ${this.getRMSError().toFixed(3)}m`);
        
        return this.transformMatrix;
    }
    
    calculateResiduals() {
        this.residuals = [];
        
        for (const pair of this.gcpPairs) {
            const ray = this.sphericalToDirection(pair.imagePoint.theta, pair.imagePoint.phi);
            const estimated = this.applyTransform(ray);
            
            const error = {
                x: pair.realPoint.x - estimated.x,
                y: pair.realPoint.y - estimated.y,
                z: pair.realPoint.z - estimated.z,
                distance: Math.sqrt(
                    Math.pow(pair.realPoint.x - estimated.x, 2) +
                    Math.pow(pair.realPoint.y - estimated.y, 2) +
                    Math.pow(pair.realPoint.z - estimated.z, 2)
                )
            };
            
            this.residuals.push(error);
        }
        
        return this.residuals;
    }
    
    getRMSError() {
        if (this.residuals.length === 0) return Infinity;
        
        let sumSq = 0;
        for (const r of this.residuals) {
            sumSq += r.distance * r.distance;
        }
        
        return Math.sqrt(sumSq / this.residuals.length);
    }
    
    applyTransform(point) {
        if (!this.transformMatrix) return point;
        
        const x = point.x * this.transformMatrix[0][0] + 
                  point.y * this.transformMatrix[0][1] + 
                  point.z * this.transformMatrix[0][2] + 
                  this.transformMatrix[0][3];
        
        const y = point.x * this.transformMatrix[1][0] + 
                  point.y * this.transformMatrix[1][1] + 
                  point.z * this.transformMatrix[1][2] + 
                  this.transformMatrix[1][3];
        
        const z = point.x * this.transformMatrix[2][0] + 
                  point.y * this.transformMatrix[2][1] + 
                  point.z * this.transformMatrix[2][2] + 
                  this.transformMatrix[2][3];
        
        return { x, y, z };
    }
    
    // ========== UTILITY FUNCTIONS ==========
    
    cartesianToSpherical(point) {
        const r = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
        const theta = Math.atan2(point.z, point.x);
        const phi = Math.asin(point.y / r);
        
        return { theta, phi, r };
    }
    
    sphericalToDirection(theta, phi) {
        const x = Math.cos(theta) * Math.cos(phi);
        const y = Math.sin(phi);
        const z = Math.sin(theta) * Math.cos(phi);
        
        return new THREE.Vector3(x, y, z);
    }
    
    transposeMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const result = Array(cols).fill().map(() => Array(rows));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result[j][i] = matrix[i][j];
            }
        }
        
        return result;
    }
    
    multiplyMatrices(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;
        const result = Array(rowsA).fill().map(() => Array(colsB).fill(0));
        
        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                for (let k = 0; k < colsA; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        
        return result;
    }
    
    multiplyMatrixVector(matrix, vector) {
        const rows = matrix.length;
        const result = Array(rows).fill(0);
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < vector.length; j++) {
                result[i] += matrix[i][j] * vector[j];
            }
        }
        
        return result;
    }
    
    solveLinearSystem(A, b) {
        // Gaussian elimination with partial pivoting
        const n = A.length;
        const Aug = A.map((row, i) => [...row, b[i]]);
        
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            let maxVal = Math.abs(Aug[i][i]);
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(Aug[k][i]) > maxVal) {
                    maxVal = Math.abs(Aug[k][i]);
                    maxRow = k;
                }
            }
            
            // Swap rows
            [Aug[i], Aug[maxRow]] = [Aug[maxRow], Aug[i]];
            
            // Eliminate
            for (let k = i + 1; k < n; k++) {
                const factor = Aug[k][i] / Aug[i][i];
                for (let j = i; j <= n; j++) {
                    Aug[k][j] -= factor * Aug[i][j];
                }
            }
        }
        
        // Back substitution
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += Aug[i][j] * x[j];
            }
            x[i] = (Aug[i][n] - sum) / Aug[i][i];
        }
        
        return x;
    }
    
    // ========== VISUALIZATION ==========
    
    visualizeCalibration() {
        if (!this.transformMatrix) return;
        
        // إضافة axes لتمثيل نظام الإحداثيات المحول
        const axesHelper = new THREE.AxesHelper(5);
        axesHelper.position.set(0, 0, 0);
        this.sphereMesh.parent.add(axesHelper);
        this.previewMarkers.push(axesHelper);
        
        // إضافة شبكة أرضية
        const gridHelper = new THREE.GridHelper(50, 20, 0x88aaff, 0x335588);
        gridHelper.position.y = -2;
        this.sphereMesh.parent.add(gridHelper);
        this.previewMarkers.push(gridHelper);
        
        // رسم الخطوط بين النقاط المعايرة والواقعية
        for (const pair of this.gcpPairs) {
            const start = pair.imagePoint.world3D;
            const end = new THREE.Vector3(pair.realPoint.x, pair.realPoint.y, pair.realPoint.z);
            
            const points_array = [start, end];
            const geometry = new THREE.BufferGeometry().setFromPoints(points_array);
            const material = new THREE.LineBasicMaterial({ color: 0xffaa44 });
            const line = new THREE.Line(geometry, material);
            this.sphereMesh.parent.add(line);
            this.previewMarkers.push(line);
        }
    }
    
    clearPreviewMarkers() {
        for (const marker of this.previewMarkers) {
            if (marker.parent) {
                marker.parent.remove(marker);
            }
            if (marker.dispose) marker.dispose();
        }
        this.previewMarkers = [];
    }
    
    getCalibrationReport() {
        return {
            status: this.currentStep === 3 ? 'completed' : 'in_progress',
            pointCount: this.gcpPairs.length,
            transformMatrix: this.transformMatrix,
            residuals: this.residuals,
            rmsError: this.getRMSError(),
            threshold: this.errorThreshold,
            isAcceptable: this.getRMSError() <= this.errorThreshold
        };
    }
    
    updateStatus(message) {
        console.log(`🔧 Calibration: ${message}`);
        if (this.onStatusUpdate) {
            this.onStatusUpdate(message);
        }
    }
    
    setOnStatusUpdate(callback) {
        this.onStatusUpdate = callback;
    }
    
    finish() {
        this.isActive = false;
        this.clearPreviewMarkers();
        
        if (this.onClickHandler && this.camera?.renderer?.domElement) {
            this.camera.renderer.domElement.removeEventListener('click', this.onClickHandler);
        }
        
        this.updateStatus('✅ Calibration wizard closed');
    }
    
    // ========== EXPORT/IMPORT ==========
    
    exportCalibrationData() {
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            points: this.gcpPairs.map(pair => ({
                image: { theta: pair.imagePoint.theta, phi: pair.imagePoint.phi },
                real: pair.realPoint
            })),
            transformMatrix: this.transformMatrix,
            residuals: this.residuals,
            rmsError: this.getRMSError()
        };
    }
    
    importCalibrationData(data) {
        this.gcpPairs = data.points.map(p => ({
            imagePoint: {
                theta: p.image.theta,
                phi: p.image.phi,
                world3D: this.sphericalToDirection(p.image.theta, p.image.phi)
            },
            realPoint: p.real
        }));
        
        this.transformMatrix = data.transformMatrix;
        this.calculateResiduals();
        this.currentStep = 3;
        
        if (this.geoRef) {
            this.geoRef.setTransformMatrix(this.transformMatrix);
        }
        
        return this;
    }
}

export default CalibrationWizard;