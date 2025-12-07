/**
 * PPT演示模块主页面功能 - 简化版本
 */

// 简单的i18n管理器
class SimpleI18n {
  constructor() {
    this.currentLang = localStorage.getItem('language') || 'zh';
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
        'welcome.supported-format': 'PowerPoint (.ppt, .pptx)',
        'shortcuts.title': '快捷键',
        'shortcuts.prev-page': '上一页',
        'shortcuts.next-page': '下一页',
        'shortcuts.first-page': '第一页',
        'shortcuts.last-page': '最后一页',
        'shortcuts.fullscreen': '全屏',
        'shortcuts.play-pause': '播放/暂停',
        'shortcuts.exit-fullscreen': '退出全屏'
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
        'welcome.description': 'Support online PowerPoint presentation',
        'welcome.supported-format': 'PowerPoint (.ppt, .pptx)',
        'shortcuts.title': 'Shortcuts',
        'shortcuts.prev-page': 'Previous Page',
        'shortcuts.next-page': 'Next Page',
        'shortcuts.first-page': 'First Page',
        'shortcuts.last-page': 'Last Page',
        'shortcuts.fullscreen': 'Fullscreen',
        'shortcuts.play-pause': 'Play/Pause',
        'shortcuts.exit-fullscreen': 'Exit Fullscreen'
      }
    };
  }

  t(key) {
    return this.translations[this.currentLang][key] || key;
  }

  toggle() {
    this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('language', this.currentLang);
    this.updatePageLanguage();
  }

  updatePageLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        element.textContent = this.t(key);
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      if (key) {
        element.title = this.t(key);
      }
    });

    // 更新语言切换按钮文本
    const langText = document.getElementById('lang-text');
    if (langText) {
      langText.textContent = this.currentLang === 'zh' ? '中' : 'En';
    }
  }
}

class SimplePPTViewer {
  constructor() {
    this.currentPPT = null;
    this.ppts = [];
    this.autoplay = false;
    this.loop = false;
    this.showNotes = false;
    this.localPreview = null;
    this.currentViewMode = 'online'; // 'online' 或 'local'
    this.images = null;
    this.currentPage = 0;
    this.currentZoom = 1;
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    this.i18nManager = new SimpleI18n();
    this.canvasRenderer = null;

    this.init();
  }

  async init() {
    console.log('[PPTViewer] 初始化PPT查看器...');

    // 初始化主题
    this.applyTheme(this.currentTheme);

    // 初始化语言
    this.i18nManager.updatePageLanguage();

    // 初始化事件监听器
    this.initEventListeners();

    // 初始化文件拖放
    this.initFileDrop();

    // 加载保存的PPT文件
    await this.loadSavedPPTs();

    console.log('[PPTViewer] PPT查看器初始化完成');
  }

  initEventListeners() {
    // 主题切换
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // 语言切换
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        this.i18nManager.toggle();
      });
    }

    // 文件选择
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // 拖拽区域点击
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.addEventListener('click', () => {
        fileInput?.click();
      });
    }

    // 控制按钮
    document.getElementById('prev-btn')?.addEventListener('click', () => this.previousSlide());
    document.getElementById('next-btn')?.addEventListener('click', () => this.nextSlide());
    document.getElementById('play-pause-btn')?.addEventListener('click', () => this.toggleAutoplay());
    document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
    document.getElementById('export-pdf-btn')?.addEventListener('click', () => this.exportToPDF());

    // 侧边栏切换
    document.getElementById('toggle-sidebar')?.addEventListener('click', () => this.toggleSidebar());
    document.getElementById('show-sidebar')?.addEventListener('click', () => this.showSidebar());

    // 演示控制
    document.getElementById('autoplay-toggle')?.addEventListener('click', () => this.toggleAutoplay());
    document.getElementById('loop-toggle')?.addEventListener('click', () => this.toggleLoop());
    document.getElementById('notes-toggle')?.addEventListener('click', () => this.toggleNotes());

    // 快捷键
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // 快捷键提示
    document.getElementById('shortcuts-btn')?.addEventListener('click', () => this.toggleShortcuts());

    // 监听PPT库加载完成事件
    document.addEventListener('pptLibrariesReady', () => {
      console.log('[PPTViewer] PPT库加载完成');
      if (window.pptLibrariesLoaded) {
        this.initCanvasRenderer();
      } else {
        console.warn('[PPTViewer] PPT库加载失败，某些功能可能不可用');
      }
    });
  }

  initFileDrop() {
    const dropZone = document.getElementById('drop-zone');
    const viewer = document.getElementById('ppt-viewer');

    [dropZone, viewer].forEach(element => {
      if (!element) return;

      element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('dragover');
      });

      element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        element.classList.remove('dragover');
      });

      element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.handleFiles(files);
      });
    });
  }

  async handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.handleFiles(files);
  }

  async handleFiles(files) {
    const pptFiles = files.filter(file =>
      file.type === 'application/vnd.ms-powerpoint' ||
      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.name.toLowerCase().endsWith('.ppt') ||
      file.name.toLowerCase().endsWith('.pptx')
    );

    if (pptFiles.length === 0) {
      alert('请选择PPT文件 (.ppt, .pptx)');
      return;
    }

    for (const file of pptFiles) {
      await this.loadPPTFile(file);
    }
  }

  async loadPPTFile(file) {
    try {
      console.log(`[PPTViewer] 加载PPT文件: ${file.name}`);

      // 创建文件URL
      const fileUrl = URL.createObjectURL(file);

      const ppt = {
        id: Date.now() + Math.random(),
        name: file.name,
        url: fileUrl,
        uploadTime: new Date().toLocaleString(),
        type: 'pptx',
        file: file,
        data: null,
        slideCount: 0
      };

      // 添加到PPT列表
      this.ppts.unshift(ppt);
      this.currentPPT = ppt;

      // 保存到localStorage
      this.savePPTs();

      // 更新文件列表
      this.updateFileList();

      // 显示PPT
      await this.displayPPT(ppt);

      console.log(`[PPTViewer] PPT文件加载完成: ${file.name}`);

    } catch (error) {
      console.error('[PPTViewer] PPT文件加载失败:', error);
      alert(`PPT文件加载失败: ${error.message}`);
    }
  }

  async displayPPT(ppt) {
    try {
      // 显示欢迎消息
      document.getElementById('welcome-message')?.classList.add('hidden');
      document.getElementById('ppt-viewer')?.classList.remove('hidden');
      document.getElementById('control-bar')?.classList.remove('hidden');

      // 更新标题
      const titleElement = document.getElementById('ppt-title');
      if (titleElement) {
        titleElement.textContent = ppt.name;
      }

      // 更新信息
      const infoElement = document.getElementById('ppt-info');
      if (infoElement) {
        infoElement.textContent = `上传时间: ${ppt.uploadTime}`;
      }

      // 启用按钮
      document.getElementById('fullscreen-btn')?.removeAttribute('disabled');
      document.getElementById('export-pdf-btn')?.removeAttribute('disabled');

      // 如果已有公网URL，直接显示
      if (ppt.publicUrl) {
        this.showOfficeOnlinePreview(ppt.publicUrl, ppt.name);
        return;
      }

      // 否则上传到 Supabase 获取公网URL
      await this.uploadAndPreview(ppt);

    } catch (error) {
      console.error('[PPTViewer] 显示PPT失败:', error);
      alert(`显示PPT失败: ${error.message}`);
    }
  }

  // 上传到 Supabase 并预览
  async uploadAndPreview(ppt) {
    const viewer = document.getElementById('ppt-viewer');
    if (!viewer || !ppt || !ppt.name) {
      console.error('[PPTViewer] 无效的PPT对象:', ppt);
      return;
    }

    console.log('[PPTViewer] 开始上传PPT:', ppt.name);

    // 显示上传进度
    viewer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full">
        <div class="loading-spinner mb-4"></div>
        <p class="text-white mb-2">正在上传到云端...</p>
        <div class="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div id="upload-progress-bar" class="h-full bg-blue-500 transition-all" style="width: 0%"></div>
        </div>
        <p id="upload-percent" class="text-gray-400 text-sm mt-2">0%</p>
      </div>
    `;

    try {
      const publicUrl = await this.uploadToSupabase(ppt.file, (progress) => {
        const progressBar = document.getElementById('upload-progress-bar');
        const percentText = document.getElementById('upload-percent');
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (percentText) percentText.textContent = `${progress}%`;
      });

      // 保存公网URL到ppt对象
      ppt.publicUrl = publicUrl;
      this.savePPTs();

      // 显示预览
      this.showOfficeOnlinePreview(publicUrl, ppt.name);

    } catch (error) {
      console.error('[PPTViewer] 上传失败:', error);
      viewer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center">
          <svg class="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-white mb-2">上传失败</p>
          <p class="text-gray-400 text-sm mb-4">${error.message}</p>
          <button onclick="pptViewer.uploadAndPreview(pptViewer.currentPPT)" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            重试
          </button>
        </div>
      `;
    }
  }

  // 上传文件到 Supabase
  uploadToSupabase(file, onProgress) {
    return new Promise((resolve, reject) => {
      const SUPABASE_URL = 'https://gjoymdzbiiijeregqemj.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb3ltZHpiaWlpamVyZWdxZW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMDA0NjYsImV4cCI6MjA3OTg3NjQ2Nn0.0HeF8MF0B7hlNaePJ7BFGm0BtDvwn3YnBSzQAEMokQM';
      const SUPABASE_BUCKET = 'code';

      // 生成安全文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop().toLowerCase();
      const safeFileName = `ppt_${timestamp}_${randomStr}.${ext}`;
      const filePath = `ppt-files/${safeFileName}`;

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
          console.log('[PPTViewer] 上传成功:', publicUrl);
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
    const viewer = document.getElementById('ppt-viewer');
    if (!viewer) return;

    const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;

    viewer.innerHTML = `
      <div class="w-full h-full relative">
        <iframe 
          src="${officeEmbedUrl}" 
          class="w-full h-full border-0 rounded-lg"
          frameborder="0"
          allowfullscreen
          id="office-iframe"
        ></iframe>
        <div id="iframe-loading" class="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
          <div class="text-center">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-300">正在加载预览...</p>
          </div>
        </div>
        <button 
          onclick="pptViewer.togglePreviewFullscreen()" 
          class="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all shadow-lg"
          title="全屏"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
          </svg>
        </button>
      </div>
    `;

    // iframe 加载完成后隐藏loading
    const iframe = document.getElementById('office-iframe');
    const loadingEl = document.getElementById('iframe-loading');
    if (iframe && loadingEl) {
      iframe.onload = () => {
        loadingEl.style.display = 'none';
      };
      setTimeout(() => {
        loadingEl.style.display = 'none';
      }, 5000);
    }

    console.log('[PPTViewer] Office Online 预览已显示');
  }

  // 全屏预览
  togglePreviewFullscreen() {
    const viewer = document.getElementById('ppt-viewer');
    if (!viewer) return;

    if (!document.fullscreenElement) {
      viewer.requestFullscreen().catch(err => {
        console.error('无法进入全屏:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  displayFallback(ppt) {
    const viewer = document.getElementById('ppt-viewer');
    if (!viewer) return;

    const fileSize = ppt.file ? `文件大小: ${(ppt.file.size / 1024 / 1024).toFixed(2)} MB` : '';

    viewer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center p-8">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h3 class="text-xl font-medium text-white mb-2">PowerPoint 文件</h3>
        <p class="text-gray-400 mb-4">已选择: ${ppt.name}</p>
        <p class="text-gray-500 text-sm">${fileSize}</p>
        <div class="mt-6 space-x-4">
          <button onclick="window.pptViewer.downloadCurrentPPT()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            下载文件
          </button>
          <button onclick="window.pptViewer.openInOffice()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            在Office中打开
          </button>
        </div>
      </div>
    `;
  }

  downloadCurrentPPT() {
    if (!this.currentPPT || !this.currentPPT.name) {
      console.error('[PPTViewer] 没有可下载的PPT文件');
      return;
    }

    const link = document.createElement('a');
    link.href = this.currentPPT.url;
    link.download = this.currentPPT.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openInOffice() {
    if (!this.currentPPT || !this.currentPPT.name) {
      console.error('[PPTViewer] 没有可打开的PPT文件');
      return;
    }

    // 使用已有的公网URL，或者使用文件URL
    const publicUrl = this.currentPPT.publicUrl || this.currentPPT.url;
    if (!publicUrl) {
      console.error('[PPTViewer] 没有有效的文件URL');
      return;
    }

    const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicUrl)}`;
    window.open(officeUrl, '_blank');
  }

  updateFileList() {
    const fileList = document.getElementById('file-list');
    if (!fileList) return;

    if (this.ppts.length === 0) {
      fileList.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0l1 16h8l1-16M9 9h6m-6 4h6"></path>
          </svg>
          <p class="text-sm">暂无PPT文件</p>
          <p class="text-xs mt-1">拖拽或点击上传PPT文件</p>
        </div>
      `;
      return;
    }

    fileList.innerHTML = this.ppts.map(ppt => `
      <div class="file-item ${this.currentPPT?.id === ppt.id ? 'active' : ''}"
           data-id="${ppt.id}"
           onclick="window.pptViewer.selectPPT('${ppt.id}')">
        <div class="file-icon ${ppt.type}">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-white text-sm truncate">${ppt.name}</p>
          <p class="text-gray-400 text-xs truncate">${ppt.uploadTime}</p>
        </div>
      </div>
    `).join('');
  }

  selectPPT(id) {
    const ppt = this.ppts.find(p => p.id == id);
    if (ppt) {
      this.currentPPT = ppt;
      this.displayPPT(ppt);
      this.updateFileList();
    }
  }

  async loadSavedPPTs() {
    try {
      const saved = localStorage.getItem('savedPPTs');
      if (saved) {
        this.ppts = JSON.parse(saved);
        this.updateFileList();
      }
    } catch (error) {
      console.error('[PPTViewer] 加载保存的PPT失败:', error);
    }
  }

  savePPTs() {
    try {
      // 不保存blob URL和File对象，只保存基本信息和publicUrl
      const saveData = this.ppts.map(ppt => ({
        id: ppt.id,
        name: ppt.name,
        uploadTime: ppt.uploadTime,
        type: ppt.type,
        data: ppt.data,
        slideCount: ppt.slideCount,
        publicUrl: ppt.publicUrl || null  // 保存Supabase公网URL
      }));
      localStorage.setItem('savedPPTs', JSON.stringify(saveData));
    } catch (error) {
      console.error('[PPTViewer] 保存PPT失败:', error);
    }
  }

  // 主题切换
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('theme', this.currentTheme);
  }

  applyTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme min-h-screen flex' : 'min-h-screen flex';

    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');

    if (theme === 'light') {
      lightIcon?.classList.remove('hidden');
      darkIcon?.classList.add('hidden');
    } else {
      lightIcon?.classList.add('hidden');
      darkIcon?.classList.remove('hidden');
    }
  }

  // 幻灯片导航
  previousSlide() {
    // 实现上一页逻辑
  }

  nextSlide() {
    // 实现下一页逻辑
  }

  // 自动播放
  toggleAutoplay() {
    this.autoplay = !this.autoplay;
    const btn = document.getElementById('autoplay-toggle');
    if (btn) {
      btn.classList.toggle('bg-green-600', this.autoplay);
      btn.classList.toggle('bg-gray-700', !this.autoplay);
    }
  }

  // 循环播放
  toggleLoop() {
    this.loop = !this.loop;
    const btn = document.getElementById('loop-toggle');
    if (btn) {
      btn.classList.toggle('bg-green-600', this.loop);
      btn.classList.toggle('bg-gray-700', !this.loop);
    }
  }

  // 显示备注
  toggleNotes() {
    this.showNotes = !this.showNotes;
    const btn = document.getElementById('notes-toggle');
    if (btn) {
      btn.classList.toggle('bg-green-600', this.showNotes);
      btn.classList.toggle('bg-gray-700', !this.showNotes);
    }
  }

  // 全屏
  toggleFullscreen() {
    const container = document.getElementById('ppt-viewer');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // 导出PDF
  exportToPDF() {
    alert('PDF导出功能开发中...');
  }

  // 侧边栏
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const showBtn = document.getElementById('show-sidebar');

    if (sidebar) {
      sidebar.classList.add('hidden');
      showBtn?.classList.remove('hidden');
    }
  }

  showSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const showBtn = document.getElementById('show-sidebar');

    if (sidebar) {
      sidebar.classList.remove('hidden');
      showBtn?.classList.add('hidden');
    }
  }

  // 快捷键提示
  toggleShortcuts() {
    const hint = document.getElementById('shortcuts-hint');
    if (hint) {
      hint.classList.toggle('show');
    }
  }

  // 键盘事件
  handleKeyboard(event) {
    switch (event.key) {
      case 'ArrowLeft':
        this.previousSlide();
        break;
      case 'ArrowRight':
        this.nextSlide();
        break;
      case 'Home':
        this.currentPage = 0;
        break;
      case 'End':
        // 跳转到最后一页
        break;
      case 'F11':
        this.toggleFullscreen();
        break;
      case ' ':
        this.toggleAutoplay();
        break;
      case 'Escape':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        break;
    }
  }

  initCanvasRenderer() {
    if (typeof JSZip !== 'undefined' && typeof fabric !== 'undefined') {
      console.log('[PPTViewer] 初始化Canvas渲染器');
      // Canvas渲染器初始化逻辑
    } else {
      console.warn('[PPTViewer] 缺少必要的库，Canvas渲染器不可用');
    }
  }

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
    `;
    document.head.appendChild(style);
  }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
  window.pptViewer = new SimplePPTViewer();
});