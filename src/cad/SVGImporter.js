// ============================================
// SVG IMPORTER - مستورد ملفات SVG
// يحول SVG إلى كائنات Three.js (مسارات، أشكال، نصوص، مجموعات)
// يدعم: paths, circles, rectangles, text, groups, transformations
// ============================================

import * as THREE from 'three';

export class SVGImporter {
    constructor(options = {}) {
        // إعدادات الاستيراد
        this.scale = options.scale || 1;
        this.zOffset = options.zOffset || 0;
        this.defaultColor = options.defaultColor || 0x88aaff;
        this.extrudeDepth = options.extrudeDepth || 0;
        this.extrudeBevel = options.extrudeBevel !== false;
        this.mergeShapes = options.mergeShapes !== false;
        
        // حالة الاستيراد
        this.importedObjects = [];
        this.importedGroups = new Map();
        this.definitions = new Map(); // defs, gradients, symbols
        this.viewBox = null;
        this.dimensions = { width: 0, height: 0 };
        
        // معالجة الأنماط
        this.styleCache = new Map();
        
        // معاينة
        this.previewGroup = null;
        
        console.log('🎨 SVGImporter initialized');
    }
    
    // ========== MAIN IMPORT ==========
    
    async importFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const svgString = event.target.result;
                    const result = this.importFromString(svgString, options);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    importFromString(svgString, options = {}) {
        // دمج الخيارات
        this.scale = options.scale || this.scale;
        this.zOffset = options.zOffset || this.zOffset;
        this.extrudeDepth = options.extrudeDepth || this.extrudeDepth;
        
        // تحميل SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // قراءة viewBox والأبعاد
        this.parseViewBox(svgElement);
        
        // قراءة التعريفات (defs)
        this.parseDefs(svgElement);
        
        // استيراد العناصر
        const elements = this.parseElement(svgElement);
        
        // تجميع النتيجة
        const result = {
            success: true,
            objectCount: this.importedObjects.length,
            objects: this.importedObjects,
            dimensions: this.dimensions,
            viewBox: this.viewBox,
            groups: Array.from(this.importedGroups.keys())
        };
        
        console.log(`✅ SVG Import: ${result.objectCount} objects created`);
        
        return result;
    }
    
    // ========== SVG PARSING ==========
    
    parseViewBox(svgElement) {
        const viewBoxAttr = svgElement.getAttribute('viewBox');
        if (viewBoxAttr) {
            const parts = viewBoxAttr.split(/\s+/).map(Number);
            this.viewBox = {
                x: parts[0],
                y: parts[1],
                width: parts[2],
                height: parts[3]
            };
            this.dimensions = { width: parts[2], height: parts[3] };
        } else {
            const width = parseFloat(svgElement.getAttribute('width')) || 800;
            const height = parseFloat(svgElement.getAttribute('height')) || 600;
            this.dimensions = { width, height };
            this.viewBox = { x: 0, y: 0, width, height };
        }
    }
    
    parseDefs(svgElement) {
        const defsElement = svgElement.querySelector('defs');
        if (!defsElement) return;
        
        // استخراج الـ gradients
        const gradients = defsElement.querySelectorAll('linearGradient, radialGradient');
        gradients.forEach(gradient => {
            const id = gradient.getAttribute('id');
            if (id) {
                this.definitions.set(id, this.parseGradient(gradient));
            }
        });
        
        // استخراج الـ symbols
        const symbols = defsElement.querySelectorAll('symbol');
        symbols.forEach(symbol => {
            const id = symbol.getAttribute('id');
            if (id) {
                this.definitions.set(id, { type: 'symbol', element: symbol });
            }
        });
    }
    
    parseGradient(gradientElement) {
        const type = gradientElement.tagName === 'linearGradient' ? 'linear' : 'radial';
        const stops = [];
        
        const stopElements = gradientElement.querySelectorAll('stop');
        stopElements.forEach(stop => {
            stops.push({
                offset: parseFloat(stop.getAttribute('offset')) / 100,
                color: stop.getAttribute('stop-color') || '#ffffff',
                opacity: parseFloat(stop.getAttribute('stop-opacity')) || 1
            });
        });
        
        return { type, stops };
    }
    
    parseElement(element, parentTransform = null) {
        const elements = [];
        const tagName = element.tagName?.toLowerCase();
        
        // تجميع التحويلات
        const transform = this.combineTransforms(
            element.getAttribute('transform'),
            parentTransform
        );
        
        // معالجة العنصر حسب نوعه
        let threeObject = null;
        
        switch(tagName) {
            case 'svg':
            case 'g':
                // مجموعة - معالجة الأطفال
                const children = element.children;
                for (let i = 0; i < children.length; i++) {
                    const childObjects = this.parseElement(children[i], transform);
                    if (childObjects.length) {
                        elements.push(...childObjects);
                    }
                }
                break;
                
            case 'path':
                threeObject = this.parsePath(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            case 'circle':
                threeObject = this.parseCircle(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            case 'ellipse':
                threeObject = this.parseEllipse(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            case 'rect':
            case 'rectangle':
                threeObject = this.parseRect(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            case 'line':
                threeObject = this.parseLine(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            case 'polyline':
                threeObject = this.parsePolyline(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            case 'polygon':
                threeObject = this.parsePolygon(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            case 'text':
                threeObject = this.parseText(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            case 'use':
                threeObject = this.parseUse(element, transform);
                if (threeObject) elements.push(threeObject);
                break;
                
            default:
                // عنصر غير معروف
                break;
        }
        
        return elements;
    }
    
    // ========== PATH PARSING (الأهم) ==========
    
    parsePath(element, transform) {
        const d = element.getAttribute('d');
        if (!d) return null;
        
        const style = this.parseStyle(element);
        const color = this.getColor(style, 'stroke');
        const fillColor = this.getColor(style, 'fill');
        const fillOpacity = parseFloat(style['fill-opacity']) || 1;
        const strokeWidth = parseFloat(style['stroke-width']) || 1;
        
        // تحويل مسار SVG إلى Three.js
        const shapes = this.svgPathToShapes(d, transform);
        
        if (shapes.length === 0) return null;
        
        // إذا كان هناك تعبئة (fill)
        if (fillColor && fillOpacity > 0 && this.extrudeDepth > 0) {
            // بثق الشكل إلى 3D
            const extruded = this.extrudeShapes(shapes, {
                color: fillColor,
                opacity: fillOpacity,
                depth: this.extrudeDepth
            });
            if (extruded) {
                this.importedObjects.push(extruded);
                return extruded;
            }
        }
        
        // إذا كان مجرد خطوط
        if (color) {
            const lines = this.shapesToLines(shapes, color, strokeWidth);
            lines.forEach(line => {
                this.importedObjects.push(line);
            });
            return lines.length === 1 ? lines[0] : null;
        }
        
        // إذا كان شكلاً مسطحاً
        if (fillColor) {
            const mesh = this.shapesToMesh(shapes, fillColor, fillOpacity);
            if (mesh) {
                this.importedObjects.push(mesh);
                return mesh;
            }
        }
        
        return null;
    }
    
    svgPathToShapes(d, transform) {
        // تحليل مسار SVG إلى مجموعة من المسارات الفرعية
        const shapes = [];
        let currentPath = [];
        
        // محلل مسارات SVG البسيط
        const commands = this.parseSVGPathCommands(d);
        
        for (const cmd of commands) {
            switch(cmd.type) {
                case 'M': // Move to
                    if (currentPath.length > 0) {
                        shapes.push(this.closeShape(currentPath));
                        currentPath = [];
                    }
                    currentPath.push({ x: cmd.x, y: cmd.y });
                    break;
                    
                case 'L': // Line to
                case 'H': // Horizontal line
                case 'V': // Vertical line
                    if (currentPath.length > 0) {
                        let x = cmd.x ?? currentPath[currentPath.length - 1].x;
                        let y = cmd.y ?? currentPath[currentPath.length - 1].y;
                        
                        if (cmd.type === 'H') x = cmd.x;
                        if (cmd.type === 'V') y = cmd.y;
                        
                        currentPath.push({ x, y });
                    }
                    break;
                    
                case 'C': // Cubic bezier
                case 'Q': // Quadratic bezier
                    // تبسيط: تحويل المنحنيات إلى خطوط مستقيمة
                    if (currentPath.length > 0) {
                        currentPath.push({ x: cmd.x, y: cmd.y });
                    }
                    break;
                    
                case 'Z': // Close path
                    if (currentPath.length > 0 && currentPath[0]) {
                        currentPath.push({ 
                            x: currentPath[0].x, 
                            y: currentPath[0].y 
                        });
                        shapes.push(this.closeShape(currentPath));
                        currentPath = [];
                    }
                    break;
            }
        }
        
        if (currentPath.length > 0) {
            shapes.push(this.closeShape(currentPath));
        }
        
        // تطبيق التحويلات
        if (transform) {
            return shapes.map(shape => this.transformShape(shape, transform));
        }
        
        return shapes;
    }
    
    parseSVGPathCommands(d) {
        // محلل بسيط لأوامر SVG
        const commands = [];
        const regex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
        let match;
        
        while ((match = regex.exec(d)) !== null) {
            const type = match[1].toUpperCase();
            const argsStr = match[2].trim();
            
            if (!argsStr) {
                if (type === 'Z') {
                    commands.push({ type: 'Z' });
                }
                continue;
            }
            
            const args = argsStr.split(/[\s,]+/).map(Number);
            
            switch(type) {
                case 'M': // Move to
                case 'L': // Line to
                    for (let i = 0; i < args.length; i += 2) {
                        commands.push({
                            type: type,
                            x: args[i],
                            y: args[i + 1]
                        });
                    }
                    break;
                    
                case 'H': // Horizontal line
                    for (const x of args) {
                        commands.push({ type: 'H', x: x });
                    }
                    break;
                    
                case 'V': // Vertical line
                    for (const y of args) {
                        commands.push({ type: 'V', y: y });
                    }
                    break;
                    
                case 'C': // Cubic bezier
                    for (let i = 0; i < args.length; i += 6) {
                        commands.push({
                            type: 'C',
                            x1: args[i], y1: args[i+1],
                            x2: args[i+2], y2: args[i+3],
                            x: args[i+4], y: args[i+5]
                        });
                    }
                    break;
                    
                case 'Q': // Quadratic bezier
                    for (let i = 0; i < args.length; i += 4) {
                        commands.push({
                            type: 'Q',
                            x1: args[i], y1: args[i+1],
                            x: args[i+2], y: args[i+3]
                        });
                    }
                    break;
            }
        }
        
        return commands;
    }
    
    closeShape(points) {
        if (points.length < 2) return points;
        
        // التحقق مما إذا كان الشكل مغلقاً بالفعل
        const first = points[0];
        const last = points[points.length - 1];
        
        if (first.x !== last.x || first.y !== last.y) {
            points.push({ x: first.x, y: first.y });
        }
        
        return points;
    }
    
    // ========== SHAPE CONVERSION ==========
    
    shapesToMesh(shapes, color, opacity = 1) {
        if (shapes.length === 0) return null;
        
        // تجميع جميع النقاط في شكل واحد
        const allPoints = [];
        for (const shape of shapes) {
            allPoints.push(...shape);
        }
        
        if (allPoints.length < 3) return null;
        
        // إنشاء Shape لـ Three.js
        const shape3D = new THREE.Shape();
        let firstPoint = allPoints[0];
        
        shape3D.moveTo(
            (firstPoint.x - this.viewBox.width/2) * this.scale,
            -(firstPoint.y - this.viewBox.height/2) * this.scale
        );
        
        for (let i = 1; i < allPoints.length; i++) {
            shape3D.lineTo(
                (allPoints[i].x - this.viewBox.width/2) * this.scale,
                -(allPoints[i].y - this.viewBox.height/2) * this.scale
            );
        }
        
        // إنشاء الشكل الهندسي
        const geometry = new THREE.ShapeGeometry(shape3D);
        const material = new THREE.MeshBasicMaterial({
            color: typeof color === 'string' ? this.colorHex(color) : color,
            transparent: opacity < 1,
            opacity: opacity,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = this.zOffset;
        
        return mesh;
    }
    
    shapesToLines(shapes, color, lineWidth = 1) {
        const lines = [];
        
        for (const shape of shapes) {
            if (shape.length < 2) continue;
            
            const points = shape.map(p => new THREE.Vector3(
                (p.x - this.viewBox.width/2) * this.scale,
                -(p.y - this.viewBox.height/2) * this.scale,
                this.zOffset
            ));
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ 
                color: typeof color === 'string' ? this.colorHex(color) : color,
                linewidth: lineWidth
            });
            
            const line = new THREE.Line(geometry, material);
            lines.push(line);
        }
        
        return lines;
    }
    
    extrudeShapes(shapes, options) {
        if (shapes.length === 0 || options.depth <= 0) return null;
        
        const shape3D = new THREE.Shape();
        let firstPoint = shapes[0][0];
        
        shape3D.moveTo(
            (firstPoint.x - this.viewBox.width/2) * this.scale,
            -(firstPoint.y - this.viewBox.height/2) * this.scale
        );
        
        for (let i = 1; i < shapes[0].length; i++) {
            shape3D.lineTo(
                (shapes[0][i].x - this.viewBox.width/2) * this.scale,
                -(shapes[0][i].y - this.viewBox.height/2) * this.scale
            );
        }
        
        const extrudeSettings = {
            steps: 1,
            depth: options.depth * this.scale,
            bevelEnabled: this.extrudeBevel,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 3
        };
        
        const geometry = new THREE.ExtrudeGeometry(shape3D, extrudeSettings);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            color: typeof options.color === 'string' ? this.colorHex(options.color) : options.color,
            transparent: options.opacity < 1,
            opacity: options.opacity,
            roughness: 0.5,
            metalness: 0.2
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = this.zOffset;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        return mesh;
    }
    
    // ========== ELEMENT PARSERS ==========

parseCircle(element, transform) {
    const cx = parseFloat(element.getAttribute('cx')) || 0;
    const cy = parseFloat(element.getAttribute('cy')) || 0;
    const r = parseFloat(element.getAttribute('r')) || 0;
    
    const style = this.parseStyle(element);
    const color = this.getColor(style, 'stroke');
    const fillColor = this.getColor(style, 'fill');
    const fillOpacity = parseFloat(style['fill-opacity']) || 1;
    const strokeWidth = parseFloat(style['stroke-width']) || 1;
    
    const x = (cx - this.viewBox.width/2) * this.scale;
    const y = -(cy - this.viewBox.height/2) * this.scale;
    const radius = r * this.scale;
    
    let object = null;
    
    if (fillColor && fillOpacity > 0) {
        const geometry = new THREE.CircleGeometry(radius, 32);
        const material = new THREE.MeshBasicMaterial({
            color: this.colorHex(fillColor),
            transparent: fillOpacity < 1,
            opacity: fillOpacity,
            side: THREE.DoubleSide
        });
        object = new THREE.Mesh(geometry, material);
        object.position.set(x, y, this.zOffset);
    } else if (color) {
        const geometry = new THREE.RingGeometry(radius - strokeWidth/2, radius + strokeWidth/2, 64);
        const material = new THREE.MeshBasicMaterial({
            color: this.colorHex(color),
            side: THREE.DoubleSide
        });
        object = new THREE.Mesh(geometry, material);
        object.position.set(x, y, this.zOffset);
    }
    
    if (object && transform) this.applyTransformToObject(object, transform);
    if (object) this.importedObjects.push(object);
    return object;
}

parseEllipse(element, transform) {
    const cx = parseFloat(element.getAttribute('cx')) || 0;
    const cy = parseFloat(element.getAttribute('cy')) || 0;
    const rx = parseFloat(element.getAttribute('rx')) || 0;
    const ry = parseFloat(element.getAttribute('ry')) || 0;
    
    const style = this.parseStyle(element);
    const fillColor = this.getColor(style, 'fill');
    const fillOpacity = parseFloat(style['fill-opacity']) || 1;
    
    const x = (cx - this.viewBox.width/2) * this.scale;
    const y = -(cy - this.viewBox.height/2) * this.scale;
    
    const geometry = new THREE.CircleGeometry(rx * this.scale, 32);
    const material = new THREE.MeshBasicMaterial({
        color: this.colorHex(fillColor || this.defaultColor),
        transparent: fillOpacity < 1,
        opacity: fillOpacity,
        side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, this.zOffset);
    mesh.scale.set(1, ry/rx, 1);
    
    if (transform) this.applyTransformToObject(mesh, transform);
    this.importedObjects.push(mesh);
    return mesh;
}

parseRect(element, transform) {
    const x = parseFloat(element.getAttribute('x')) || 0;
    const y = parseFloat(element.getAttribute('y')) || 0;
    const width = parseFloat(element.getAttribute('width')) || 0;
    const height = parseFloat(element.getAttribute('height')) || 0;
    const rx = parseFloat(element.getAttribute('rx')) || 0;
    
    const style = this.parseStyle(element);
    const fillColor = this.getColor(style, 'fill');
    const fillOpacity = parseFloat(style['fill-opacity']) || 1;
    
    const centerX = (x + width/2 - this.viewBox.width/2) * this.scale;
    const centerY = -(y + height/2 - this.viewBox.height/2) * this.scale;
    const w = width * this.scale;
    const h = height * this.scale;
    
    let mesh;
    
    if (rx > 0) {
        const shape = new THREE.Shape();
        const radius = rx * this.scale;
        const x1 = -w/2, x2 = w/2, y1 = -h/2, y2 = h/2;
        
        shape.moveTo(x1 + radius, y1);
        shape.lineTo(x2 - radius, y1);
        shape.quadraticCurveTo(x2, y1, x2, y1 + radius);
        shape.lineTo(x2, y2 - radius);
        shape.quadraticCurveTo(x2, y2, x2 - radius, y2);
        shape.lineTo(x1 + radius, y2);
        shape.quadraticCurveTo(x1, y2, x1, y2 - radius);
        shape.lineTo(x1, y1 + radius);
        shape.quadraticCurveTo(x1, y1, x1 + radius, y1);
        
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color: this.colorHex(fillColor || this.defaultColor),
            side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(geometry, material);
    } else {
        const geometry = new THREE.PlaneGeometry(w, h);
        const material = new THREE.MeshBasicMaterial({
            color: this.colorHex(fillColor || this.defaultColor),
            side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(geometry, material);
    }
    
    mesh.position.set(centerX, centerY, this.zOffset);
    if (transform) this.applyTransformToObject(mesh, transform);
    this.importedObjects.push(mesh);
    return mesh;
}

parseLine(element, transform) {
    const x1 = parseFloat(element.getAttribute('x1')) || 0;
    const y1 = parseFloat(element.getAttribute('y1')) || 0;
    const x2 = parseFloat(element.getAttribute('x2')) || 0;
    const y2 = parseFloat(element.getAttribute('y2')) || 0;
    
    const style = this.parseStyle(element);
    const color = this.getColor(style, 'stroke');
    const strokeWidth = parseFloat(style['stroke-width']) || 1;
    
    const p1 = new THREE.Vector3(
        (x1 - this.viewBox.width/2) * this.scale,
        -(y1 - this.viewBox.height/2) * this.scale,
        this.zOffset
    );
    const p2 = new THREE.Vector3(
        (x2 - this.viewBox.width/2) * this.scale,
        -(y2 - this.viewBox.height/2) * this.scale,
        this.zOffset
    );
    
    const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const material = new THREE.LineBasicMaterial({ 
        color: this.colorHex(color || this.defaultColor),
        linewidth: strokeWidth
    });
    
    const line = new THREE.Line(geometry, material);
    if (transform) this.applyTransformToObject(line, transform);
    this.importedObjects.push(line);
    return line;
}

parsePolyline(element, transform) {
    const pointsStr = element.getAttribute('points');
    if (!pointsStr) return null;
    
    const points = [];
    const coords = pointsStr.trim().split(/[\s,]+/);
    
    for (let i = 0; i < coords.length; i += 2) {
        points.push(new THREE.Vector3(
            (parseFloat(coords[i]) - this.viewBox.width/2) * this.scale,
            -(parseFloat(coords[i+1]) - this.viewBox.height/2) * this.scale,
            this.zOffset
        ));
    }
    
    const style = this.parseStyle(element);
    const color = this.getColor(style, 'stroke');
    const fillColor = this.getColor(style, 'fill');
    
    let object = null;
    
    if (fillColor) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        points.forEach(p => vertices.push(p.x, p.y, p.z));
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        
        const indices = [];
        for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshBasicMaterial({
            color: this.colorHex(fillColor),
            side: THREE.DoubleSide
        });
        object = new THREE.Mesh(geometry, material);
    } else {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: this.colorHex(color || this.defaultColor)
        });
        object = new THREE.Line(geometry, material);
    }
    
    if (transform) this.applyTransformToObject(object, transform);
    this.importedObjects.push(object);
    return object;
}

parsePolygon(element, transform) {
    return this.parsePolyline(element, transform);
}

parseText(element, transform) {
    const text = element.textContent || '';
    const x = parseFloat(element.getAttribute('x')) || 0;
    const y = parseFloat(element.getAttribute('y')) || 0;
    
    const style = this.parseStyle(element);
    const fillColor = this.getColor(style, 'fill');
    const fontSize = parseFloat(style['font-size']) || 16;
    const fontFamily = style['font-family'] || 'Arial';
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = Math.max(text.length * fontSize * 0.8, 50);
    canvas.height = fontSize * 1.5;
    
    context.fillStyle = fillColor || '#ffffff';
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillText(text, 10, fontSize);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.set(
        (x - this.viewBox.width/2) * this.scale,
        -(y - this.viewBox.height/2) * this.scale,
        this.zOffset + 0.1
    );
    sprite.scale.set(canvas.width / 100 * this.scale, canvas.height / 100 * this.scale, 1);
    
    if (transform) this.applyTransformToObject(sprite, transform);
    this.importedObjects.push(sprite);
    return sprite;
}

parseUse(element, transform) {
    const href = element.getAttribute('href') || element.getAttribute('xlink:href');
    if (!href) return null;
    
    const id = href.replace('#', '');
    const definition = this.definitions.get(id);
    
    if (definition && definition.type === 'symbol') {
        return this.parseElement(definition.element, transform);
    }
    return null;
}

// ========== STYLE PARSING ==========

parseStyle(element) {
    const style = {};
    
    const fill = element.getAttribute('fill');
    const stroke = element.getAttribute('stroke');
    const strokeWidth = element.getAttribute('stroke-width');
    const fillOpacity = element.getAttribute('fill-opacity');
    const strokeOpacity = element.getAttribute('stroke-opacity');
    
    if (fill && fill !== 'none') style.fill = fill;
    if (stroke && stroke !== 'none') style.stroke = stroke;
    if (strokeWidth) style['stroke-width'] = strokeWidth;
    if (fillOpacity) style['fill-opacity'] = fillOpacity;
    if (strokeOpacity) style['stroke-opacity'] = strokeOpacity;
    
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
        const parts = styleAttr.split(';');
        for (const part of parts) {
            const [key, value] = part.split(':');
            if (key && value) style[key.trim()] = value.trim();
        }
    }
    
    const className = element.getAttribute('class');
    if (className && this.styleCache.has(className)) {
        Object.assign(style, this.styleCache.get(className));
    }
    
    return style;
}

getColor(style, type) {
    let color = style[type];
    if (color === 'none') return null;
    if (!color) return type === 'fill' ? null : this.defaultColor;
    
    if (color.startsWith('url(')) {
        const id = color.match(/url\(#([^)]+)\)/)?.[1];
        const gradient = this.definitions.get(id);
        if (gradient && gradient.stops) color = gradient.stops[0]?.color || '#ffffff';
    }
    
    return color;
}

// ========== TRANSFORMATIONS ==========

combineTransforms(transformAttr, parentTransform) {
    let transform = null;
    if (transformAttr) transform = this.parseTransform(transformAttr);
    if (parentTransform) {
        if (transform) transform = this.composeTransforms(parentTransform, transform);
        else transform = parentTransform;
    }
    return transform;
}

parseTransform(transformStr) {
    if (!transformStr) return null;
    
    const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    
    const matrixMatch = transformStr.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
        const values = matrixMatch[1].split(',').map(Number);
        matrix.a = values[0]; matrix.b = values[1];
        matrix.c = values[2]; matrix.d = values[3];
        matrix.e = values[4]; matrix.f = values[5];
        return matrix;
    }
    
    const translateMatch = transformStr.match(/translate\(([^)]+)\)/);
    if (translateMatch) {
        const values = translateMatch[1].split(',').map(Number);
        matrix.e = values[0] * this.scale;
        matrix.f = -values[1] * this.scale;
        return matrix;
    }
    
    const scaleMatch = transformStr.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
        const values = scaleMatch[1].split(',').map(Number);
        matrix.a = values[0];
        matrix.d = values.length > 1 ? values[1] : values[0];
        return matrix;
    }
    
    const rotateMatch = transformStr.match(/rotate\(([^)]+)\)/);
    if (rotateMatch) {
        const values = rotateMatch[1].split(',').map(Number);
        const angle = values[0] * Math.PI / 180;
        matrix.a = Math.cos(angle);
        matrix.b = Math.sin(angle);
        matrix.c = -Math.sin(angle);
        matrix.d = Math.cos(angle);
        
        if (values[1] !== undefined) {
            const cx = (values[1] - this.viewBox.width/2) * this.scale;
            const cy = -(values[2] - this.viewBox.height/2) * this.scale;
            matrix.e = cx - (cx * matrix.a + cy * matrix.c);
            matrix.f = cy - (cx * matrix.b + cy * matrix.d);
        }
        return matrix;
    }
    
    return matrix;
}

composeTransforms(t1, t2) {
    return {
        a: t1.a * t2.a + t1.c * t2.b,
        b: t1.b * t2.a + t1.d * t2.b,
        c: t1.a * t2.c + t1.c * t2.d,
        d: t1.b * t2.c + t1.d * t2.d,
        e: t1.a * t2.e + t1.c * t2.f + t1.e,
        f: t1.b * t2.e + t1.d * t2.f + t1.f
    };
}

transformShape(shape, transform) {
    if (!transform) return shape;
    return shape.map(point => ({
        x: point.x * transform.a + point.y * transform.c + transform.e,
        y: point.x * transform.b + point.y * transform.d + transform.f
    }));
}

applyTransformToObject(object, transform) {
    if (!transform) return;
    const matrix = new THREE.Matrix4().set(
        transform.a, transform.c, 0, transform.e,
        transform.b, transform.d, 0, transform.f,
        0, 0, 1, 0, 0, 0, 0, 1
    );
    object.applyMatrix4(matrix);
}

// ========== UTILITY ==========

colorHex(color) {
    if (typeof color === 'number') return color;
    if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (match) return (parseInt(match[0]) << 16) | (parseInt(match[1]) << 8) | parseInt(match[2]);
    }
    if (color.startsWith('#')) return parseInt(color.slice(1), 16);
    
    const namedColors = {
        'black': 0x000000, 'white': 0xffffff, 'red': 0xff0000,
        'green': 0x00ff00, 'blue': 0x0000ff, 'yellow': 0xffff00
    };
    return namedColors[color.toLowerCase()] || this.defaultColor;
}

registerStyle(className, style) {
    this.styleCache.set(className, style);
}

createPreview(objects, color = 0x44aaff) {
    if (this.previewGroup) this.clearPreview();
    this.previewGroup = new THREE.Group();
    for (const obj of objects) {
        if (obj.material) {
            obj.userData.originalColor = obj.material.color;
            obj.material.color.setHex(color);
        }
        this.previewGroup.add(obj);
    }
    return this.previewGroup;
}

clearPreview() {
    if (this.previewGroup) {
        this.previewGroup.children.forEach(child => {
            if (child.userData.originalColor && child.material) {
                child.material.color = child.userData.originalColor;
            }
        });
        this.previewGroup.clear();
        this.previewGroup = null;
    }
}

getBoundingBox() {
    const bbox = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
    for (const obj of this.importedObjects) {
        if (obj.geometry && obj.geometry.boundingBox) {
            obj.geometry.computeBoundingBox();
            const box = obj.geometry.boundingBox;
            bbox.min.x = Math.min(bbox.min.x, box.min.x + obj.position.x);
            bbox.min.y = Math.min(bbox.min.y, box.min.y + obj.position.y);
            bbox.max.x = Math.max(bbox.max.x, box.max.x + obj.position.x);
            bbox.max.y = Math.max(bbox.max.y, box.max.y + obj.position.y);
        }
    }
    return bbox;
}

dispose() {
    for (const obj of this.importedObjects) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        if (obj.texture) obj.texture.dispose();
    }
    this.importedObjects = [];
    this.importedGroups.clear();
    this.definitions.clear();
    this.styleCache.clear();
    this.clearPreview();
}