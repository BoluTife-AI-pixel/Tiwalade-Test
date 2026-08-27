/**
 * TaskFlow - Todo Application Dashboard Manager
 * Persistent storage with localStorage, state management, statistics calculation, and dynamic rendering.
 */

// Storage key constant
const STORAGE_KEY = 'taskflow_tasks_v1';

// Initial sample seed data for first launch
const INITIAL_SEED_TASKS = [
    {
        id: 'seed-1',
        title: 'Review Q3 Product Roadmap & Milestones',
        description: 'Align design system priorities with engineering capacity for upcoming release sprint.',
        category: 'Work',
        priority: 'high',
        dueDate: getRelativeDateStr(1), // Tomorrow
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
        id: 'seed-2',
        title: 'Schedule Annual Health Checkup & Dental Exam',
        description: 'Call specialist clinic to confirm appointment times for next week.',
        category: 'Health',
        priority: 'medium',
        dueDate: getRelativeDateStr(3),
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
    },
    {
        id: 'seed-3',
        title: 'Finalize Monthly Budget & Investment Allocations',
        description: 'Transfer automated savings to index fund portfolio and clear credit card statements.',
        category: 'Finance',
        priority: 'high',
        dueDate: getRelativeDateStr(0), // Today
        completed: true,
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
        id: 'seed-4',
        title: 'Build Prototype for Glassmorphism Dashboard UI',
        description: 'Complete high-fidelity interactive component layout with dark aesthetics.',
        category: 'Projects',
        priority: 'high',
        dueDate: getRelativeDateStr(0), // Today
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
        id: 'seed-5',
        title: 'Pick up organic groceries for weekend dinner',
        description: 'Fresh basil, extra virgin olive oil, cherry tomatoes, sourdough bread.',
        category: 'Personal',
        priority: 'low',
        dueDate: getRelativeDateStr(2),
        completed: false,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    }
];

// Helper to get relative date ISO YYYY-MM-DD
function getRelativeDateStr(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
}

// Application State
class TaskApp {
    constructor() {
        this.tasks = [];
        this.filterState = {
            status: 'all',          // 'all' | 'active' | 'completed'
            category: 'all',        // 'all' | 'Work' | 'Personal' ...
            priority: 'all',        // 'all' | 'high' | 'medium' | 'low'
            navView: 'all',         // 'all' | 'today' | 'important' | categoryName
            search: '',
            sortBy: 'createdAt-desc'
        };

        this.editingTaskId = null;

        this.initDOMReferences();
        this.bindEvents();
        this.loadTasks();
        this.initHeaderGreeting();
        this.render();
    }

    initDOMReferences() {
        // Stats
        this.elTotalCount = document.getElementById('stat-total-count');
        this.elPendingCount = document.getElementById('stat-pending-count');
        this.elCompletedCount = document.getElementById('stat-completed-count');
        this.elRateText = document.getElementById('stat-rate-text');
        this.elPendingSubtext = document.getElementById('stat-pending-subtext');
        this.elCompletedSubtext = document.getElementById('stat-completed-subtext');
        this.elProgressCircle = document.getElementById('progress-circle');

        // Nav counters
        this.elCountNavAll = document.getElementById('count-nav-all');
        this.elCountNavToday = document.getElementById('count-nav-today');
        this.elCountNavImportant = document.getElementById('count-nav-important');
        this.elCategoryNavList = document.getElementById('category-nav-list');

        // Nav buttons
        this.btnNavAll = document.getElementById('nav-all-tasks');
        this.btnNavToday = document.getElementById('nav-today');
        this.btnNavImportant = document.getElementById('nav-important');

        // Controls & Search
        this.searchInput = document.getElementById('search-input');
        this.clearSearchBtn = document.getElementById('clear-search-btn');
        this.statusTabsContainer = document.getElementById('status-filter-tabs');
        this.categoryFilterSelect = document.getElementById('category-filter-select');
        this.priorityFilterSelect = document.getElementById('priority-filter-select');
        this.sortSelect = document.getElementById('sort-select');
        this.clearCompletedBtn = document.getElementById('clear-completed-btn');

        // Task List & Views
        this.taskList = document.getElementById('task-list');
        this.emptyState = document.getElementById('empty-state');
        this.emptyStateTitle = document.getElementById('empty-state-title');
        this.emptyStateDesc = document.getElementById('empty-state-desc');
        this.currentViewTitle = document.getElementById('current-view-title');
        this.activeFilterBadge = document.getElementById('active-filter-badge');
        this.taskListSummary = document.getElementById('task-list-summary');
        this.emptyAddBtn = document.getElementById('empty-add-btn');

        // Modal
        this.openModalBtn = document.getElementById('open-new-task-modal-btn');
        this.modalOverlay = document.getElementById('task-modal-overlay');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.cancelModalBtn = document.getElementById('cancel-modal-btn');
        this.taskForm = document.getElementById('task-form');
        this.modalTitle = document.getElementById('modal-title');
        this.taskIdInput = document.getElementById('task-id-input');
        this.taskTitleInput = document.getElementById('task-title-input');
        this.taskDescInput = document.getElementById('task-desc-input');
        this.taskCategoryInput = document.getElementById('task-category-input');
        this.taskPriorityInput = document.getElementById('task-priority-input');
        this.taskDueDateInput = document.getElementById('task-duedate-input');

        // Toast Container
        this.toastContainer = document.getElementById('toast-container');
    }

    bindEvents() {
        // Search Input
        this.searchInput.addEventListener('input', (e) => {
            this.filterState.search = e.target.value.trim().toLowerCase();
            if (this.filterState.search.length > 0) {
                this.clearSearchBtn.classList.remove('hidden');
            } else {
                this.clearSearchBtn.classList.add('hidden');
            }
            this.renderTasks();
        });

        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.filterState.search = '';
            this.clearSearchBtn.classList.add('hidden');
            this.renderTasks();
        });

        // Status Tab Buttons
        this.statusTabsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab-btn');
            if (!btn) return;
            this.statusTabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.filterState.status = btn.dataset.status;
            this.renderTasks();
        });

        // Dropdown Select Filters
        this.categoryFilterSelect.addEventListener('change', (e) => {
            this.filterState.category = e.target.value;
            this.renderTasks();
        });

        this.priorityFilterSelect.addEventListener('change', (e) => {
            this.filterState.priority = e.target.value;
            this.renderTasks();
        });

        this.sortSelect.addEventListener('change', (e) => {
            this.filterState.sortBy = e.target.value;
            this.renderTasks();
        });

        // Clear Completed Button
        this.clearCompletedBtn.addEventListener('click', () => {
            this.clearCompletedTasks();
        });

        // Navigation Menu Item Clicks
        this.btnNavAll.addEventListener('click', () => this.setNavView('all'));
        this.btnNavToday.addEventListener('click', () => this.setNavView('today'));
        this.btnNavImportant.addEventListener('click', () => this.setNavView('important'));

        // Modal Open/Close
        this.openModalBtn.addEventListener('click', () => this.openTaskModal());
        this.emptyAddBtn.addEventListener('click', () => this.openTaskModal());
        this.closeModalBtn.addEventListener('click', () => this.closeTaskModal());
        this.cancelModalBtn.addEventListener('click', () => this.closeTaskModal());

        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.closeTaskModal();
        });

        // Form Submit
        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Task List Delegated Click (Checkbox, Edit, Delete)
        this.taskList.addEventListener('click', (e) => {
            const card = e.target.closest('.task-card');
            if (!card) return;
            const taskId = card.dataset.id;

            if (e.target.closest('.checkbox-container')) {
                this.toggleTaskCompletion(taskId);
            } else if (e.target.closest('.btn-edit')) {
                this.openTaskModal(taskId);
            } else if (e.target.closest('.btn-delete')) {
                this.deleteTask(taskId);
            }
        });
    }

    initHeaderGreeting() {
        const title = document.getElementById('greeting-title');
        const dateStr = document.getElementById('current-date-str');
        
        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Good evening';
        if (hour < 12) greeting = 'Good morning';
        else if (hour < 18) greeting = 'Good afternoon';

        title.textContent = `${greeting}, Admin!`;

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateStr.textContent = now.toLocaleDateString('en-US', options);

        // Pre-fill modal due date with today by default
        this.taskDueDateInput.value = getRelativeDateStr(0);
    }

    setNavView(viewName) {
        this.filterState.navView = viewName;
        
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.category-nav-item').forEach(el => el.classList.remove('active'));

        if (viewName === 'all') {
            this.btnNavAll.classList.add('active');
        } else if (viewName === 'today') {
            this.btnNavToday.classList.add('active');
        } else if (viewName === 'important') {
            this.btnNavImportant.classList.add('active');
        } else {
            const catBtn = document.querySelector(`.category-nav-item[data-category="${viewName}"]`);
            if (catBtn) catBtn.classList.add('active');
        }

        this.renderTasks();
    }

    loadTasks() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                this.tasks = JSON.parse(data);
            } else {
                // First launch: Seed with sample tasks
                this.tasks = [...INITIAL_SEED_TASKS];
                this.saveTasks();
            }
        } catch (err) {
            console.error('Failed to load tasks from localStorage:', err);
            this.tasks = [...INITIAL_SEED_TASKS];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
        } catch (err) {
            console.error('Failed to save tasks to localStorage:', err);
            this.showToast('Storage full or error saving data', 'danger');
        }
    }

    render() {
        this.updateStats();
        this.renderCategoryNav();
        this.renderTasks();
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const highPriorityPending = this.tasks.filter(t => !t.completed && t.priority === 'high').length;
        const todayStr = getRelativeDateStr(0);
        const todayCount = this.tasks.filter(t => t.dueDate === todayStr).length;

        // Stat Card Values
        this.elTotalCount.textContent = total;
        this.elPendingCount.textContent = pending;
        this.elCompletedCount.textContent = completed;

        this.elPendingSubtext.textContent = `${highPriorityPending} high priority`;
        
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        this.elCompletedSubtext.textContent = `${rate}% completion rate`;
        this.elRateText.textContent = `${rate}%`;

        // Progress SVG Ring offset update (circumference = 2 * PI * 30 ≈ 188.49)
        const circumference = 188.49;
        const offset = circumference - (rate / 100) * circumference;
        this.elProgressCircle.style.strokeDashoffset = offset;

        // Nav counts
        this.elCountNavAll.textContent = total;
        this.elCountNavToday.textContent = todayCount;
        this.elCountNavImportant.textContent = highPriorityPending;
    }

    renderCategoryNav() {
        const categories = ['Work', 'Personal', 'Health', 'Finance', 'Projects'];
        this.elCategoryNavList.innerHTML = '';

        categories.forEach(cat => {
            const count = this.tasks.filter(t => t.category === cat).length;
            const btn = document.createElement('button');
            btn.className = `category-nav-item ${this.filterState.navView === cat ? 'active' : ''}`;
            btn.dataset.category = cat;
            
            const dotClass = `dot-${cat.toLowerCase()}`;
            btn.innerHTML = `
                <span class="category-dot ${dotClass}"></span>
                <span style="flex: 1; text-align: left;">${cat}</span>
                <span class="nav-count">${count}</span>
            `;

            btn.addEventListener('click', () => this.setNavView(cat));
            this.elCategoryNavList.appendChild(btn);
        });
    }

    getFilteredAndSortedTasks() {
        let result = [...this.tasks];

        // 1. Sidebar Nav View Filter
        const todayStr = getRelativeDateStr(0);
        if (this.filterState.navView === 'today') {
            result = result.filter(t => t.dueDate === todayStr);
        } else if (this.filterState.navView === 'important') {
            result = result.filter(t => t.priority === 'high');
        } else if (this.filterState.navView !== 'all') {
            result = result.filter(t => t.category === this.filterState.navView);
        }

        // 2. Status Tab Filter
        if (this.filterState.status === 'active') {
            result = result.filter(t => !t.completed);
        } else if (this.filterState.status === 'completed') {
            result = result.filter(t => t.completed);
        }

        // 3. Dropdown Category Filter
        if (this.filterState.category !== 'all') {
            result = result.filter(t => t.category === this.filterState.category);
        }

        // 4. Dropdown Priority Filter
        if (this.filterState.priority !== 'all') {
            result = result.filter(t => t.priority === this.filterState.priority);
        }

        // 5. Search Text Filter
        if (this.filterState.search) {
            const q = this.filterState.search;
            result = result.filter(t => 
                t.title.toLowerCase().includes(q) || 
                (t.description && t.description.toLowerCase().includes(q)) ||
                t.category.toLowerCase().includes(q)
            );
        }

        // 6. Sorting Logic
        result.sort((a, b) => {
            switch (this.filterState.sortBy) {
                case 'dueDate-asc':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'priority-desc': {
                    const weight = { high: 3, medium: 2, low: 1 };
                    return weight[b.priority] - weight[a.priority];
                }
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'createdAt-desc':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        return result;
    }

    renderTasks() {
        const filteredTasks = this.getFilteredAndSortedTasks();
        const totalCount = this.tasks.length;

        // Update Section Header Title and Badge
        if (this.filterState.navView === 'today') {
            this.currentViewTitle.textContent = 'Tasks Due Today';
            this.activeFilterBadge.textContent = 'Due Today';
        } else if (this.filterState.navView === 'important') {
            this.currentViewTitle.textContent = 'High Priority Tasks';
            this.activeFilterBadge.textContent = 'High Priority';
        } else if (this.filterState.navView !== 'all') {
            this.currentViewTitle.textContent = `${this.filterState.navView} Tasks`;
            this.activeFilterBadge.textContent = this.filterState.navView;
        } else {
            this.currentViewTitle.textContent = 'All Tasks';
            this.activeFilterBadge.textContent = 'Showing All';
        }

        this.taskListSummary.textContent = `Showing ${filteredTasks.length} of ${totalCount} tasks`;

        // Empty state check
        if (filteredTasks.length === 0) {
            this.taskList.innerHTML = '';
            this.emptyState.classList.remove('hidden');
            if (this.filterState.search) {
                this.emptyStateTitle.textContent = 'No matching tasks found';
                this.emptyStateDesc.textContent = `No results match "${this.filterState.search}". Try refining your search query.`;
            } else if (this.filterState.status === 'completed') {
                this.emptyStateTitle.textContent = 'No completed tasks yet';
                this.emptyStateDesc.textContent = 'Check off tasks as you finish them to track your progress here!';
            } else {
                this.emptyStateTitle.textContent = 'No tasks in this view';
                this.emptyStateDesc.textContent = 'Get started by creating a new task to organize your workspace.';
            }
            return;
        }

        this.emptyState.classList.add('hidden');

        // Render HTML for each task
        const todayStr = getRelativeDateStr(0);
        this.taskList.innerHTML = filteredTasks.map(task => {
            const isCompleted = task.completed;
            const priorityClass = `badge-priority-${task.priority}`;
            const categoryClass = `badge-cat-${task.category}`;
            
            // Format due date badge
            let dueDateBadge = '';
            if (task.dueDate) {
                const isOverdue = !isCompleted && task.dueDate < todayStr;
                const isToday = task.dueDate === todayStr;
                let dateBadgeClass = 'badge-duedate';
                let dateLabel = task.dueDate;
                
                if (isOverdue) {
                    dateBadgeClass += ' overdue';
                    dateLabel = `Overdue (${task.dueDate})`;
                } else if (isToday) {
                    dateBadgeClass += ' today';
                    dateLabel = 'Due Today';
                }

                dueDateBadge = `
                    <span class="badge ${dateBadgeClass}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        ${dateLabel}
                    </span>
                `;
            }

            return `
                <div class="task-card ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
                    <div class="checkbox-container" title="${isCompleted ? 'Mark pending' : 'Mark completed'}">
                        <div class="checkbox-custom">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                    </div>

                    <div class="task-content">
                        <div class="task-title">${escapeHTML(task.title)}</div>
                        ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
                        
                        <div class="task-meta">
                            <span class="badge ${categoryClass}">${escapeHTML(task.category)}</span>
                            <span class="badge ${priorityClass}">${task.priority.toUpperCase()}</span>
                            ${dueDateBadge}
                        </div>
                    </div>

                    <div class="task-actions">
                        <button class="action-icon-btn btn-edit" title="Edit task">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="action-icon-btn btn-delete" title="Delete task">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleTaskCompletion(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        task.completed = !task.completed;
        this.saveTasks();
        this.render();

        const statusMsg = task.completed ? 'Task completed! Great job!' : 'Task marked as pending';
        this.showToast(statusMsg, task.completed ? 'success' : 'info');
    }

    deleteTask(id) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index === -1) return;

        const deletedTitle = this.tasks[index].title;
        this.tasks.splice(index, 1);
        this.saveTasks();
        this.render();

        this.showToast(`Deleted "${deletedTitle.substring(0, 20)}..."`, 'danger');
    }

    clearCompletedTasks() {
        const completedCount = this.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear', 'info');
            return;
        }

        this.tasks = this.tasks.filter(t => !t.completed);
        this.saveTasks();
        this.render();

        this.showToast(`Cleared ${completedCount} completed task(s)`, 'success');
    }

    openTaskModal(taskId = null) {
        this.editingTaskId = taskId;

        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;
            this.modalTitle.textContent = 'Edit Task';
            this.taskIdInput.value = task.id;
            this.taskTitleInput.value = task.title;
            this.taskDescInput.value = task.description || '';
            this.taskCategoryInput.value = task.category;
            this.taskPriorityInput.value = task.priority;
            this.taskDueDateInput.value = task.dueDate || '';
        } else {
            this.modalTitle.textContent = 'Create New Task';
            this.taskForm.reset();
            this.taskIdInput.value = '';
            this.taskDueDateInput.value = getRelativeDateStr(0);
        }

        this.modalOverlay.classList.remove('hidden');
        setTimeout(() => this.taskTitleInput.focus(), 50);
    }

    closeTaskModal() {
        this.modalOverlay.classList.add('hidden');
        this.editingTaskId = null;
        this.taskForm.reset();
    }

    handleFormSubmit() {
        const title = this.taskTitleInput.value.trim();
        const description = this.taskDescInput.value.trim();
        const category = this.taskCategoryInput.value;
        const priority = this.taskPriorityInput.value;
        const dueDate = this.taskDueDateInput.value;

        if (!title) {
            this.showToast('Task title is required', 'danger');
            return;
        }

        if (this.editingTaskId) {
            // Edit mode
            const task = this.tasks.find(t => t.id === this.editingTaskId);
            if (task) {
                task.title = title;
                task.description = description;
                task.category = category;
                task.priority = priority;
                task.dueDate = dueDate;
                this.showToast('Task updated successfully', 'success');
            }
        } else {
            // Create mode
            const newTask = {
                id: 'task-' + Date.now(),
                title,
                description,
                category,
                priority,
                dueDate,
                completed: false,
                createdAt: new Date().toISOString()
            };
            this.tasks.unshift(newTask);
            this.showToast('New task created!', 'success');
        }

        this.saveTasks();
        this.closeTaskModal();
        this.render();
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconSVG = '';
        if (type === 'success') {
            iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        } else if (type === 'danger') {
            iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        } else {
            iconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
        }

        toast.innerHTML = `
            <div class="toast-icon">${iconSVG}</div>
            <span>${escapeHTML(message)}</span>
        `;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
}

// Utility: HTML Escaping
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialize Application when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.taskApp = new TaskApp();
});
