/**
 * 全局设置管理器
 * 统一管理跨页面的主题和语言设置
 * 确保在不同页面之间保持一致的用户偏好
 */

(function() {
  'use strict';

  const STORAGE_KEYS = {
    THEME: 'global-theme-preference',
    LANGUAGE: 'global-language-preference'
  };

  const DEFAULTS = {
    THEME: 'dark',
    LANGUAGE: 'zh'
  };

  /**
   * 全局设置管理器
   */
  class GlobalSettings {
    constructor() {
      this._theme = this.loadTheme();
      this._language = this.loadLanguage();
      this._listeners = {
        theme: [],
        language: []
      };

      // 监听 storage 事件，实现跨标签页同步
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.THEME && e.newValue) {
          this._theme = e.newValue;
          this._notifyListeners('theme', e.newValue);
          this.applyTheme(e.newValue);
        }
        if (e.key === STORAGE_KEYS.LANGUAGE && e.newValue) {
          this._language = e.newValue;
          this._notifyListeners('language', e.newValue);
          this.applyLanguage(e.newValue);
        }
      });

      // 页面加载时自动应用设置
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.applyAll());
      } else {
        this.applyAll();
      }

      console.log('🌐 全局设置管理器已初始化', { theme: this._theme, language: this._language });
    }

    /**
     * 从 localStorage 加载主题设置
     */
    loadTheme() {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.THEME);
        if (saved && ['dark', 'light'].includes(saved)) {
          return saved;
        }
        // 兼容旧版存储键
        const legacyTheme = localStorage.getItem('web-compiler-theme') || localStorage.getItem('theme');
        if (legacyTheme && ['dark', 'light'].includes(legacyTheme)) {
          localStorage.setItem(STORAGE_KEYS.THEME, legacyTheme);
          return legacyTheme;
        }
        return DEFAULTS.THEME;
      } catch (e) {
        console.warn('读取主题设置失败:', e);
        return DEFAULTS.THEME;
      }
    }

    /**
     * 从 localStorage 加载语言设置
     */
    loadLanguage() {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
        if (saved && ['zh', 'en'].includes(saved)) {
          return saved;
        }
        // 兼容旧版存储键
        const legacyLang = localStorage.getItem('preferred-language') || localStorage.getItem('language');
        if (legacyLang && ['zh', 'en'].includes(legacyLang)) {
          localStorage.setItem(STORAGE_KEYS.LANGUAGE, legacyLang);
          return legacyLang;
        }
        return DEFAULTS.LANGUAGE;
      } catch (e) {
        console.warn('读取语言设置失败:', e);
        return DEFAULTS.LANGUAGE;
      }
    }

    /**
     * 获取当前主题
     */
    get theme() {
      return this._theme;
    }

    /**
     * 设置主题
     */
    set theme(value) {
      if (['dark', 'light'].includes(value) && this._theme !== value) {
        this._theme = value;
        try {
          localStorage.setItem(STORAGE_KEYS.THEME, value);
          // 同时更新旧版存储键以保持兼容
          localStorage.setItem('web-compiler-theme', value);
          localStorage.setItem('theme', value);
        } catch (e) {
          console.warn('保存主题设置失败:', e);
        }
        this.applyTheme(value);
        this._notifyListeners('theme', value);
        console.log('🎨 主题已切换:', value);
      }
    }

    /**
     * 获取当前语言
     */
    get language() {
      return this._language;
    }

    /**
     * 设置语言
     */
    set language(value) {
      if (['zh', 'en'].includes(value) && this._language !== value) {
        this._language = value;
        try {
          localStorage.setItem(STORAGE_KEYS.LANGUAGE, value);
          // 同时更新旧版存储键以保持兼容
          localStorage.setItem('preferred-language', value);
          localStorage.setItem('language', value);
        } catch (e) {
          console.warn('保存语言设置失败:', e);
        }
        this.applyLanguage(value);
        this._notifyListeners('language', value);
        console.log('🌍 语言已切换:', value);
      }
    }

    /**
     * 切换主题
     */
    toggleTheme() {
      this.theme = this._theme === 'dark' ? 'light' : 'dark';
      return this._theme;
    }

    /**
     * 切换语言
     */
    toggleLanguage() {
      this.language = this._language === 'zh' ? 'en' : 'zh';
      return this._language;
    }

    /**
     * 应用主题到当前页面
     */
    applyTheme(theme) {
      const root = document.documentElement;
      const body = document.body;

      // 设置 data-theme 属性
      root.setAttribute('data-theme', theme);

      // 添加/移除 light-theme 类
      if (theme === 'light') {
        body.classList.add('light-theme');
        root.classList.add('light-theme');
      } else {
        body.classList.remove('light-theme');
        root.classList.remove('light-theme');
      }

      // 更新主题切换按钮图标
      this._updateThemeButtons(theme);

      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    /**
     * 应用语言到当前页面
     */
    applyLanguage(lang) {
      // 设置 HTML lang 属性
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

      // 更新所有带 data-i18n 属性的元素
      this._updateI18nElements(lang);

      // 更新语言切换按钮
      this._updateLanguageButtons(lang);

      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }

    /**
     * 应用所有设置
     */
    applyAll() {
      this.applyTheme(this._theme);
      this.applyLanguage(this._language);
    }

    /**
     * 更新主题切换按钮
     */
    _updateThemeButtons(theme) {
      // 通用主题切换按钮
      const themeButtons = document.querySelectorAll('[id*="theme-toggle"], [id*="theme-btn"], .theme-toggle-btn');
      themeButtons.forEach(btn => {
        const sunIcon = btn.querySelector('.sun-icon, [data-icon="sun"]');
        const moonIcon = btn.querySelector('.moon-icon, [data-icon="moon"]');
        
        if (sunIcon && moonIcon) {
          if (theme === 'light') {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
          } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
          }
        }

        // 更新按钮 title
        const titleKey = theme === 'light' ? 'switchToDark' : 'switchToLight';
        const titles = {
          zh: { switchToDark: '切换到深色模式', switchToLight: '切换到浅色模式' },
          en: { switchToDark: 'Switch to Dark Mode', switchToLight: 'Switch to Light Mode' }
        };
        btn.title = titles[this._language]?.[titleKey] || '';
      });

      // 特定页面的主题图标
      const themeIconLight = document.getElementById('theme-icon-light');
      const themeIconDark = document.getElementById('theme-icon-dark');
      if (themeIconLight && themeIconDark) {
        if (theme === 'light') {
          themeIconLight.classList.add('hidden');
          themeIconDark.classList.remove('hidden');
        } else {
          themeIconLight.classList.remove('hidden');
          themeIconDark.classList.add('hidden');
        }
      }
    }

    /**
     * 更新语言切换按钮
     */
    _updateLanguageButtons(lang) {
      const langButtons = document.querySelectorAll('[id*="lang-toggle"], [id*="lang-btn"], .lang-toggle-btn');
      langButtons.forEach(btn => {
        const textEl = btn.querySelector('#lang-text, .lang-text');
        if (textEl) {
          textEl.textContent = lang === 'zh' ? '中' : 'EN';
        }
      });
    }

    /**
     * 更新带 data-i18n 属性的元素
     */
    _updateI18nElements(lang) {
      // 如果页面有 i18n 对象，使用它来翻译
      if (window.i18n && typeof window.i18n.setLanguage === 'function') {
        window.i18n.setLanguage(lang);
        return;
      }

      // 否则使用内置的基本翻译
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = this._getTranslation(key, lang);
        if (translation) {
          el.textContent = translation;
        }
      });

      // 更新 placeholder
      const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
      placeholders.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translation = this._getTranslation(key, lang);
        if (translation) {
          el.placeholder = translation;
        }
      });

      // 更新 title
      const titles = document.querySelectorAll('[data-i18n-title]');
      titles.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const translation = this._getTranslation(key, lang);
        if (translation) {
          el.title = translation;
        }
      });
    }

    /**
     * 获取翻译文本（基本翻译表）
     */
    _getTranslation(key, lang) {
      const translations = {
        zh: {
          // 通用
          'back_to_main': '返回主界面',
          'my_documents': '我的文档',
          'upload_document': '上传文档',
          'select_document': '请选择或上传文档',
          'welcome_title': '欢迎使用文档演示系统',
          'welcome_desc': '支持在线预览 PDF 和 Markdown 文件',
          'visualization': '可视化图表',
          'hide_sidebar': '隐藏侧边栏',
          'show_sidebar': '显示侧边栏',
          // PPT Viewer
          'ppt_viewer': 'PPT演示系统',
          'upload_ppt': '上传PPT',
          'select_ppt': '请选择或上传PPT文件',
          // 设置
          'settings': '设置',
          'theme': '主题',
          'language': '语言',
          'dark_mode': '深色模式',
          'light_mode': '浅色模式'
        },
        en: {
          // Common
          'back_to_main': 'Back to Main',
          'my_documents': 'My Documents',
          'upload_document': 'Upload Document',
          'select_document': 'Select or upload a document',
          'welcome_title': 'Welcome to Document Viewer',
          'welcome_desc': 'Support online preview of PDF and Markdown files',
          'visualization': 'Visualization',
          'hide_sidebar': 'Hide Sidebar',
          'show_sidebar': 'Show Sidebar',
          // PPT Viewer
          'ppt_viewer': 'PPT Presentation',
          'upload_ppt': 'Upload PPT',
          'select_ppt': 'Select or upload a PPT file',
          // Settings
          'settings': 'Settings',
          'theme': 'Theme',
          'language': 'Language',
          'dark_mode': 'Dark Mode',
          'light_mode': 'Light Mode'
        }
      };

      return translations[lang]?.[key] || null;
    }

    /**
     * 添加监听器
     */
    on(event, callback) {
      if (this._listeners[event]) {
        this._listeners[event].push(callback);
      }
    }

    /**
     * 移除监听器
     */
    off(event, callback) {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
      }
    }

    /**
     * 通知监听器
     */
    _notifyListeners(event, value) {
      if (this._listeners[event]) {
        this._listeners[event].forEach(callback => {
          try {
            callback(value);
          } catch (e) {
            console.error('监听器回调错误:', e);
          }
        });
      }
    }
  }

  // 创建全局实例
  window.globalSettings = new GlobalSettings();

  // 提供便捷方法
  window.getTheme = () => window.globalSettings.theme;
  window.setTheme = (theme) => { window.globalSettings.theme = theme; };
  window.toggleTheme = () => window.globalSettings.toggleTheme();

  window.getLanguage = () => window.globalSettings.language;
  window.setLanguage = (lang) => { window.globalSettings.language = lang; };
  window.toggleLanguage = () => window.globalSettings.toggleLanguage();

})();
