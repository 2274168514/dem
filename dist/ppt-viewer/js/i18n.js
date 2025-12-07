/**
 * 国际化语言配置
 */
export const i18nConfig = {
  zh: {
    "sidebar.my-ppts": "我的PPT",
    "sidebar.presentation-control": "演示控制",
    "sidebar.autoplay": "自动播放",
    "sidebar.loop-play": "循环播放",
    "sidebar.show-notes": "显示备注",
    "sidebar.upload-ppt": "上传PPT",
    "sidebar.file-types": ".ppt, .pptx",
    "sidebar.return-main": "返回主界面",
    "main.select-ppt": "请选择或上传PPT文件",
    "welcome.title": "欢迎使用PPT演示系统",
    "welcome.description": "支持在线演示PowerPoint文件",
    "welcome.supported-format": "PowerPoint (.ppt, .pptx)",
    "toolbar.theme": "主题",
    "toolbar.language": "语言",
    "toolbar.lang-switch": "中/EN",
    "toolbar.export-pdf": "导出PDF",
    "toolbar.fullscreen": "全屏",
    "shortcuts.title": "快捷键",
    "shortcuts.prev-page": "上一页",
    "shortcuts.next-page": "下一页",
    "shortcuts.first-page": "第一页",
    "shortcuts.last-page": "最后一页",
    "shortcuts.fullscreen": "全屏",
    "shortcuts.play-pause": "播放/暂停",
    "shortcuts.exit-fullscreen": "退出全屏",
    "speaker-notes.title": "演讲者备注",
    "no_ppts": "暂无PPT",
    "upload_success": "上传成功",
    "upload_failed": "上传失败",
    "file_too_large": "文件太大",
    "unsupported_type": "不支持的文件类型",
    "please_login": "请先登录",
    "server_error": "服务器错误",
    "delete_confirm": "确定要删除这个PPT吗？",
    "delete_success": "删除成功",
    "delete_failed": "删除失败"
  },
  en: {
    "sidebar.my-ppts": "My Presentations",
    "sidebar.presentation-control": "Presentation Control",
    "sidebar.autoplay": "Autoplay",
    "sidebar.loop-play": "Loop Play",
    "sidebar.show-notes": "Show Notes",
    "sidebar.upload-ppt": "Upload PPT",
    "sidebar.file-types": ".ppt, .pptx",
    "sidebar.return-main": "Back to Main",
    "main.select-ppt": "Please select or upload a PPT file",
    "welcome.title": "Welcome to PPT Viewer",
    "welcome.description": "Supports online PowerPoint presentations",
    "welcome.supported-format": "PowerPoint (.ppt, .pptx)",
    "toolbar.theme": "Theme",
    "toolbar.language": "Language",
    "toolbar.lang-switch": "EN/中",
    "toolbar.export-pdf": "Export PDF",
    "toolbar.fullscreen": "Fullscreen",
    "shortcuts.title": "Shortcuts",
    "shortcuts.prev-page": "Previous",
    "shortcuts.next-page": "Next",
    "shortcuts.first-page": "First",
    "shortcuts.last-page": "Last",
    "shortcuts.fullscreen": "Fullscreen",
    "shortcuts.play-pause": "Play/Pause",
    "shortcuts.exit-fullscreen": "Exit Fullscreen",
    "speaker-notes.title": "Speaker Notes",
    "no_ppts": "No presentations",
    "upload_success": "Upload successful",
    "upload_failed": "Upload failed",
    "file_too_large": "File too large",
    "unsupported_type": "Unsupported file type",
    "please_login": "Please login first",
    "server_error": "Server error",
    "delete_confirm": "Are you sure you want to delete this PPT?",
    "delete_success": "Delete successful",
    "delete_failed": "Delete failed"
  }
};

/**
 * 国际化管理器
 */
export class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('language') || 'zh';
    this.translations = i18nConfig;
  }

  /**
   * 切换语言
   */
  toggleLanguage() {
    this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('language', this.currentLang);
    this.updateLanguage();
  }

  /**
   * 获取当前语言
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * 获取翻译文本
   */
  t(key) {
    return this.translations[this.currentLang][key] || key;
  }

  /**
   * 更新页面语言
   */
  updateLanguage() {
    // 更新带有data-i18n属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });

    // 更新带有data-i18n-title属性的元素
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });

    // 更新语言按钮显示
    const langText = document.getElementById('lang-text');
    if (langText) {
      langText.textContent = this.currentLang === 'zh' ? 'EN' : '中';
    }

    // 更新HTML lang属性
    document.documentElement.lang = this.currentLang === 'zh' ? 'zh-CN' : 'en-US';

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: this.currentLang }
    }));
  }

  /**
   * 初始化
   */
  init() {
    this.updateLanguage();
  }
}