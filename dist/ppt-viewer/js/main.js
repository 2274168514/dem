/**
 * PPT演示模块主页面功能
 */

// ========== 内置依赖类 ==========

// 简化的 DatabaseManager（仅用于API调用）
class DatabaseManager {
  constructor() {
    this.apiBase = 'http://localhost:5024/api';
  }
}

// 简化的 I18nManager
class I18nManager {
  constructor() {
    // 从全局设置读取语言，兼容旧版存储
    this.currentLang = (window.globalSettings && window.globalSettings.language) 
      || localStorage.getItem('global-language-preference')
      || localStorage.getItem('preferred-language')
      || localStorage.getItem('language') 
      || 'zh';
    this.translations = {
      zh: {
        'sidebar.my-ppts': '我的PPT',
        'sidebar.presentation-control': '演示控制',
        'sidebar.autoplay': '自动播放',
        'sidebar.loop-play': '循环播放',
        'sidebar.show-notes': '显示备注',
        'sidebar.upload-ppt': '上传PPT',
        'sidebar.file-types': '.ppt, .pptx',
        'sidebar.return-main': '返回主界面',
        'main.select-ppt': '请选择或上传PPT文件',
        'toolbar.language': '切换语言',
        'toolbar.theme': '切换主题',
        'toolbar.export-pdf': '导出PDF',
        'toolbar.fullscreen': '全屏',
        'welcome.title': '欢迎使用PPT演示系统',
        'welcome.description': '支持在线演示PowerPoint文件',
        'welcome.supported-format': 'PowerPoint (.ppt, .pptx)'
      },
      en: {
        'sidebar.my-ppts': 'My PPTs',
        'sidebar.presentation-control': 'Presentation Control',
        'sidebar.autoplay': 'Autoplay',
        'sidebar.loop-play': 'Loop Play',
        'sidebar.show-notes': 'Show Notes',
        'sidebar.upload-ppt': 'Upload PPT',
        'sidebar.file-types': '.ppt, .pptx',
        'sidebar.return-main': 'Return to Main',
        'main.select-ppt': 'Please select or upload PPT file',
        'toolbar.language': 'Language',
        'toolbar.theme': 'Theme',
        'toolbar.export-pdf': 'Export PDF',
        'toolbar.fullscreen': 'Fullscreen',
        'welcome.title': 'Welcome to PPT Presentation System',
        'welcome.description': 'Online PowerPoint presentation support',
        'welcome.supported-format': 'PowerPoint (.ppt, .pptx)'
      }
    };
  }

  t(key) {
    return this.translations[this.currentLang]?.[key] || key;
  }

  init() {
    // 初始化：更新UI上的所有文本
    this.updateUI();
  }

  toggleLanguage() {
    // 使用全局设置管理器
    if (window.globalSettings) {
      window.globalSettings.toggleLanguage();
      this.currentLang = window.globalSettings.language;
    } else {
      this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
      localStorage.setItem('language', this.currentLang);
    }
    this.updateUI();
  }

  updateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
  }
}

// 简化的 CanvasRenderer（占位）
class CanvasRenderer {
  constructor() {}
  init() {}
  render() {}
}

// ========== 主类 ==========

class PPTViewer {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.currentPPT = null;
    this.ppts = [];
    this.autoplay = false;
    this.loop = false;
    this.showNotes = false;
    this.localPreview = null;
    this.currentViewMode = 'online'; // 'online' 或 'local'
    // 添加图片查看器相关属性
    this.images = null;
    this.currentPage = 0;
    this.currentZoom = 1;

    // 从全局设置读取主题和语言，兼容旧版存储
    this.currentTheme = (window.globalSettings && window.globalSettings.theme)
      || localStorage.getItem('global-theme-preference')
      || localStorage.getItem('theme') 
      || 'dark';
    this.i18nManager = new I18nManager();

    // 添加Canvas渲染器
    this.canvasRenderer = new CanvasRenderer();

    // Supabase 相关状态
    this.uploadProgress = 0;
    this.publicUrl = null;
    this.isFullscreen = false;

    // 本地 PPT 历史记录 (存储在 localStorage)
    this.localPPTHistory = this.loadLocalPPTHistory();

    this.init();
  }

  // 加载本地 PPT 历史记录
  loadLocalPPTHistory() {
    try {
      const history = localStorage.getItem('ppt-viewer-history');
      return history ? JSON.parse(history) : [];
    } catch (e) {
      return [];
    }
  }

  // 保存 PPT 到本地历史记录
  saveToLocalHistory(pptInfo) {
    // 检查是否已存在相同的记录（按 publicUrl 判断）
    const existingIndex = this.localPPTHistory.findIndex(p => p.publicUrl === pptInfo.publicUrl);
    if (existingIndex >= 0) {
      // 更新已有记录
      this.localPPTHistory[existingIndex] = { ...this.localPPTHistory[existingIndex], ...pptInfo, updated_at: new Date().toISOString() };
    } else {
      // 添加新记录
      this.localPPTHistory.unshift({
        id: `local_${Date.now()}`,
        title: pptInfo.title,
        publicUrl: pptInfo.publicUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isLocal: true
      });
    }
    
    // 最多保存 50 条记录
    if (this.localPPTHistory.length > 50) {
      this.localPPTHistory = this.localPPTHistory.slice(0, 50);
    }
    
    localStorage.setItem('ppt-viewer-history', JSON.stringify(this.localPPTHistory));
    this.renderPPTList();
  }

  // 从本地历史删除
  deleteFromLocalHistory(id) {
    this.localPPTHistory = this.localPPTHistory.filter(p => p.id !== id);
    localStorage.setItem('ppt-viewer-history', JSON.stringify(this.localPPTHistory));
    this.renderPPTList();
  }

  async init() {
    // 初始化主题和语言
    this.initializeThemeAndLanguage();

    // 加载用户PPT
    await this.loadPPTs();

    // 绑定事件
    this.bindEvents();
  }

  bindEvents() {
    // 侧边栏隐藏/显示
    const toggleBtn = document.getElementById('toggle-sidebar');
    const showBtn = document.getElementById('show-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.add('hidden');
      mainContent.classList.add('full-width');
      setTimeout(() => {
        sidebar.style.display = 'none';
        showBtn.classList.remove('hidden');
        setTimeout(() => {
          showBtn.classList.add('visible');
        }, 50);
      }, 300);
    });

    showBtn.addEventListener('click', () => {
      showBtn.classList.remove('visible');
      sidebar.style.display = 'flex';
      setTimeout(() => {
        sidebar.classList.remove('hidden');
        mainContent.classList.remove('full-width');
      }, 50);
      setTimeout(() => {
        showBtn.classList.add('hidden');
      }, 300);
    });

    // 演示控制
    const autoplayToggle = document.getElementById('autoplay-toggle');
    if (autoplayToggle) {
      autoplayToggle.addEventListener('click', () => {
        this.toggleAutoplay();
      });
    }

    const loopToggle = document.getElementById('loop-toggle');
    if (loopToggle) {
      loopToggle.addEventListener('click', () => {
        this.toggleLoop();
      });
    }

    const notesToggle = document.getElementById('notes-toggle');
    if (notesToggle) {
      notesToggle.addEventListener('click', () => {
        this.toggleNotes();
      });
    }

    // 文件上传
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');

    if (dropZone && fileInput) {
      // 点击上传
      dropZone.addEventListener('click', () => {
        fileInput.click();
      });

      // 文件选择
      fileInput.addEventListener('change', (e) => {
        this.handleFileUpload(e.target.files);
      });

      // 拖拽上传
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        this.handleFileUpload(e.dataTransfer.files);
      });
    }

    // 快捷键按钮
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const shortcutsHint = document.getElementById('shortcuts-hint');
    if (shortcutsBtn && shortcutsHint) {
      shortcutsBtn.addEventListener('click', () => {
        shortcutsHint.classList.toggle('show');
      });
    }

    // 工具栏按钮
    this.bindToolbarEvents();
  }

  bindToolbarEvents() {
    // 主题切换
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // 语言切换
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        this.i18nManager.toggleLanguage();
      });
    }

    // 导出PDF
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => {
        this.exportPDF();
      });
    }

    // 全屏按钮
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }
  }

  async loadPPTs() {
    // 直接使用本地历史记录，不再依赖服务器
    this.ppts = this.localPPTHistory;
    console.log('[PPTViewer] 加载本地PPT历史，共', this.ppts.length, '个PPT');
    this.renderPPTList();
  }

  renderPPTList() {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';

    const lang = this.i18nManager.currentLang || 'zh';
    const emptyText = lang === 'en' ? 'No PPT files' : '暂无PPT';
    const emptyHint = lang === 'en' ? 'Upload a PPT to get started' : '上传 PPT 文件开始预览';

    if (this.ppts.length === 0) {
      fileList.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <p>${emptyText}</p>
          <p class="text-xs mt-1">${emptyHint}</p>
        </div>
      `;
      return;
    }

    this.ppts.forEach(ppt => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      const deleteHandler = ppt.isLocal ? `pptViewer.deleteLocalPPT('${ppt.id}')` : `pptViewer.deletePPT(${ppt.id})`;
      fileItem.innerHTML = `
        <div class="file-icon ppt">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-white font-medium truncate">${ppt.title}</h4>
          <p class="text-gray-400 text-sm">${this.formatDate(ppt.updated_at)}</p>
        </div>
        <button onclick="event.stopPropagation(); ${deleteHandler}" class="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      `;

      fileItem.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.openPPT(ppt);
        }
      });

      fileList.appendChild(fileItem);
    });
  }

  // 删除本地历史记录
  deleteLocalPPT(id) {
    const lang = this.i18nManager.currentLang || 'zh';
    const confirmText = lang === 'en' ? 'Delete this PPT from history?' : '确定要从历史记录中删除这个PPT吗？';
    if (!confirm(confirmText)) return;
    
    this.deleteFromLocalHistory(id);
    
    // 如果删除的是当前PPT，清空预览
    if (this.currentPPT && this.currentPPT.id === id) {
      this.currentPPT = null;
      document.getElementById('ppt-title').textContent = lang === 'en' ? 'Select or upload a PPT file' : '请选择或上传PPT文件';
      document.getElementById('ppt-info').textContent = '';
      document.getElementById('welcome-message').classList.remove('hidden');
      document.getElementById('ppt-viewer').classList.add('hidden');
      document.getElementById('fullscreen-btn').disabled = true;
      document.getElementById('export-pdf-btn').disabled = true;
    }
    
    this.showMessage(lang === 'en' ? 'Deleted' : '删除成功', 'success');
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const lang = this.i18nManager?.currentLang || 'zh';

    if (lang === 'en') {
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      return date.toLocaleDateString('en-US');
    } else {
      if (days === 0) return '今天';
      if (days === 1) return '昨天';
      if (days < 7) return `${days}天前`;
      return date.toLocaleDateString('zh-CN');
    }
  }

  async openPPT(ppt) {
    if (!ppt) {
      console.error('[PPTViewer] openPPT: ppt 对象为空');
      return;
    }
    
    console.log('[PPTViewer] 打开 PPT:', ppt);
    this.currentPPT = ppt;

    // 更新标题
    document.getElementById('ppt-title').textContent = ppt.title || '未命名PPT';
    document.getElementById('ppt-info').textContent = ppt.updated_at ? this.formatDate(ppt.updated_at) : '';

    // 显示预览区域
    document.getElementById('welcome-message').classList.add('hidden');
    document.getElementById('ppt-viewer').classList.remove('hidden');

    // 启用工具栏按钮
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (fullscreenBtn) fullscreenBtn.disabled = false;
    if (exportPdfBtn) exportPdfBtn.disabled = false;

    // 如果有 publicUrl，直接显示预览（优先使用已上传的云端链接）
    if (ppt.publicUrl) {
      const lang = this.i18nManager.currentLang || 'zh';
      this.showLoadingUI(lang === 'en' ? 'Loading preview...' : '正在加载预览...');
      setTimeout(() => {
        this.showOfficeOnlinePreview(ppt.publicUrl, ppt.title || 'presentation.pptx');
      }, 300);
      return;
    }

    // 如果是服务器上的文件（有 id 但没有 publicUrl），从服务器下载并上传到 Supabase
    if (ppt.id && !ppt.publicUrl) {
      await this.downloadAndPreview(ppt);
      return;
    }

    // 如果都没有，显示错误
    console.error('[PPTViewer] PPT 对象缺少必要信息:', ppt);
    const lang = this.i18nManager.currentLang || 'zh';
    this.showMessage(lang === 'en' ? 'Invalid PPT record' : 'PPT记录无效', 'error');
  }

  // 从服务器下载 PPT 并上传到 Supabase 预览
  async downloadAndPreview(ppt) {
    const viewUrl = `${this.dbManager.apiBase}/documents/${ppt.id}/view`;
    const lang = this.i18nManager.currentLang || 'zh';
    
    const texts = {
      zh: {
        downloading: '正在获取文件...',
        uploading: '正在上传到云端...',
        loading: '正在加载预览...',
        failed: '服务器文件不可用，请重新选择本地文件',
        selectFile: '选择本地 PPT 文件预览',
        dragOrClick: '点击或拖拽文件到此处'
      },
      en: {
        downloading: 'Fetching file...',
        uploading: 'Uploading to cloud...',
        loading: 'Loading preview...',
        failed: 'Server file unavailable, please select a local file',
        selectFile: 'Select Local PPT File to Preview',
        dragOrClick: 'Click or drag file here'
      }
    };
    const t = texts[lang] || texts.zh;

    // 显示加载界面
    this.showLoadingUI(t.downloading);

    try {
      // 1. 从服务器下载 PPT 文件
      console.log('[PPTViewer] 正在从服务器下载 PPT:', viewUrl);
      const response = await fetch(viewUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 检查响应类型是否为 PPT 文件
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/') && !contentType.includes('octet-stream')) {
        throw new Error('Invalid file type');
      }

      const blob = await response.blob();
      
      // 检查文件大小，避免空文件或错误页面
      if (blob.size < 1000) {
        throw new Error('File too small or invalid');
      }

      const file = new File([blob], ppt.title || 'presentation.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      console.log('[PPTViewer] 文件下载成功，大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      // 2. 上传到 Supabase 并预览
      this.updateLoadingStatus(t.uploading);
      await this.uploadToSupabaseAndPreview(file);

    } catch (error) {
      console.error('[PPTViewer] 预览失败:', error);
      
      // 显示重新选择文件的界面
      this.showReuploadUI(ppt.title, t);
    }
  }

  // 显示重新上传界面
  showReuploadUI(title, texts) {
    const pptViewer = document.getElementById('ppt-viewer');
    pptViewer.innerHTML = `
      <div class="h-full w-full flex items-center justify-center">
        <div class="text-center">
          <div class="mb-6">
            <svg class="w-16 h-16 mx-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-gray-400 mt-2">${texts.failed}</p>
          </div>
          <label class="cursor-pointer block">
            <div class="border-2 border-dashed border-orange-500 rounded-xl p-8 hover:bg-orange-500/10 transition-all">
              <svg class="w-12 h-12 mx-auto mb-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <h3 class="text-lg font-bold text-white mb-1">${texts.selectFile}</h3>
              <p class="text-gray-400 text-sm">${texts.dragOrClick}</p>
            </div>
            <input type="file" accept=".pptx,.ppt" class="hidden" id="reupload-input">
          </label>
        </div>
      </div>
    `;

    // 绑定文件选择事件
    const fileInput = document.getElementById('reupload-input');
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.handleFileUpload(e.target.files);
      }
    });
  }

  // 显示加载界面
  showLoadingUI(status) {
    const pptViewer = document.getElementById('ppt-viewer');
    pptViewer.innerHTML = `
      <div class="h-full w-full flex items-center justify-center">
        <div class="text-center">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p id="loading-status" class="text-gray-300">${status}</p>
          <div class="mt-4 w-64 mx-auto">
            <div class="w-full bg-gray-700 rounded-full h-2">
              <div id="upload-progress-bar" class="bg-orange-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <p id="upload-percent" class="text-gray-400 text-sm mt-1">0%</p>
          </div>
        </div>
      </div>
    `;
  }

  // 更新加载状态
  updateLoadingStatus(status) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) statusEl.textContent = status;
  }

  // 上传到 Supabase 并显示 Office Online 预览
  async uploadToSupabaseAndPreview(file) {
    const lang = this.i18nManager.currentLang || 'zh';
    const t = lang === 'en' ? { loading: 'Loading preview...' } : { loading: '正在加载预览...' };

    // 生成安全的文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop().toLowerCase();
    const safeFileName = `ppt_${timestamp}_${randomStr}.${ext}`;
    const filePath = `ppt-files/${safeFileName}`;

    console.log('[PPTViewer] 开始上传到 Supabase:', safeFileName);

    const progressBar = document.getElementById('upload-progress-bar');
    const percentText = document.getElementById('upload-percent');

    const publicUrl = await this.uploadWithProgress(file, filePath, (progress) => {
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (percentText) percentText.textContent = `${progress}%`;
    });

    if (publicUrl) {
      console.log('[PPTViewer] 上传成功，公开URL:', publicUrl);
      this.publicUrl = publicUrl;
      this.updateLoadingStatus(t.loading);
      
      // 保存到本地历史记录
      this.saveToLocalHistory({
        title: file.name,
        publicUrl: publicUrl
      });
      
      // 延迟显示预览
      setTimeout(() => {
        this.showOfficeOnlinePreview(publicUrl, file.name);
      }, 500);
    } else {
      throw new Error('上传失败');
    }
  }

  async handleFileUpload(files) {
    const file = files[0];
    if (!file) return;

    // 检查文件类型
    const type = this.getFileType(file);
    if (type !== 'ppt') {
      this.showMessage(`不支持的文件类型: ${file.name}`, 'error');
      return;
    }

    // 检查文件大小 (200MB限制)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      this.showMessage(`文件太大: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`, 'error');
      return;
    }

    // 设置当前 PPT 信息
    this.currentPPT = { title: file.name };
    document.getElementById('ppt-title').textContent = file.name;
    document.getElementById('ppt-info').textContent = '本地文件';

    // 显示预览区域
    document.getElementById('welcome-message').classList.add('hidden');
    document.getElementById('ppt-viewer').classList.remove('hidden');

    // 启用工具栏按钮
    document.getElementById('fullscreen-btn').disabled = false;
    document.getElementById('export-pdf-btn').disabled = false;

    const lang = this.i18nManager.currentLang || 'zh';
    const t = lang === 'en' ? { uploading: 'Uploading to cloud...' } : { uploading: '正在上传到云端...' };

    // 显示加载界面
    this.showLoadingUI(t.uploading);

    try {
      // 直接上传到 Supabase 并预览
      await this.uploadToSupabaseAndPreview(file);
      this.showMessage(lang === 'en' ? 'Upload successful' : '上传成功', 'success');
    } catch (error) {
      console.error('[PPTViewer] 上传失败:', error);
      this.showMessage(`${lang === 'en' ? 'Upload failed' : '上传失败'}: ${error.message}`, 'error');
      // 回到欢迎界面
      document.getElementById('welcome-message').classList.remove('hidden');
      document.getElementById('ppt-viewer').classList.add('hidden');
    }
  }

  getFileType(file) {
    const type = file.type.toLowerCase();
    if (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) {
      return 'ppt';
    }
    return null;
  }

  async deletePPT(pptId) {
    if (!confirm('确定要删除这个PPT吗？')) return;

    try {
      await this.dbManager.deleteDocument(pptId);
      this.showMessage('删除成功', 'success');
      await this.loadPPTs();

      // 如果删除的是当前PPT，清空预览
      if (this.currentPPT && this.currentPPT.id === pptId) {
        this.currentPPT = null;
        document.getElementById('ppt-title').textContent = '请选择或上传PPT文件';
        document.getElementById('ppt-info').textContent = '';
        document.getElementById('welcome-message').classList.remove('hidden');
        document.getElementById('ppt-viewer').classList.add('hidden');

        // 禁用工具栏按钮（已移除grid-view-btn）
        document.getElementById('fullscreen-btn').disabled = true;
        document.getElementById('export-pdf-btn').disabled = true;
      }
    } catch (error) {
      console.error('删除失败:', error);
      this.showMessage('删除失败', 'error');
    }
  }

  // ========== 演示控制方法 ==========

  // 切换自动播放
  toggleAutoplay() {
    this.autoplay = !this.autoplay;
    const btn = document.getElementById('autoplay-toggle');
    
    if (btn) {
      btn.classList.toggle('bg-gray-700', !this.autoplay);
      btn.classList.toggle('bg-blue-600', this.autoplay);
      btn.classList.toggle('active', this.autoplay);
    }
    
    // 更新右键菜单中的状态
    this.updateContextMenuState();
    
    // 控制自动播放
    if (this.autoplay) {
      this.startAutoplay();
    } else {
      this.stopAutoplay();
    }
    
    console.log('[PPTViewer] 自动播放:', this.autoplay ? '开启' : '关闭');
  }

  // 切换循环播放
  toggleLoop() {
    this.loop = !this.loop;
    const btn = document.getElementById('loop-toggle');
    
    if (btn) {
      btn.classList.toggle('bg-gray-700', !this.loop);
      btn.classList.toggle('bg-blue-600', this.loop);
      btn.classList.toggle('active', this.loop);
    }
    
    // 更新右键菜单中的状态
    this.updateContextMenuState();
    
    console.log('[PPTViewer] 循环播放:', this.loop ? '开启' : '关闭');
  }

  // 切换显示备注
  toggleNotes() {
    this.showNotes = !this.showNotes;
    const btn = document.getElementById('notes-toggle');
    const pptViewer = document.getElementById('ppt-viewer');
    
    if (btn) {
      btn.classList.toggle('bg-gray-700', !this.showNotes);
      btn.classList.toggle('bg-blue-600', this.showNotes);
      btn.classList.toggle('active', this.showNotes);
    }
    
    // 显示/隐藏备注面板
    let notesPanel = document.getElementById('speaker-notes');
    
    if (this.showNotes) {
      // 如果备注面板不存在，创建它
      if (!notesPanel && pptViewer) {
        notesPanel = document.createElement('div');
        notesPanel.id = 'speaker-notes';
        notesPanel.className = 'speaker-notes-panel';
        notesPanel.innerHTML = `
          <div class="notes-header">
            <span>演讲者备注</span>
            <button onclick="pptViewer.toggleNotes()" class="notes-close-btn">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="notes-content">
            <p class="text-gray-400 text-sm">当前幻灯片没有备注内容。</p>
            <p class="text-gray-500 text-xs mt-2">提示：Office Online 预览模式下无法提取备注。</p>
          </div>
        `;
        // 添加样式
        this.addNotesStyles();
        pptViewer.parentElement.appendChild(notesPanel);
      }
      if (notesPanel) {
        notesPanel.classList.add('show');
      }
    } else {
      if (notesPanel) {
        notesPanel.classList.remove('show');
      }
    }
    
    console.log('[PPTViewer] 显示备注:', this.showNotes ? '开启' : '关闭');
  }

  // 添加备注面板样式
  addNotesStyles() {
    if (document.getElementById('notes-panel-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'notes-panel-styles';
    style.textContent = `
      .speaker-notes-panel {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(31, 41, 55, 0.95);
        backdrop-filter: blur(10px);
        border-top: 1px solid #374151;
        padding: 12px 16px;
        transform: translateY(100%);
        transition: transform 0.3s ease;
        z-index: 20;
        max-height: 150px;
        overflow-y: auto;
      }
      .speaker-notes-panel.show {
        transform: translateY(0);
      }
      .notes-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        color: #fff;
        font-size: 14px;
        font-weight: 500;
      }
      .notes-close-btn {
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .notes-close-btn:hover {
        color: #fff;
        background: rgba(255,255,255,0.1);
      }
      .notes-content {
        color: #d1d5db;
        font-size: 13px;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }

  // 更新右键菜单状态
  updateContextMenuState() {
    const contextMenu = document.getElementById('ppt-context-menu');
    if (!contextMenu) return;
    
    // 更新自动播放状态
    const autoplayItem = contextMenu.querySelector('[data-action="autoplay"]');
    if (autoplayItem) {
      const statusSpan = autoplayItem.querySelector('.ml-auto');
      if (statusSpan) {
        statusSpan.textContent = this.autoplay ? '✓' : '';
        statusSpan.className = `ml-auto text-xs ${this.autoplay ? 'text-green-400' : 'text-gray-500'}`;
      }
    }
    
    // 更新循环播放状态
    const loopItem = contextMenu.querySelector('[data-action="loop"]');
    if (loopItem) {
      const statusSpan = loopItem.querySelector('.ml-auto');
      if (statusSpan) {
        statusSpan.textContent = this.loop ? '✓' : '';
        statusSpan.className = `ml-auto text-xs ${this.loop ? 'text-green-400' : 'text-gray-500'}`;
      }
    }
  }

  // 开始自动播放 - 模拟翻页提示
  startAutoplay() {
    if (this.autoplayInterval) return;
    
    this.autoplayInterval = setInterval(() => {
      if (!this.autoplay) {
        this.stopAutoplay();
        return;
      }
      // 显示翻页提示（Office Online无法直接控制）
      this.showAutoplayIndicator();
    }, 5000);
  }

  // 显示自动播放指示器
  showAutoplayIndicator() {
    let indicator = document.getElementById('autoplay-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'autoplay-indicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 9999;
        animation: fadeInOut 2s ease;
        pointer-events: none;
      `;
      document.body.appendChild(indicator);
      
      // 添加动画样式
      if (!document.getElementById('autoplay-indicator-style')) {
        const style = document.createElement('style');
        style.id = 'autoplay-indicator-style';
        style.textContent = `
          @keyframes fadeInOut {
            0%, 100% { opacity: 0; transform: translateY(10px); }
            20%, 80% { opacity: 1; transform: translateY(0); }
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    indicator.textContent = '⏵ 自动播放中 - 按空格键翻页';
    indicator.style.animation = 'none';
    indicator.offsetHeight; // 触发重排
    indicator.style.animation = 'fadeInOut 2s ease';
  }

  // 停止自动播放
  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
    const indicator = document.getElementById('autoplay-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // ========== 全屏和其他控制 ==========

  toggleFullscreen() {
    const viewer = document.getElementById('ppt-viewer');
    if (!document.fullscreenElement) {
      viewer.requestFullscreen().catch(err => {
        console.error('无法进入全屏:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  toggleGridView() {
    // 实现网格视图切换
    this.showMessage('网格视图功能开发中', 'info');
  }

  exportPDF() {
    // 实现导出PDF功能
    this.showMessage('导出PDF功能开发中', 'info');
  }

  startLocalPreview() {
    if (!this.currentPPT) {
      this.showMessage('请先选择PPT文件', 'error');
      return;
    }

    const viewUrl = `${this.dbManager.apiBase}/documents/${this.currentPPT.id}/view`;

    // 直接在主界面创建图片预览器
    this.createImageViewer(viewUrl);
  }

  createImageViewer(viewUrl) {
    // 获取主内容区域
    const mainContent = document.querySelector('.flex-1.p-6.overflow-hidden.relative');

    // 隐藏欢迎消息，显示PPT查看器
    const welcomeMsg = document.getElementById('welcome-message');
    const pptViewer = document.getElementById('ppt-viewer');

    if (welcomeMsg) welcomeMsg.classList.add('hidden');
    if (pptViewer) {
      pptViewer.classList.remove('hidden');
      pptViewer.innerHTML = `
        <div class="image-viewer-container h-full w-full">
          <!-- 图片显示区域 -->
          <div class="viewer-content h-full bg-gray-900 overflow-auto relative" style="height: 100%;">
            <div id="image-container" class="flex items-center justify-center h-full">
              <div class="loading-spinner mx-auto"></div>
            </div>
          </div>
        </div>
      `;
    }

    // 工具栏已移除，只保留键盘事件
    this.bindBasicKeyboardEvents();

    // 加载图片
    this.loadPPTImages(viewUrl);
  }

  bindBasicKeyboardEvents() {
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (!this.images || this.images.length === 0) return;

      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.navigatePage(-1);
          console.log(`PPT当前页: ${this.currentPage + 1}/${this.images.length}`);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.navigatePage(1);
          console.log(`PPT当前页: ${this.currentPage + 1}/${this.images.length}`);
          break;
        case 'Home':
          e.preventDefault();
          this.goToPage(0);
          break;
        case 'End':
          e.preventDefault();
          this.goToPage(this.images.length - 1);
          break;
        case 'F11':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            this.closeViewer();
          }
          break;
      }
    });
  }

  async loadPPTImages(viewUrl) {
    console.log('[PPTViewer] 显示PPT预览界面');
    this.displayLocalViewer(viewUrl);
  }

  displayLocalViewer(viewUrl) {
    const container = document.getElementById('image-container');
    if (!container) {
      console.error('[PPTViewer] 找不到 image-container 元素');
      return;
    }

    const lang = this.i18nManager.currentLang || 'zh';
    const texts = {
      zh: {
        title: 'PPT 预览',
        notice: '由于浏览器安全限制，在线查看器无法访问本地文件。',
        chooseMethod: '请选择以下方式查看 PPT：',
        download: '下载 PPT 文件',
        uploadLocal: '上传本地 PPT 预览',
        cloudPreview: '云端预览（推荐）',
        cloudDesc: '上传到云端，使用 Microsoft Office Online 预览',
        uploading: '正在上传到云端...',
        uploadSuccess: '上传成功，正在加载预览...',
        uploadFailed: '上传失败'
      },
      en: {
        title: 'PPT Preview',
        notice: 'Due to browser security restrictions, online viewers cannot access local files.',
        chooseMethod: 'Please choose one of the following methods to view PPT:',
        download: 'Download PPT File',
        uploadLocal: 'Upload Local PPT Preview',
        cloudPreview: 'Cloud Preview (Recommended)',
        cloudDesc: 'Upload to cloud and preview with Microsoft Office Online',
        uploading: 'Uploading to cloud...',
        uploadSuccess: 'Upload successful, loading preview...',
        uploadFailed: 'Upload failed'
      }
    };
    const t = texts[lang] || texts.zh;

    // 显示本地预览界面，支持拖拽上传和云端预览
    container.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center p-8">
        <div class="text-center max-w-lg">
          <svg class="w-20 h-20 mx-auto mb-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
          </svg>
          <h3 class="text-xl font-bold text-white mb-4">${this.currentPPT?.title || t.title}</h3>
          
          <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <p class="text-gray-300 mb-4">${t.notice}</p>
            <p class="text-gray-400 text-sm mb-4">${t.chooseMethod}</p>
            
            <div class="space-y-3">
              <!-- 云端预览按钮 - 推荐 -->
              <label class="block w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors cursor-pointer">
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                ${t.cloudPreview}
                <input type="file" accept=".pptx,.ppt" class="hidden" onchange="pptViewer.handleCloudPPTUpload(this.files[0])">
              </label>
              <p class="text-gray-500 text-xs">${t.cloudDesc}</p>
              
              <div class="border-t border-gray-700 my-4"></div>
              
              <a href="${viewUrl}" download class="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                ${t.download}
              </a>
              
              <label class="block w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer">
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                ${t.uploadLocal}
                <input type="file" accept=".pptx,.ppt" class="hidden" onchange="pptViewer.handleLocalPPTUpload(this.files[0])">
              </label>
            </div>
          </div>
          
          <!-- 上传进度显示区域 -->
          <div id="upload-progress-area" class="hidden">
            <div class="bg-gray-800 rounded-lg p-4">
              <p id="upload-status" class="text-gray-300 mb-2">${t.uploading}</p>
              <div class="w-full bg-gray-700 rounded-full h-2">
                <div id="upload-progress-bar" class="bg-orange-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <p id="upload-percent" class="text-gray-400 text-sm mt-1">0%</p>
            </div>
          </div>
          
          <div id="local-preview-area" class="hidden">
            <div class="bg-gray-900 rounded-lg p-4">
              <div id="slides-container" class="space-y-4"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.currentViewUrl = viewUrl;
    console.log('[PPTViewer] 本地预览界面已加载');
  }

  // 上传 PPT 到 Supabase 并用 Office Online 预览
  async handleCloudPPTUpload(file) {
    if (!file) return;
    
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.pptx') && !file.name.toLowerCase().endsWith('.ppt')) {
      this.showMessage('请选择 PPT 文件 (.ppt 或 .pptx)', 'error');
      return;
    }

    // 检查 Supabase 客户端
    if (!window.supabaseClient) {
      this.showMessage('Supabase 未初始化', 'error');
      return;
    }

    const lang = this.i18nManager.currentLang || 'zh';
    const texts = {
      zh: {
        uploading: '正在上传到云端...',
        uploadSuccess: '上传成功，正在加载预览...',
        uploadFailed: '上传失败'
      },
      en: {
        uploading: 'Uploading to cloud...',
        uploadSuccess: 'Upload successful, loading preview...',
        uploadFailed: 'Upload failed'
      }
    };
    const t = texts[lang] || texts.zh;

    // 显示上传进度 - 支持两种容器 ID
    const progressContainer = document.getElementById('upload-progress-container') || document.getElementById('upload-progress-area');
    const progressBar = document.getElementById('upload-progress-bar');
    const percentText = document.getElementById('upload-percent');
    const statusText = document.getElementById('upload-status');
    
    if (progressContainer) {
      progressContainer.classList.remove('hidden');
    }
    if (statusText) {
      statusText.textContent = t.uploading;
    }

    try {
      // 生成安全的文件名 (不含中文)
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop().toLowerCase();
      const safeFileName = `ppt_${timestamp}_${randomStr}.${ext}`;
      const filePath = `ppt-files/${safeFileName}`;

      console.log('[PPTViewer] 开始上传文件到 Supabase:', safeFileName);

      // 使用 XMLHttpRequest 实现进度监控
      const publicUrl = await this.uploadWithProgress(file, filePath, (progress) => {
        this.uploadProgress = progress;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (percentText) percentText.textContent = `${progress}%`;
      });

      if (publicUrl) {
        console.log('[PPTViewer] 上传成功，公开URL:', publicUrl);
        if (statusText) statusText.textContent = t.uploadSuccess;
        
        // 存储公开URL并显示Office Online预览
        this.publicUrl = publicUrl;
        
        // 延迟显示预览，等待文件可访问
        setTimeout(() => {
          this.showOfficeOnlinePreview(publicUrl, file.name);
        }, 1000);
      } else {
        throw new Error('上传返回空URL');
      }
    } catch (error) {
      console.error('[PPTViewer] 上传失败:', error);
      if (statusText) statusText.textContent = `${t.uploadFailed}: ${error.message}`;
      this.showMessage(`${t.uploadFailed}: ${error.message}`, 'error');
    }
  }

  // 使用 XMLHttpRequest 上传并监控进度
  uploadWithProgress(file, filePath, onProgress) {
    return new Promise((resolve, reject) => {
      const SUPABASE_URL = localStorage.getItem('SUPABASE_URL') || 'https://gjoymdzbiiijeregqemj.supabase.co';
      const SUPABASE_ANON_KEY = localStorage.getItem('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb3ltZHpiaWlpamVyZWdxZW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMDA0NjYsImV4cCI6MjA3OTg3NjQ2Nn0.0HeF8MF0B7hlNaePJ7BFGm0BtDvwn3YnBSzQAEMokQM';
      const SUPABASE_BUCKET = 'code';

      const xhr = new XMLHttpRequest();
      const url = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filePath}`;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filePath}`;
          resolve(publicUrl);
        } else {
          let errorMsg = `HTTP ${xhr.status}`;
          try {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.message || response.error || errorMsg;
          } catch (e) {}
          reject(new Error(errorMsg));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'));
      });

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(file);
    });
  }

  // 显示 Office Online 预览
  showOfficeOnlinePreview(publicUrl, fileName) {
    // 使用 ppt-viewer 作为容器
    const container = document.getElementById('ppt-viewer') || document.getElementById('image-container');
    if (!container) return;

    // 保存当前 publicUrl 供右键菜单使用
    this.currentPublicUrl = publicUrl;
    this.currentFileName = fileName;

    const lang = this.i18nManager.currentLang || 'zh';
    const texts = {
      zh: {
        loading: '正在加载 Office Online 预览...',
        loadingTip: '如果长时间未加载，请检查网络连接',
        contextMenu: {
          fullscreen: '全屏播放',
          exitFullscreen: '退出全屏',
          autoplay: '自动播放',
          loop: '循环播放',
          download: '下载原文件',
          reupload: '重新上传',
          copyLink: '复制链接',
          openNew: '在新窗口打开'
        }
      },
      en: {
        loading: 'Loading Office Online preview...',
        loadingTip: 'If it takes too long, please check your network connection',
        contextMenu: {
          fullscreen: 'Fullscreen',
          exitFullscreen: 'Exit Fullscreen',
          autoplay: 'Auto Play',
          loop: 'Loop',
          download: 'Download Original',
          reupload: 'Re-upload',
          copyLink: 'Copy Link',
          openNew: 'Open in New Window'
        }
      }
    };
    const t = texts[lang] || texts.zh;

    // Office Online 嵌入URL
    const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;

    container.innerHTML = `
      <div class="w-full h-full relative" id="ppt-preview-container">
        <!-- 预览区域 - 全屏填充 -->
        <div class="w-full h-full flex items-center justify-center bg-black" id="iframe-wrapper">
          <div class="relative w-full h-full" style="max-width: 100%; max-height: 100%;">
            <iframe 
              src="${officeEmbedUrl}" 
              class="w-full h-full border-0"
              frameborder="0"
              allowfullscreen
              id="office-iframe"
            ></iframe>
            <!-- 加载提示 -->
            <div id="iframe-loading" class="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div class="text-center">
                <div class="loading-spinner mx-auto mb-4"></div>
                <p class="text-gray-300">${t.loading}</p>
                <p class="text-gray-500 text-sm mt-2">${t.loadingTip}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 浮动全屏按钮 -->
        <button 
          onclick="pptViewer.togglePreviewFullscreen()" 
          class="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all shadow-lg backdrop-blur-sm z-10"
          id="preview-fullscreen-btn"
          title="${lang === 'en' ? 'Fullscreen' : '全屏'}"
        >
          <svg class="w-5 h-5" id="fullscreen-icon-expand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
          </svg>
          <svg class="w-5 h-5 hidden" id="fullscreen-icon-collapse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9V4H4m0 0l5 5m6-5h5v5m0-5l-5 5m-6 6v5H4m0 0l5-5m6 5h5v-5m0 5l-5-5"></path>
          </svg>
        </button>
        
        <!-- 右键菜单 -->
        <div id="ppt-context-menu" class="hidden absolute bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 min-w-48 z-50">
          <button class="context-menu-item" data-action="fullscreen">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
            </svg>
            <span>${t.contextMenu.fullscreen}</span>
          </button>
          <div class="border-t border-gray-700 my-1"></div>
          <button class="context-menu-item" data-action="autoplay">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${t.contextMenu.autoplay}</span>
            <span class="ml-auto text-xs ${this.autoplay ? 'text-green-400' : 'text-gray-500'}">${this.autoplay ? '✓' : ''}</span>
          </button>
          <button class="context-menu-item" data-action="loop">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>${t.contextMenu.loop}</span>
            <span class="ml-auto text-xs ${this.loop ? 'text-green-400' : 'text-gray-500'}">${this.loop ? '✓' : ''}</span>
          </button>
          <div class="border-t border-gray-700 my-1"></div>
          <a href="${publicUrl}" download class="context-menu-item" data-action="download">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            <span>${t.contextMenu.download}</span>
          </a>
          <label class="context-menu-item cursor-pointer" data-action="reupload">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span>${t.contextMenu.reupload}</span>
            <input type="file" accept=".pptx,.ppt" class="hidden" onchange="pptViewer.handleFileUpload(this.files); pptViewer.hideContextMenu();">
          </label>
          <div class="border-t border-gray-700 my-1"></div>
          <button class="context-menu-item" data-action="copyLink">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
            </svg>
            <span>${t.contextMenu.copyLink}</span>
          </button>
          <button class="context-menu-item" data-action="openNew">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
            <span>${t.contextMenu.openNew}</span>
          </button>
        </div>
      </div>
    `;

    // 添加右键菜单样式
    this.addContextMenuStyles();

    // 绑定右键菜单事件
    this.bindContextMenuEvents();

    // iframe 加载完成后隐藏加载提示
    const iframe = document.getElementById('office-iframe');
    const loadingOverlay = document.getElementById('iframe-loading');
    
    if (iframe && loadingOverlay) {
      iframe.onload = () => {
        loadingOverlay.style.display = 'none';
      };
      
      // 5秒后自动隐藏加载提示
      setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.style.display = 'none';
        }
      }, 5000);
    }

    // 监听全屏变化
    document.addEventListener('fullscreenchange', () => {
      this.updateFullscreenButton();
    });

    console.log('[PPTViewer] Office Online 预览已显示');
  }

  // 添加右键菜单样式
  addContextMenuStyles() {
    if (document.getElementById('context-menu-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'context-menu-styles';
    style.textContent = `
      .context-menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 10px 16px;
        text-align: left;
        color: #e5e5e5;
        font-size: 14px;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: background-color 0.15s;
      }
      .context-menu-item:hover {
        background-color: #374151;
      }
      .context-menu-item svg {
        flex-shrink: 0;
      }
      #ppt-context-menu {
        animation: contextMenuFadeIn 0.15s ease-out;
      }
      @keyframes contextMenuFadeIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 绑定右键菜单事件
  bindContextMenuEvents() {
    const previewContainer = document.getElementById('ppt-preview-container');
    const contextMenu = document.getElementById('ppt-context-menu');
    
    if (!previewContainer || !contextMenu) return;

    // 阻止默认右键菜单，显示自定义菜单
    previewContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY);
    });

    // 点击菜单项处理
    contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = item.dataset.action;
        if (action && action !== 'download' && action !== 'reupload') {
          e.preventDefault();
          this.handleContextMenuAction(action);
        }
        // download 和 reupload 有自己的处理方式
        if (action !== 'reupload') {
          this.hideContextMenu();
        }
      });
    });

    // 点击其他地方关闭菜单
    document.addEventListener('click', (e) => {
      if (!contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // ESC键关闭菜单
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
      }
    });
  }

  // 显示右键菜单
  showContextMenu(x, y) {
    const contextMenu = document.getElementById('ppt-context-menu');
    if (!contextMenu) return;

    // 更新菜单项状态
    this.updateContextMenuState();

    // 显示菜单
    contextMenu.classList.remove('hidden');

    // 计算位置，确保不超出屏幕
    const menuRect = contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let menuX = x;
    let menuY = y;

    if (x + menuRect.width > viewportWidth) {
      menuX = x - menuRect.width;
    }
    if (y + menuRect.height > viewportHeight) {
      menuY = y - menuRect.height;
    }

    // 确保不超出左边和上边
    menuX = Math.max(10, menuX);
    menuY = Math.max(10, menuY);

    contextMenu.style.left = menuX + 'px';
    contextMenu.style.top = menuY + 'px';
  }

  // 隐藏右键菜单
  hideContextMenu() {
    const contextMenu = document.getElementById('ppt-context-menu');
    if (contextMenu) {
      contextMenu.classList.add('hidden');
    }
  }

  // 更新右键菜单状态
  updateContextMenuState() {
    const contextMenu = document.getElementById('ppt-context-menu');
    if (!contextMenu) return;

    // 更新自动播放状态
    const autoplayItem = contextMenu.querySelector('[data-action="autoplay"] .ml-auto');
    if (autoplayItem) {
      autoplayItem.textContent = this.autoplay ? '✓' : '';
      autoplayItem.className = `ml-auto text-xs ${this.autoplay ? 'text-green-400' : 'text-gray-500'}`;
    }

    // 更新循环播放状态
    const loopItem = contextMenu.querySelector('[data-action="loop"] .ml-auto');
    if (loopItem) {
      loopItem.textContent = this.loop ? '✓' : '';
      loopItem.className = `ml-auto text-xs ${this.loop ? 'text-green-400' : 'text-gray-500'}`;
    }

    // 更新全屏按钮文字
    const lang = this.i18nManager.currentLang || 'zh';
    const fullscreenItem = contextMenu.querySelector('[data-action="fullscreen"] span');
    if (fullscreenItem) {
      if (document.fullscreenElement) {
        fullscreenItem.textContent = lang === 'en' ? 'Exit Fullscreen' : '退出全屏';
      } else {
        fullscreenItem.textContent = lang === 'en' ? 'Fullscreen' : '全屏播放';
      }
    }
  }

  // 处理右键菜单动作
  handleContextMenuAction(action) {
    const lang = this.i18nManager.currentLang || 'zh';
    
    switch (action) {
      case 'fullscreen':
        this.togglePreviewFullscreen();
        break;
        
      case 'autoplay':
        this.toggleAutoplay();
        break;
        
      case 'loop':
        this.toggleLoop();
        break;
        
      case 'copyLink':
        if (this.currentPublicUrl) {
          navigator.clipboard.writeText(this.currentPublicUrl).then(() => {
            this.showNotification(lang === 'en' ? 'Link copied!' : '链接已复制!', 'success');
          }).catch(err => {
            console.error('复制失败:', err);
            this.showNotification(lang === 'en' ? 'Copy failed' : '复制失败', 'error');
          });
        }
        break;
        
      case 'openNew':
        if (this.currentPublicUrl) {
          const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(this.currentPublicUrl)}`;
          window.open(officeUrl, '_blank');
        }
        break;
    }
  }

  // 切换自动播放
  toggleAutoplay() {
    this.autoplay = !this.autoplay;
    const lang = this.i18nManager.currentLang || 'zh';
    
    // 更新按钮状态
    const autoplayBtn = document.getElementById('autoplay-toggle');
    if (autoplayBtn) {
      if (this.autoplay) {
        autoplayBtn.classList.add('active', 'bg-blue-600', 'text-white');
        autoplayBtn.classList.remove('bg-gray-700');
      } else {
        autoplayBtn.classList.remove('active', 'bg-blue-600', 'text-white');
        autoplayBtn.classList.add('bg-gray-700');
      }
    }
    
    // 显示提示
    if (this.autoplay) {
      this.showNotification(lang === 'en' ? 'Auto-play enabled (Note: Office Online has limited control)' : '自动播放已开启 (注意: Office Online 控制有限)', 'info');
    } else {
      this.showNotification(lang === 'en' ? 'Auto-play disabled' : '自动播放已关闭', 'info');
    }
    
    console.log('[PPTViewer] 自动播放:', this.autoplay);
  }

  // 切换循环播放
  toggleLoop() {
    this.loop = !this.loop;
    const lang = this.i18nManager.currentLang || 'zh';
    
    // 更新按钮状态
    const loopBtn = document.getElementById('loop-toggle');
    if (loopBtn) {
      if (this.loop) {
        loopBtn.classList.add('active', 'bg-blue-600', 'text-white');
        loopBtn.classList.remove('bg-gray-700');
      } else {
        loopBtn.classList.remove('active', 'bg-blue-600', 'text-white');
        loopBtn.classList.add('bg-gray-700');
      }
    }
    
    // 显示提示
    if (this.loop) {
      this.showNotification(lang === 'en' ? 'Loop enabled' : '循环播放已开启', 'info');
    } else {
      this.showNotification(lang === 'en' ? 'Loop disabled' : '循环播放已关闭', 'info');
    }
    
    console.log('[PPTViewer] 循环播放:', this.loop);
  }

  // 切换备注显示
  toggleNotes() {
    this.showNotes = !this.showNotes;
    const lang = this.i18nManager.currentLang || 'zh';
    
    // 更新按钮状态
    const notesBtn = document.getElementById('notes-toggle');
    if (notesBtn) {
      if (this.showNotes) {
        notesBtn.classList.add('active', 'bg-blue-600', 'text-white');
        notesBtn.classList.remove('bg-gray-700');
      } else {
        notesBtn.classList.remove('active', 'bg-blue-600', 'text-white');
        notesBtn.classList.add('bg-gray-700');
      }
    }
    
    // 显示/隐藏备注面板
    this.toggleNotesPanel();
    
    // 显示提示
    if (this.showNotes) {
      this.showNotification(lang === 'en' ? 'Notes panel shown (Office Online does not support notes extraction)' : '备注面板已显示 (Office Online 不支持备注提取)', 'info');
    } else {
      this.showNotification(lang === 'en' ? 'Notes panel hidden' : '备注面板已隐藏', 'info');
    }
    
    console.log('[PPTViewer] 显示备注:', this.showNotes);
  }

  // 切换备注面板
  toggleNotesPanel() {
    let notesPanel = document.getElementById('notes-panel');
    const lang = this.i18nManager.currentLang || 'zh';
    
    if (this.showNotes) {
      // 创建备注面板
      if (!notesPanel) {
        const container = document.getElementById('ppt-preview-container');
        if (container) {
          notesPanel = document.createElement('div');
          notesPanel.id = 'notes-panel';
          notesPanel.className = 'absolute bottom-0 left-0 right-0 h-32 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 p-4 overflow-y-auto z-20';
          notesPanel.innerHTML = `
            <div class="flex justify-between items-center mb-2">
              <h4 class="text-gray-300 text-sm font-medium">
                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                ${lang === 'en' ? 'Speaker Notes' : '演讲者备注'}
              </h4>
              <button onclick="pptViewer.toggleNotes()" class="text-gray-400 hover:text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <p class="text-gray-500 text-sm italic">
              ${lang === 'en' ? 'Notes extraction from Office Online is not supported. Notes would appear here if available.' : 'Office Online 不支持备注提取。如果可用，备注将显示在此处。'}
            </p>
          `;
          container.appendChild(notesPanel);
        }
      } else {
        notesPanel.classList.remove('hidden');
      }
    } else {
      // 隐藏备注面板
      if (notesPanel) {
        notesPanel.classList.add('hidden');
      }
    }
  }

  // 显示通知
  showNotification(message, type = 'info') {
    // 移除旧的通知
    const existingNotification = document.getElementById('ppt-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 创建新通知
    const notification = document.createElement('div');
    notification.id = 'ppt-notification';
    
    const bgColor = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-blue-600',
      warning: 'bg-yellow-600'
    }[type] || 'bg-blue-600';
    
    notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fadeIn`;
    notification.style.animation = 'fadeIn 0.3s ease-out';
    notification.textContent = message;

    document.body.appendChild(notification);

    // 3秒后自动消失
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // 切换预览全屏
  togglePreviewFullscreen() {
    const container = document.getElementById('ppt-preview-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('无法进入全屏:', err);
      });
      this.isFullscreen = true;
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  // 更新全屏按钮状态
  updateFullscreenButton() {
    const expandIcon = document.getElementById('fullscreen-icon-expand');
    const collapseIcon = document.getElementById('fullscreen-icon-collapse');
    
    if (expandIcon && collapseIcon) {
      if (document.fullscreenElement) {
        expandIcon.classList.add('hidden');
        collapseIcon.classList.remove('hidden');
      } else {
        expandIcon.classList.remove('hidden');
        collapseIcon.classList.add('hidden');
      }
    }
  }

  async handleLocalPPTUpload(file) {
    if (!file) return;
    
    const container = document.getElementById('image-container');
    container.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p class="text-gray-300">正在解析 PPT 文件...</p>
        </div>
      </div>
    `;

    try {
      // 使用 JSZip 解析 PPTX 文件
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip 库未加载');
      }

      const zip = await JSZip.loadAsync(file);
      const slides = [];
      
      // 查找幻灯片
      const slideFiles = Object.keys(zip.files)
        .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)/)[1]);
          const numB = parseInt(b.match(/slide(\d+)/)[1]);
          return numA - numB;
        });

      // 提取幻灯片中的图片
      const mediaFiles = Object.keys(zip.files)
        .filter(name => name.startsWith('ppt/media/'));

      const images = [];
      for (const mediaFile of mediaFiles) {
        const data = await zip.files[mediaFile].async('base64');
        const ext = mediaFile.split('.').pop().toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : 
                        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                        ext === 'gif' ? 'image/gif' : 'image/png';
        images.push({
          name: mediaFile,
          url: `data:${mimeType};base64,${data}`
        });
      }

      // 显示结果
      this.displayParsedPPT(file.name, slideFiles.length, images);

    } catch (error) {
      console.error('[PPTViewer] 解析 PPT 失败:', error);
      container.innerHTML = `
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <svg class="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-red-400 mb-4">解析 PPT 失败</p>
            <p class="text-gray-500 text-sm mb-4">${error.message}</p>
            <button onclick="pptViewer.displayLocalViewer(pptViewer.currentViewUrl)" 
                    class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
              返回
            </button>
          </div>
        </div>
      `;
    }
  }

  displayParsedPPT(filename, slideCount, images) {
    const container = document.getElementById('image-container');
    
    let imagesHtml = '';
    if (images.length > 0) {
      imagesHtml = `
        <div class="mt-6">
          <h4 class="text-white text-lg mb-4">PPT 中的图片 (${images.length} 张)</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${images.map((img, i) => `
              <div class="bg-gray-800 rounded-lg p-2">
                <img src="${img.url}" alt="图片 ${i+1}" class="w-full h-32 object-contain rounded cursor-pointer hover:opacity-80" 
                     onclick="window.open('${img.url}', '_blank')">
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="w-full h-full overflow-auto p-6">
        <div class="max-w-4xl mx-auto">
          <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-xl font-bold text-white">${filename}</h3>
                <p class="text-gray-400">共 ${slideCount} 张幻灯片</p>
              </div>
              <button onclick="pptViewer.displayLocalViewer(pptViewer.currentViewUrl)" 
                      class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
                返回
              </button>
            </div>
            
            <div class="bg-green-900/30 border border-green-700 rounded-lg p-4">
              <p class="text-green-400">
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                PPT 文件解析成功！
              </p>
            </div>
          </div>
          
          ${imagesHtml}
          
          <div class="mt-6 text-center text-gray-500 text-sm">
            <p>提示：完整预览 PPT 请下载后使用 PowerPoint 或 WPS 打开</p>
          </div>
        </div>
      </div>
    `;
  }

  switchViewer(type) {
    const iframe = document.getElementById('ppt-iframe');
    if (!iframe) return;

    if (type === 'office') {
      iframe.src = this.officeViewerUrl;
      this.showMessage('已切换到 Office 在线查看器', 'info');
    } else if (type === 'google') {
      iframe.src = this.googleViewerUrl;
      this.showMessage('已切换到 Google 文档查看器', 'info');
    }
  }

  displayCurrentImage() {
    if (!this.images || this.images.length === 0) return;

    const container = document.getElementById('image-container');
    const image = this.images[this.currentPage];

    if (container) {
      container.innerHTML = `
        <div class="image-wrapper" style="transform: scale(${this.currentZoom}); transition: transform 0.3s ease;">
          <img
            src="${image.url}"
            alt="幻灯片 ${this.currentPage + 1}"
            class="max-w-full max-h-full shadow-lg"
            draggable="false"
          />
        </div>
      `;
    }
  }

  adjustZoom(delta) {
    this.currentZoom = Math.max(0.5, Math.min(3, this.currentZoom + delta));
    this.displayCurrentImage();
  }

  resetZoom() {
    this.currentZoom = 1;
    this.displayCurrentImage();
  }

  navigatePage(direction) {
    if (!this.images || this.images.length === 0) return;

    const newPage = this.currentPage + direction;
    if (newPage >= 0 && newPage < this.images.length) {
      this.currentPage = newPage;
      this.displayCurrentImage();
      this.updatePageInfo();
    }
  }

  goToPage(pageIndex) {
    if (!this.images || this.images.length === 0) return;

    if (pageIndex >= 0 && pageIndex < this.images.length) {
      this.currentPage = pageIndex;
      this.displayCurrentImage();
      this.updatePageInfo();
    }
  }

  updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo && this.images) {
      pageInfo.textContent = `${this.currentPage + 1} / ${this.images.length}`;
    }
  }

  toggleFullscreen() {
    const viewer = document.querySelector('.image-viewer-container');
    if (!document.fullscreenElement) {
      viewer.requestFullscreen().catch(err => {
        console.error('无法进入全屏:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  closeViewer() {
    // 恢复原始界面
    const welcomeMsg = document.getElementById('welcome-message');
    const pptViewer = document.getElementById('ppt-viewer');

    if (welcomeMsg) welcomeMsg.classList.remove('hidden');
    if (pptViewer) pptViewer.classList.add('hidden');

    // 清理数据
    this.images = null;
    this.currentPage = 0;
    this.currentZoom = 1;

    // 移除键盘事件监听
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  
  async loadLocalPPT(viewUrl) {
    try {
      // 显示加载状态
      const loadingEl = document.getElementById('local-loading');
      const errorEl = document.getElementById('local-error');

      if (loadingEl) loadingEl.classList.remove('hidden');
      if (errorEl) errorEl.classList.add('hidden');

      // 加载PPT
      const success = await this.localPreview.loadPPT(viewUrl);

      if (success) {
        // 渲染到画布
        const canvas = document.getElementById('local-canvas');
        if (canvas) {
          this.localPreview.renderToCanvas(canvas);
        }

        // 隐藏加载状态
        if (loadingEl) loadingEl.classList.add('hidden');

        this.showMessage('本地预览加载成功', 'success');
      } else {
        throw new Error('加载PPT失败');
      }
    } catch (error) {
      console.error('本地预览失败:', error);
      const loadingEl = document.getElementById('local-loading');
      const errorEl = document.getElementById('local-error');

      if (loadingEl) loadingEl.classList.add('hidden');
      if (errorEl) errorEl.classList.remove('hidden');

      this.showMessage('本地预览失败', 'error');
    }
  }

  showMessage(message, type = 'info') {
    // 创建提示消息
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // 自动消失
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  // 主题切换功能
  toggleTheme() {
    // 使用全局设置管理器
    if (window.globalSettings) {
      window.globalSettings.toggleTheme();
      this.currentTheme = window.globalSettings.theme;
    } else {
      this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', this.currentTheme);
    }
    this.applyTheme(this.currentTheme);
  }

  /**
   * 应用主题
   */
  applyTheme(theme) {
    const root = document.documentElement;
    const body = document.body;
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');

    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      body.classList.add('light-theme');
      if (themeIconLight) themeIconLight.classList.remove('hidden');
      if (themeIconDark) themeIconDark.classList.add('hidden');
    } else {
      root.removeAttribute('data-theme');
      body.classList.remove('light-theme');
      if (themeIconLight) themeIconLight.classList.add('hidden');
      if (themeIconDark) themeIconDark.classList.remove('hidden');
    }
  }

  // 获取翻译文本
  t(key) {
    return this.i18nManager.t(key);
  }

  
  // 更新界面文本
  updateUIText() {
    // 更新所有带有data-i18n属性的元素
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translatedText = this.t(key);
      element.textContent = translatedText;
    });

    // 更新所有带有data-i18n-title属性的元素
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translatedText = this.t(key);
      element.setAttribute('title', translatedText);
    });
  }

  // 初始化主题和语言设置
  initializeThemeAndLanguage() {
    // 初始化主题
    this.applyTheme(this.currentTheme);

    // 初始化国际化
    this.i18nManager.init();
  }
}

/**
 * PPT本地预览类
 * 使用JSZip + XML解析 + Canvas实现
 */
class LocalPPTPreview {
  constructor() {
    this.currentSlide = 0;
    this.slides = [];
    this.canvas = null;
    this.ctx = null;
  }

  async loadPPT(fileUrl) {
    try {
      // 检查JSZip是否可用
      if (typeof window.JSZip === 'undefined') {
        console.error('JSZip库未加载，无法解析PPT文件');
        throw new Error('JSZip库未加载');
      }

      // 下载PPT文件
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      // 使用JSZip解压
      const zip = await window.JSZip.loadAsync(arrayBuffer);

      // 解析幻灯片
      await this.parseSlides(zip);

      return true;
    } catch (error) {
      console.error('加载PPT失败:', error);
      return false;
    }
  }

  async parseSlides(zip) {
    this.slides = [];

    // 获取幻灯片文件列表
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
        const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
        return numA - numB;
      });

    // 解析每个幻灯片
    for (const slideFile of slideFiles) {
      const slideXml = await zip.file(slideFile).async('string');
      const slideData = await this.parseSlideXML(slideXml);
      this.slides.push(slideData);
    }

    console.log(`成功解析 ${this.slides.length} 张幻灯片`);
  }

  async parseSlideXML(xmlString) {
    return new Promise((resolve) => {
      try {
        // 使用浏览器内置的DOMParser
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        const slide = {
          shapes: [],
          text: [],
          images: []
        };

        // 提取文本内容
        const textElements = xmlDoc.getElementsByTagName('a:t');
        for (let i = 0; i < textElements.length; i++) {
          const textContent = textElements[i].textContent || textElements[i].innerText;
          if (textContent && textContent.trim()) {
            slide.text.push(textContent.trim());
          }
        }

        // 提取形状信息
        const spElements = xmlDoc.getElementsByTagName('p:sp');
        for (let i = 0; i < spElements.length; i++) {
          const shape = {
            type: 'textbox',
            text: ''
          };

          const shapeText = spElements[i].getElementsByTagName('a:t');
          if (shapeText.length > 0) {
            shape.text = shapeText[0].textContent || shapeText[0].innerText || '';
          }

          if (shape.text) {
            slide.shapes.push(shape);
          }
        }

        // 提取图片信息
        const picElements = xmlDoc.getElementsByTagName('p:pic');
        for (let i = 0; i < picElements.length; i++) {
          const image = {
            type: 'image',
            src: 'placeholder.png'
          };
          slide.images.push(image);
        }

        console.log('✅ DOMParser解析成功，找到文本:', slide.text.length, '个，形状:', slide.shapes.length, '个');
        resolve(slide);

      } catch (error) {
        console.error('❌ DOMParser解析XML失败:', error);

        // 降级到简单正则表达式解析
        console.log('使用备选正则表达式解析...');
        const textMatch = xmlString.match(/<a:t>([^<]*)<\/a:t>/g);
        const textContent = textMatch ? textMatch.map(match => match.replace(/<\/?a:t>/g, '').trim()).filter(text => text) : [];

        resolve({
          shapes: [],
          text: textContent,
          images: []
        });
      }
    });
  }

  renderToCanvas(canvasElement, slideIndex = 0) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.currentSlide = slideIndex;

    if (slideIndex >= this.slides.length) {
      console.error('幻灯片索引超出范围');
      return;
    }

    const slide = this.slides[slideIndex];
    this.renderSlide(slide);
  }

  renderSlide(slide) {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 设置白色背景
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 添加边框
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制标题区域背景
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.fillRect(0, 0, this.canvas.width, 100);
    this.ctx.strokeStyle = '#e9ecef';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 100);
    this.ctx.lineTo(this.canvas.width, 100);
    this.ctx.stroke();

    let contentY = 140;

    // 渲染幻灯片内容
    if (slide.text && slide.text.length > 0) {
      // 渲染标题
      const title = slide.text[0];
      this.ctx.fillStyle = '#1f2937';
      this.ctx.font = 'bold 36px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(title, this.canvas.width / 2, 60);

      // 渲染副标题和内容
      if (slide.text.length > 1) {
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#374151';

        for (let i = 1; i < slide.text.length; i++) {
          const text = slide.text[i];

          // 处理长文本换行
          const maxWidth = this.canvas.width - 120;
          const lines = this.wrapText(text, maxWidth);

          // 检查是否是新的段落（通过空行或特定字符判断）
          const isNewParagraph = text.trim() === '' || (i > 1 && slide.text[i-1].trim() === '');

          lines.forEach((line, lineIndex) => {
            if (line.trim()) {
              // 添加项目符号
              if (!line.startsWith('  ') && (i === 1 || isNewParagraph)) {
                this.ctx.fillStyle = '#3b82f6';
                this.ctx.font = 'bold 20px Arial';
                this.ctx.fillText('•', 60, contentY);
                this.ctx.font = '20px Arial';
                this.ctx.fillStyle = '#374151';
                this.ctx.fillText(line, 85, contentY);
              } else {
                this.ctx.fillText(line, line.startsWith('  ') ? 85 : 60, contentY);
              }
              contentY += 30;
            }
          });

          // 添加段落间距
          if (isNewParagraph) {
            contentY += 15;
          }

          // 防止内容超出画布
          if (contentY > this.canvas.height - 80) {
            break;
          }
        }
      }
    } else {
      // 空白幻灯片提示
      this.ctx.fillStyle = '#9ca3af';
      this.ctx.font = '18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('此幻灯片暂无内容', this.canvas.width / 2, this.canvas.height / 2);

      // 添加装饰性元素
      this.ctx.strokeStyle = '#e5e7eb';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([8, 4]);
      this.ctx.strokeRect(60, this.canvas.height / 2 - 50, this.canvas.width - 120, 100);
      this.ctx.setLineDash([]);
    }

    // 渲染图片占位符
    if (slide.images && slide.images.length > 0) {
      slide.images.forEach((image, index) => {
        const imgX = image.x || (100 + (index * 250));
        const imgY = image.y || Math.max(contentY + 20, 300);
        const imgWidth = Math.min(image.width || 200, 250);
        const imgHeight = Math.min(image.height || 150, 180);

        // 绘制图片占位符
        this.ctx.fillStyle = '#f3f4f6';
        this.ctx.fillRect(imgX, imgY, imgWidth, imgHeight);

        // 绘制图片边框
        this.ctx.strokeStyle = '#d1d5db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(imgX, imgY, imgWidth, imgHeight);

        // 添加图片图标和文字
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('📷', imgX + imgWidth / 2, imgY + imgHeight / 2 - 10);

        this.ctx.font = '14px Arial';
        this.ctx.fillText(image.title || `图片 ${index + 1}`, imgX + imgWidth / 2, imgY + imgHeight / 2 + 15);

        // 更新内容Y位置
        contentY = Math.max(contentY, imgY + imgHeight + 20);
      });
    }

    // 渲染形状占位符
    if (slide.shapes && slide.shapes.length > 0) {
      slide.shapes.forEach((shape, index) => {
        const shapeX = shape.x || (100 + (index * 200));
        const shapeY = shape.y || Math.max(contentY + 20, 250);
        const shapeWidth = shape.width || 150;
        const shapeHeight = shape.height || 100;

        // 绘制形状占位符
        this.ctx.fillStyle = '#eff6ff';
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;

        // 根据形状类型绘制不同的形状
        if (shape.type === 'circle' || shape.type === 'oval') {
          this.ctx.beginPath();
          this.ctx.ellipse(shapeX + shapeWidth/2, shapeY + shapeHeight/2, shapeWidth/2, shapeHeight/2, 0, 0, 2 * Math.PI);
          this.ctx.fill();
          this.ctx.stroke();
        } else if (shape.type === 'triangle') {
          this.ctx.beginPath();
          this.ctx.moveTo(shapeX + shapeWidth/2, shapeY);
          this.ctx.lineTo(shapeX, shapeY + shapeHeight);
          this.ctx.lineTo(shapeX + shapeWidth, shapeY + shapeHeight);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
        } else {
          // 默认矩形
          this.ctx.fillRect(shapeX, shapeY, shapeWidth, shapeHeight);
          this.ctx.strokeRect(shapeX, shapeY, shapeWidth, shapeHeight);
        }

        // 添加形状标签
        this.ctx.fillStyle = '#1e40af';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(shape.type || '形状', shapeX + shapeWidth/2, shapeY + shapeHeight/2);
      });
    }

    // 添加幻灯片编号和页脚信息
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`幻灯片 ${this.currentSlide + 1}`, 20, this.canvas.height - 15);

    const now = new Date();
    const timeString = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    this.ctx.textAlign = 'right';
    this.ctx.fillText(timeString, this.canvas.width - 20, this.canvas.height - 15);

    // 重置文本对齐方式
    this.ctx.textAlign = 'left';
  }

  wrapText(text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i];
      const metrics = this.ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  nextSlide() {
    if (this.currentSlide < this.slides.length - 1) {
      this.currentSlide++;
      this.renderSlide(this.slides[this.currentSlide]);
      return this.currentSlide;
    }
    return -1;
  }

  prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.renderSlide(this.slides[this.currentSlide]);
      return this.currentSlide;
    }
    return -1;
  }

  goToSlide(index) {
    if (index >= 0 && index < this.slides.length) {
      this.currentSlide = index;
      this.renderSlide(this.slides[this.currentSlide]);
      return this.currentSlide;
    }
    return -1;
  }

  getSlideCount() {
    return this.slides.length;
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('=== 等待PPT库加载 ===');

    // 检查库是否已经加载
    function checkLibraries() {
      const jszipLoaded = typeof window.JSZip !== 'undefined';
      const fabricLoaded = typeof window.fabric !== 'undefined';

      console.log('=== PPT库状态检查 ===');
      console.log('JSZip:', jszipLoaded ? '✅ 已加载' : '❌ 未加载');
      console.log('DOMParser:', '✅ 内置支持');
      console.log('Fabric.js:', fabricLoaded ? '✅ 已加载' : '❌ 未加载');

      if (jszipLoaded) {
        console.log('🎉 JSZip库加载完成，初始化PPT查看器');
        window.pptViewer = new PPTViewer();
      } else {
        console.warn('⚠️ JSZip库未加载，将使用备选解析方案');
        // 即使库未加载也初始化，使用备选方案
        window.pptViewer = new PPTViewer();
      }
    }

    // 如果库已经加载完成，立即初始化
    if (window.pptLibrariesLoaded !== undefined) {
      checkLibraries();
    } else {
      // 等待库加载完成事件
      document.addEventListener('pptLibrariesReady', checkLibraries);

      // 备选方案：超时后初始化
      setTimeout(() => {
        if (!window.pptViewer) {
          console.warn('⏰ 库加载超时，强制初始化PPT查看器');
          checkLibraries();
        }
      }, 3000);
    }

  } catch (error) {
    console.error('PPT Viewer初始化失败:', error);
  }
  
  // 监听全局设置变化
  if (window.globalSettings) {
    window.addEventListener('themeChanged', (e) => {
      if (window.pptViewer) {
        window.pptViewer.currentTheme = e.detail.theme;
        window.pptViewer.applyTheme(e.detail.theme);
      }
    });
    
    window.addEventListener('languageChanged', (e) => {
      if (window.pptViewer && window.pptViewer.i18nManager) {
        window.pptViewer.i18nManager.currentLang = e.detail.language;
        window.pptViewer.i18nManager.updateUI();
      }
    });
  }
});