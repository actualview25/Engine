// ============================================
// GEOMETRY UTILS - أدوات معالجة الهندسة
// حساب المسافات، المساحات، الأحجام، والتحويلات الهندسية
// ============================================

import * as THREE from 'three';

export class GeometryUtils {
    constructor() {
        console.log('📐 GeometryUtils initialized');
    }
    
    // ========== DISTANCE CALCULATIONS ==========
    
    static distanceBetween(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    static distance2D(p1, p2) {
        const dx = p1.x - p2.x;
        const dz = p1.z - p2.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    static horizontalDistance(p1, p2) {
        return this.distance2D(p1, p2);
    }
    
    static verticalDistance(p1, p2) {
        return Math.abs(p1.y - p2.y);
    }
    
    // ========== AREA CALCULATIONS ==========
    
    static polygonArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            area += p1.x * p2.z - p2.x * p1.z;
        }
        
        return Math.abs(area) / 2;
    }
    
    static triangleArea(p1, p2, p3) {
        const a = this.distanceBetween(p1, p2);
        const b = this.distanceBetween(p2, p3);
        const c = this.distanceBetween(p3, p1);
        const s = (a + b + c) / 2;
        return Math.sqrt(s * (s - a) * (s - b) * (s - c));
    }
    
    static circleArea(radius) {
        return Math.PI * radius * radius;
    }
    
    static rectangleArea(width, height) {
        return width * height;
    }
    
    // ========== VOLUME CALCULATIONS ==========
    
    static boxVolume(length, width, height) {
        return length * width * height;
    }
    
    static sphereVolume(radius) {
        return (4 / 3) * Math.PI * Math.pow(radius, 3);
    }
    
    static cylinderVolume(radius, height) {
        return Math.PI * radius * radius * height;
    }
    
    static coneVolume(radius, height) {
        return (1 / 3) * Math.PI * radius * radius * height;
    }
    
    static irregularVolume(points, baseHeight, topHeight) {
        // محيط القاعدة
        let baseArea = 0;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            baseArea += p1.x * p2.z - p2.x * p1.z;
        }
        baseArea = Math.abs(baseArea) / 2;
        
        // الحجم (منشور مع سطح علوي متغير)
        const avgHeight = (baseHeight + topHeight) / 2;
        return baseArea * avgHeight;
    }
    
    // ========== ANGLE CALCULATIONS ==========
    
    static angleBetween(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
        
        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
        
        const rad = Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2))));
        return rad * 180 / Math.PI;
    }
    
    static slopePercentage(rise, run) {
        if (run === 0) return Infinity;
        return (rise / run) * 100;
    }
    
    static slopeAngle(rise, run) {
        return Math.atan2(rise, run) * 180 / Math.PI;
    }
    
    // ========== BOUNDING BOX ==========
    
    static computeBoundingBox(points) {
        if (points.length === 0) return null;
        
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            minZ = Math.min(minZ, p.z);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
            maxZ = Math.max(maxZ, p.z);
        }
        
        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ },
            center: {
                x: (minX + maxX) / 2,
                y: (minY + maxY) / 2,
                z: (minZ + maxZ) / 2
            },
            size: {
                x: maxX - minX,
                y: maxY - minY,
                z: maxZ - minZ
            }
        };
    }
    
    static boundingBoxIntersection(box1, box2) {
        return !(box2.min.x > box1.max.x ||
                 box2.max.x < box1.min.x ||
                 box2.min.y > box1.max.y ||
                 box2.max.y < box1.min.y ||
                 box2.min.z > box1.max.z ||
                 box2.max.z < box1.min.z);
    }
    
    static boundingBoxVolume(box) {
        return box.size.x * box.size.y * box.size.z;
    }
    
    // ========== TRANSFORMATIONS ==========
    
    static rotatePoint(point, center, angle) {
        const rad = angle * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        const dx = point.x - center.x;
        const dz = point.z - center.z;
        
        return {
            x: center.x + dx * cos - dz * sin,
            y: point.y,
            z: center.z + dx * sin + dz * cos
        };
    }
    
    static scalePoint(point, center, scale) {
        return {
            x: center.x + (point.x - center.x) * scale,
            y: center.y + (point.y - center.y) * scale,
            z: center.z + (point.z - center.z) * scale
        };
    }
    
    static translatePoint(point, delta) {
        return {
            x: point.x + delta.x,
            y: point.y + delta.y,
            z: point.z + delta.z
        };
    }
    
    // ========== VECTOR OPERATIONS ==========
    
    static normalize(vector) {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
        if (length === 0) return { x: 0, y: 0, z: 0 };
        return {
            x: vector.x / length,
            y: vector.y / length,
            z: vector.z / length
        };
    }
    
    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }
    
    static cross(v1, v2) {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }
    
    static add(v1, v2) {
        return {
            x: v1.x + v2.x,
            y: v1.y + v2.y,
            z: v1.z + v2.z
        };
    }
    
    static subtract(v1, v2) {
        return {
            x: v1.x - v2.x,
            y: v1.y - v2.y,
            z: v1.z - v2.z
        };
    }
    
    static multiply(vector, scalar) {
        return {
            x: vector.x * scalar,
            y: vector.y * scalar,
            z: vector.z * scalar
        };
    }
    
    // ========== LINE OPERATIONS ==========
    
    static lineLength(points) {
        let length = 0;
        for (let i = 0; i < points.length - 1; i++) {
            length += this.distanceBetween(points[i], points[i + 1]);
        }
        return length;
    }
    
    static lineMidPoint(p1, p2) {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            z: (p1.z + p2.z) / 2
        };
    }
    
    static closestPointOnLine(point, lineStart, lineEnd) {
        const lineVec = this.subtract(lineEnd, lineStart);
        const pointVec = this.subtract(point, lineStart);
        
        const t = this.dot(pointVec, lineVec) / this.dot(lineVec, lineVec);
        const clampedT = Math.max(0, Math.min(1, t));
        
        return {
            x: lineStart.x + lineVec.x * clampedT,
            y: lineStart.y + lineVec.y * clampedT,
            z: lineStart.z + lineVec.z * clampedT
        };
    }
    
    static pointToLineDistance(point, lineStart, lineEnd) {
        const closest = this.closestPointOnLine(point, lineStart, lineEnd);
        return this.distanceBetween(point, closest);
    }
    
    // ========== THREE.JS INTEGRATION ==========
    
    static toVector3(point) {
        return new THREE.Vector3(point.x, point.y, point.z);
    }
    
    static fromVector3(vec) {
        return { x: vec.x, y: vec.y, z: vec.z };
    }
    
    static toArray(points) {
        const arr = [];
        for (const p of points) {
            arr.push(p.x, p.y, p.z);
        }
        return arr;
    }
    
    static fromArray(arr) {
        const points = [];
        for (let i = 0; i < arr.length; i += 3) {
            points.push({ x: arr[i], y: arr[i + 1], z: arr[i + 2] });
        }
        return points;
    }
}

export default GeometryUtils;