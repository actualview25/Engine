// ============================================
// BIM 360 CONNECTOR - التكامل مع منصة Autodesk BIM 360
// يدعم: المصادقة، استيراد المشاريع، تصدير النماذج، مزامنة التعليقات
// ============================================

export class BIM360Connector {
    constructor(eventBus, config = {}) {
        this.eventBus = eventBus;
        
        // إعدادات الاتصال
        this.config = {
            clientId: config.clientId || '',
            clientSecret: config.clientSecret || '',
            redirectUri: config.redirectUri || window.location.origin + '/callback',
            baseUrl: 'https://developer.api.autodesk.com',
            region: config.region || 'EMEA', // US, EMEA, APAC
            autoRefresh: config.autoRefresh !== false
        };
        
        // حالة الاتصال
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.isAuthenticated = false;
        this.userInfo = null;
        
        // بيانات المشاريع
        this.projects = [];
        this.currentProject = null;
        this.currentFolder = null;
        
        // إعدادات المزامنة
        this.syncInterval = null;
        this.syncEnabled = false;
        
        // الأحداث
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('bim360:connect', (credentials) => {
            this.connect(credentials);
        });
        
        this.eventBus.on('bim360:disconnect', () => {
            this.disconnect();
        });
        
        this.eventBus.on('bim360:sync', () => {
            this.syncWithBIM360();
        });
        
        this.eventBus.on('bim360:export', (data) => {
            this.exportToBIM360(data);
        });
        
        this.eventBus.on('bim360:import', (projectId) => {
            this.importFromBIM360(projectId);
        });
    }
    
    // ========== المصادقة ==========
    
    async connect(credentials) {
        this.eventBus.emit('ui:status', '🔌 جاري الاتصال بـ BIM 360...');
        this.eventBus.emit('ui:loading', true);
        
        try {
            if (credentials.apiKey) {
                // استخدام API Key
                await this.authenticateWithApiKey(credentials.apiKey);
            } else if (credentials.username && credentials.password) {
                // استخدام اسم المستخدم وكلمة المرور (3-legged OAuth)
                await this.authenticateWithPassword(credentials);
            } else {
                // OAuth 2.0
                await this.startOAuthFlow();
            }
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل الاتصال بـ BIM 360: ${error.message}`);
            console.error('BIM 360 connection error:', error);
        }
    }
    
    async authenticateWithApiKey(apiKey) {
        const response = await fetch(`${this.config.baseUrl}/authentication/v1/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                grant_type: 'client_credentials',
                scope: 'data:read data:write bucket:create bucket:read'
            })
        });
        
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        this.isAuthenticated = true;
        
        await this.getUserInfo();
        await this.loadProjects();
        
        this.eventBus.emit('ui:loading', false);
        this.eventBus.emit('ui:success', '✅ تم الاتصال بـ BIM 360 بنجاح');
        this.eventBus.emit('bim360:connected', { user: this.userInfo, projects: this.projects });
        
        if (this.config.autoRefresh) {
            this.startTokenRefresh();
        }
    }
    
    async authenticateWithPassword(credentials) {
        // 3-legged OAuth للمستخدمين
        const response = await fetch(`${this.config.baseUrl}/authentication/v1/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                grant_type: 'password',
                username: credentials.username,
                password: credentials.password,
                scope: 'data:read data:write'
            })
        });
        
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        this.isAuthenticated = true;
        
        await this.getUserInfo();
        await this.loadProjects();
        
        this.eventBus.emit('ui:loading', false);
        this.eventBus.emit('ui:success', '✅ تم تسجيل الدخول إلى BIM 360');
        this.eventBus.emit('bim360:connected', { user: this.userInfo, projects: this.projects });
    }
    
    async startOAuthFlow() {
        // فتح نافذة OAuth
        const authUrl = `${this.config.baseUrl}/authentication/v1/authorize?` +
            `response_type=code&` +
            `client_id=${this.config.clientId}&` +
            `redirect_uri=${encodeURIComponent(this.config.redirectUri)}&` +
            `scope=data:read%20data:write`;
        
        const popup = window.open(authUrl, 'BIM360 Auth', 'width=800,height=600');
        
        // انتظار رد الـ callback
        window.addEventListener('message', async (event) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'bim360_callback') {
                popup?.close();
                await this.exchangeCodeForToken(event.data.code);
            }
        });
    }
    
    async exchangeCodeForToken(code) {
        const response = await fetch(`${this.config.baseUrl}/authentication/v1/gettoken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.config.redirectUri
            })
        });
        
        const data = await response.json();
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        this.isAuthenticated = true;
        
        await this.getUserInfo();
        await this.loadProjects();
        
        this.eventBus.emit('ui:success', '✅ تم الاتصال بـ BIM 360');
        this.eventBus.emit('bim360:connected', { user: this.userInfo, projects: this.projects });
    }
    
    async refreshAccessToken() {
        if (!this.refreshToken) return;
        
        try {
            const response = await fetch(`${this.config.baseUrl}/authentication/v1/refreshtoken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });
            
            const data = await response.json();
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            
            this.eventBus.emit('bim360:tokenRefreshed');
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.isAuthenticated = false;
            this.eventBus.emit('bim360:disconnected', { reason: 'token_expired' });
        }
    }
    
    startTokenRefresh() {
        setInterval(() => {
            if (this.accessToken && Date.now() > this.tokenExpiry - 300000) {
                this.refreshAccessToken();
            }
        }, 60000);
    }
    
    // ========== إدارة المشاريع ==========
    
    async loadProjects() {
        if (!this.isAuthenticated) return;
        
        try {
            const response = await fetch(`${this.config.baseUrl}/project/v1/hubs`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            const hubs = await response.json();
            
            this.projects = [];
            
            for (const hub of hubs.data) {
                const projectsResponse = await fetch(
                    `${this.config.baseUrl}/project/v1/hubs/${hub.id}/projects`,
                    { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
                );
                
                const projects = await projectsResponse.json();
                
                for (const project of projects.data) {
                    this.projects.push({
                        id: project.id,
                        name: project.attributes.name,
                        hubId: hub.id,
                        hubName: hub.attributes.name,
                        createdAt: project.attributes.createdAt,
                        updatedAt: project.attributes.updatedAt,
                        timezone: project.attributes.timezone,
                        metadata: project.attributes.extension?.data || {}
                    });
                }
            }
            
            return this.projects;
        } catch (error) {
            console.error('Load projects error:', error);
            return [];
        }
    }
    
    async getProjectById(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) return project;
        
        try {
            const response = await fetch(`${this.config.baseUrl}/project/v1/projects/${projectId}`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            
            const data = await response.json();
            
            return {
                id: data.data.id,
                name: data.data.attributes.name,
                createdAt: data.data.attributes.createdAt
            };
        } catch (error) {
            console.error('Get project error:', error);
            return null;
        }
    }
    
    async createProject(name, template = 'construction') {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }
        
        const response = await fetch(`${this.config.baseUrl}/project/v1/projects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonapi: { version: '1.0' },
                data: {
                    type: 'projects',
                    attributes: {
                        name: name,
                        projectType: template
                    }
                }
            })
        });
        
        const data = await response.json();
        
        const newProject = {
            id: data.data.id,
            name: data.data.attributes.name,
            createdAt: data.data.attributes.createdAt
        };
        
        this.projects.push(newProject);
        
        this.eventBus.emit('bim360:projectCreated', newProject);
        
        return newProject;
    }
    
    // ========== استيراد وتصدير البيانات ==========
    
    async importFromBIM360(projectId) {
        this.eventBus.emit('ui:loading', true);
        this.eventBus.emit('ui:status', `📥 جاري استيراد المشروع من BIM 360...`);
        
        try {
            const project = await this.getProjectById(projectId);
            if (!project) throw new Error('Project not found');
            
            this.currentProject = project;
            
            // استيراد الملفات من المشروع
            const files = await this.listProjectFiles(projectId);
            
            // تحويل الملفات إلى صيغة المحرك
            const importedData = {
                project: project,
                files: files,
                importedAt: new Date().toISOString()
            };
            
            // البحث عن ملفات IFC و RVT
            const ifcFiles = files.filter(f => f.name.endsWith('.ifc'));
            const rvtFiles = files.filter(f => f.name.endsWith('.rvt'));
            
            if (ifcFiles.length > 0) {
                this.eventBus.emit('ui:status', '🏗️ جاري استيراد ملفات BIM...');
                for (const file of ifcFiles) {
                    await this.downloadAndImportFile(file);
                }
            }
            
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:success', `✅ تم استيراد المشروع: ${project.name}`);
            this.eventBus.emit('bim360:imported', importedData);
            
            return importedData;
            
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل الاستيراد: ${error.message}`);
            throw error;
        }
    }
    
    async listProjectFiles(projectId) {
        const response = await fetch(
            `${this.config.baseUrl}/data/v1/projects/${projectId}/items`,
            { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
        );
        
        const data = await response.json();
        
        return data.data.map(item => ({
            id: item.id,
            name: item.attributes.name,
            type: item.type,
            size: item.attributes.size,
            version: item.attributes.versionNumber,
            createdAt: item.attributes.createTime,
            modifiedAt: item.attributes.lastModifiedTime,
            createdBy: item.relationships?.owner?.data?.id
        }));
    }
    
    async downloadAndImportFile(file) {
        // تحميل الملف من BIM 360
        const downloadUrl = `${this.config.baseUrl}/data/v1/projects/${this.currentProject.id}/items/${file.id}/download`;
        
        const response = await fetch(downloadUrl, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        
        const blob = await response.blob();
        const fileObj = new File([blob], file.name, { type: blob.type });
        
        // إرسال للمعالجة المناسبة حسب نوع الملف
        if (file.name.endsWith('.ifc')) {
            this.eventBus.emit('ifc:import', fileObj);
        } else if (file.name.endsWith('.dxf') || file.name.endsWith('.dwg')) {
            this.eventBus.emit('cad:import', fileObj);
        }
        
        return fileObj;
    }
    
    async exportToBIM360(data) {
        this.eventBus.emit('ui:loading', true);
        this.eventBus.emit('ui:status', '📤 جاري التصدير إلى BIM 360...');
        
        try {
            // إنشاء bucket إذا لم يكن موجوداً
            const bucketKey = `actualview_${Date.now()}`;
            
            await fetch(`${this.config.baseUrl}/oss/v2/buckets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bucketKey: bucketKey,
                    policyKey: 'transient'
                })
            });
            
            // تصدير المشروع كملف JSON
            const projectData = {
                name: data.name || 'Actual View Project',
                nodes: data.nodes || [],
                hotspots: data.hotspots || [],
                boq: data.boq || [],
                timestamp: new Date().toISOString(),
                version: '2.0.0'
            };
            
            const jsonString = JSON.stringify(projectData);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // رفع الملف إلى OSS
            const formData = new FormData();
            formData.append('file', blob, 'project.json');
            
            await fetch(`${this.config.baseUrl}/oss/v2/buckets/${bucketKey}/objects/project.json`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: blob
            });
            
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:success', '✅ تم تصدير المشروع إلى BIM 360');
            this.eventBus.emit('bim360:exported', { bucket: bucketKey });
            
        } catch (error) {
            this.eventBus.emit('ui:loading', false);
            this.eventBus.emit('ui:error', `❌ فشل التصدير: ${error.message}`);
        }
    }
    
   // ========== المزامنة ==========
    
    async syncWithBIM360() {
        if (!this.isAuthenticated || !this.currentProject) {
            this.eventBus.emit('ui:warning', 'الرجاء الاتصال بـ BIM 360 أولاً');
            return;
        }
        
        this.eventBus.emit('ui:status', '🔄 جاري المزامنة مع BIM 360...');
        
        try {
            const files = await this.listProjectFiles(this.currentProject.id);
            const localData = this.getLocalProjectData();
            
            // مقارنة التواريخ
            const remoteModified = files.reduce((latest, f) => 
                new Date(f.modifiedAt) > new Date(latest) ? f.modifiedAt : latest, '1970-01-01');
            
            if (new Date(remoteModified) > new Date(localData.lastSync)) {
                // تحديث من BIM 360
                await this.importFromBIM360(this.currentProject.id);
            } else {
                // تحديث BIM 360 من المحلي
                await this.exportToBIM360(localData);
            }
            
            this.eventBus.emit('ui:success', '✅ تمت المزامنة بنجاح');
            this.eventBus.emit('bim360:synced', { timestamp: new Date().toISOString() });
            
        } catch (error) {
            console.error('Sync error:', error);
            this.eventBus.emit('ui:error', `❌ فشلت المزامنة: ${error.message}`);
        }
    }
    
    getLocalProjectData() {
        return {
            name: localStorage.getItem('project_name') || 'Untitled',
            lastSync: localStorage.getItem('last_sync') || new Date().toISOString(),
            nodes: JSON.parse(localStorage.getItem('project_nodes') || '[]'),
            hotspots: JSON.parse(localStorage.getItem('project_hotspots') || '[]')
        };
    }
    
    startAutoSync(intervalMinutes = 5) {
        this.syncEnabled = true;
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.syncEnabled && this.isAuthenticated) {
                this.syncWithBIM360();
            }
        }, intervalMinutes * 60 * 1000);
        
        this.eventBus.emit('ui:success', `🔄 تم تفعيل المزامنة التلقائية كل ${intervalMinutes} دقيقة`);
    }
    
    stopAutoSync() {
        this.syncEnabled = false;
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.eventBus.emit('ui:status', '⏹️ تم إيقاف المزامنة التلقائية');
    }
    
    // ========== معلومات المستخدم ==========
    
    async getUserInfo() {
        try {
            const response = await fetch(`${this.config.baseUrl}/userprofile/v1/users/@me`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            
            const data = await response.json();
            
            this.userInfo = {
                id: data.userId,
                name: data.userName,
                email: data.email,
                companyId: data.companyId,
                region: data.region
            };
            
            return this.userInfo;
        } catch (error) {
            console.error('Get user info error:', error);
            return null;
        }
    }
    
    disconnect() {
        this.accessToken = null;
        this.refreshToken = null;
        this.isAuthenticated = false;
        this.userInfo = null;
        this.projects = [];
        this.currentProject = null;
        this.stopAutoSync();
        
        this.eventBus.emit('ui:status', '🔌 تم قطع الاتصال بـ BIM 360');
        this.eventBus.emit('bim360:disconnected');
    }
    
    isConnected() {
        return this.isAuthenticated && this.accessToken !== null;
    }
    
    getConnectionStatus() {
        return {
            connected: this.isConnected(),
            user: this.userInfo,
            projects: this.projects.length,
            currentProject: this.currentProject,
            tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null
        };
    }
}