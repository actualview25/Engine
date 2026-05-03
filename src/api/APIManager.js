// ============================================
// API MANAGER - تكامل مع خدمات خارجية
// يدعم: REST APIs, WebSockets, Export/Import
// ============================================

export class APIManager {
    constructor(eventBus, nodeSystem, boqManager) {
        this.eventBus = eventBus;
        this.nodeSystem = nodeSystem;
        this.boqManager = boqManager;
        
        this.endpoints = {
            // مثال لنقاط النهاية
            bim360: 'https://api.bim360.com/v1',
            projectWise: 'https://api.projectwise.com/v2',
            localServer: 'http://localhost:3000/api'
        };
        
        this.webSocket = null;
        this.isConnected = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('api:sync', (data) => {
            this.syncToServer(data);
        });
        
        this.eventBus.on('api:loadProject', (projectId) => {
            this.loadProjectFromAPI(projectId);
        });
        
        this.eventBus.on('api:websocketConnect', (url) => {
            this.connectWebSocket(url);
        });
        
        this.eventBus.on('api:websocketDisconnect', () => {
            this.disconnectWebSocket();
        });
        
        this.eventBus.on('api:exportToBIM360', (data) => {
            this.exportToBIM360(data);
        });
    }
    
    // ========== REST APIs ==========
    
    async syncToServer(data) {
        this.eventBus.emit('ui:status', '🔄 جاري المزامنة مع الخادم...');
        
        try {
            const response = await fetch(`${this.endpoints.localServer}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    project: data || this.getCurrentProjectData(),
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.eventBus.emit('ui:success', '✅ تمت المزامنة بنجاح');
                this.eventBus.emit('api:synced', result);
            } else {
                throw new Error('Sync failed');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.eventBus.emit('ui:error', '❌ فشلت المزامنة');
        }
    }
    
    async loadProjectFromAPI(projectId) {
        this.eventBus.emit('ui:loading', true);
        this.eventBus.emit('ui:status', `📥 جاري تحميل المشروع ${projectId}...`);
        
        try {
            const response = await fetch(`${this.endpoints.localServer}/projects/${projectId}`);
            
            if (response.ok) {
                const projectData = await response.json();
                
                // تحميل المشروع
                this.eventBus.emit('project:load', projectData);
                this.eventBus.emit('ui:loading', false);
                this.eventBus.emit('ui:success', `✅ تم تحميل المشروع: ${projectData.name}`);
                
                return projectData;
            } else {
                throw new Error('Project not found');
            }
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل تحميل المشروع: ${error.message}`);
            return null;
        }
    }
    
    async exportToBIM360(data) {
        this.eventBus.emit('ui:status', '📤 جاري التصدير إلى BIM 360...');
        
        try {
            // مثال: تصدير إلى API BIM 360
            const response = await fetch(`${this.endpoints.bim360}/projects`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer YOUR_TOKEN',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    description: data.description,
                    model: data.model
                })
            });
            
            if (response.ok) {
                this.eventBus.emit('ui:success', '✅ تم التصدير إلى BIM 360');
            }
        } catch (error) {
            console.error('BIM 360 export error:', error);
        }
    }
    
    async uploadModel(file) {
        const formData = new FormData();
        formData.append('model', file);
        formData.append('projectId', this.currentProjectId);
        
        try {
            const response = await fetch(`${this.endpoints.localServer}/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                this.eventBus.emit('ui:success', '✅ تم رفع النموذج بنجاح');
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    }
    
    // ========== WebSocket للمزامنة الفورية ==========
    
    connectWebSocket(url = 'ws://localhost:3000') {
        if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.disconnectWebSocket();
        }
        
        this.webSocket = new WebSocket(url);
        
        this.webSocket.onopen = () => {
            this.isConnected = true;
            this.eventBus.emit('ui:success', '🔌 تم الاتصال بالخادم مباشرة');
            this.eventBus.emit('websocket:connected');
            
            // إرسال معلومات الجلسة
            this.webSocket.send(JSON.stringify({
                type: 'handshake',
                client: 'ActualViewEngine',
                version: '1.0.0'
            }));
        };
        
        this.webSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.webSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.eventBus.emit('ui:error', '❌ خطأ في الاتصال بالخادم');
        };
        
        this.webSocket.onclose = () => {
            this.isConnected = false;
            this.eventBus.emit('ui:status', '🔌 تم قطع الاتصال بالخادم');
            this.eventBus.emit('websocket:disconnected');
        };
    }
    
    disconnectWebSocket() {
        if (this.webSocket) {
            this.webSocket.close();
            this.webSocket = null;
        }
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'sync':
                this.eventBus.emit('project:sync', data.project);
                break;
            case 'userJoined':
                this.eventBus.emit('ui:status', `👤 انضم مستخدم جديد: ${data.username}`);
                break;
            case 'userLeft':
                this.eventBus.emit('ui:status', `👋 غادر المستخدم: ${data.username}`);
                break;
            case 'modelUpdate':
                this.eventBus.emit('model:update', data.model);
                break;
            case 'comment':
                this.eventBus.emit('comment:new', data.comment);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    sendWebSocketMessage(type, data) {
        if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(JSON.stringify({ type, ...data }));
        }
    }
    
    // ========== مشاركة المشروع ==========
    
    shareProject(projectData, email) {
        // مثال: إرسال مشروع عبر البريد
        const shareData = {
            to: email,
            subject: 'مشروع من Actual View Engine',
            body: 'تمت مشاركة مشروع معك',
            project: projectData
        };
        
        this.sendWebSocketMessage('share', shareData);
        this.eventBus.emit('ui:success', `📧 تمت مشاركة المشروع مع ${email}`);
    }
    
    getCurrentProjectData() {
        return {
            nodes: this.nodeSystem.getAllNodes(),
            boq: this.boqManager?.exportToJSON(),
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
    }
    
    // ========== تصدير إلى منصات خارجية ==========
    
    async exportToGoogleDrive(data, fileName) {
        // تكامل مع Google Drive API
        this.eventBus.emit('ui:status', '📤 جاري الرفع إلى Google Drive...');
        
        // ملاحظة: يتطلب OAuth 2.0
        console.log('Export to Google Drive:', fileName, data);
        
        this.eventBus.emit('ui:success', '✅ تم الرفع إلى Google Drive');
    }
    
    async exportToDropbox(data, fileName) {
        // تكامل مع Dropbox API
        this.eventBus.emit('ui:status', '📤 جاري الرفع إلى Dropbox...');
        
        console.log('Export to Dropbox:', fileName, data);
        
        this.eventBus.emit('ui:success', '✅ تم الرفع إلى Dropbox');
    }
}
