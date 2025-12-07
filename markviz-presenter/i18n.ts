export type Language = 'zh' | 'en';

export interface Translations {
  zh: {
    [key: string]: string;
  };
  en: {
    [key: string]: string;
  };
}

export const translations: Translations = {
  zh: {
    // 应用标题和导航
    'app.title': 'Markdown编辑器',
    'app.logo': 'M',

    // 模式相关
    'mode.presentation': '预览模式',
    'mode.editor': '编辑模式',

    // 按钮
    'button.edit': '编辑',
    'button.save': '保存导出',
    'button.return': '返回预览',
    'button.cancel': '取消',
    'button.import': '导入 Markdown 文件',
    'button.select_file': '选择本地 MD 文件',
    'button.back_to_main': '返回主应用',
    'button.insert_viz': '+ 可视化脚本',

    // 文件相关
    'file.select': '选择 Markdown 文件',
    'file.previous': '之前导入的文件',
    'file.none': '暂无之前导入的文件',
    'file.click_to_load': '点击加载此文件',
    'file.selected': '已选择',

    // 插入工具
    'insert.label': '插入:',
    'insert.link': '插入链接',
    'insert.image': '插入图片',
    'insert.video': '插入视频',
    'insert.ppt': '插入PPT',

    // 链接弹窗
    'link.text': '链接文字',
    'link.text_placeholder': '不填则显示链接地址',
    'link.url': '链接地址',
    'link.preview': '预览',
    'link.insert': '插入',
    'link.optional': '可选',

    // 占位符
    'placeholder.start_writing': '# 开始编写您的演示文稿...',

    // 欢迎界面
    'welcome.title': 'Markdown编辑器',
    'welcome.description': '选择一个 Markdown 文件开始您的交互式演示。',
    'welcome.imported_files': '已导入的文件',

    // 主题切换
    'theme.dark': '深色模式',
    'theme.light': '浅色模式',

    // 语言切换
    'lang.chinese': '中文',
    'lang.english': 'English',
    'lang.switch': '切换语言',

    // 媒体类型
    'media.open': '打开',
    'media.external': '外部链接',
    'media.image': '图片',
    'media.video': '视频',
    'media.pdf': 'PDF文档',
    'media.ppt': 'PPT演示文稿',

    // PPT 查看器
    'ppt.upload': '上传到云端',
    'ppt.uploading': '上传中...',
    'ppt.upload_hint': '上传到云端获取公网地址',
    'ppt.upload_first': '请先上传到云端',
    'ppt.view_online': '在线查看',
    'ppt.view_online_hint': '在 Office Online 中预览',
    'ppt.download': '下载',
    'ppt.config': '配置 Supabase',
    'ppt.fullscreen': '全屏',
    'ppt.exit_fullscreen': '退出全屏',
    'ppt.upload_prompt': '点击"上传到云端"按钮，即可使用 Microsoft Office Online 在线预览',
    'ppt.upload_tip': '提示：上传后文件将存储在云端，微软服务器可以访问并预览',
  },
  en: {
    // App title and navigation
    'app.title': 'Markdown Editor',
    'app.logo': 'M',

    // Mode related
    'mode.presentation': 'Presentation Mode',
    'mode.editor': 'Edit Mode',

    // Buttons
    'button.edit': 'Edit',
    'button.save': 'Save & Export',
    'button.return': 'Return to Preview',
    'button.cancel': 'Cancel',
    'button.import': 'Import Markdown File',
    'button.select_file': 'Select Local MD File',
    'button.back_to_main': 'Back to Main App',
    'button.insert_viz': '+ Visualization Script',

    // File related
    'file.select': 'Select Markdown File',
    'file.previous': 'Previously Imported Files',
    'file.none': 'No previously imported files',
    'file.click_to_load': 'Click to load this file',
    'file.selected': 'Selected',

    // Insert tools
    'insert.label': 'Insert:',
    'insert.link': 'Insert Link',
    'insert.image': 'Insert Image',
    'insert.video': 'Insert Video',
    'insert.ppt': 'Insert PPT',

    // Link modal
    'link.text': 'Link Text',
    'link.text_placeholder': 'Leave empty to show URL',
    'link.url': 'Link URL',
    'link.preview': 'Preview',
    'link.insert': 'Insert',
    'link.optional': 'optional',

    // Placeholders
    'placeholder.start_writing': '# Start writing your presentation...',

    // Welcome interface
    'welcome.title': 'Markdown Editor',
    'welcome.description': 'Select a Markdown file to start your interactive presentation.',
    'welcome.imported_files': 'Imported Files',

    // Theme toggle
    'theme.dark': 'Dark Mode',
    'theme.light': 'Light Mode',

    // Language toggle
    'lang.chinese': '中文',
    'lang.english': 'English',
    'lang.switch': 'Switch Language',

    // Media types
    'media.open': 'Open',
    'media.external': 'External Link',
    'media.image': 'Image',
    'media.video': 'Video',
    'media.pdf': 'PDF Document',
    'media.ppt': 'PPT Presentation',

    // PPT Viewer
    'ppt.upload': 'Upload to Cloud',
    'ppt.uploading': 'Uploading...',
    'ppt.upload_hint': 'Upload to cloud for public URL',
    'ppt.upload_first': 'Please upload to cloud first',
    'ppt.view_online': 'View Online',
    'ppt.view_online_hint': 'Preview in Office Online',
    'ppt.download': 'Download',
    'ppt.config': 'Configure Supabase',
    'ppt.fullscreen': 'Fullscreen',
    'ppt.exit_fullscreen': 'Exit Fullscreen',
    'ppt.upload_prompt': 'Click "Upload to Cloud" to preview with Microsoft Office Online',
    'ppt.upload_tip': 'Tip: Files will be stored in the cloud for Microsoft servers to access',
  }
};

export class I18n {
  private currentLanguage: Language = 'zh';
  private listeners: ((lang: Language) => void)[] = [];

  constructor() {
    // 优先从全局设置读取语言
    const globalLang = (window as any).globalSettings?.language 
      || localStorage.getItem('global-language-preference');
    if (globalLang && (globalLang === 'zh' || globalLang === 'en')) {
      this.currentLanguage = globalLang as Language;
    } else {
      // 然后从本地存储读取
      const saved = localStorage.getItem('markviz-language');
      this.currentLanguage = (saved as Language) || 'zh';
    }
    
    // 监听全局语言变化事件
    window.addEventListener('languageChanged', (e: Event) => {
      const customEvent = e as CustomEvent;
      const lang = customEvent.detail?.language as Language;
      if (lang && (lang === 'zh' || lang === 'en') && this.currentLanguage !== lang) {
        this.currentLanguage = lang;
        localStorage.setItem('markviz-language', lang);
        this.notifyListeners();
        console.log('🔄 markviz-presenter 语言已同步:', lang);
      }
    });
  }

  // 获取当前语言
  get current(): Language {
    return this.currentLanguage;
  }

  // 切换语言
  toggle(): void {
    this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
    // 保存到所有存储键
    localStorage.setItem('markviz-language', this.currentLanguage);
    localStorage.setItem('global-language-preference', this.currentLanguage);
    localStorage.setItem('language', this.currentLanguage);
    localStorage.setItem('preferred-language', this.currentLanguage);
    
    // 同步到全局设置
    if ((window as any).globalSettings) {
      (window as any).globalSettings.language = this.currentLanguage;
    }
    
    this.notifyListeners();
  }

  // 设置语言
  setLanguage(lang: Language): void {
    this.currentLanguage = lang;
    // 保存到所有存储键
    localStorage.setItem('markviz-language', this.currentLanguage);
    localStorage.setItem('global-language-preference', this.currentLanguage);
    localStorage.setItem('language', this.currentLanguage);
    localStorage.setItem('preferred-language', this.currentLanguage);
    
    // 同步到全局设置
    if ((window as any).globalSettings) {
      (window as any).globalSettings.language = this.currentLanguage;
    }
    
    this.notifyListeners();
  }

  // 获取翻译文本
  t(key: string): string {
    return translations[this.currentLanguage][key] || key;
  }

  // 监听语言变化
  onChange(callback: (lang: Language) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.currentLanguage));
  }
}

// 创建全局实例
export const i18n = new I18n();