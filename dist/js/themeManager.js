/**
 * 主题管理器
 * 处理深色/浅色主题切换功能
 */

export class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.themes = {
            dark: {
                '--bg': '#0f1116',
                '--panel': '#1f232b',
                '--panel-dark': '#181b21',
                '--border': '#2a2f3b',
                '--text': '#d7dae0',
                '--text-muted': '#8a909f',
                '--accent': '#3ea7ff',
                '--accent-strong': '#2ea043',
                '--sidebar-width': '240px',
                '--danger': '#ff6b81',
                '--warn': '#f0b27a',
                '--info': '#5dade2'
            },
            light: {
                '--bg': '#F2F2F7',
                '--panel': '#FFFFFF',
                '--panel-dark': '#F2F2F7',
                '--border': '#E5E5EA',
                '--text': '#1D1D1F',
                '--text-muted': '#6E6E73',
                '--accent': '#007AFF',
                '--accent-strong': '#30D158',
                '--sidebar-width': '240px',
                '--danger': '#FF3B30',
                '--warn': '#FF9500',
                '--info': '#007AFF'
            }
        };

        this.storageKey = 'web-compiler-theme';
        this.init();
    }

    /**
     * 初始化主题管理器
     */
    init() {
        console.log('🎨 主题管理器初始化...');

        // 从存储中读取主题设置
        this.loadThemeFromStorage();

        // 应用当前主题
        this.applyTheme(this.currentTheme);

        // 绑定主题切换按钮事件
        this.bindThemeToggle();

        console.log(`✅ 主题管理器初始化完成，当前主题: ${this.currentTheme}`);
    }

    /**
     * 从本地存储加载主题设置
     */
    loadThemeFromStorage() {
        try {
            // 优先从全局设置读取
            if (window.globalSettings) {
                this.currentTheme = window.globalSettings.theme;
                return;
            }
            
            // 然后从本地存储读取（按优先级）
            const globalTheme = localStorage.getItem('global-theme-preference');
            if (globalTheme && this.themes[globalTheme]) {
                this.currentTheme = globalTheme;
                return;
            }
            
            const savedTheme = localStorage.getItem(this.storageKey);
            if (savedTheme && this.themes[savedTheme]) {
                this.currentTheme = savedTheme;
            } else {
                // 检查系统主题偏好
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                this.currentTheme = prefersDark ? 'dark' : 'light';
            }
        } catch (error) {
            console.warn('⚠️ 读取主题设置失败，使用默认主题:', error);
            this.currentTheme = 'dark';
        }
    }

    /**
     * 保存主题设置到本地存储
     */
    saveThemeToStorage() {
        try {
            localStorage.setItem(this.storageKey, this.currentTheme);
            // 同时保存到全局设置键
            localStorage.setItem('global-theme-preference', this.currentTheme);
            
            // 同步到全局设置
            if (window.globalSettings) {
                window.globalSettings.theme = this.currentTheme;
            }
        } catch (error) {
            console.warn('⚠️ 保存主题设置失败:', error);
        }
    }

    /**
     * 应用主题
     */
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) {
            console.error(`❌ 主题 "${themeName}" 不存在`);
            return;
        }

        const root = document.documentElement;
        Object.entries(theme).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // 设置HTML属性用于CSS选择器
        root.setAttribute('data-theme', themeName);

        // 更新按钮状态
        this.updateToggleButton(themeName);

        // 更新CodeMirror主题
        this.updateCodeMirrorTheme(themeName);

        console.log(`✅ 已应用 ${themeName} 主题`);
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.currentTheme = newTheme;
        this.applyTheme(newTheme);
        this.saveThemeToStorage();

        console.log(`🔄 主题已切换到: ${newTheme}`);
    }

    /**
     * 绑定主题切换按钮事件
     */
    bindThemeToggle() {
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });

            console.log('✅ 主题切换按钮事件绑定成功');
        } else {
            console.warn('⚠️ 找不到主题切换按钮');
        }

        // 监听系统主题变化
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // 如果用户手动设置过主题，则不跟随系统变化
            const hasManualSetting = localStorage.getItem(this.storageKey);
            if (!hasManualSetting) {
                const systemTheme = e.matches ? 'dark' : 'light';
                if (this.currentTheme !== systemTheme) {
                    this.currentTheme = systemTheme;
                    this.applyTheme(systemTheme);
                }
            }
        });

        // 监听语言变化事件，更新按钮文本
        window.addEventListener('languageChanged', () => {
            this.updateToggleButton(this.currentTheme);
        });
        
        // 监听全局主题变化事件（跨页面同步）
        window.addEventListener('themeChanged', (e) => {
            const newTheme = e.detail?.theme;
            if (newTheme && this.themes[newTheme] && this.currentTheme !== newTheme) {
                this.currentTheme = newTheme;
                this.applyTheme(newTheme);
                console.log('🔄 主题已从全局设置同步:', newTheme);
            }
        });
    }

    /**
     * 更新主题切换按钮状态
     */
    updateToggleButton(themeName) {
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            // 获取语言管理器
            const languageManager = window.languageManager;

            // 根据主题更新按钮图标和样式
            if (themeName === 'dark') {
                const darkText = languageManager ? languageManager.t('theme-dark') : '🌙 深色';
                themeToggleBtn.innerHTML = darkText;
                themeToggleBtn.className = 'theme-button theme-button-light';
            } else {
                const lightText = languageManager ? languageManager.t('theme-light') : '☀️ 浅色';
                themeToggleBtn.innerHTML = lightText;
                themeToggleBtn.className = 'theme-button theme-button-dark';
            }
        }
    }

    /**
     * 更新CodeMirror编辑器主题
     */
    updateCodeMirrorTheme(themeName) {
        // 如果编辑器已初始化，更新其主题
        if (window.editors && window.editors.getCodemirrorInstance) {
            const htmlEditor = window.editors.getCodemirrorInstance('html');
            const cssEditor = window.editors.getCodemirrorInstance('css');
            const jsEditor = window.editors.getCodemirrorInstance('js');

            // 使用更适合的主题
            const newTheme = themeName === 'dark' ? 'material-darker' : 'default';

            [htmlEditor, cssEditor, jsEditor].forEach(editor => {
                if (editor) {
                    editor.setOption('theme', newTheme);

                    // 如果是浅色模式，额外设置一些编辑器选项
                    if (themeName === 'light') {
                        editor.setOption('lineNumbers', true);
                        editor.refresh();
                    }
                }
            });

            console.log(`✅ CodeMirror主题已更新为: ${newTheme}`);

            // 强制刷新编辑器显示
            setTimeout(() => {
                [htmlEditor, cssEditor, jsEditor].forEach(editor => {
                    if (editor) {
                        editor.refresh();
                    }
                });
            }, 100);
        }
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 设置主题
     */
    setTheme(themeName) {
        if (this.themes[themeName] && this.currentTheme !== themeName) {
            this.currentTheme = themeName;
            this.applyTheme(themeName);
            this.saveThemeToStorage();
        }
    }

    /**
     * 获取可用主题列表
     */
    getAvailableThemes() {
        return Object.keys(this.themes);
    }
}