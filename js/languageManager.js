/**
 * 语言管理模块
 * 负责中英文语言切换功能
 */

class LanguageManager {
    constructor() {
        // 优先从全局设置读取语言
        this.currentLang = (window.globalSettings && window.globalSettings.language)
            || localStorage.getItem('global-language-preference')
            || localStorage.getItem('preferred-language') 
            || 'zh';
        this.translations = this.loadTranslations();
        
        // 确保DOM准备好后再初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    loadTranslations() {
        return {
            zh: {
                // 编辑器界面
                'run-btn': '立即运行',
                'auto-run': '自动编译',
                'theme-dark': '🌙 深色',
                'theme-light': '☀️ 浅色',
                'status-ready': '准备就绪',
                'status-compiling': '编译中...',
                'status-compiled': '编译完成',
                'status-error': '编译错误',
                'status-saving': '保存中...',
                'status-saved': '已保存',

                // 文件操作
                'new-file': '新建文件',
                'save-file': '保存文件',
                'delete-file': '删除文件',
                'rename-file': '重命名文件',
                'file-name': '文件名',
                'confirm-delete': '确认删除',
                'delete-confirm': '确定要删除文件"{name}"吗？',

                // Tab相关
                'untitled': '未命名',
                'close-tab': '关闭标签',
                'close-others': '关闭其他',
                'close-all': '关闭全部',

                // 代码面板
                'html-panel': 'HTML',
                'css-panel': 'CSS',
                'js-panel': 'JavaScript',

                // 控制台
                'console-clear': '清空控制台',
                'console-placeholder': '控制台输出将显示在这里...',
                'console-level-log': '日志',
                'console-level-info': '信息',
                'console-level-warn': '警告',
                'console-level-error': '错误',
                'debug-console': '调试控制台',
                'terminal': '终端',
                'issues': '问题',
                'hide-console': '隐藏控制台',

                // 文件树
                'create-folder': '新建文件夹',
                'create-file': '新建文件',
                'refresh-tree': '刷新',
                'collapse-all': '全部折叠',
                'expand-all': '全部展开',
                'file-explorer': '资源管理器',

                // AI助手
                'ai-title': 'AI 助手',
                'ai-placeholder': '描述您想要生成的代码或文件，例如：创建一个响应式的导航栏组件',
                'ai-prompt-label': '描述您的需求:',
                'ai-generate': '生成代码',
                'ai-insert': '插入代码',
                'ai-clear': '清空',
                'ai-programming': '🤖 AI编程',

                // 命令栏按钮
                'back-to-assignment': '🔙 返回',
                'submit-assignment': '📋 提交',
                'export-project': '📦 导出',
                'template-btn': '📊 模板',

                // 预览相关
                'real-time-preview': '实时预览',

                // 错误信息
                'error-network': '网络连接错误',
                'error-generic': '操作失败',
                'error-empty': '内容不能为空',
                'error-invalid': '输入无效',

                // 成功信息
                'success-saved': '文件已保存',
                'success-deleted': '文件已删除',
                'success-created': '文件已创建',
                'success-renamed': '文件已重命名',
                'success-profile-updated': '个人资料已更新',

                // 个人资料页面
                'profile-title': '个人资料',
                'profile-basic-info': '基本信息',
                'profile-account-info': '账户信息',
                'profile-username': '用户名',
                'profile-fullname': '姓名',
                'profile-email': '邮箱',
                'profile-role': '角色',
                'profile-student-id': '学号',
                'profile-employee-id': '工号',
                'profile-department': '院系',
                'profile-major': '专业',
                'profile-phone': '电话',
                'profile-grade': '年级',
                'profile-save': '保存更改',
                'profile-cancel': '取消',
                'profile-role-admin': '管理员',
                'profile-role-teacher': '教师',
                'profile-role-student': '学生',
                'profile-avatar-upload': '更换头像',
                'profile-password-change': '修改密码',
                'profile-current-password': '当前密码',
                'profile-new-password': '新密码',
                'profile-confirm-password': '确认新密码',

                // 搜索和筛选
                'searchPlaceholder': '搜索学生姓名或学号...',
                'allStatuses': '所有状态',
                'studentActive': '已提交',
                'studentInactive': '未提交'
            },
            en: {
                // Editor Interface
                'run-btn': 'Run Code',
                'auto-run': 'Auto Run',
                'theme-dark': '🌙 Dark',
                'theme-light': '☀️ Light',
                'status-ready': 'Ready',
                'status-compiling': 'Compiling...',
                'status-compiled': 'Compiled',
                'status-error': 'Error',
                'status-saving': 'Saving...',
                'status-saved': 'Saved',

                // File Operations
                'new-file': 'New File',
                'save-file': 'Save File',
                'delete-file': 'Delete File',
                'rename-file': 'Rename File',
                'file-name': 'File Name',
                'confirm-delete': 'Confirm Delete',
                'delete-confirm': 'Are you sure you want to delete "{name}"?',

                // Tab Related
                'untitled': 'Untitled',
                'close-tab': 'Close Tab',
                'close-others': 'Close Others',
                'close-all': 'Close All',

                // Code Panels
                'html-panel': 'HTML',
                'css-panel': 'CSS',
                'js-panel': 'JavaScript',

                // Console
                'console-clear': 'Clear Console',
                'console-placeholder': 'Console output will appear here...',
                'console-level-log': 'Log',
                'console-level-info': 'Info',
                'console-level-warn': 'Warn',
                'console-level-error': 'Error',
                'debug-console': 'Debug Console',
                'terminal': 'Terminal',
                'issues': 'Issues',
                'hide-console': 'Hide Console',

                // File Tree
                'create-folder': 'New Folder',
                'create-file': 'New File',
                'refresh-tree': 'Refresh',
                'collapse-all': 'Collapse All',
                'expand-all': 'Expand All',
                'file-explorer': 'Explorer',

                // AI Assistant
                'ai-title': 'AI Assistant',
                'ai-placeholder': 'Describe the code or file you want to generate, e.g., Create a responsive navbar component',
                'ai-prompt-label': 'Describe your request:',
                'ai-generate': 'Generate',
                'ai-insert': 'Insert',
                'ai-clear': 'Clear',
                'ai-programming': '🤖 AI Coding',

                // Command Bar Buttons
                'back-to-assignment': '🔙 Back',
                'submit-assignment': '📋 Submit',
                'export-project': '📦 Export',
                'template-btn': '📊 Template',

                // Preview Related
                'real-time-preview': 'Real-time Preview',

                // Error Messages
                'error-network': 'Network Error',
                'error-generic': 'Operation Failed',
                'error-empty': 'Content cannot be empty',
                'error-invalid': 'Invalid Input',

                // Success Messages
                'success-saved': 'File Saved',
                'success-deleted': 'File Deleted',
                'success-created': 'File Created',
                'success-renamed': 'File Renamed',
                'success-profile-updated': 'Profile Updated',

                // Profile Page
                'profile-title': 'Profile',
                'profile-basic-info': 'Basic Info',
                'profile-account-info': 'Account Info',
                'profile-username': 'Username',
                'profile-fullname': 'Full Name',
                'profile-email': 'Email',
                'profile-role': 'Role',
                'profile-student-id': 'Student ID',
                'profile-employee-id': 'Employee ID',
                'profile-department': 'Department',
                'profile-major': 'Major',
                'profile-phone': 'Phone',
                'profile-grade': 'Grade',
                'profile-save': 'Save Changes',
                'profile-cancel': 'Cancel',
                'profile-role-admin': 'Admin',
                'profile-role-teacher': 'Teacher',
                'profile-role-student': 'Student',
                'profile-avatar-upload': 'Change Avatar',
                'profile-password-change': 'Change Password',
                'profile-current-password': 'Current Password',
                'profile-new-password': 'New Password',
                'profile-confirm-password': 'Confirm Password',

                // Search and Filter
                'searchPlaceholder': 'Search student name or ID...',
                'allStatuses': 'All Statuses',
                'studentActive': 'Submitted',
                'studentInactive': 'Not Submitted',

                // 通知相关
                'notification-center': '通知中心',
                'mark-all-read': '全部已读',
                'loading': '加载中...',
                'view-all': '查看全部',
                'no-notifications': '暂无通知',
                'minutes-ago': '分钟前',
                'hours-ago': '小时前',
                'days-ago': '天前',
                'just-now': '刚刚',
                'mark-as-read': '标记已读',
                'new-user-registration': '新用户注册',
                'course-assignment': '课程分配',
                'assignment-submission': '作业提交',
                'grade-assigned': '作业评分',
                'course-enrollment': '课程报名',
                'system-announcement': '系统公告'
            },
            en: {
                // Editor Interface
                'run-btn': 'Run',
                'auto-run': 'Auto Compile',
                'theme-dark': '🌙 Dark',
                'theme-light': '☀️ Light',
                'status-ready': 'Ready',
                'status-compiling': 'Compiling...',
                'status-compiled': 'Compiled',
                'status-error': 'Error',
                'status-saving': 'Saving...',
                'status-saved': 'Saved',

                // File Operations
                'new-file': 'New File',
                'save-file': 'Save File',
                'delete-file': 'Delete File',
                'rename-file': 'Rename File',
                'file-name': 'File Name',
                'confirm-delete': 'Confirm Delete',
                'delete-confirm': 'Are you sure you want to delete file "{name}"?',

                // Tab Related
                'untitled': 'Untitled',
                'close-tab': 'Close Tab',
                'close-others': 'Close Others',
                'close-all': 'Close All',

                // Code Panels
                'html-panel': 'HTML',
                'css-panel': 'CSS',
                'js-panel': 'JavaScript',

                // Console
                'console-clear': 'Clear Console',
                'console-placeholder': 'Console output will appear here...',
                'console-level-log': 'Log',
                'console-level-info': 'Info',
                'console-level-warn': 'Warn',
                'console-level-error': 'Error',
                'debug-console': 'Debug Console',
                'terminal': 'Terminal',
                'issues': 'Issues',
                'hide-console': 'Hide Console',

                // File Tree
                'create-folder': 'New Folder',
                'create-file': 'New File',
                'refresh-tree': 'Refresh',
                'collapse-all': 'Collapse All',
                'expand-all': 'Expand All',
                'file-explorer': 'File Explorer',

                // AI Assistant
                'ai-title': 'AI Assistant',
                'ai-placeholder': 'Describe the code or files you want to generate, e.g.: Create a responsive navigation component',
                'ai-prompt-label': 'Describe your needs:',
                'ai-generate': 'Generate Code',
                'ai-insert': 'Insert Code',
                'ai-clear': 'Clear',
                'ai-programming': '🤖 AI Coding',

                // Notifications
                'notification-center': 'Notification Center',
                'mark-all-read': 'Mark All Read',
                'view-all': 'View All',
                'no-notifications': 'No notifications',
                'loading-notifications': 'Loading...',
                'notifications-error': 'Failed to load notifications',
                'retry': 'Retry',
                'new-user-registration': 'New User Registration',
                'course-assignment': 'Course Assignment',
                'assignment-submission': 'Assignment Submission',
                'grade-assigned': 'Grade Assigned',
                'course-enrollment': 'Course Enrollment',
                'system-announcement': 'System Announcement',
                'just-now': 'Just now',
                'minutes-ago': 'minutes ago',
                'hours-ago': 'hours ago',
                'days-ago': 'days ago',

                // Command Bar Buttons
                'back-to-assignment': '🔙 Back',
                'submit-assignment': '📋 Submit',
                'export-project': '📦 Export',
                'template-btn': '📊 Templates',

                // Preview Related
                'real-time-preview': 'Live Preview',

                // Error Messages
                'error-network': 'Network connection error',
                'error-generic': 'Operation failed',
                'error-empty': 'Content cannot be empty',
                'error-invalid': 'Invalid input',

                // Success Messages
                'success-saved': 'File saved',
                'success-deleted': 'File deleted',
                'success-created': 'File created',
                'success-renamed': 'File renamed',

                // Notifications
                'notification-center': 'Notifications',
                'mark-all-read': 'Mark All Read',
                'loading': 'Loading...',
                'view-all': 'View All',
                'no-notifications': 'No notifications',
                'minutes-ago': 'minutes ago',
                'hours-ago': 'hours ago',
                'days-ago': 'days ago',
                'just-now': 'just now',
                'mark-as-read': 'Mark as Read',
                'new-user-registration': 'New User Registration',
                'course-assignment': 'Course Assignment',
                'assignment-submission': 'Assignment Submission',
                'grade-assigned': 'Grade Assigned',
                'course-enrollment': 'Course Enrollment',
                'system-announcement': 'System Announcement'
            }
        };
    }

    init() {
        console.log('🌐 LanguageManager 初始化...');
        this.setupEventListeners();
        this.updateLanguage();
    }

    setupEventListeners() {
        const langToggleBtn = document.getElementById('lang-toggle-btn');
        console.log('🔍 查找语言切换按钮:', langToggleBtn ? '找到' : '未找到');
        
        if (langToggleBtn) {
            // 避免重复绑定
            if (langToggleBtn._hasLangListener) {
                console.log('⚠️ 语言按钮已绑定事件，跳过');
                return;
            }
            
            langToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('👉 语言按钮被点击');
                this.toggleLanguage();
            });
            langToggleBtn._hasLangListener = true;
            console.log('✅ 语言切换按钮事件已绑定');
        } else {
            // 如果没找到，延迟重试
            console.log('⚠️ 语言按钮未找到，500ms后重试...');
            setTimeout(() => this.setupEventListeners(), 500);
        }
        
        // 监听全局语言变化事件（跨页面同步）
        window.addEventListener('languageChanged', (e) => {
            const newLang = e.detail?.language;
            if (newLang && ['zh', 'en'].includes(newLang) && this.currentLang !== newLang) {
                this.currentLang = newLang;
                this.updateLanguage();
                console.log('🔄 语言已从全局设置同步:', newLang);
            }
        });
    }

    toggleLanguage() {
        this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
        // 保存到所有存储键
        localStorage.setItem('preferred-language', this.currentLang);
        localStorage.setItem('language', this.currentLang);
        localStorage.setItem('global-language-preference', this.currentLang);
        
        // 同步到全局设置
        if (window.globalSettings) {
            window.globalSettings.language = this.currentLang;
        }
        
        this.updateLanguage();

        // 触发语言变更事件
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLang }
        }));
    }
    
    // 设置语言（用于外部调用，如全局设置同步）
    setLanguage(lang) {
        if (['zh', 'en'].includes(lang) && this.currentLang !== lang) {
            this.currentLang = lang;
            localStorage.setItem('preferred-language', lang);
            localStorage.setItem('language', lang);
            localStorage.setItem('global-language-preference', lang);
            this.updateLanguage();
        }
    }

    updateLanguage() {
        const currentLangSpan = document.getElementById('current-lang');
        if (currentLangSpan) {
            currentLangSpan.textContent = this.currentLang === 'zh' ? '中' : 'EN';
        }

        // 更新页面所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            if (element.tagName === 'INPUT' && element.type === 'checkbox') {
                // 对于checkbox，更新旁边的span标签
                const label = element.nextElementSibling;
                if (label && label.tagName === 'SPAN') {
                    label.textContent = translation;
                }
            } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                // 对于输入框，更新placeholder
                const placeholderKey = element.getAttribute('data-i18n-placeholder');
                if (placeholderKey) {
                    element.placeholder = this.t(placeholderKey);
                } else {
                    element.placeholder = translation;
                }
            } else if (element.tagName === 'BUTTON') {
                // 对于按钮，如果有子元素且第一个是文本节点，更新文本
                if (element.childNodes.length > 0) {
                    const textNode = Array.from(element.childNodes).find(node =>
                        node.nodeType === Node.TEXT_NODE && node.textContent.trim()
                    );
                    if (textNode) {
                        const originalText = textNode.textContent.trim();
                        // 保留图标，只替换文本
                        const hasIcon = element.querySelector('svg') || element.textContent.includes('🌙') || element.textContent.includes('☀️');
                        if (hasIcon) {
                            textNode.textContent = translation;
                        } else {
                            element.textContent = translation;
                        }
                    }
                } else {
                    element.textContent = translation;
                }
            } else {
                // 其他元素，直接更新内容
                element.textContent = translation;
            }

            // 处理title属性的国际化
            const titleKey = element.getAttribute('data-i18n-title');
            if (titleKey) {
                element.title = this.t(titleKey);
            }
        });

        // 更新页面标题
        this.updatePageTitle();

        // 更新HTML lang属性
        document.documentElement.lang = this.currentLang === 'zh' ? 'zh-CN' : 'en-US';
    }

    updatePageTitle() {
        const title = document.querySelector('title');
        if (title) {
            const originalTitle = title.textContent;
            if (originalTitle.includes('在线编程教育平台')) {
                title.textContent = this.currentLang === 'zh' ? '在线编程教育平台' : 'Online Programming Education Platform';
            }
        }
    }

    t(key, params = {}) {
        let translation = this.translations[this.currentLang][key] || this.translations['zh'][key] || key;

        // 替换参数
        Object.keys(params).forEach(param => {
            translation = translation.replace(`{${param}}`, params[param]);
        });

        return translation;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    setLanguage(lang) {
        if (['zh', 'en'].includes(lang)) {
            this.currentLang = lang;
            localStorage.setItem('preferred-language', lang);
            this.updateLanguage();

            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: this.currentLang }
            }));
        }
    }

    // 格式化时间（根据语言）
    formatTime(date) {
        if (this.currentLang === 'zh') {
            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } else {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    }

    // 格式化日期（根据语言）
    formatDate(date) {
        if (this.currentLang === 'zh') {
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }
}

// 导出语言管理器
export default LanguageManager;

// 全局实例
window.languageManager = new LanguageManager();