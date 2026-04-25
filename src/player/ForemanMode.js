// ============================================
// FOREMAN MODE - وضعية رئيس العمال
// يدعم: إدارة العمال، توزيع المهام، مراقبة التقدم، تقارير متقدمة
// ============================================

import WorkerMode from './WorkerMode.js';

export class ForemanMode extends WorkerMode {
    constructor(engine = null) {
        super(engine);
        
        this.workerRole = 'foreman';
        
        // إعدادات رئيس العمال
        this.settings = {
            ...this.settings,
            canAssignTasks: true,
            canApproveIssues: true,
            canViewAllWorkers: true,
            canGenerateReports: true,
            maxWorkers: 50,
            reportInterval: 3600000 // 1 hour
        };
        
        // إدارة العمال
        this.workers = new Map(); // workerId -> workerData
        self.workerLocations = new Map();
        self.workerStatus = new Map();
        
        // إدارة الفرق
        self.teams = new Map(); // teamId -> teamData
        
        // تقارير
        self.reports = [];
        self.reportInterval = null;
        
        // الموافقات
        self.pendingApprovals = [];
        
        console.log('👨‍💼 ForemanMode initialized');
    }
    
    // ========== WORKER MANAGEMENT ==========
    
    registerWorker(workerData) {
        const worker = {
            id: workerData.id || this.generateWorkerId(),
            name: workerData.name,
            role: workerData.role || 'general',
            teamId: workerData.teamId || null,
            registeredAt: Date.now(),
            lastActive: Date.now(),
            status: 'offline', // offline, online, busy
            tasks: [],
            performance: {
                tasksCompleted: 0,
                avgCompletionTime: 0,
                issuesReported: 0
            }
        };
        
        this.workers.set(worker.id, worker);
        
        this.notifyListeners('workerRegistered', worker);
        
        if (this.engine && this.engine.eventBus) {
            this.engine.eventBus.emit('foreman:workerRegistered', worker);
        }
        
        return worker.id;
    }
    
    unregisterWorker(workerId) {
        if (this.workers.has(workerId)) {
            const worker = this.workers.get(workerId);
            this.workers.delete(workerId);
            this.workerLocations.delete(workerId);
            this.workerStatus.delete(workerId);
            
            this.notifyListeners('workerUnregistered', worker);
            return true;
        }
        return false;
    }
    
    updateWorkerStatus(workerId, status, location = null) {
        const worker = this.workers.get(workerId);
        if (worker) {
            worker.status = status;
            worker.lastActive = Date.now();
            
            if (location) {
                this.workerLocations.set(workerId, location);
            }
            
            this.workerStatus.set(workerId, { status, lastActive: Date.now() });
            
            this.notifyListeners('workerStatusUpdated', { workerId, status, location });
            return true;
        }
        return false;
    }
    
    getWorker(workerId) {
        return this.workers.get(workerId);
    }
    
    getAllWorkers() {
        return Array.from(this.workers.values());
    }
    
    getWorkersByTeam(teamId) {
        return Array.from(this.workers.values()).filter(w => w.teamId === teamId);
    }
    
    getWorkersByRole(role) {
        return Array.from(this.workers.values()).filter(w => w.role === role);
    }
    
    // ========== TEAM MANAGEMENT ==========
    
    createTeam(teamName, leaderId = null) {
        const team = {
            id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: teamName,
            leaderId: leaderId,
            members: [],
            createdAt: Date.now(),
            tasks: []
        };
        
        this.teams.set(team.id, team);
        
        if (leaderId) {
            this.assignToTeam(leaderId, team.id);
        }
        
        this.notifyListeners('teamCreated', team);
        
        return team.id;
    }
    
    assignToTeam(workerId, teamId) {
        const worker = this.workers.get(workerId);
        const team = this.teams.get(teamId);
        
        if (worker && team) {
            if (worker.teamId) {
                const oldTeam = this.teams.get(worker.teamId);
                if (oldTeam) {
                    oldTeam.members = oldTeam.members.filter(m => m !== workerId);
                }
            }
            
            worker.teamId = teamId;
            team.members.push(workerId);
            
            this.notifyListeners('workerAssigned', { workerId, teamId });
            return true;
        }
        return false;
    }
    
    getTeam(teamId) {
        return this.teams.get(teamId);
    }
    
    getAllTeams() {
        return Array.from(this.teams.values());
    }
    
    // ========== TASK DISTRIBUTION ==========
    
    assignTaskToWorker(workerId, taskData) {
        const worker = this.workers.get(workerId);
        if (!worker) return null;
        
        const task = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            title: taskData.title,
            description: taskData.description,
            category: taskData.category || 'general',
            priority: taskData.priority || 'medium',
            location: taskData.location || null,
            assignedTo: workerId,
            assignedBy: this.workerName,
            assignedAt: Date.now(),
            dueDate: taskData.dueDate || null,
            status: 'pending',
            progress: 0
        };
        
        worker.tasks.push(task.id);
        
        this.notifyListeners('taskAssigned', task);
        
        if (this.engine && this.engine.eventBus) {
            this.engine.eventBus.emit('foreman:taskAssigned', task);
        }
        
        return task;
    }
    
    assignTaskToTeam(teamId, taskData) {
        const team = this.teams.get(teamId);
        if (!team) return null;
        
        const tasks = [];
        for (const memberId of team.members) {
            const task = this.assignTaskToWorker(memberId, taskData);
            if (task) tasks.push(task);
        }
        
        team.tasks.push(...tasks);
        
        this.notifyListeners('teamTasksAssigned', { teamId, tasks });
        
        return tasks;
    }
    
    reassignTask(taskId, newWorkerId) {
        // البحث عن المهمة
        let task = null;
        let oldWorkerId = null;
        
        for (const [workerId, worker] of this.workers) {
            if (worker.tasks.includes(taskId)) {
                task = worker.tasks.find(t => t === taskId);
                oldWorkerId = workerId;
                worker.tasks = worker.tasks.filter(t => t !== taskId);
                break;
            }
        }
        
        if (task && oldWorkerId) {
            const newWorker = this.workers.get(newWorkerId);
            if (newWorker) {
                newWorker.tasks.push(taskId);
                
                this.notifyListeners('taskReassigned', {
                    taskId,
                    fromWorker: oldWorkerId,
                    toWorker: newWorkerId
                });
                
                return true;
            }
        }
        
        return false;
    }
    
    // ========== MONITORING ==========
    
    getWorkerPerformance(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return null;
        
        // حساب الأداء من تاريخ المهام
        const completedTasks = this.completedTasks.filter(t => t.assignedTo === workerId);
        const avgTime = completedTasks.reduce((sum, t) => {
            const duration = t.completedAt - t.assignedAt;
            return sum + duration;
        }, 0) / (completedTasks.length || 1);
        
        return {
            workerId,
            workerName: worker.name,
            tasksCompleted: completedTasks.length,
            avgCompletionTime: avgTime / 1000, // seconds
            pendingTasks: worker.tasks.filter(t => {
                const task = this.findTask(t);
                return task && task.status !== 'completed';
            }).length,
            issuesReported: this.issues.filter(i => i.reportedBy === workerId).length
        };
    }
    
    getTeamPerformance(teamId) {
        const team = this.teams.get(teamId);
        if (!team) return null;
        
        const members = team.members.map(m => this.getWorkerPerformance(m));
        const avgPerformance = members.reduce((sum, m) => sum + (m?.tasksCompleted || 0), 0) / (members.length || 1);
        
        return {
            teamId,
            teamName: team.name,
            memberCount: members.length,
            totalTasksCompleted: members.reduce((sum, m) => sum + (m?.tasksCompleted || 0), 0),
            averageTasksPerMember: avgPerformance,
            members: members
        };
    }
    
    getSiteSummary() {
        const workers = this.getAllWorkers();
        const activeWorkers = workers.filter(w => w.status === 'online');
        
        return {
            totalWorkers: workers.length,
            activeWorkers: activeWorkers.length,
            workersByRole: this.getWorkersByRoleSummary(),
            teamsCount: this.teams.size,
            openIssues: this.getOpenIssues().length,
            pendingTasks: this.activeTasks.length,
            completedTasks: this.completedTasks.length,
            lastUpdated: Date.now()
        };
    }
    
    getWorkersByRoleSummary() {
        const summary = {};
        for (const worker of this.workers.values()) {
            summary[worker.role] = (summary[worker.role] || 0) + 1;
        }
        return summary;
    }
    
    // ========== APPROVALS ==========
    
    submitForApproval(item) {
        const approval = {
            id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: item.type, // issue, task, material, etc.
            itemId: item.id,
            submittedBy: item.submittedBy,
            submittedAt: Date.now(),
            status: 'pending',
            data: item
        };
        
        this.pendingApprovals.push(approval);
        
        this.notifyListeners('approvalSubmitted', approval);
        
        return approval.id;
    }
    
    approveRequest(approvalId, notes = null) {
        const approval = this.pendingApprovals.find(a => a.id === approvalId);
        if (approval) {
            approval.status = 'approved';
            approval.approvedBy = this.workerName;
            approval.approvedAt = Date.now();
            approval.notes = notes;
            
            this.notifyListeners('requestApproved', approval);
            return true;
        }
        return false;
    }
    
    rejectRequest(approvalId, reason = null) {
        const approval = this.pendingApprovals.find(a => a.id === approvalId);
        if (approval) {
            approval.status = 'rejected';
            approval.rejectedBy = this.workerName;
            approval.rejectedAt = Date.now();
            approval.reason = reason;
            
            this.notifyListeners('requestRejected', approval);
            return true;
        }
        return false;
    }
    
    getPendingApprovals() {
        return this.pendingApprovals.filter(a => a.status === 'pending');
    }
    
    // ========== REPORTS ==========
    
    startAutoReporting(interval = this.settings.reportInterval) {
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
        }
        
        this.reportInterval = setInterval(() => {
            this.generateReport();
        }, interval);
        
        console.log(`📊 Auto reporting started (interval: ${interval}ms)`);
    }
    
    stopAutoReporting() {
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
        }
    }
    
    generateReport() {
        const report = {
            id: `report_${Date.now()}`,
            generatedAt: Date.now(),
            generatedBy: this.workerName,
            summary: this.getSiteSummary(),
            workerPerformance: this.getAllWorkers().map(w => this.getWorkerPerformance(w.id)),
            teamPerformance: this.getAllTeams().map(t => this.getTeamPerformance(t.id)),
            openIssues: this.getOpenIssues(),
            pendingTasks: this.getActiveTasks(),
            recentActivities: this.getRecentActivities()
        };
        
        this.reports.push(report);
        
        if (this.reports.length > 50) {
            this.reports.shift();
        }
        
        this.notifyListeners('reportGenerated', report);
        
        if (this.engine && this.engine.eventBus) {
            this.engine.eventBus.emit('foreman:reportGenerated', report);
        }
        
        return report;
    }
    
    getRecentActivities(limit = 20) {
        const activities = [];
        
        // تجميع الأنشطة من المهام المكتملة
        for (const task of this.completedTasks.slice(-limit)) {
            activities.push({
                type: 'task_completed',
                task: task.title,
                worker: task.assignedTo,
                timestamp: task.completedAt
            });
        }
        
        // تجميع من التقارير
        for (const issue of this.issues.slice(-limit)) {
            activities.push({
                type: 'issue_reported',
                issue: issue.title,
                reporter: issue.reportedBy,
                timestamp: issue.reportedAt
            });
        }
        
        return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
    
    exportReport(format = 'json') {
        const report = this.generateReport();
        
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(report);
        }
        
        return report;
    }
    
    convertToCSV(report) {
        let csv = 'Worker,Role,Tasks Completed,Issues Reported\n';
        for (const perf of report.workerPerformance) {
            if (perf) {
                csv += `${perf.workerName},${perf.workerRole || 'N/A'},${perf.tasksCompleted},${perf.issuesReported}\n`;
            }
        }
        return csv;
    }
    
    // ========== NOTIFICATIONS ==========
    
    sendNotificationToWorker(workerId, message, type = 'info') {
        const notification = {
            id: `notif_${Date.now()}`,
            to: workerId,
            from: this.workerName,
            message: message,
            type: type,
            timestamp: Date.now(),
            read: false
        };
        
        this.notifyListeners('notificationSent', notification);
        
        if (this.engine && this.engine.eventBus) {
            this.engine.eventBus.emit('foreman:notification', notification);
        }
        
        return notification;
    }
    
    broadcastToTeam(teamId, message, type = 'info') {
        const team = this.teams.get(teamId);
        if (!team) return [];
        
        const notifications = [];
        for (const memberId of team.members) {
            notifications.push(this.sendNotificationToWorker(memberId, message, type));
        }
        
        return notifications;
    }
    
    // ========== UTILITY ==========
    
    getWorkerLocation(workerId) {
        return this.workerLocations.get(workerId) || null;
    }
    
    getAllWorkerLocations() {
        return Array.from(this.workerLocations.entries()).map(([id, location]) => ({
            workerId: id,
            worker: this.workers.get(id),
            location
        }));
    }
    
    dispose() {
        this.stopAutoReporting();
        super.dispose();
        this.workers.clear();
        this.teams.clear();
        this.workerLocations.clear();
        this.workerStatus.clear();
        this.pendingApprovals = [];
        this.reports = [];
        console.log('♻️ ForemanMode disposed');
    }
}

export default ForemanMode;