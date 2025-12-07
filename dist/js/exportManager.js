/**
 * 导出管理器
 * 支持将整个项目文件夹导出为压缩包
 */

export class ExportManager {
  constructor(fileManager) {
    this.fileManager = fileManager;
    this.init();
  }

  /**
   * 初始化导出功能
   */
  init() {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportProject());
      console.log('📦 导出管理器已初始化');
    } else {
      console.error('❌ 找不到导出按钮 #export-btn');
    }
  }

  /**
   * 导出整个项目
   */
  async exportProject() {
    try {
      console.log('🚀 开始导出项目...');

      // 显示导出状态
      const exportBtn = document.getElementById('export-btn');
      const originalText = exportBtn.textContent;
      exportBtn.textContent = '📦 导出中...';
      exportBtn.disabled = true;

      // 获取所有文件数据
      const files = this.gatherAllFiles();

      if (files.length === 0) {
        this.showMessage('没有可导出的文件', 'warning');
        exportBtn.textContent = originalText;
        exportBtn.disabled = false;
        return;
      }

      // 创建压缩包
      const zipBlob = await this.createZipFile(files);

      // 下载文件
      this.downloadFile(zipBlob, `web-compiler-project-${this.getTimestamp()}.zip`);

      console.log('✅ 项目导出成功');
      this.showMessage('项目导出成功！', 'success');

    } catch (error) {
      console.error('❌ 导出失败:', error);
      this.showMessage('导出失败: ' + error.message, 'error');
    } finally {
      // 恢复按钮状态
      const exportBtn = document.getElementById('export-btn');
      exportBtn.textContent = '📦 导出';
      exportBtn.disabled = false;
    }
  }

  /**
   * 收集所有文件数据
   */
  gatherAllFiles() {
    const files = [];

    if (!this.fileManager || !this.fileManager.files) {
      console.warn('⚠️ 文件管理器不可用');
      return files;
    }

    // 收集文件管理器中的所有文件
    Object.entries(this.fileManager.files).forEach(([filePath, content]) => {
      if (content && content.trim()) {
        files.push({
          path: filePath,
          content: content,
          type: this.getFileType(filePath)
        });
      }
    });

    console.log(`📁 收集到 ${files.length} 个文件`);
    return files;
  }

  /**
   * 获取文件类型
   */
  getFileType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();

    const textTypes = ['html', 'css', 'js', 'json', 'csv', 'md', 'txt', 'xml'];
    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'];

    if (textTypes.includes(ext)) {
      return 'text';
    } else if (imageTypes.includes(ext)) {
      return 'binary';
    }
    return 'text';
  }

  /**
   * 创建ZIP文件
   */
  async createZipFile(files) {
    return new Promise((resolve, reject) => {
      try {
        // 使用JSZip库创建压缩包
        const JSZip = window.JSZip;

        if (!JSZip) {
          // 动态加载JSZip库
          this.loadJSZip().then(() => {
            this.createZipFileInternal(files).then(resolve).catch(reject);
          }).catch(reject);
          return;
        }

        this.createZipFileInternal(files).then(resolve).catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 内部ZIP创建方法
   */
  createZipFileInternal(files) {
    return new Promise((resolve, reject) => {
      const zip = new JSZip();

      files.forEach(file => {
        if (file.type === 'binary') {
          // 二进制文件（图片）
          if (file.content.startsWith('data:')) {
            // Data URL格式
            const base64Data = file.content.split(',')[1];
            zip.file(file.path, base64Data, { base64: true });
          } else {
            zip.file(file.path, file.content);
          }
        } else {
          // 文本文件
          zip.file(file.path, file.content);
        }
      });

      zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      }).then(blob => {
        resolve(blob);
      }).catch(error => {
        reject(error);
      });
    });
  }

  /**
   * 动态加载JSZip库
   */
  loadJSZip() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('无法加载JSZip库'));
      document.head.appendChild(script);
    });
  }

  /**
   * 下载文件
   */
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * 获取时间戳
   */
  getTimestamp() {
    const now = new Date();
    return now.getFullYear() +
           String(now.getMonth() + 1).padStart(2, '0') +
           String(now.getDate()).padStart(2, '0') + '_' +
           String(now.getHours()).padStart(2, '0') +
           String(now.getMinutes()).padStart(2, '0');
  }

  /**
   * 显示消息提示
   */
  showMessage(message, type = 'info') {
    // 如果有控制台管理器，使用它来显示消息
    if (window.consoleManager) {
      window.consoleManager.append(type === 'error' ? 'error' : 'info', [`📦 ${message}`]);
    } else {
      console.log(`📦 ${message}`);
    }

    // 可以在这里添加Toast通知
    this.showToast(message, type);
  }

  /**
   * 显示Toast通知
   */
  showToast(message, type = 'info') {
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(toast);

    // 显示动画
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 100);

    // 3秒后隐藏
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}