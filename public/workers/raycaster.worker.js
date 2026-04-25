// Raycaster Web Worker - للحسابات الثقيلة
// يعمل في thread منفصل لتحسين الأداء

self.onmessage = function(e) {
    const { points, origin, direction, threshold } = e.data;
    
    const results = [];
    
    for (const point of points) {
        // حساب أقرب نقطة على الشعاع
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        const dz = point.z - origin.z;
        
        const t = dx * direction.x + dy * direction.y + dz * direction.z;
        
        if (t < 0) continue;
        
        const closestPoint = {
            x: origin.x + direction.x * t,
            y: origin.y + direction.y * t,
            z: origin.z + direction.z * t
        };
        
        const distance = Math.sqrt(
            Math.pow(closestPoint.x - point.x, 2) +
            Math.pow(closestPoint.y - point.y, 2) +
            Math.pow(closestPoint.z - point.z, 2)
        );
        
        if (distance < (threshold || 0.5)) {
            results.push({
                point: point,
                distance: distance,
                t: t
            });
        }
    }
    
    // ترتيب حسب المسافة
    results.sort((a, b) => a.distance - b.distance);
    
    self.postMessage(results);
};