// ============================================
// GEO REFERENCING - نظام الإسناد الجغرافي
// يدعم: تحويل الإحداثيات، المعايرة، أنظمة الإحداثيات المتعددة
// ============================================

export class GeoReferencing {
    constructor() {
        // نظام الإحداثيات الحالي
        this.coordinateSystem = 'local'; // local, utm, gps, cad
        this.origin = { x: 0, y: 0, z: 0 };
        this.scale = 1.0;
        this.rotation = 0; // radians
        
        // مصفوفة التحويل (4x4)
        this.transformMatrix = null;
        
        // نقاط التحكم الأرضية (GCPs)
        this.gcps = []; // { imagePoint, realPoint, residual }
        
        // إعدادات التحويل
        this.transformationType = 'affine'; // affine, similarity, projective
        this.useHeightCompensation = true;
        this.heightReference = 0;
        
        // نظام UTM
        this.utmZone = 36;
        this.utmHemisphere = 'N';
        
        // معايرة الكاميرا (للصور البانورامية)
        this.cameraCalibration = {
            focalLength: 0,
            principalPoint: { x: 0, y: 0 },
            distortion: { k1: 0, k2: 0, k3: 0 }
        };
        
        // الإسقاطات المدعومة
        this.projections = {
            'local': (p) => p,
            'utm': (p) => this.localToUTM(p),
            'gps': (p) => this.localToGPS(p),
            'cad': (p) => this.localToCAD(p)
        };
        
        console.log('🌍 GeoReferencing initialized');
    }
    
    // ========== SYSTEM SETUP ==========
    
    setCoordinateSystem(system, options = {}) {
        const validSystems = ['local', 'utm', 'gps', 'cad'];
        if (!validSystems.includes(system)) {
            console.error(`Invalid coordinate system: ${system}`);
            return false;
        }
        
        this.coordinateSystem = system;
        
        if (system === 'utm' && options.zone) {
            this.utmZone = options.zone;
            this.utmHemisphere = options.hemisphere || 'N';
        }
        
        console.log(`📍 Coordinate system set to: ${system}`);
        return true;
    }
    
    setOrigin(x, y, z = 0) {
        this.origin = { x, y, z };
        this.updateTransformMatrix();
        console.log(`📍 Origin set to: (${x}, ${y}, ${z})`);
    }
    
    setScale(scale) {
        this.scale = scale;
        this.updateTransformMatrix();
    }
    
    setRotation(angleRadians) {
        this.rotation = angleRadians;
        this.updateTransformMatrix();
    }
    
    // ========== TRANSFORM MATRIX ==========
    
    updateTransformMatrix() {
        // بناء مصفوفة التحويل 4x4
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        
        this.transformMatrix = [
            [cos * this.scale, -sin * this.scale, 0, this.origin.x],
            [sin * this.scale, cos * this.scale, 0, this.origin.y],
            [0, 0, this.scale, this.origin.z],
            [0, 0, 0, 1]
        ];
    }
    
    setTransformMatrix(matrix) {
        this.transformMatrix = matrix;
        this.extractParametersFromMatrix();
    }
    
    extractParametersFromMatrix() {
        if (!this.transformMatrix) return;
        
        // استخراج scale من المصفوفة
        this.scale = Math.sqrt(
            this.transformMatrix[0][0] * this.transformMatrix[0][0] +
            this.transformMatrix[1][0] * this.transformMatrix[1][0]
        );
        
        // استخراج rotation
        this.rotation = Math.atan2(this.transformMatrix[1][0], this.transformMatrix[0][0]);
        
        // استخراج origin
        this.origin = {
            x: this.transformMatrix[0][3],
            y: this.transformMatrix[1][3],
            z: this.transformMatrix[2][3]
        };
    }
    
    // ========== COORDINATE CONVERSION ==========
    
    localToWorld(localPoint) {
        if (!this.transformMatrix) {
            this.updateTransformMatrix();
        }
        
        const x = localPoint.x * this.transformMatrix[0][0] +
                  localPoint.y * this.transformMatrix[0][1] +
                  localPoint.z * this.transformMatrix[0][2] +
                  this.transformMatrix[0][3];
        
        const y = localPoint.x * this.transformMatrix[1][0] +
                  localPoint.y * this.transformMatrix[1][1] +
                  localPoint.z * this.transformMatrix[1][2] +
                  this.transformMatrix[1][3];
        
        const z = localPoint.x * this.transformMatrix[2][0] +
                  localPoint.y * this.transformMatrix[2][1] +
                  localPoint.z * this.transformMatrix[2][2] +
                  this.transformMatrix[2][3];
        
        return { x, y, z };
    }
    
    worldToLocal(worldPoint) {
        if (!this.transformMatrix) {
            this.updateTransformMatrix();
        }
        
        // حساب المصفوفة المعكوسة
        const invMatrix = this.invertMatrix(this.transformMatrix);
        
        const x = worldPoint.x * invMatrix[0][0] +
                  worldPoint.y * invMatrix[0][1] +
                  worldPoint.z * invMatrix[0][2] +
                  invMatrix[0][3];
        
        const y = worldPoint.x * invMatrix[1][0] +
                  worldPoint.y * invMatrix[1][1] +
                  worldPoint.z * invMatrix[1][2] +
                  invMatrix[1][3];
        
        const z = worldPoint.x * invMatrix[2][0] +
                  worldPoint.y * invMatrix[2][1] +
                  worldPoint.z * invMatrix[2][2] +
                  invMatrix[2][3];
        
        return { x, y, z };
    }
    
    invertMatrix(matrix) {
        // مصفوفة 4x4
        const m = matrix;
        
        const inv = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 1]
        ];
        
        // حساب المحدد (simplified for affine)
        const det = m[0][0] * (m[1][1] * m[2][2] - m[2][1] * m[1][2]) -
                   m[0][1] * (m[1][0] * m[2][2] - m[2][0] * m[1][2]) +
                   m[0][2] * (m[1][0] * m[2][1] - m[2][0] * m[1][1]);
        
        if (det === 0) return matrix;
        
        const invDet = 1 / det;
        
        inv[0][0] = (m[1][1] * m[2][2] - m[2][1] * m[1][2]) * invDet;
        inv[0][1] = (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet;
        inv[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet;
        inv[0][3] = -(inv[0][0] * m[0][3] + inv[0][1] * m[1][3] + inv[0][2] * m[2][3]);
        
        inv[1][0] = (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet;
        inv[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet;
        inv[1][2] = (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invDet;
        inv[1][3] = -(inv[1][0] * m[0][3] + inv[1][1] * m[1][3] + inv[1][2] * m[2][3]);
        
        inv[2][0] = (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet;
        inv[2][1] = (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invDet;
        inv[2][2] = (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet;
        inv[2][3] = -(inv[2][0] * m[0][3] + inv[2][1] * m[1][3] + inv[2][2] * m[2][3]);
        
        return inv;
    }
    
    // ========== GCP (Ground Control Points) ==========
    
    addGCP(imagePoint, realPoint) {
        this.gcps.push({
            imagePoint: { ...imagePoint },
            realPoint: { ...realPoint },
            residual: null,
            id: `gcp_${Date.now()}_${this.gcps.length}`
        });
        
        console.log(`📌 GCP added: ${this.gcps.length} total points`);
        return this.gcps.length;
    }
    
    calculateTransform() {
        if (this.gcps.length < 3) {
            console.warn('Need at least 3 GCPs for transformation');
            return null;
        }
        
        // استخدام طريقة المربعات الصغرى
        const A = [];
        const B = [];
        
        for (const gcp of this.gcps) {
            const ix = gcp.imagePoint.x;
            const iy = gcp.imagePoint.y;
            const rx = gcp.realPoint.x;
            const ry = gcp.realPoint.y;
            
            if (this.transformationType === 'affine') {
                // Affine: 6 parameters
                A.push([ix, iy, 1, 0, 0, 0]);
                A.push([0, 0, 0, ix, iy, 1]);
                B.push(rx, ry);
            } else if (this.transformationType === 'similarity') {
                // Similarity: 4 parameters
                A.push([ix, -iy, 1, 0]);
                A.push([iy, ix, 0, 1]);
                B.push(rx, ry);
            }
        }
        
        // حل المعادلات
        const params = this.solveLeastSquares(A, B);
        
        // بناء مصفوفة التحويل
        if (this.transformationType === 'affine') {
            this.transformMatrix = [
                [params[0], params[1], 0, params[2]],
                [params[3], params[4], 0, params[5]],
                [0, 0, this.scale, this.origin.z],
                [0, 0, 0, 1]
            ];
        } else if (this.transformationType === 'similarity') {
            this.transformMatrix = [
                [params[0], -params[1], 0, params[2]],
                [params[1], params[0], 0, params[3]],
                [0, 0, this.scale, this.origin.z],
                [0, 0, 0, 1]
            ];
        }
        
        // حساب الـ residuals
        this.calculateResiduals();
        
        console.log('✅ Transformation calculated');
        return this.transformMatrix;
    }
    
    solveLeastSquares(A, B) {
        // ATA * x = ATB
        const AT = this.transpose(A);
        const ATA = this.multiply(AT, A);
        const ATB = this.multiplyVector(AT, B);
        
        // Gaussian elimination
        return this.gaussianElimination(ATA, ATB);
    }
    
    transpose(matrix) {
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
    
    multiply(A, B) {
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
    
    multiplyVector(A, v) {
        const rows = A.length;
        const cols = A[0].length;
        const result = Array(rows).fill(0);
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result[i] += A[i][j] * v[j];
            }
        }
        
        return result;
    }
    
    gaussianElimination(A, b) {
        const n = A.length;
        const Aug = A.map((row, i) => [...row, b[i]]);
        
        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(Aug[k][i]) > Math.abs(Aug[maxRow][i])) {
                    maxRow = k;
                }
            }
            
            // Swap
            [Aug[i], Aug[maxRow]] = [Aug[maxRow], Aug[i]];
            
            // Normalize
            const pivot = Aug[i][i];
            for (let j = i; j <= n; j++) {
                Aug[i][j] /= pivot;
            }
            
            // Eliminate
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = Aug[k][i];
                    for (let j = i; j <= n; j++) {
                        Aug[k][j] -= factor * Aug[i][j];
                    }
                }
            }
        }
        
        return Aug.map(row => row[n]);
    }
    
    calculateResiduals() {
        for (const gcp of this.gcps) {
            const transformed = this.localToWorld(gcp.imagePoint);
            const dx = transformed.x - gcp.realPoint.x;
            const dy = transformed.y - gcp.realPoint.y;
            const dz = transformed.z - gcp.realPoint.z;
            
            gcp.residual = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
    }
    
    getCalibrationReport() {
        const residuals = this.gcps.map(g => g.residual).filter(r => r !== null);
        const rms = residuals.length > 0 
            ? Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / residuals.length)
            : Infinity;
        
        return {
            gcpsCount: this.gcps.length,
            transformationType: this.transformationType,
            rmsError: rms,
            maxError: Math.max(...residuals, 0),
            minError: Math.min(...residuals, Infinity),
            residuals: residuals,
            transformMatrix: this.transformMatrix
        };
    }
    
    // ========== PROJECTIONS ==========
    
    localToUTM(localPoint) {
        // تحويل مبسط من local إلى UTM
        const world = this.localToWorld(localPoint);
        
        // إضافة منطقة UTM وتحويل خطوط الطول/العرض (تبسيط)
        return {
            easting: world.x + this.utmZone * 100000,
            northing: world.y + (this.utmHemisphere === 'N' ? 0 : 10000000),
            zone: this.utmZone,
            hemisphere: this.utmHemisphere
        };
    }
    
    localToGPS(localPoint) {
        // تحويل مبسط من local إلى GPS
        const world = this.localToWorld(localPoint);
        
        // معاملات التحويل (تبسيط - في الواقع تحتاج إلى datum تحويل)
        const metersPerDegree = 111320;
        
        return {
            latitude: world.y / metersPerDegree,
            longitude: world.x / (metersPerDegree * Math.cos(this.origin.y * Math.PI / 180)),
            altitude: world.z
        };
    }
    
    localToCAD(localPoint) {
        // تحويل إلى إحداثيات CAD
        return this.localToWorld(localPoint);
    }
    
    // ========== DISTANCE CALCULATIONS ==========
    
    distanceBetween(pointA, pointB) {
        const worldA = this.localToWorld(pointA);
        const worldB = this.localToWorld(pointB);
        
        const dx = worldB.x - worldA.x;
        const dy = worldB.y - worldA.y;
        const dz = worldB.z - worldA.z;
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    horizontalDistance(pointA, pointB) {
        const worldA = this.localToWorld(pointA);
        const worldB = this.localToWorld(pointB);
        
        const dx = worldB.x - worldA.x;
        const dy = worldB.y - worldA.y;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    verticalDistance(pointA, pointB) {
        const worldA = this.localToWorld(pointA);
        const worldB = this.localToWorld(pointB);
        
        return Math.abs(worldB.z - worldA.z);
    }
    
    // ========== AREA CALCULATIONS ==========
    
    calculateArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        const worldPoints = points.map(p => this.localToWorld(p));
        
        for (let i = 0; i < worldPoints.length; i++) {
            const j = (i + 1) % worldPoints.length;
            area += worldPoints[i].x * worldPoints[j].y;
            area -= worldPoints[j].x * worldPoints[i].y;
        }
        
        return Math.abs(area) / 2;
    }
    
    // ========== EXPORT/IMPORT ==========
    
    exportData() {
        return {
            version: '1.0',
            coordinateSystem: this.coordinateSystem,
            origin: this.origin,
            scale: this.scale,
            rotation: this.rotation,
            transformMatrix: this.transformMatrix,
            gcps: this.gcps,
            transformationType: this.transformationType,
            utmZone: this.utmZone,
            utmHemisphere: this.utmHemisphere,
            lastCalibration: new Date().toISOString()
        };
    }
    
    importData(data) {
        this.coordinateSystem = data.coordinateSystem || 'local';
        this.origin = data.origin || { x: 0, y: 0, z: 0 };
        this.scale = data.scale || 1;
        this.rotation = data.rotation || 0;
        this.transformMatrix = data.transformMatrix || null;
        this.gcps = data.gcps || [];
        this.transformationType = data.transformationType || 'affine';
        this.utmZone = data.utmZone || 36;
        this.utmHemisphere = data.utmHemisphere || 'N';
        
        if (this.transformMatrix) {
            this.extractParametersFromMatrix();
        } else {
            this.updateTransformMatrix();
        }
        
        console.log('📥 GeoReferencing data imported');
        return this;
    }
    
    // ========== UTILITY ==========
    
    isEnabled() {
        return this.transformMatrix !== null && this.gcps.length >= 3;
    }
    
    reset() {
        this.origin = { x: 0, y: 0, z: 0 };
        this.scale = 1;
        this.rotation = 0;
        this.transformMatrix = null;
        this.gcps = [];
        this.updateTransformMatrix();
        console.log('🔄 GeoReferencing reset');
    }
}

export default GeoReferencing;