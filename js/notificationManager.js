/**
 * 通知管理器
 * 处理用户通知的创建、发送、显示和管理
 */

// 简单的翻译函数，避免循环依赖
function t(key, params = {}) {
    const translations = {
        'zh': {
            'notification-center': '通知中心',
            'mark-all-read': '全部已读',
            'loading': '加载中...',
            'clear-all': '清空所有通知',
            'confirm-clear-all': '确定要清空所有通知吗？此操作不可撤销。',
            'no-notifications': '暂无通知',
            'minutes-ago': '分钟前',
            'hours-ago': '小时前',
            'days-ago': '天前',
            'just-now': '刚刚',
            'notifications-error': '加载通知失败',
            'retry': '重试'
        },
        'en': {
            'notification-center': 'Notification Center',
            'mark-all-read': 'Mark All Read',
            'loading': 'Loading...',
            'clear-all': 'Clear All Notifications',
            'confirm-clear-all': 'Are you sure you want to clear all notifications? This action cannot be undone.',
            'no-notifications': 'No notifications',
            'minutes-ago': 'minutes ago',
            'hours-ago': 'hours ago',
            'days-ago': 'days ago',
            'just-now': 'just now',
            'notifications-error': 'Failed to load notifications',
            'retry': 'Retry'
        }
    };

    // 获取当前语言，简化逻辑
    let currentLang = 'zh';
    if (window.languageManager) {
        const lang = window.languageManager.getCurrentLanguage();
        currentLang = (lang && lang.startsWith('en')) ? 'en' : 'zh';
    } else {
        // 从localStorage获取语言设置
        const savedLang = localStorage.getItem('preferred-language') ||
                         localStorage.getItem('language') ||
                         localStorage.getItem('global-language-preference');
        currentLang = (savedLang && savedLang.startsWith('en')) ? 'en' : 'zh';
    }

    // 获取翻译文本
    let translation = translations[currentLang]?.[key] || translations['zh'][key] || key;

    // 替换参数
    Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
    });

    return translation;
}

export class NotificationManager {
    constructor() {
        this.currentNotifications = [];
        this.unreadCount = 0;
        this.notificationPanel = null;
        this.notificationBadge = null;
        this.maxVisibleNotifications = 10;
        this.pollInterval = 60000; // 60秒轮询一次
        this.isLoading = false; // 防止重复加载
        this.pollTimer = null;

        console.log('🔔 NotificationManager 构造函数执行');

        // 通知类型配置
        this.notificationTypes = {
            'user_registration': {
                icon: '👤',
                color: '#3ea7ff',
                priority: 'normal'
            },
            'course_assignment': {
                icon: '📚',
                color: '#30d158',
                priority: 'high'
            },
            'assignment_submission': {
                icon: '📝',
                color: '#ff9500',
                priority: 'normal'
            },
            'grade_assigned': {
                icon: '✅',
                color: '#30d158',
                priority: 'high'
            },
            'course_enrollment': {
                icon: '🎓',
                color: '#3ea7ff',
                priority: 'normal'
            },
            'system_announcement': {
                icon: '📢',
                color: '#ff3b30',
                priority: 'urgent'
            }
        };

        this.init();
    }

    /**
     * 初始化通知管理器
     */
    async init() {
        console.log('🔔 通知管理器初始化...');

        // 创建UI元素
        this.createNotificationUI();

        // 绑定事件
        this.bindEvents();

        // 获取当前用户的通知
        await this.loadNotifications();

        // 启动轮询
        this.startPolling();

        // 监听语言变化
        this.bindLanguageEvents();

        // 监听主题变化
        this.bindThemeEvents();

        console.log('✅ 通知管理器初始化完成');
    }

    /**
     * 创建通知UI元素
     */
    createNotificationUI() {
        // 获取已存在的通知按钮
        const notificationBtn = document.getElementById('notification-btn');
        if (!notificationBtn) {
            console.error('通知按钮未找到，请确保在HTML中定义了id="notification-btn"的按钮');
            return;
        }

        // 创建通知面板
        const notificationPanel = document.createElement('div');
        notificationPanel.id = 'notification-panel';
        notificationPanel.className = 'notification-panel';
        notificationPanel.innerHTML = `
            <div class="notification-header">
                <h3 id="notification-title" data-i18n="notification-center">${t('notification-center')}</h3>
                <button id="mark-all-read" class="mark-all-read-btn" data-i18n="mark-all-read">${t('mark-all-read')}</button>
            </div>
            <div id="notification-list" class="notification-list">
                <div class="notification-loading" data-i18n="loading">${t('loading')}</div>
            </div>
            <div class="notification-footer">
                <button id="view-all-notifications" class="view-all-btn" data-i18n="clear-all">${t('clear-all')}</button>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(notificationPanel);

        // 保存引用
        this.notificationBtn = notificationBtn;
        this.notificationPanel = notificationPanel;
        this.notificationBadge = document.getElementById('notification-badge');
        this.notificationList = document.getElementById('notification-list');

        // 初始化时移除data-theme属性，让CSS变量自动处理
        this.updateUITheme();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 如果UI元素不存在，跳过事件绑定
        if (!this.notificationBtn || !this.notificationPanel) {
            console.warn('通知UI元素未初始化，跳过事件绑定');
            return;
        }

        // 通知按钮点击事件 - 点击即触发已读
        this.notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 点击按钮立即标记所有通知为已读
            this.markAllAsRead();
            this.toggleNotificationPanel();
        });

        // 点击其他地方关闭面板
        document.addEventListener('click', (e) => {
            if (this.notificationPanel && this.notificationBtn &&
                !this.notificationPanel.contains(e.target) &&
                !this.notificationBtn.contains(e.target)) {
                this.hideNotificationPanel();
            }
        });

        // 全部已读按钮
        const markAllReadBtn = document.getElementById('mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                this.markAllAsRead();
                // 点击后自动关闭通知面板
                setTimeout(() => {
                    this.hideNotificationPanel();
                }, 300);
            });
        }

        // 清空所有通知按钮
        const clearAllBtn = document.getElementById('view-all-notifications');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllNotifications();
            });
        }
    }

    /**
     * 切换通知面板显示
     */
    toggleNotificationPanel() {
        if (!this.notificationPanel) return;
        if (this.notificationPanel.classList.contains('show')) {
            this.hideNotificationPanel();
        } else {
            this.showNotificationPanel();
        }
    }

    /**
     * 显示通知面板
     */
    showNotificationPanel() {
        if (!this.notificationPanel || !this.notificationBtn) return;
        this.notificationPanel.classList.add('show');
        this.notificationBtn.classList.add('active');

        // 更新语言和主题
        this.updateUILanguage();
        this.updateUITheme();

        // 重新加载通知
        this.loadNotifications();
    }

    /**
     * 隐藏通知面板
     */
    hideNotificationPanel() {
        if (!this.notificationPanel) return;
        this.notificationPanel.classList.remove('show');
        if (this.notificationBtn) this.notificationBtn.classList.remove('active');
    }

    /**
     * 创建通知 (简化版)
     */
    async createNotification(type, recipientId, data) {
        console.log('📝 创建通知 (测试模式):', type, recipientId);
        // TODO: 实现数据库保存
        return null;
    }

    /**
     * 加载用户通知
     */
    async loadNotifications() {
        console.log('📋 加载通知');
        // 防止重复加载
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;

        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                console.log('⚠️ 未找到当前用户，无法加载通知');
                this.currentNotifications = [];
                this.updateNotificationDisplay();
                this.updateUnreadCount();
                return;
            }

            // 从API获取通知
            const response = await fetch(`http://localhost:5024/api/notifications?recipientId=${currentUser.id}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.currentNotifications = result.data || [];
                console.log(`✅ 加载了 ${this.currentNotifications.length} 条通知`);
                this.updateNotificationDisplay();
                this.updateUnreadCount();
            } else {
                throw new Error(result.message || '获取通知失败');
            }
        } catch (error) {
            console.error('加载通知失败:', error);
            this.showErrorMessage();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 更新通知显示
     */
    updateNotificationDisplay() {
        if (!this.notificationList) return;

        if (this.currentNotifications.length === 0) {
            const noNotificationsText = t('no-notifications');
            this.notificationList.innerHTML = `
                <div class="notification-empty">
                    <div class="empty-icon">📭</div>
                    <p>${noNotificationsText}</p>
                </div>
            `;
            return;
        }

        const notificationsHTML = this.currentNotifications.map(notification => {
            const typeConfig = this.notificationTypes[notification.type];
            const isRead = notification.is_read;
            const createdAt = new Date(notification.created_at);
            const timeAgo = this.getTimeAgo(createdAt);

            return `
                <div class="notification-item ${isRead ? 'read' : 'unread'}" data-id="${notification.id}">
                    <div class="notification-icon" style="color: ${typeConfig.color}">
                        ${typeConfig.icon}
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                        <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                    ${!isRead ? '<div class="notification-indicator"></div>' : ''}
                </div>
            `;
        }).join('');

        this.notificationList.innerHTML = notificationsHTML;

        // 绑定点击事件
        this.bindNotificationItemClicks();
    }

    /**
     * 绑定通知项点击事件
     */
    bindNotificationItemClicks() {
        const notificationItems = this.notificationList.querySelectorAll('.notification-item');
        notificationItems.forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = parseInt(item.dataset.id);
                this.handleNotificationClick(notificationId);
            });
        });
    }

    /**
     * 处理通知点击
     */
    async handleNotificationClick(notificationId) {
        try {
            const notification = this.currentNotifications.find(n => n.id === notificationId);
            if (!notification) return;

            // 标记为已读
            if (!notification.is_read) {
                await this.markAsRead(notificationId);
            }

            // 根据类型执行相应操作
            this.handleNotificationAction(notification);

        } catch (error) {
            console.error('处理通知点击失败:', error);
        }
    }

    /**
     * 处理通知操作
     */
    handleNotificationAction(notification) {
        switch (notification.type) {
            case 'course_assignment':
            case 'course_enrollment':
                if (notification.related_type === 'course' && notification.related_id) {
                    this.navigateToCourse(notification.related_id);
                }
                break;
            case 'assignment_submission':
                if (notification.related_type === 'assignment' && notification.related_id) {
                    this.navigateToAssignment(notification.related_id);
                }
                break;
            case 'grade_assigned':
                if (notification.related_type === 'submission' && notification.related_id) {
                    this.navigateToSubmission(notification.related_id);
                }
                break;
            default:
                console.log('通知类型:', notification.type);
        }

        // 关闭通知面板
        this.hideNotificationPanel();
    }

    /**
     * 标记通知为已读
     */
    async markAsRead(notificationId) {
        try {
            console.log('📖 标记已读:', notificationId);
            
            // 调用 API 持久化已读状态
            const response = await fetch(`http://localhost:5024/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const notification = this.currentNotifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.is_read = true;
                    notification.read_at = new Date().toISOString();
                    this.updateNotificationDisplay();
                    this.updateUnreadCount();
                }
                console.log('✅ 通知已标记为已读');
            } else {
                console.error('❌ 标记已读 API 调用失败');
            }
        } catch (error) {
            console.error('标记已读失败:', error);
        }
    }

    /**
     * 标记所有通知为已读
     */
    async markAllAsRead() {
        try {
            // 检查是否有未读通知
            const unreadNotifications = this.currentNotifications.filter(n => !n.is_read);
            if (unreadNotifications.length === 0) {
                console.log('📖 没有未读通知需要标记');
                return;
            }

            console.log('📖 标记全部已读:', unreadNotifications.length, '条');

            // 获取当前用户
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                console.error('❌ 未找到当前用户');
                return;
            }

            // 调用 API 持久化已读状态
            const response = await fetch('http://localhost:5024/api/notifications/mark-all-read', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ recipientId: currentUser.id })
            });
            
            if (response.ok) {
                // 更新本地状态
                this.currentNotifications.forEach(notification => {
                    notification.is_read = true;
                    notification.read_at = new Date().toISOString();
                });
                this.updateNotificationDisplay();
                this.updateUnreadCount();
                console.log('✅ 所有通知已标记为已读');
            } else {
                console.error('❌ 标记全部已读 API 调用失败');
            }
        } catch (error) {
            console.error('标记全部已读失败:', error);
        }
    }

    /**
     * 更新未读数量
     */
    updateUnreadCount() {
        this.unreadCount = this.currentNotifications.filter(n => !n.is_read).length;

        if (this.notificationBadge) {
            this.notificationBadge.textContent = this.unreadCount;
            this.notificationBadge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }

        // 更新页面标题
        this.updatePageTitle();
    }

    /**
     * 更新页面标题
     */
    updatePageTitle() {
        const originalTitle = document.title.replace(/^\(\d+\)\s*/, '');
        if (this.unreadCount > 0) {
            document.title = `(${this.unreadCount}) ${originalTitle}`;
        } else {
            document.title = originalTitle;
        }
    }

    /**
     * 启动轮询
     */
    startPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }

        this.pollTimer = setInterval(async () => {
            const currentUser = this.getCurrentUser();
            if (currentUser && !document.hidden) {
                await this.loadNotifications();
            }
        }, this.pollInterval);
    }

    /**
     * 停止轮询
     */
    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * 绑定语言事件
     */
    bindLanguageEvents() {
        window.addEventListener('languageChanged', () => {
            this.updateUILanguage();
        });
    }

    /**
     * 绑定主题事件
     */
    bindThemeEvents() {
        window.addEventListener('themeChanged', () => {
            this.updateUITheme();
        });
    }

    /**
     * 更新UI语言
     */
    updateUILanguage() {
        // 更新通知标题
        const titleElement = document.getElementById('notification-title');
        if (titleElement) {
            titleElement.textContent = t('notification-center');
        }

        // 更新按钮文本
        const markAllBtn = document.getElementById('mark-all-read');
        if (markAllBtn) {
            markAllBtn.textContent = t('mark-all-read');
        }

        const viewAllBtn = document.getElementById('view-all-notifications');
        if (viewAllBtn) {
            viewAllBtn.textContent = t('clear-all');
        }

        // 更新面板中的所有文本
        const notificationElements = this.notificationPanel.querySelectorAll('[data-i18n]');
        notificationElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = t(key);
        });

        // 更新空状态文本和时间显示
        this.updateNotificationDisplay();
    }

    /**
     * 更新UI主题
     */
    updateUITheme() {
        // 移除data-theme属性，让CSS变量自动处理
        if (this.notificationPanel) {
            this.notificationPanel.removeAttribute('data-theme');
        }

        // 更新通知徽章
        if (this.notificationBadge) {
            this.notificationBadge.removeAttribute('data-theme');
        }
    }

    /**
     * 获取当前用户
     */
    getCurrentUser() {
        try {
            const savedUser = sessionStorage.getItem('current-user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        // 尝试从主题管理器获取
        if (window.themeManager && window.themeManager.getCurrentTheme) {
            return window.themeManager.getCurrentTheme();
        }

        // 从localStorage获取
        const savedTheme = localStorage.getItem('theme') || localStorage.getItem('preferred-theme');
        if (savedTheme) {
            return savedTheme;
        }

        // 从document.documentElement获取
        const htmlTheme = document.documentElement.getAttribute('data-theme');
        if (htmlTheme) {
            return htmlTheme;
        }

        // 从body class获取
        if (document.body.classList.contains('light')) {
            return 'light';
        }
        if (document.body.classList.contains('dark')) {
            return 'dark';
        }

        // 检查系统偏好
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }

        return 'dark'; // 默认深色
    }

    /**
     * 获取默认标题
     */
    getDefaultTitle(type) {
        const typeConfig = this.notificationTypes[type];
        const currentLang = window.languageManager ? window.languageManager.getCurrentLanguage() : 'zh';
        return typeConfig?.icon + ' 通知';
    }

    /**
     * 获取默认消息
     */
    getDefaultMessage(type, data) {
        // 这里可以基于模板生成默认消息
        // 暂时返回简单描述
        return this.getDefaultTitle(type);
    }

    /**
     * 获取相对时间
     */
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            const timeText = t('days-ago');
            return `${days} ${timeText}`;
        }
        if (hours > 0) {
            const timeText = t('hours-ago');
            return `${hours} ${timeText}`;
        }
        if (minutes > 0) {
            const timeText = t('minutes-ago');
            return `${minutes} ${timeText}`;
        }
        return t('just-now');
    }

    /**
     * 转义HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示错误消息
     */
    showErrorMessage() {
        if (this.notificationList) {
            const errorText = t('notifications-error');
            const retryText = t('retry');
            this.notificationList.innerHTML = `
                <div class="notification-error">
                    <div class="error-icon">❌</div>
                    <p>${errorText}</p>
                    <button onclick="window.notificationManager.loadNotifications()" class="retry-btn">${retryText}</button>
                </div>
            `;
        }
    }

    /**
     * 导航到课程
     */
    navigateToCourse(courseId) {
        if (window.router) {
            window.router.navigate(`/course/${courseId}`);
        }
    }

    /**
     * 导航到作业
     */
    navigateToAssignment(assignmentId) {
        if (window.router) {
            window.router.navigate(`/assignment/${assignmentId}`);
        }
    }

    /**
     * 导航到提交记录
     */
    navigateToSubmission(submissionId) {
        if (window.router) {
            window.router.navigate(`/submission/${submissionId}`);
        }
    }

    /**
     * 清空所有通知
     */
    async clearAllNotifications() {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                console.log('⚠️ 未找到当前用户，无法清空通知');
                return;
            }

            // 确认对话框
            const confirmMessage = t('confirm-clear-all') || '确定要清空所有通知吗？此操作不可撤销。';
            if (!confirm(confirmMessage)) {
                return;
            }

            // 调用API清空所有通知
            const response = await fetch(`http://localhost:5024/api/notifications/clear-all?recipientId=${currentUser.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log('✅ 已清空所有通知');
                // 重新加载通知
                await this.loadNotifications();
            } else {
                throw new Error(result.message || '清空通知失败');
            }
        } catch (error) {
            console.error('清空通知失败:', error);
            // 显示错误消息
            alert('清空通知失败，请稍后重试');
        }
    }

    /**
     * 销毁通知管理器
     */
    destroy() {
        this.stopPolling();

        // 移除事件监听器
        if (this.notificationBtn) {
            this.notificationBtn.remove();
        }
        if (this.notificationPanel) {
            this.notificationPanel.remove();
        }
    }
}

// 创建全局通知管理器实例
export const notificationManager = new NotificationManager();
console.log('🔔 通知管理器实例已创建');