// ============================================
// WORKER MODE - وضعية العامل الأساسية
// يدعم: تصفح المشروع، إضافة ملاحظات، تتبع المهام، الإبلاغ عن المشاكل
// ============================================

export class WorkerMode {
    constructor(engine = null) {
        this.engine = engine;
        
        // حالة العامل
        this.workerId = this.generateWorkerId();
        this.workerName = null;
        this.workerRole = 'general'; // general, electrician, plumber, carpenter, etc.
        
        // إعدادات وضع العامل
        this.settings = {
            enableNavigation: true,
            enableMarkers: true,
            enableNotes: true,
            enableIssueReporting: true,
            enableTaskTracking: true,
            showOtherWorkers: true,
            maxMarkerDistance: 50,
            autoSaveInterval: 30000 // 30 seconds
        };
        
        // بيانات العامل
        this.currentLocation = { x: 0, y: 0, z: 0 };
        self.currentView = null;
        self.activeTasks = [];
        self.completedTasks = [];
        self.notes = [];
        self.issues = [];
        self.markers = [];
        
        // إحصائيات
        this.stats = {
            tasksCompleted: 0,
            issuesReported: 0,
            notesAdded: 0,
            timeOnSite: 0,
            lastActive: Date.now()
        };
        
        // الموقتات
        this.autoSaveInterval = null;
        self.locationUpdateInterval = null;
        
        // أحداث
        this.listeners = new Map();
        
        console.log('👷 WorkerMode initialized');
    }
    
    // ========== INITIALIZATION ==========
    
    initialize(workerName, role = 'general') {
        this.workerName = workerName;
        this.workerRole = role;
        
        this.startSession();
        this.startAutoSave();
        
        console.log(`👷 Worker ${workerName} (${role}) initialized`);
        this.notifyListeners('initialized', { workerName, role });
        
        return this;
    }
    
    startSession() {
        this.stats.sessionStart = Date.now();
        this.stats.lastActive = this.stats.sessionStart;
        
        this.locationUpdateInterval = setInterval(() => {
            this.updateLocation();
        }, 1000);
        
        this.notifyListeners('sessionStarted', { startTime: this.stats.sessionStart });
    }
    
    endSession() {
        if (this.locationUpdateInterval) {
            clearInterval(this.locationUpdateInterval);
            this.locationUpdateInterval = null;
        }
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        this.stats.timeOnSite = (Date.now() - this.stats.sessionStart) / 1000;
        this.saveSessionData();
        
        this.notifyListeners('sessionEnded', this.getSessionSummary());
        
        console.log(`👷 Worker session ended. Time on site: ${this.stats.timeOnSite}s`);
    }
    
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.settings.autoSaveInterval > 0) {
                this.saveWorkerData();
            }
        }, this.settings.autoSaveInterval);
    }
    
    // ========== TASK MANAGEMENT ==========
    
    assignTask(task) {
        const newTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            title: task.title,
            description: task.description,
            category: task.category || 'general',
            priority: task.priority || 'medium', // low, medium, high, critical
            location: task.location || null,
            assignedAt: Date.now(),
            dueDate: task.dueDate || null,
            status: 'pending',
            progress: 0,
            notes: []
        };
        
        this.activeTasks.push(newTask);
        
        this.notifyListeners('taskAssigned', newTask);
        
        return newTask.id;
    }
    
    startTask(taskId) {
        const task = this.findTask(taskId);
        if (task && task.status === 'pending') {
            task.status = 'in_progress';
            task.startedAt = Date.now();
            
            this.notifyListeners('taskStarted', task);
            return true;
        }
        return false;
    }
    
    updateTaskProgress(taskId, progress, note = null) {
        const task = this.findTask(taskId);
        if (task && task.status === 'in_progress') {
            task.progress = Math.min(100, Math.max(0, progress));
            
            if (note) {
                task.notes.push({
                    text: note,
                    timestamp: Date.now(),
                    progress: progress
                });
            }
            
            if (task.progress >= 100) {
                this.completeTask(taskId);
            }
            
            this.notifyListeners('taskProgress', { taskId, progress, note });
            return true;
        }
        return false;
    }
    
    completeTask(taskId, completionNote = null) {
        const index = this.activeTasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            const task = this.activeTasks[index];
            task.status = 'completed';
            task.completedAt = Date.now();
            task.completionNote = completionNote;
            
            this.activeTasks.splice(index, 1);
            this.completedTasks.push(task);
            this.stats.tasksCompleted++;
            
            this.notifyListeners('taskCompleted', task);
            return true;
        }
        return false;
    }
    
    findTask(taskId) {
        return this.activeTasks.find(t => t.id === taskId) ||
               this.completedTasks.find(t => t.id === taskId);
    }
    
    getActiveTasks() {
        return [...this.activeTasks];
    }
    
    getTasksByPriority(priority) {
        return this.activeTasks.filter(t => t.priority === priority);
    }
    
    // ========== NOTES MANAGEMENT ==========
    
    addNote(note, location = null, category = 'general') {
        const newNote = {
            id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            text: note,
            category: category,
            location: location || this.currentLocation,
            createdAt: Date.now(),
            createdBy: this.workerName,
            attachments: []
        };
        
        this.notes.push(newNote);
        this.stats.notesAdded++;
        
        this.notifyListeners('noteAdded', newNote);
        
        return newNote.id;
    }
    
    addNoteWithAttachment(note, file, location = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newNote = {
                    id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    text: note,
                    category: 'attachment',
                    location: location || this.currentLocation,
                    createdAt: Date.now(),
                    createdBy: this.workerName,
                    attachments: [{
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: e.target.result
                    }]
                };
                
                this.notes.push(newNote);
                this.stats.notesAdded++;
                
                this.notifyListeners('noteAdded', newNote);
                resolve(newNote.id);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    getNotesByCategory(category) {
        return this.notes.filter(n => n.category === category);
    }
    
    getRecentNotes(limit = 10) {
        return [...this.notes]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit);
    }
    
    // ========== ISSUE REPORTING ==========
    
    reportIssue(issue, location = null, severity = 'medium') {
        const newIssue = {
            id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            title: issue.title,
            description: issue.description,
            severity: severity, // low, medium, high, critical
            location: location || this.currentLocation,
            reportedAt: Date.now(),
            reportedBy: this.workerName,
            status: 'open', // open, in_progress, resolved, closed
            assignedTo: null,
            resolution: null,
            photos: issue.photos || []
        };
        
        this.issues.push(newIssue);
        this.stats.issuesReported++;
        
        this.notifyListeners('issueReported', newIssue);
        
        // إشعار المسؤولين (إذا كان متاحاً)
        if (this.engine && this.engine.eventBus) {
            this.engine.eventBus.emit('issue:reported', newIssue);
        }
        
        return newIssue.id;
    }
    
    updateIssueStatus(issueId, status, resolution = null) {
        const issue = this.issues.find(i => i.id === issueId);
        if (issue) {
            issue.status = status;
            if (resolution) {
                issue.resolution = resolution;
                issue.resolvedAt = Date.now();
            }
            
            this.notifyListeners('issueUpdated', issue);
            return true;
        }
        return false;
    }
    
    getOpenIssues() {
        return this.issues.filter(i => i.status === 'open' || i.status === 'in_progress');
    }
    
    getIssuesBySeverity(severity) {
        return this.issues.filter(i => i.severity === severity);
    }
    
    // ========== MARKER MANAGEMENT ==========
    
    addMarker(position, type, data = {}) {
        const marker = {
            id: `marker_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            position: position,
            type: type, // task, note, issue, material, safety, etc.
            data: data,
            createdBy: this.workerName,
            createdAt: Date.now(),
            expiresAt: data.expiresAt || null
        };
        
        this.markers.push(marker);
        
        this.notifyListeners('markerAdded', marker);
        
        if (this.engine && this.engine.eventBus) {
            this.engine.eventBus.emit('marker:added', marker);
        }
        
        return marker.id;
    }
    
    removeMarker(markerId) {
        const index = this.markers.findIndex(m => m.id === markerId);
        if (index !== -1) {
            const removed = this.markers.splice(index, 1)[0];
            this.notifyListeners('markerRemoved', removed);
            return true;
        }
        return false;
    }
    
    getMarkersInRange(position, radius) {
        return this.markers.filter(marker => {
            const distance = this.calculateDistance(position, marker.position);
            return distance <= radius;
        });
    }
    
    // ========== LOCATION TRACKING ==========
    
    updateLocation() {
        if (this.engine && this.engine.camera) {
            const cameraPos = this.engine.camera.position;
            this.currentLocation = {
                x: cameraPos.x,
                y: cameraPos.y,
                z: cameraPos.z
            };
            
            this.stats.lastActive = Date.now();
            this.notifyListeners('locationUpdated', this.currentLocation);
        }
    }
    
    setLocation(location) {
        this.currentLocation = { ...location };
        this.notifyListeners('locationUpdated', this.currentLocation);
    }
    
    getDistanceTo(location) {
        return this.calculateDistance(this.currentLocation, location);
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // ========== NAVIGATION ==========
    
    navigateToLocation(location, nodeId = null) {
        if (!this.settings.enableNavigation) return false;
        
        if (nodeId && this.engine && this.engine.navigationHandler) {
            this.engine.navigationHandler.navigateToNode(nodeId);
            this.setLocation(location);
            return true;
        }
        
        this.setLocation(location);
        return true;
    }
    
    navigateToTask(taskId) {
        const task = this.findTask(taskId);
        if (task && task.location) {
            return this.navigateToLocation(task.location, task.nodeId);
        }
        return false;
    }
    
    // ========== DATA PERSISTENCE ==========
    
    saveWorkerData() {
        const data = {
            workerId: this.workerId,
            workerName: this.workerName,
            workerRole: this.workerRole,
            settings: this.settings,
            stats: this.stats,
            activeTasks: this.activeTasks,
            completedTasks: this.completedTasks,
            notes: this.notes,
            issues: this.issues,
            markers: this.markers,
            lastSaved: Date.now()
        };
        
        const key = `worker_${this.workerId}_data`;
        localStorage.setItem(key, JSON.stringify(data));
        
        this.notifyListeners('dataSaved', { key, size: JSON.stringify(data).length });
        
        return data;
    }
    
    loadWorkerData(workerId) {
        const key = `worker_${workerId}_data`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
            const data = JSON.parse(saved);
            this.workerId = data.workerId;
            this.workerName = data.workerName;
            this.workerRole = data.workerRole;
            this.settings = data.settings;
            this.stats = data.stats;
            this.activeTasks = data.activeTasks;
            this.completedTasks = data.completedTasks;
            this.notes = data.notes;
            this.issues = data.issues;
            this.markers = data.markers;
            
            this.notifyListeners('dataLoaded', data);
            return true;
        }
        
        return false;
    }
    
    saveSessionData() {
        const sessionData = {
            workerId: this.workerId,
            workerName: this.workerName,
            sessionStart: this.stats.sessionStart,
            sessionEnd: Date.now(),
            duration: this.stats.timeOnSite,
            tasksCompleted: this.stats.tasksCompleted,
            issuesReported: this.stats.issuesReported,
            notesAdded: this.stats.notesAdded
        };
        
        const sessions = JSON.parse(localStorage.getItem('worker_sessions') || '[]');
        sessions.push(sessionData);
        
        if (sessions.length > 100) sessions.shift();
        localStorage.setItem('worker_sessions', JSON.stringify(sessions));
        
        return sessionData;
    }
    
    // ========== SESSION SUMMARY ==========
    
    getSessionSummary() {
        return {
            workerId: this.workerId,
            workerName: this.workerName,
            workerRole: this.workerRole,
            duration: this.stats.timeOnSite,
            tasksCompleted: this.stats.tasksCompleted,
            issuesReported: this.stats.issuesReported,
            notesAdded: this.stats.notesAdded,
            activeTasksCount: this.activeTasks.length,
            completedTasksCount: this.completedTasks.length,
            markersCount: this.markers.length,
            sessionStart: this.stats.sessionStart,
            sessionEnd: Date.now()
        };
    }
    
    // ========== UTILITY ==========
    
    generateWorkerId() {
        return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    setSetting(key, value) {
        if (this.settings.hasOwnProperty(key)) {
            this.settings[key] = value;
            this.notifyListeners('settingChanged', { key, value });
            return true;
        }
        return false;
    }
    
    getSetting(key) {
        return this.settings[key];
    }
    
    getStatistics() {
        return {
            ...this.stats,
            activeTasks: this.activeTasks.length,
            pendingIssues: this.getOpenIssues().length,
            totalMarkers: this.markers.length
        };
    }
    
    // ========== EVENT SYSTEM ==========
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const filtered = this.listeners.get(event).filter(cb => cb !== callback);
            if (filtered.length === 0) {
                this.listeners.delete(event);
            } else {
                this.listeners.set(event, filtered);
            }
        }
    }
    
    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            for (const callback of this.listeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('WorkerMode listener error:', error);
                }
            }
        }
    }
    
    // ========== DISPOSE ==========
    
    dispose() {
        this.endSession();
        this.saveWorkerData();
        this.listeners.clear();
        
        console.log('♻️ WorkerMode disposed');
    }
}

export default WorkerMode;