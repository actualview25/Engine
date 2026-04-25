// ============================================
// PROJECT WISE CONNECTOR - التكامل مع Bentley ProjectWise
// يدعم: المصادقة، استيراد المشاريع، إدارة المستندات، المزامنة
// ============================================

export class ProjectWiseConnector {
    constructor(eventBus, config = {}) {
        this.eventBus = eventBus;
        
        // إعدادات الاتصال
        this.config = {
            serverUrl: config.serverUrl || 'https://projectwise.example.com',
            integrationServer: config.integrationServer || 'https://pw-integration.example.com',
            clientId: config.clientId || '',
            clientSecret: config.clientSecret || '',
            database: config.database || 'Default',
            autoConnect: config.autoConnect || false
        };
        
        // حالة الاتصال
        this.sessionId = null;
        this.accessToken = null;
        this.isAuthenticated = false;
        this.userInfo = null;
        
        // بيانات المشاريع
        this.projects = [];
        this.currentProject = null;
        this.currentFolder = null;
        this.documents = [];
        
        // WebSocket للمزامنة الفورية
        this.ws = null;
        
        this.setupEventListeners();
        
        if (this.config.autoConnect) {
            this.connect();
        }
    }
    
    setupEventListeners() {
        this.eventBus.on('projectwise:connect', (config) => {
            this.connect(config);
        });
        
        this.eventBus.on('projectwise:disconnect', () => {
            this.disconnect();
        });
        
        this.eventBus.on('projectwise:sync', () => {
            this.syncDocuments();
        });
        
        this.eventBus.on('projectwise:import', (projectId) => {
            this.importProject(projectId);
        });
        
        this.eventBus.on('projectwise:export', (data) => {
            this.exportDocument(data);
        });
    }
    
    // ========== المصادقة ==========
    
    async connect(credentials = null) {
        this.eventBus.emit('ui:status', '🔌 جاري الاتصال بـ ProjectWise...');
        this.eventBus.emit('ui:loading', true);
        
        try {
            if (credentials) {
                await this.authenticate(credentials);
            } else if (this.config.clientId) {
                await this.authenticateWithClientCredentials();
            } else {
                await this.authenticateWithSession();
            }
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل الاتصال بـ ProjectWise: ${error.message}`);
            console.error('ProjectWise connection error:', error);
        }
    }
    
    async authenticate(credentials) {
        // مصادقة بأسم المستخدم وكلمة المرور
        const response = await fetch(`${this.config.integrationServer}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: credentials.username,
                password: credentials.password,
                database: this.config.database
            })
        });
        
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        
        this.sessionId = data.sessionId;
        this.accessToken = data.accessToken;
        this.isAuthenticated = true;
        
        await this.getUserInfo();
        await this.loadProjects();
        await this.connectWebSocket();
        
        this.eventBus.emit('ui:loading', false);
        this.eventBus.emit('ui:success', '✅ تم الاتصال بـ ProjectWise بنجاح');
        this.eventBus.emit('projectwise:connected', {
            user: this.userInfo,
            projects: this.projects
        });
    }
    
    async authenticateWithClientCredentials() {
        const response = await fetch(`${this.config.integrationServer}/api/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                grant_type: 'client_credentials'
            })
        });
        
        const data = await response.json();
        this.accessToken = data.access_token;
        this.isAuthenticated = true;
        
        await this.loadProjects();
        
        this.eventBus.emit('ui:loading', false);
        this.eventBus.emit('ui:success', '✅ تم الاتصال بـ ProjectWise');
    }
    
    async authenticateWithSession() {
        // محاولة استخدام session مخزنة
        const savedSession = localStorage.getItem('projectwise_session');
        
        if (savedSession) {
            const session = JSON.parse(savedSession);
            this.sessionId = session.sessionId;
            this.accessToken = session.accessToken;
            this.isAuthenticated = true;
            
            await this.loadProjects();
            
            this.eventBus.emit('ui:success', '✅ تم استعادة جلسة ProjectWise');
        } else {
            throw new Error('No saved session and no credentials provided');
        }
    }
    
    // ========== WebSocket للاتصال المباشر ==========
    
    async connectWebSocket() {
        const wsUrl = this.config.integrationServer.replace('https', 'wss') + '/ws';
        
        this.ws = new WebSocket(`${wsUrl}?session=${this.sessionId}`);
        
        this.ws.onopen = () => {
            console.log('ProjectWise WebSocket connected');
            this.eventBus.emit('projectwise:wsConnected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // محاولة إعادة الاتصال بعد 5 ثوان
            setTimeout(() => {
                if (this.isAuthenticated) {
                    this.connectWebSocket();
                }
            }, 5000);
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'document_update':
                this.eventBus.emit('projectwise:documentUpdated', data.document);
                break;
            case 'document_created':
                this.documents.push(data.document);
                this.eventBus.emit('projectwise:documentCreated', data.document);
                break;
            case 'document_deleted':
                this.documents = this.documents.filter(d => d.id !== data.documentId);
                this.eventBus.emit('projectwise:documentDeleted', data.documentId);
                break;
            case 'comment_added':
                this.eventBus.emit('projectwise:commentAdded', data.comment);
                break;
            case 'sync_request':
                this.syncDocuments();
                break;
        }
    }
    
    // ========== إدارة المشاريع ==========
    
    async loadProjects() {
        if (!this.isAuthenticated) return;
        
        try {
            const response = await fetch(
                `${this.config.integrationServer}/api/projects?database=${encodeURIComponent(this.config.database)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'X-Session-Id': this.sessionId || ''
                    }
                }
            );
            
            const data = await response.json();
            
            this.projects = data.projects.map(project => ({
                id: project.id,
                name: project.name,
                description: project.description,
                path: project.path,
                createdAt: project.createdAt,
                modifiedAt: project.modifiedAt,
                owner: project.owner,
                documentCount: project.documentCount
            }));
            
            return this.projects;
        } catch (error) {
            console.error('Load projects error:', error);
            return [];
        }
    }
    
    async getProjectDetails(projectId) {
        const response = await fetch(
            `${this.config.integrationServer}/api/projects/${projectId}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Session-Id': this.sessionId || ''
                }
            }
        );
        
        const data = await response.json();
        
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            path: data.path,
            createdAt: data.createdAt,
            modifiedAt: data.modifiedAt,
            owner: data.owner,
            documents: data.documents,
            folders: data.folders
        };
    }
    
    // ========== إدارة المستندات ==========
    
    async listDocuments(folderPath = '') {
        if (!this.currentProject) {
            this.eventBus.emit('ui:warning', 'الرجاء اختيار مشروع أولاً');
            return [];
        }
        
        try {
            const response = await fetch(
                `${this.config.integrationServer}/api/documents?` +
                `project=${encodeURIComponent(this.currentProject.id)}&` +
                `folder=${encodeURIComponent(folderPath)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'X-Session-Id': this.sessionId || ''
                    }
                }
            );
            
            const data = await response.json();
            
            this.documents = data.documents.map(doc => ({
                id: doc.id,
                name: doc.name,
                type: doc.type,
                size: doc.size,
                version: doc.version,
                path: doc.path,
                modifiedAt: doc.modifiedAt,
                modifiedBy: doc.modifiedBy,
                thumbnail: doc.thumbnail,
                metadata: doc.metadata
            }));
            
            return this.documents;
        } catch (error) {
            console.error('List documents error:', error);
            return [];
        }
    }
    
    async downloadDocument(documentId) {
        const response = await fetch(
            `${this.config.integrationServer}/api/documents/${documentId}/download`,
            {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Session-Id': this.sessionId || ''
                }
            }
        );
        
        const blob = await response.blob();
        const document = this.documents.find(d => d.id === documentId);
        const file = new File([blob], document?.name || 'document', { type: blob.type });
        
        return file;
    }
    
    async uploadDocument(file, folderPath = '') {
        if (!this.currentProject) {
            throw new Error('No project selected');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', this.currentProject.id);
        formData.append('folder', folderPath);
        
        const response = await fetch(
            `${this.config.integrationServer}/api/documents/upload`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Session-Id': this.sessionId || ''
                },
                body: formData
            }
        );
        
        const data = await response.json();
        
        this.eventBus.emit('projectwise:documentUploaded', data.document);
        this.documents.push(data.document);
        
        return data.document;
    }
    
    async importProject(projectId) {
        this.eventBus.emit('ui:loading', true);
        this.eventBus.emit('ui:status', '📥 جاري استيراد المشروع من ProjectWise...');
        
        try {
            const project = await this.getProjectDetails(projectId);
            this.currentProject = project;
            
            // استيراد المستندات
            const documents = await this.listDocuments();
            
            // البحث عن ملفات CAD و BIM
            const cadFiles = documents.filter(d => 
                d.name.endsWith('.dwg') || 
                d.name.endsWith('.dxf') || 
                d.name.endsWith('.ifc') ||
                d.name.endsWith('.rvt')
            );
            
            for (const doc of cadFiles) {
                const file = await this.downloadDocument(doc.id);
                
                if (doc.name.endsWith('.ifc')) {
                    this.eventBus.emit('ifc:import', file);
                } else if (doc.name.endsWith('.dwg') || doc.name.endsWith('.dxf')) {
                    this.eventBus.emit('cad:import', file);
                }
            }
            
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:success', `✅ تم استيراد المشروع: ${project.name}`);
            this.eventBus.emit('projectwise:imported', { project, documents: cadFiles });
            
            return { project, documents: cadFiles };
            
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل الاستيراد: ${error.message}`);
            throw error;
        }
    }
    
    async exportDocument(data) {
        this.eventBus.emit('ui:loading', true);
        this.eventBus.emit('ui:status', '📤 جاري التصدير إلى ProjectWise...');
        
        try {
            // تصدير المشروع كملف JSON
            const exportData = {
                name: data.name || 'Actual View Export',
                nodes: data.nodes || [],
                hotspots: data.hotspots || [],
                boq: data.boq || [],
                timestamp: new Date().toISOString()
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const file = new File([blob], `${data.name || 'project'}.json`, { type: 'application/json' });
            
            const result = await this.uploadDocument(file, data.folder || '');
            
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:success', '✅ تم تصدير المشروع إلى ProjectWise');
            this.eventBus.emit('projectwise:exported', result);
            
            return result;
            
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل التصدير: ${error.message}`);
            throw error;
        }
    }
    
    // ========== المزامنة ==========
    
    async syncDocuments() {
        if (!this.currentProject) return;
        
        this.eventBus.emit('ui:status', '🔄 جاري المزامنة مع ProjectWise...');
        
        try {
            const remoteDocs = await this.listDocuments();
            const localData = this.getLocalProjectData();
            
            // مقارنة وإضافة المستندات الجديدة
            for (const doc of remoteDocs) {
                if (!localData.documents.find(d => d.id === doc.id)) {
                    // مستند جديد - تحميل واستيراد
                    const file = await this.downloadDocument(doc.id);
                    
                    if (doc.name.endsWith('.ifc')) {
                        this.eventBus.emit('ifc:import', file);
                    } else if (doc.name.endsWith('.dwg')) {
                        this.eventBus.emit('cad:import', file);
                    }
                }
            }
            
            this.eventBus.emit('ui:success', '✅ تمت المزامنة بنجاح');
            this.eventBus.emit('projectwise:synced', { timestamp: new Date().toISOString() });
            
        } catch (error) {
            console.error('Sync error:', error);
            this.eventBus.emit('ui:error', `❌ فشلت المزامنة: ${error.message}`);
        }
    }
    
    getLocalProjectData() {
        return {
            documents: JSON.parse(localStorage.getItem('projectwise_documents') || '[]'),
            lastSync: localStorage.getItem('projectwise_last_sync') || new Date().toISOString()
        };
    }
    
    // ========== معلومات المستخدم ==========
    
    async getUserInfo() {
        try {
            const response = await fetch(
                `${this.config.integrationServer}/api/user/profile`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'X-Session-Id': this.sessionId || ''
                    }
                }
            );
            
            const data = await response.json();
            
            this.userInfo = {
                id: data.id,
                name: data.name,
                email: data.email,
                department: data.department,
                role: data.role,
                permissions: data.permissions
            };
            
            return this.userInfo;
        } catch (error) {
            console.error('Get user info error:', error);
            return null;
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        
        this.sessionId = null;
        this.accessToken = null;
        this.isAuthenticated = false;
        this.userInfo = null;
        this.projects = [];
        this.currentProject = null;
        this.documents = [];
        
        localStorage.removeItem('projectwise_session');
        
        this.eventBus.emit('ui:status', '🔌 تم قطع الاتصال بـ ProjectWise');
        this.eventBus.emit('projectwise:disconnected');
    }
    
    isConnected() {
        return this.isAuthenticated && this.sessionId !== null;
    }
    
    getConnectionStatus() {
        return {
            connected: this.isConnected(),
            user: this.userInfo,
            projects: this.projects.length,
            currentProject: this.currentProject,
            documents: this.documents.length,
            wsConnected: this.ws?.readyState === WebSocket.OPEN
        };
    }
}