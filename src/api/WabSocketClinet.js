// ============================================
// WEB SOCKET CLIENT - اتصال مباشر للخادم
// يدعم: مزامنة فورية، غرف، رسائل، عرض مستخدمين نشطين
// ============================================

export class WebSocketClient {
    constructor(eventBus, config = {}) {
        this.eventBus = eventBus;
        
        // إعدادات الاتصال
        this.config = {
            url: config.url || 'ws://localhost:8080',
            reconnect: config.reconnect !== false,
            reconnectInterval: config.reconnectInterval || 3000,
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            heartbeatInterval: config.heartbeatInterval || 30000,
            autoJoinRoom: config.autoJoinRoom || 'global'
        };
        
        // حالة الاتصال
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.rooms = new Set();
        this.userId = null;
        this.userName = null;
        
        // قوائم البيانات
        this.users = new Map(); // userId -> userInfo
        this.messages = [];
        this.callbacks = new Map(); // eventId -> callback
        
        // المؤقتات
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.eventBus.on('ws:connect', (config) => {
            this.connect(config);
        });
        
        this.eventBus.on('ws:disconnect', () => {
            this.disconnect();
        });
        
        this.eventBus.on('ws:send', (data) => {
            this.send(data);
        });
        
        this.eventBus.on('ws:joinRoom', (room) => {
            this.joinRoom(room);
        });
        
        this.eventBus.on('ws:leaveRoom', (room) => {
            this.leaveRoom(room);
        });
        
        this.eventBus.on('ws:sync', (data) => {
            this.syncData(data);
        });
    }
    
    // ========== إدارة الاتصال ==========
    
    connect(config = null) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        
        if (this.isConnected || this.isConnecting) {
            console.log('Already connected or connecting');
            return;
        }
        
        this.isConnecting = true;
        this.eventBus.emit('ui:status', '🔌 جاري الاتصال بالخادم...');
        
        try {
            this.ws = new WebSocket(this.config.url);
            
            this.ws.onopen = () => {
                this.handleOpen();
            };
            
            this.ws.onmessage = (event) => {
                this.handleMessage(event);
            };
            
            this.ws.onerror = (error) => {
                this.handleError(error);
            };
            
            this.ws.onclose = () => {
                this.handleClose();
            };
            
        } catch (error) {
            this.handleError(error);
        }
    }
    
    handleOpen() {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // إرسال ترحيب للخادم
        this.send({
            type: 'handshake',
            client: 'ActualViewEngine',
            version: '2.0.0',
            timestamp: new Date().toISOString()
        });
        
        // الانضمام إلى الغرفة الافتراضية
        if (this.config.autoJoinRoom) {
            this.joinRoom(this.config.autoJoinRoom);
        }
        
        // بدء نبضات القلب
        this.startHeartbeat();
        
        this.eventBus.emit('ui:success', '✅ تم الاتصال بالخادم بنجاح');
        this.eventBus.emit('ws:connected', {
            url: this.config.url,
            timestamp: new Date().toISOString()
        });
        
        console.log('WebSocket connected');
    }
    
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            // معالجة أنواع الرسائل المختلفة
            switch (data.type) {
                case 'handshake_ack':
                    this.handleHandshakeAck(data);
                    break;
                case 'heartbeat':
                    this.handleHeartbeat(data);
                    break;
                case 'message':
                    this.handleChatMessage(data);
                    break;
                case 'sync':
                    this.handleSyncData(data);
                    break;
                case 'users_update':
                    this.handleUsersUpdate(data);
                    break;
                case 'room_joined':
                    this.handleRoomJoined(data);
                    break;
                case 'room_left':
                    this.handleRoomLeft(data);
                    break;
                case 'model_update':
                    this.handleModelUpdate(data);
                    break;
                case 'cursor_update':
                    this.handleCursorUpdate(data);
                    break;
                case 'error':
                    this.handleServerError(data);
                    break;
                default:
                    // توجيه الرسالة حسب التسجيل المسبق
                    if (this.callbacks.has(data.type)) {
                        this.callbacks.get(data.type)(data);
                    } else {
                        this.eventBus.emit(`ws:${data.type}`, data);
                    }
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }
    
    handleError(error) {
        console.error('WebSocket error:', error);
        this.eventBus.emit('ws:error', error);
        this.eventBus.emit('ui:error', '❌ خطأ في اتصال WebSocket');
    }
    
    handleClose() {
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        
        this.eventBus.emit('ui:status', '🔌 تم قطع الاتصال بالخادم');
        this.eventBus.emit('ws:disconnected');
        
        console.log('WebSocket disconnected');
        
        // محاولة إعادة الاتصال
        if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            
            const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
            
            this.eventBus.emit('ui:status', `🔄 محاولة إعادة الاتصال (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
            
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, delay);
        }
    }
    
    // ========== نبضات القلب (Heartbeat) ==========
    
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.send({
                    type: 'heartbeat',
                    timestamp: Date.now()
                });
            }
        }, this.config.heartbeatInterval);
    }
    
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    handleHeartbeat(data) {
        // رد على الـ heartbeat من الخادم
        this.send({
            type: 'heartbeat_ack',
            timestamp: data.timestamp,
            serverTime: Date.now()
        });
    }
    
    handleHandshakeAck(data) {
        this.userId = data.userId;
        this.userName = data.userName;
        
        this.eventBus.emit('ws:authenticated', {
            userId: this.userId,
            userName: this.userName,
            users: data.users
        });
        
        // تحديث قائمة المستخدمين
        if (data.users) {
            for (const user of data.users) {
                this.users.set(user.id, user);
            }
            this.eventBus.emit('ws:usersUpdate', Array.from(this.users.values()));
        }
    }
    
    // ========== إدارة الرسائل ==========
    
    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected, message queued');
            // يمكن إضافة queue للرسائل هنا
        }
    }
    
    sendMessage(message, room = null, to = null) {
        this.send({
            type: 'message',
            room: room,
            to: to,
            content: message,
            timestamp: Date.now(),
            from: this.userId,
            fromName: this.userName
        });
    }
    
    handleChatMessage(data) {
        const message = {
            id: data.id,
            from: data.from,
            fromName: data.fromName,
            content: data.content,
            room: data.room,
            timestamp: data.timestamp,
            isSystem: data.isSystem || false
        };
        
        this.messages.push(message);
        
        // تحديد الحد الأقصى للرسائل المخزنة
        if (this.messages.length > 500) {
            this.messages.shift();
        }
        
        this.eventBus.emit('ws:message', message);
        this.eventBus.emit('ui:status', `💬 ${data.fromName}: ${data.content.substring(0, 50)}`);
    }
    
    // ========== إدارة الغرف ==========
    
    joinRoom(room) {
        if (!room || this.rooms.has(room)) return;
        
        this.send({
            type: 'join_room',
            room: room
        });
    }
    
    leaveRoom(room) {
        if (!this.rooms.has(room)) return;
        
        this.send({
            type: 'leave_room',
            room: room
        });
    }
    
    handleRoomJoined(data) {
        this.rooms.add(data.room);
        this.eventBus.emit('ws:roomJoined', {
            room: data.room,
            users: data.users
        });
        this.eventBus.emit('ui:status', `📢 انضممت إلى الغرفة: ${data.room}`);
    }
    
    handleRoomLeft(data) {
        this.rooms.delete(data.room);
        this.eventBus.emit('ws:roomLeft', { room: data.room });
    }
    
    // ========== مزامنة البيانات ==========
    
    syncData(data) {
        this.send({
            type: 'sync',
            data: data,
            timestamp: Date.now()
        });
    }
    
    handleSyncData(data) {
        this.eventBus.emit('ws:sync', {
            from: data.from,
            data: data.data,
            timestamp: data.timestamp
        });
        
        // مزامنة مع الأنظمة المحلية
        if (data.data.nodes) {
            this.eventBus.emit('project:sync', data.data);
        }
        
        if (data.data.cursor) {
            this.eventBus.emit('cursor:update', data.data.cursor);
        }
    }
    
    // ========== تحديث المشروع التعاوني ==========
    
    sendModelUpdate(modelData) {
        this.send({
            type: 'model_update',
            data: modelData,
            timestamp: Date.now(),
            userId: this.userId
        });
    }
    
    handleModelUpdate(data) {
        this.eventBus.emit('ws:modelUpdate', {
            userId: data.userId,
            data: data.data,
            timestamp: data.timestamp
        });
        
        // تحديث النموذج المحلي
        if (data.data.node) {
            this.eventBus.emit('node:update', data.data.node);
        }
        
        if (data.data.hotspot) {
            this.eventBus.emit('hotspot:update', data.data.hotspot);
        }
    }
    
    sendCursorUpdate(position, target = null) {
        this.send({
            type: 'cursor_update',
            position: position,
            target: target,
            userId: this.userId,
            userName: this.userName,
            timestamp: Date.now()
        });
    }
    
    handleCursorUpdate(data) {
        this.eventBus.emit('ws:cursorUpdate', {
            userId: data.userId,
            userName: data.userName,
            position: data.position,
            target: data.target,
            timestamp: data.timestamp
        });
    }
    
    // ========== إدارة المستخدمين ==========
    
    handleUsersUpdate(data) {
        if (data.joined) {
            this.users.set(data.joined.id, data.joined);
            this.eventBus.emit('ws:userJoined', data.joined);
            this.eventBus.emit('ui:status', `👤 انضم ${data.joined.name} إلى الجلسة`);
        }
        
        if (data.left) {
            this.users.delete(data.left.id);
            this.eventBus.emit('ws:userLeft', data.left);
            this.eventBus.emit('ui:status', `👋 غادر ${data.left.name} الجلسة`);
        }
        
        if (data.users) {
            this.users.clear();
            for (const user of data.users) {
                this.users.set(user.id, user);
            }
            this.eventBus.emit('ws:usersUpdate', Array.from(this.users.values()));
        }
    }
    
    getActiveUsers() {
        return Array.from(this.users.values());
    }
    
    getCurrentUser() {
        return this.userId ? {
            id: this.userId,
            name: this.userName
        } : null;
    }
    
    // ========== معالجة الأخطاء ==========
    
    handleServerError(data) {
        console.error('Server error:', data);
        this.eventBus.emit('ws:serverError', {
            code: data.code,
            message: data.message,
            details: data.details
        });
        this.eventBus.emit('ui:error', `⚠️ خطأ من الخادم: ${data.message}`);
    }
    
    // ========== التسجيل للرسائل المخصصة ==========
    
    on(eventType, callback) {
        this.callbacks.set(eventType, callback);
    }
    
    off(eventType) {
        this.callbacks.delete(eventType);
    }
    
    // ========== الفصل والتنظيف ==========
    
    disconnect() {
        this.config.reconnect = false;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        
        if (this.isConnected) {
            this.send({
                type: 'disconnect',
                userId: this.userId
            });
            
            this.ws.close();
        }
        
        this.stopHeartbeat();
        
        this.isConnected = false;
        this.isConnecting = false;
        this.rooms.clear();
        this.users.clear();
        
        this.eventBus.emit('ui:status', '🔌 تم قطع الاتصال بالخادم');
        this.eventBus.emit('ws:disconnected');
        
        console.log('WebSocket disconnected manually');
    }
    
    // ========== حالة الاتصال ==========
    
    isConnecting() {
        return this.isConnecting;
    }
    
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            connecting: this.isConnecting,
            url: this.config.url,
            userId: this.userId,
            rooms: Array.from(this.rooms),
            usersCount: this.users.size,
            messagesCount: this.messages.length,
            reconnectAttempts: this.reconnectAttempts
        };
    }
    
    getRecentMessages(limit = 50) {
        return this.messages.slice(-limit);
    }
    
    clearMessages() {
        this.messages = [];
    }
}