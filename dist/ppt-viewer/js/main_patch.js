// 这个文件将作为patch来更新main.js中的handleFileUpload方法

// 保存原始方法
if (typeof PPTViewer !== 'undefined') {
  const originalHandleFileUpload = PPTViewer.prototype.handleFileUpload;

  // 重写handleFileUpload方法
  PPTViewer.prototype.handleFileUpload = function(files) {
    [...files].forEach(async file => {
      // 检查文件类型
      const type = this.getFileType(file);
      if (type !== 'ppt') {
        this.showMessage(`不支持的文件类型: ${file.name}`, 'error');
        return;
      }

      // 检查文件扩展名
      if (!file.name.toLowerCase().endsWith('.pptx')) {
        this.showMessage(`请上传PPTX格式文件: ${file.name}`, 'error');
        return;
      }

      // 检查文件大小 (200MB限制)
      const maxSize = 200 * 1024 * 1024; // 200MB
      if (file.size > maxSize) {
        this.showMessage(`文件太大: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`, 'error');
        this.showMessage('请压缩文件或选择小于200MB的文件', 'error');
        return;
      }

      // 使用Canvas渲染器直接处理本地文件
      this.createPPTViewer(file);
    });
  };

  // 添加createPPTViewer方法
  PPTViewer.prototype.createPPTViewer = function(file) {
    // 获取主内容区域
    const mainContent = document.querySelector('.flex-1.p-6.overflow-hidden.relative');

    // 隐藏欢迎消息，显示PPT查看器
    const welcomeMsg = document.getElementById('welcome-message');
    const pptViewer = document.getElementById('ppt-viewer');

    if (welcomeMsg) welcomeMsg.classList.add('hidden');
    if (pptViewer) {
      pptViewer.classList.remove('hidden');
      pptViewer.innerHTML = `
        <div class="ppt-viewer-container h-full w-full">
          <!-- Canvas显示区域 -->
          <div class="viewer-content h-full bg-white overflow-auto relative" style="height: 100%;">
            <div id="canvas-container" class="flex items-center justify-center h-full"></div>
          </div>
        </div>
      `;
    }

    // 工具栏已移除，直接渲染PPT
    this.bindBasicViewerEvents(file);

    // 使用Canvas渲染器渲染PPT
    const container = document.getElementById('canvas-container');
    this.canvasRenderer.renderPPT(file, container, (result) => {
      if (result.success) {
        console.log(`PPT渲染成功，共 ${result.totalPages} 页`);
      } else {
        console.error('Canvas渲染失败:', result.error);
        this.showMessage(`渲染失败: ${result.error}`, 'error');
      }
    });
  };

  // 添加bindBasicViewerEvents方法 - 只保留键盘事件
  PPTViewer.prototype.bindBasicViewerEvents = function(file) {
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.canvasRenderer.previousSlide();
          console.log(`当前页: ${this.canvasRenderer.currentSlide + 1}`);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.canvasRenderer.nextSlide();
          console.log(`当前页: ${this.canvasRenderer.currentSlide + 1}`);
          break;
        case 'F11':
          e.preventDefault();
          const viewer = document.querySelector('.ppt-viewer-container');
          if (!document.fullscreenElement) {
            viewer.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            this.closeCanvasViewer();
          }
          break;
      }
    });
  };

  
  // 添加closeCanvasViewer方法
  PPTViewer.prototype.closeCanvasViewer = function() {
    // 恢复界面
    const welcomeMsg = document.getElementById('welcome-message');
    const pptViewer = document.getElementById('ppt-viewer');

    if (welcomeMsg) welcomeMsg.classList.remove('hidden');
    if (pptViewer) {
      pptViewer.classList.add('hidden');
      pptViewer.innerHTML = '';
    }

    // 重置状态
    this.currentPPT = null;
  };
}