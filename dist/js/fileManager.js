/**
 * 简化的文件管理器
 * 核心功能：文件树、文件选择、预览逻辑
 */

import { getAllFiles, saveFileData } from './storage.js';

// 默认端口配置
const FRONTEND_PORT = 5020;
const API_PORT = 5024;

export class FileManager {
  constructor(editors, storage, preview) {
    this.fileTree = document.getElementById('file-tree');
    this.editors = editors;
    this.storage = storage;
    this.preview = preview;
    this.currentFilePath = null;

    // 文件数据存储
    this.files = {};
    this.loadStoredFiles();

    console.log('🗂️ FileManager 初始化完成');
  }

  /**
   * 安全获取文件扩展名
   * @param {string} filePath - 文件路径
   * @returns {string} 扩展名（小写）
   */
  getFileExtension(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return '';
      }

      const parts = filePath.split('.');
      if (parts.length < 2) {
        return '';
      }

      const ext = parts.pop().toLowerCase();
      if (!ext || ext.length === 0) {
        return '';
      }

      return ext;
    } catch (error) {
      console.error(`❌ FileManager获取文件扩展名失败: ${filePath}`, error);
      return '';
    }
  }

  init() {
    this.generateFileTree();
    this.loadStoredFiles();
    this.setupEvents();
    this.initDefaultFiles();
  }

  generateFileTree() {
    this.fileTree.innerHTML = '';

    const folders = [
      { path: 'html', name: '📄 HTML', icon: '📄' },
      { path: 'css', name: '🎨 CSS', icon: '🎨' },
      { path: 'js', name: '⚡ JavaScript', icon: '⚡' },
      { path: 'data', name: '📊 Data', icon: '📊' }
    ];

    const folderElements = {};

    // 创建文件夹结构
    folders.forEach(folder => {
      const folderEl = this.createFolder(folder.path, folder.name);
      folderElements[folder.path] = folderEl;
      this.fileTree.appendChild(folderEl);
    });

    // 收集所有已存在的文件
    const filePaths = Object.keys(this.files).sort();

    // 按文件夹分组文件
    const filesByFolder = {};
    filePaths.forEach(filePath => {
      const folderPath = this.getFolderPath(filePath);
      if (!filesByFolder[folderPath]) {
        filesByFolder[folderPath] = [];
      }
      filesByFolder[folderPath].push(filePath);
    });

    // 添加文件到对应的文件夹
    Object.keys(filesByFolder).forEach(folderPath => {
      if (folderElements[folderPath]) {
        const contents = folderElements[folderPath].querySelector('.folder-contents');
        filesByFolder[folderPath].forEach(filePath => {
          // 检查文件是否已存在（避免重复添加）
          const existingFile = contents.querySelector(`[data-path="${filePath}"]`);
          if (!existingFile) {
            const fileEl = this.createFile(filePath);
            contents.appendChild(fileEl);
          }
        });
      } else {
        // 如果是根目录文件，直接添加到文件树
        filesByFolder[folderPath].forEach(filePath => {
          const fileEl = this.createFile(filePath);
          this.fileTree.appendChild(fileEl);
        });
      }
    });

    // 如果没有任何文件，添加默认文件
    if (filePaths.length === 0) {
      const defaultFiles = [
        { path: 'html/index.html', folder: 'html' },
        { path: 'css/style.css', folder: 'css' },
        { path: 'js/main.js', folder: 'js' },
        { path: 'data/data.json', folder: 'data' },
        { path: 'data/data.csv', folder: 'data' }
      ];

      defaultFiles.forEach(file => {
        const contents = folderElements[file.folder].querySelector('.folder-contents');
        const fileEl = this.createFile(file.path);
        contents.appendChild(fileEl);
      });
    }

    // 展开所有文件夹（初始状态，无动画）
    Object.values(folderElements).forEach(folder => {
      folder.classList.add('open');
      const contents = folder.querySelector('.folder-contents');
      const arrow = folder.querySelector('.folder-arrow');
      if (contents && arrow) {
        // 设置初始状态（不触发动画）
        contents.style.transition = 'none';
        contents.classList.add('expanded');
        contents.classList.remove('collapsed');
        contents.style.maxHeight = 'none';
        contents.style.opacity = '1';
        arrow.style.transition = 'none';
        arrow.classList.add('expanded');
        arrow.textContent = '▼';

        // 延迟重新启用过渡效果
        setTimeout(() => {
          contents.style.transition = 'max-height 0.3s ease, opacity 0.2s ease';
          arrow.style.transition = 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }, 100);
      }
    });
  }

  /**
   * 获取文件所在的文件夹路径
   */
  getFolderPath(filePath) {
    const slashIndex = filePath.indexOf('/');
    if (slashIndex > 0) {
      return filePath.substring(0, slashIndex);
    }
    return 'root';
  }

  createFolder(path, name) {
    const folder = document.createElement('li');
    folder.className = 'folder';
    folder.dataset.path = path;
    folder.innerHTML = `
      <div class="folder-header">
        <span class="folder-arrow">▶</span>
        <span class="folder-icon">📁</span>
        <span class="folder-name">${name}</span>
      </div>
      <ul class="folder-contents collapsed"></ul>
    `;
    return folder;
  }

  createFile(path) {
    const fileName = path.split('/').pop();
    const icon = this.getFileIcon(fileName);

    const file = document.createElement('li');
    file.className = 'file';
    file.dataset.path = path;
    file.innerHTML = `
      <span class="file-icon">${icon}</span>
      <span class="file-name">${fileName}</span>
    `;
    return file;
  }

  getFileIcon(fileName) {
    const ext = this.getFileExtension(fileName);
    const icons = {
      'html': '📄', 'css': '🎨', 'js': '⚡',
      'json': '📊', 'csv': '📊', 'md': '📝',
      'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️',
      'svg': '🖼️', 'webp': '🖼️', 'ico': '🖼️',
      'ppt': '📽️', 'pptx': '📽️', 'pdf': '📄', 'doc': '📝', 'docx': '📝',
      'xls': '📊', 'xlsx': '📊', 'txt': '📄', 'zip': '🗜️', 'rar': '🗜️'
    };
    return icons[ext] || '📄';
  }

  setupEvents() {
    try {
      if (!this.fileTree) {
        console.error('❌ 文件树元素不存在');
        return;
      }

      // 文件夹展开/折叠
      this.fileTree.addEventListener('click', (e) => {
        try {
          const header = e.target.closest('.folder-header');
          if (header) {
            const folder = header.parentElement;
            if (!folder) return;

            const contents = folder.querySelector('.folder-contents');
            const arrow = header.querySelector('.folder-arrow');

            if (contents && arrow) {
              folder.classList.toggle('open');
              const isOpen = folder.classList.contains('open');

              // 平滑动画展开/收起
              if (isOpen) {
                // 移除收起状态，添加展开状态
                contents.classList.remove('collapsed');
                contents.classList.add('expanded');
                arrow.classList.add('expanded');
                arrow.textContent = '▼';

                // 确保有过渡效果
                contents.style.transition = 'max-height 0.3s ease, opacity 0.2s ease';

                // 先获取实际高度
                const scrollHeight = contents.scrollHeight;
                contents.style.maxHeight = '0';
                contents.style.opacity = '0';

                // 在下一帧触发展开动画
                requestAnimationFrame(() => {
                  contents.style.maxHeight = scrollHeight + 'px';
                  contents.style.opacity = '1';

                  // 动画完成后清除max-height限制
                  setTimeout(() => {
                    if (contents.classList.contains('expanded')) {
                      contents.style.maxHeight = 'none';
                    }
                  }, 300);
                });
              } else {
                // 移除展开状态，添加收起状态
                contents.classList.remove('expanded');
                contents.classList.add('collapsed');
                arrow.classList.remove('expanded');
                arrow.textContent = '▶';

                // 确保有过渡效果
                contents.style.transition = 'max-height 0.3s ease, opacity 0.2s ease';

                // 设置当前高度
                const scrollHeight = contents.scrollHeight;
                contents.style.maxHeight = scrollHeight + 'px';
                contents.style.opacity = '1';

                // 在下一帧触发收起动画
                requestAnimationFrame(() => {
                  contents.style.maxHeight = '0';
                  contents.style.opacity = '0';
                });
              }
            }
            return;
          }

          // 文件选择
          const file = e.target.closest('.file');
          if (file && file.dataset && file.dataset.path) {
            this.selectFile(file.dataset.path);
            return;
          }
        } catch (error) {
          console.error('❌ 处理文件树点击事件失败:', error);
        }
      });
    } catch (error) {
      console.error('❌ 设置文件树事件失败:', error);
    }
  }

  loadStoredFiles() {
    try {
      const storedFiles = getAllFiles();

      // 清除旧的缓存格式，强制使用新的默认内容
      if (localStorage.getItem('web-compiler-files')) {
        console.log('🧹 清除旧缓存格式');
        localStorage.removeItem('web-compiler-files');
      }

      // 定义允许的默认文件列表
      const allowedFiles = [
        'html/index.html',
        'css/style.css',
        'js/main.js',
        'data/data.json',
        'data/data.csv'
      ];

      // 清理不在允许列表中的文件
      const cleanedFiles = {};
      const filesToDelete = [];

      Object.keys(storedFiles).forEach(filePath => {
        if (allowedFiles.includes(filePath)) {
          cleanedFiles[filePath] = storedFiles[filePath];
        } else {
          filesToDelete.push(filePath);
        }
      });

      // 删除杂乱文件的存储
      if (filesToDelete.length > 0) {
        console.log(`🗑️ 清理 ${filesToDelete.length} 个杂乱文件:`, filesToDelete);
        filesToDelete.forEach(filePath => {
          localStorage.removeItem(`file-${filePath}`);
        });

        // 更新主要的文件存储
        const allFilesData = localStorage.getItem('web-compiler-all-files');
        if (allFilesData) {
          try {
            const allFiles = JSON.parse(allFilesData);
            filesToDelete.forEach(filePath => {
              delete allFiles[filePath];
            });
            localStorage.setItem('web-compiler-all-files', JSON.stringify(allFiles));
            console.log('✅ 已更新文件存储');
          } catch (error) {
            console.warn('清理文件存储失败:', error);
          }
        }
      }

      // 检查是否有默认文件
      const hasDefaultFiles = cleanedFiles['html/index.html'] &&
                              cleanedFiles['css/style.css'] &&
                              cleanedFiles['js/main.js'];

      if (!hasDefaultFiles) {
        console.log('🔄 设置默认内容');
        this.files = {
          'html/index.html': this.getDefaultContent('html/index.html'),
          'css/style.css': this.getDefaultContent('css/style.css'),
          'js/main.js': this.getDefaultContent('js/main.js'),
          'data/data.json': this.getDefaultContent('data/data.json'),
          'data/data.csv': this.getDefaultContent('data/data.csv')
        };
      } else {
        this.files = { ...cleanedFiles };
      }

      console.log('已加载存储的文件:', Object.keys(cleanedFiles));
      console.log('当前files对象包含:', Object.keys(this.files));
    } catch (error) {
      console.warn('加载存储文件失败:', error);
      this.initDefaultFiles();
    }
  }

  initDefaultFiles() {
    // 强制设置默认文件内容
    this.files = {
      'html/index.html': this.getDefaultContent('html/index.html'),
      'css/style.css': this.getDefaultContent('css/style.css'),
      'js/main.js': this.getDefaultContent('js/main.js'),
      'data/data.json': this.getDefaultContent('data/data.json'),
      'data/data.csv': this.getDefaultContent('data/data.csv')
    };
    console.log('🕐 已初始化默认文件');
    console.log('文件数量:', Object.keys(this.files).length);

    // 立即加载到编辑器（不等待，确保内容可用）
    if (this.editors) {
      this.loadAllFilesToEditors();
    }
  }

  /**
   * 加载所有文件到编辑器
   */
  loadAllFilesToEditors() {
    if (!this.editors) return;

    // 加载HTML
    const htmlContent = this.files['html/index.html'] || '';
    this.editors.setValue('html', htmlContent);

    // 加载CSS
    const cssContent = this.files['css/style.css'] || '';
    this.editors.setValue('css', cssContent);

    // 加载JS
    const jsContent = this.files['js/main.js'] || '';
    this.editors.setValue('js', jsContent);

    console.log('📝 已加载所有文件到编辑器');
  }

  selectFile(filePath) {
    // 保存当前文件
    this.saveCurrentFile();

    // 更新当前文件路径
    this.currentFilePath = filePath;

    // 更新选中状态
    this.fileTree.querySelectorAll('.file').forEach(f => {
      f.classList.remove('active');
    });
    const currentFile = this.fileTree.querySelector(`[data-path="${filePath}"]`);
    if (currentFile) {
      currentFile.classList.add('active');
    }

    // 异步加载文件内容，避免阻塞UI
    this.loadFileContent(filePath).then(() => {
      // 确保文件加载完成后再触发预览更新
      this.updatePreview(filePath);
    }).catch(error => {
      console.error(`❌ 选择文件失败: ${filePath}`, error);
      // 即使加载失败也要触发预览更新
      this.updatePreview(filePath);
    });
  }

  /**
   * 加载相关文件到编辑器
   */
  loadRelatedFiles() {
    return new Promise((resolve) => {
      console.log('🔄 开始加载相关文件...');
      console.log('可用文件:', Object.keys(this.files));

      try {
        // 使用微任务确保异步执行，避免竞态条件
        Promise.resolve().then(() => {
          // 加载CSS文件
          const cssContent = this.files['css/style.css'] || this.getDefaultContent('css/style.css');
          if (this.editors && this.editors.setValue) {
            this.editors.setValue('css', cssContent);
            console.log('📝 CSS文件内容长度:', cssContent.length);
          }

          // 加载JS文件
          const jsContent = this.files['js/main.js'] || this.getDefaultContent('js/main.js');
          if (this.editors && this.editors.setValue) {
            this.editors.setValue('js', jsContent);
            console.log('📝 JS文件内容长度:', jsContent.length);
          }

          console.log('✅ 已加载CSS和JS到编辑器');
          resolve();
        });
      } catch (error) {
        console.error('❌ 加载相关文件失败:', error);
        resolve(); // 确保Promise不会reject
      }
    });
  }

  loadFileContent(filePath) {
    return new Promise((resolve) => {
      try {
        const fileExt = this.getFileExtension(filePath);
        let fileType = 'html';

        switch (fileExt) {
          case 'css': fileType = 'css'; break;
          case 'js': fileType = 'js'; break;
          case 'json':
          case 'csv':
          case 'md':
          case 'txt':
          case 'xml':
            fileType = 'js'; // 使用JS编辑器作为文本编辑器
            break;
          case 'png':
          case 'jpg':
          case 'jpeg':
          case 'gif':
          case 'svg':
          case 'webp':
          case 'ico':
            fileType = 'js'; // 使用JS编辑器显示图片信息
            break;
          case 'ppt':
          case 'pptx':
          case 'pdf':
          case 'doc':
          case 'docx':
          case 'xls':
          case 'xlsx':
            fileType = 'js'; // 使用JS编辑器显示文档信息
            break;
          default: fileType = 'html';
        }

        // 对于图片文件，如果存在Data URL内容则使用，否则使用默认说明
        let content = this.files[filePath] || this.getDefaultContent(filePath);

        // 检查是否为图片文件
        const isImageFile = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(fileExt);
        // 检查是否为文档文件
        const isDocumentFile = ['ppt', 'pptx', 'pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(fileExt);

        if (isDocumentFile && this.files[filePath]) {
          console.log(`📄 加载文档文件: ${filePath} (Data URL 长度: ${content.length})`);
          const fileName = filePath.split('/').pop();
          const dataUrl = this.files[filePath];
          const fileSizeKB = Math.round(dataUrl.length * 0.75 / 1024);

          // 为文档文件创建简化的内容显示，保留原始数据不修改
          const originalDataUrl = this.files[filePath]; // 保存原始数据
          content = `/* 📄 文档文件: ${fileName}
 * 📁 路径: ${filePath}
 * 🏷️  类型: ${fileExt.toUpperCase()} 文档
 * 📊  大小: ${fileSizeKB} KB
 * 🔗  Data URL: ${dataUrl.length.toLocaleString()} 字符
 *
 * 💡 使用方法:
 * 在右侧预览面板查看文档内容
 *
 * ⚠️ 注意: 这是文档文件的二进制数据表示
 * 实际文档数据存储在文件管理器中，通过预览功能查看
 */

// 原始文档Data URL (${dataUrl.length} 字符):
// ${dataUrl.substring(0, 100)}${dataUrl.length > 100 ? '...' : ''}

// 文档已完整存储，可通过预览功能查看
`;
        } else if (isImageFile && this.files[filePath]) {
          console.log(`🖼️ 加载图片文件: ${filePath} (Data URL 长度: ${content.length})`);
          const fileName = filePath.split('/').pop();
          const dataUrl = this.files[filePath];
          const fileSizeKB = Math.round(dataUrl.length * 0.75 / 1024);

          // 为图片文件创建简化的内容显示，保留原始数据不修改
          const originalDataUrl = this.files[filePath]; // 保存原始数据
          content = `/* 🖼️ 图片文件: ${fileName}
 * 📁 路径: ${filePath}
 * 🏷️  类型: ${fileExt} 图片
 * 📊  大小: ${fileSizeKB} KB
 * 🔗  Data URL: ${dataUrl.length.toLocaleString()} 字符
 *
 * 💡 使用方法:
 * 在右侧预览面板查看图片，或复制下方代码使用
 *
 * 📋 HTML 引用: <img src="../data/${fileName}" alt="${fileName}">
 * 🎨 CSS 引用: background-image: url('../data/${fileName}')
 *
 * ⚠️ 注意: 这是图片文件的二进制数据表示
 * 实际图片数据存储在文件管理器中，通过预览功能查看
 */

// 原始图片Data URL (${dataUrl.length} 字符):
// ${dataUrl.substring(0, 100)}${dataUrl.length > 100 ? '...' : ''}

// 图片已完整存储，可通过预览功能查看
`;
        } else {
          console.log(`📝 加载文件: ${filePath} (类型: ${fileType}, 长度: ${content.length})`);
        }

        // 确保编辑器实例存在
        if (!this.editors || !this.editors.setValue) {
          console.warn('⚠️ 编辑器实例不存在，跳过文件加载');
          resolve();
          return;
        }

        // 使用微任务确保异步加载，避免竞态条件
        Promise.resolve().then(() => {
          this.editors.setValue(fileType, content);

          // 如果是HTML文件，同时加载CSS和JS（但优先加载当前选择的文件）
          if (fileType === 'html' && filePath === 'html/index.html') {
            console.log('🔄 HTML文件加载，同时加载CSS和JS');

            // 使用Promise确保按顺序加载
            this.loadRelatedFiles().then(() => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      } catch (error) {
        console.error(`❌ 加载文件失败: ${filePath}`, error);
        resolve(); // 确保Promise不会reject
      }
    });
  }

  saveCurrentFile() {
    if (!this.currentFilePath) return;

    // 获取当前文件类型
    const fileExt = this.currentFilePath.split('.').pop();

    // 图片文件不应该被保存，避免覆盖原始的Data URL数据
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(fileExt)) {
      console.log(`🚫 图片文件 ${this.currentFilePath} 跳过保存，保护原始Data URL数据`);
      return;
    }

    let fileType = 'html';

    switch (fileExt) {
      case 'css': fileType = 'css'; break;
      case 'js': fileType = 'js'; break;
      case 'json':
      case 'csv':
      case 'md':
      case 'txt':
      case 'xml':
        fileType = 'js'; // 使用JS编辑器作为文本编辑器
        break;
      default: fileType = 'html';
    }

    // 保存当前编辑器的内容到当前文件
    const content = this.editors.getValue(fileType);
    this.files[this.currentFilePath] = content;
    saveFileData(this.currentFilePath, content);

    console.log(`💾 已保存 ${fileExt.toUpperCase()} 文件: ${this.currentFilePath}`);
  }

  updatePreview(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        console.warn('⚠️ 无效的文件路径:', filePath);
        return;
      }

      if (!this.preview || !this.preview.run) {
        console.warn('⚠️ 预览实例不存在');
        return;
      }

      const fileParts = filePath.split('.');
      const fileExt = fileParts.length > 1 ? fileParts.pop().toLowerCase() : '';
      const fileName = filePath.split('/').pop().split('.')[0]; // 获取文件名（不含扩展名）

      // 获取预览内容
      let payload;

      try {
        if (fileExt === 'html') {
          payload = { html: (this.files && this.files[filePath]) || '' };
        } else if (fileExt === 'css') {
          // CSS文件：查找对应的HTML文件
          const correspondingHtml = this.findCorrespondingHtmlFile(fileName);
          const correspondingJs = this.findCorrespondingJsFile(fileName);

          payload = {
            html: (this.files && this.files[correspondingHtml]) || (this.files && this.files['html/index.html']) || '',
            css: (this.files && this.files[filePath]) || '',
            js: (this.files && this.files[correspondingJs]) || (this.files && this.files['js/main.js']) || ''
          };

          console.log(`🎨 预览CSS文件: ${filePath}, 使用HTML: ${correspondingHtml}`);
        } else if (fileExt === 'js') {
          // JS文件：查找对应的HTML文件
          const correspondingHtml = this.findCorrespondingHtmlFile(fileName);
          const correspondingCss = this.findCorrespondingCssFile(fileName);

          payload = {
            html: (this.files && this.files[correspondingHtml]) || (this.files && this.files['html/index.html']) || '',
            css: (this.files && this.files[correspondingCss]) || (this.files && this.files['css/style.css']) || '',
            js: (this.files && this.files[filePath]) || ''
          };

          console.log(`⚡ 预览JS文件: ${filePath}, 使用HTML: ${correspondingHtml}`);
        } else if (fileExt === 'json' || fileExt === 'csv') {
          // 数据文件：创建数据预览
          payload = this.createDataPreview(filePath);
        } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(fileExt)) {
          // 图片文件：创建图片预览
          payload = this.createImagePreview(filePath);
        } else if (['ppt', 'pptx', 'pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(fileExt)) {
          // 文档文件：创建文档预览
          payload = this.createDocumentPreview(filePath);
        } else {
          // 其他文件：所有内容
          payload = {
            html: (this.files && this.files['html/index.html']) || '',
            css: (this.files && this.files['css/style.css']) || '',
            js: (this.files && this.files['js/main.js']) || ''
          };
        }
      } catch (error) {
        console.error('❌ 构建预览内容失败:', error);
        // 使用默认内容作为后备
        payload = {
          html: (this.files && this.files['html/index.html']) || '',
          css: (this.files && this.files['css/style.css']) || '',
          js: (this.files && this.files['js/main.js']) || ''
        };
      }

      // 运行预览
      setTimeout(() => {
        try {
          this.preview.run(payload, filePath);
        } catch (error) {
          console.error('❌ 运行预览失败:', error);
        }
      }, 100);

    } catch (error) {
      console.error('❌ 更新预览失败:', error);
    }
  }

  /**
   * 创建数据文件预览
   */
  createDataPreview(filePath) {
    const fileExt = filePath.split('.').pop();
    const content = this.files[filePath] || '';
    const fileName = filePath.split('/').pop();

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>数据文件预览: ${fileName}</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #ffffff;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2563eb;
      margin-bottom: 20px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
    }
    .file-info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .file-info span {
      display: inline-block;
      margin-right: 20px;
      font-weight: 600;
    }
    .content {
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 20px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      white-space: pre-wrap;
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
    }
    .format-json {
      color: #d73a49;
    }
    .format-csv {
      color: #032f62;
    }
    .download-btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 15px;
      text-decoration: none;
      display: inline-block;
    }
    .download-btn:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 数据文件预览</h1>

    <div class="file-info">
      <span>📁 文件名: ${fileName}</span>
      <span>📝 文件类型: ${fileExt.toUpperCase()}</span>
      <span>📏 文件大小: ${new Blob([content]).size} 字节</span>
    </div>

    <div class="content format-${fileExt}">`;

    if (fileExt === 'json') {
      try {
        // 尝试格式化JSON
        const formatted = JSON.stringify(JSON.parse(content), null, 2);
        html += this.escapeHtml(formatted);
      } catch (e) {
        html += this.escapeHtml(content);
        html += `\n\n⚠️ JSON格式错误: ${e.message}`;
      }
    } else if (fileExt === 'csv') {
      html += this.formatCSV(content);
    }

    html += `</div>

    <button class="download-btn" onclick="downloadFile()">📥 下载文件</button>

    <script>
      function downloadFile() {
        const content = ${JSON.stringify(content)};
        const blob = new Blob([content], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '${fileName}';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      console.log('📊 数据文件预览已加载: ${filePath}');
    </script>
  </div>
</body>
</html>`;

    return { html };
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 格式化CSV
   */
  formatCSV(content) {
    return this.escapeHtml(content)
      .split('\n')
      .map((line, index) => {
        const cells = line.split(',');
        let result = '';

        cells.forEach((cell, cellIndex) => {
          if (index === 0) {
            // 表头
            result += `<strong>${this.escapeHtml(cell.trim())}</strong>`;
          } else {
            // 数据行
            result += this.escapeHtml(cell.trim());
          }

          if (cellIndex < cells.length - 1) {
            result += ', ';
          }
        });

        return result;
      })
      .join('\n');
  }

  getDefaultContent(filePath) {
    // 处理图片文件的默认内容
    const fileExt = this.getFileExtension(filePath);
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(fileExt)) {
      const fileName = filePath.split('/').pop();
      return `/* 图片文件信息
 * 文件名: ${fileName}
 * 文件类型: ${fileExt.toUpperCase()} 图片
 *
 * 这是一个图片文件，包含了二进制数据。
 * 在HTML中可以通过以下方式引用:
 * <img src="../data/${fileName}" alt="${fileName}">
 *
 * 或者使用CSS背景图片:
 * background-image: url('../data/${fileName}');
 *
 * 当前显示的是图片的Data URL或二进制数据表示。
 */`;
    }

    if (filePath === 'html/index.html') {
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>交互式时钟</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="clock-container">
    <header class="clock-header">
      <h1>🕐 交互式数字时钟</h1>
      <p class="subtitle">精确到秒的实时显示，支持多种主题切换</p>
    </header>

    <main class="clock-main">
      <!-- 数字时钟显示 -->
      <div class="digital-clock">
        <div class="time-display">
          <span class="time-part hours" id="hours">00</span>
          <span class="separator">:</span>
          <span class="time-part minutes" id="minutes">00</span>
          <span class="separator">:</span>
          <span class="time-part seconds" id="seconds">00</span>
        </div>
        <div class="date-display" id="date-display">2024年1月1日 星期一</div>
      </div>

      <!-- 控制面板 -->
      <div class="control-panel">
        <div class="theme-selector">
          <h3>主题选择</h3>
          <div class="theme-buttons">
            <button class="theme-btn active" data-theme="default">默认</button>
            <button class="theme-btn" data-theme="dark">深色</button>
            <button class="theme-btn" data-theme="neon">霓虹</button>
          </div>
        </div>

        <div class="format-selector">
          <h3>时间格式</h3>
          <div class="format-buttons">
            <button class="format-btn active" data-format="24">24小时制</button>
            <button class="format-btn" data-format="12">12小时制</button>
          </div>
        </div>

        <div class="actions">
          <button id="fullscreen-btn" class="action-btn">📺 全屏显示</button>
        </div>
      </div>
    </main>
  </div>

  <script type="module" src="js/main.js"></script>
</body>
</html>`;
    } else if (filePath === 'css/style.css') {
      return `/* 交互式时钟样式 */
:root {
  --primary-color: #2563eb;
  --bg-color: #f8fafc;
  --text-color: #1e293b;
  --border-color: #e2e8f0;
}

/* 深色主题 */
[data-theme="dark"] {
  --bg-color: #1e293b;
  --text-color: #f1f5f9;
  --border-color: #334155;
}

/* 霓虹主题 */
[data-theme="neon"] {
  --bg-color: #0a0a0a;
  --text-color: #00ff88;
  --border-color: #ff00ff;
  --primary-color: #00ffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background: var(--bg-color);
  min-height: 100vh;
}

.clock-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.clock-header {
  text-align: center;
  margin-bottom: 40px;
}

.clock-header h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 10px;
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.8;
}

.clock-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.digital-clock {
  text-align: center;
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

[data-theme="dark"] .digital-clock {
  background: #374151;
}

[data-theme="neon"] .digital-clock {
  background: #111;
  border: 2px solid #00ff88;
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
}

.time-display {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  font-size: 4rem;
  font-weight: 300;
  font-family: 'Courier New', monospace;
}

.time-part {
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  color: white;
  padding: 20px 30px;
  border-radius: 15px;
  min-width: 120px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
}

[data-theme="neon"] .time-part {
  background: #000;
  color: #00ff88;
  border: 2px solid #00ff88;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
  text-shadow: 0 0 10px #00ff88;
}

.separator {
  font-size: 3rem;
  margin: 0 10px;
  color: var(--primary-color);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.date-display {
  font-size: 1.2rem;
  color: var(--text-color);
  opacity: 0.8;
}

.control-panel {
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  width: 100%;
  max-width: 600px;
}

[data-theme="dark"] .control-panel {
  background: #374151;
}

[data-theme="neon"] .control-panel {
  background: #111;
  border: 1px solid #00ff88;
}

.control-panel h3 {
  margin-bottom: 15px;
  color: var(--text-color);
}

.theme-buttons, .format-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}

.theme-btn, .format-btn {
  padding: 10px 20px;
  border: 2px solid var(--border-color);
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.theme-btn:hover, .format-btn:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.theme-btn.active, .format-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 12px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
}

@media (max-width: 768px) {
  .time-display {
    font-size: 2.5rem;
    flex-direction: column;
    gap: 10px;
  }

  .time-part {
    min-width: 100px;
    padding: 15px 20px;
  }

  .separator {
    transform: rotate(90deg);
    margin: 0;
  }
}`;
    } else if (filePath === 'js/main.js') {
      return `// 交互式时钟 JavaScript
class ClockApp {
  constructor() {
    this.currentTimeFormat = '24';
    this.currentTheme = 'default';
    this.init();
  }

  init() {
    this.initDigitalClock();
    this.initThemeSelector();
    this.initFormatSelector();
    this.initFullscreen();
    this.startClock();
  }

  initDigitalClock() {
    this.hoursElement = document.getElementById('hours');
    this.minutesElement = document.getElementById('minutes');
    this.secondsElement = document.getElementById('seconds');
    this.dateElement = document.getElementById('date-display');
  }

  initThemeSelector() {
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const theme = e.target.dataset.theme;
        this.setTheme(theme);

        themeButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  }

  initFormatSelector() {
    const formatButtons = document.querySelectorAll('.format-btn');
    formatButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const format = e.target.dataset.format;
        this.setTimeFormat(format);

        formatButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  }

  initFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }
  }

  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('clock-theme', theme);
  }

  setTimeFormat(format) {
    this.currentTimeFormat = format;
    localStorage.setItem('clock-format', format);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  startClock() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  updateClock() {
    try {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      // 处理12小时制
      let period = '';
      if (this.currentTimeFormat === '12') {
        period = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12 || 12;
      }

      // 更新时间显示 - 添加空值检查
      if (this.hoursElement) {
        this.hoursElement.textContent = String(hours).padStart(2, '0');
      }
      if (this.minutesElement) {
        this.minutesElement.textContent = String(minutes).padStart(2, '0');
      }
      if (this.secondsElement) {
        this.secondsElement.textContent = String(seconds).padStart(2, '0');
      }

      // 更新日期显示
      if (this.dateElement) {
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const weekday = weekdays[now.getDay()];

        this.dateElement.textContent = \`\${year}年\${month}月\${day}日 \${weekday}\${period}\`;
      }

      // 如果任何元素都不存在，停止时钟
      if (!this.hoursElement && !this.minutesElement && !this.secondsElement) {
        console.warn('⚠️ 时钟元素未找到，停止时钟更新');
        if (this.clockInterval) {
          clearInterval(this.clockInterval);
          this.clockInterval = null;
        }
      }
    } catch (error) {
      console.error('❌ 更新时钟失败:', error);
    }
  }
}

// 启动时钟应用
document.addEventListener('DOMContentLoaded', function() {
  // 恢复保存的主题
  const savedTheme = localStorage.getItem('clock-theme');
  if (savedTheme) {
    document.body.setAttribute('data-theme', savedTheme);
  }

  // 创建时钟应用实例
  window.clockApp = new ClockApp();
  console.log('🕐 交互式时钟应用已启动');
});`;
    } else if (filePath === 'data/data.json') {
      return `{
  "title": "编程语言流行度数据分析",
  "labels": ["JavaScript", "Python", "Java", "TypeScript", "C#", "C++", "PHP", "Go", "Rust", "Swift"],
  "values": [67.8, 63.9, 60.4, 38.5, 27.4, 23.5, 21.2, 18.3, 13.2, 11.5],
  "description": "2024年开发者调查报告 - 编程语言流行度百分比",
  "categories": {
    "Web开发": ["JavaScript", "TypeScript", "PHP"],
    "数据科学": ["Python", "R", "Julia"],
    "移动开发": ["Swift", "Kotlin", "Dart"],
    "系统编程": ["C++", "Rust", "Go", "C"],
    "企业应用": ["Java", "C#", "Kotlin"]
  },
  "trends": [
    {
      "year": 2020,
      "JavaScript": 67.7,
      "Python": 44.1,
      "Java": 40.2,
      "TypeScript": 25.4,
      "C#": 31.0,
      "C++": 24.4,
      "PHP": 26.2,
      "Go": 8.8,
      "Rust": 3.0,
      "Swift": 4.9
    },
    {
      "year": 2021,
      "JavaScript": 69.5,
      "Python": 48.2,
      "Java": 35.4,
      "TypeScript": 30.2,
      "C#": 27.6,
      "C++": 24.3,
      "PHP": 21.98,
      "Go": 9.55,
      "Rust": 7.1,
      "Swift": 5.1
    },
    {
      "year": 2022,
      "JavaScript": 65.82,
      "Python": 48.07,
      "Java": 33.27,
      "TypeScript": 30.19,
      "C#": 27.62,
      "C++": 22.42,
      "PHP": 20.87,
      "Go": 13.24,
      "Rust": 9.32,
      "Swift": 4.91
    },
    {
      "year": 2023,
      "JavaScript": 63.61,
      "Python": 49.28,
      "Java": 30.19,
      "TypeScript": 38.87,
      "C#": 29.16,
      "C++": 22.42,
      "PHP": 18.98,
      "Go": 13.76,
      "Rust": 13.05,
      "Swift": 5.1
    },
    {
      "year": 2024,
      "JavaScript": 67.8,
      "Python": 63.9,
      "Java": 30.4,
      "TypeScript": 38.5,
      "C#": 27.4,
      "C++": 23.5,
      "PHP": 21.2,
      "Go": 18.3,
      "Rust": 13.2,
      "Swift": 11.5
    }
  ],
  "salaryData": [
    {"language": "Rust", "avgSalary": 90000, "range": "75000-120000"},
    {"language": "Go", "avgSalary": 85000, "range": "70000-110000"},
    {"language": "TypeScript", "avgSalary": 80000, "range": "65000-105000"},
    {"language": "C++", "avgSalary": 78000, "range": "65000-100000"},
    {"language": "Python", "avgSalary": 75000, "range": "60000-95000"},
    {"language": "Java", "avgSalary": 72000, "range": "58000-90000"},
    {"language": "C#", "avgSalary": 70000, "range": "55000-88000"},
    {"language": "JavaScript", "avgSalary": 68000, "range": "50000-85000"},
    {"language": "Swift", "avgSalary": 75000, "range": "60000-95000"},
    {"language": "PHP", "avgSalary": 55000, "range": "40000-70000"}
  ]
}`;
    } else if (filePath === 'data/data.csv') {
      return `编程语言,流行度百分比,平均年薪(美元),学习难度,就业机会,主要用途
JavaScript,67.8,68000,中等,非常高,Web开发
Python,63.9,75000,简单,高,数据科学/AI/Web
Java,30.4,72000,中等,高,企业应用/安卓
TypeScript,38.5,80000,中等,高,Web开发/前端
C#,27.4,70000,中等,高,游戏开发/.NET
C++,23.5,78000,困难,中等,系统编程/游戏
PHP,21.2,55000,简单,中等,Web后端/WordPress
Go,18.3,85000,中等,中等,云计算/后端
Rust,13.2,90000,困难,低,系统编程/区块链
Swift,11.5,75000,中等,中等,iOS开发
Kotlin,9.2,73000,中等,中等,安卓开发
Ruby,5.8,65000,简单,低,Web开发/Rails
Dart,7.1,68000,简单,低,Flutter/跨平台
R,4.5,70000,中等,低,数据统计/分析
Scala,2.8,85000,困难,低,大数据/并发编程
Lua,1.9,60000,简单,低,游戏开发/嵌入式
Haskell,1.2,80000,困难,低,学术研究/函数式编程`;
    }

    // 其他文件的默认内容
    pop();
    const defaults = {
      'html': '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <title>新建文件</title>\n</head>\n<body>\n\n</body>\n</html>',
      'css': '/* CSS 样式 */\n',
      'js': '// JavaScript 代码\nconsole.log("Hello World!");\n',
      'json': '{\n  "name": "数据文件"\n}',
      'md': '# Markdown 文档\n\n这是一个Markdown文件。'
    };
    return defaults[fileExt] || '';
  }

  getSelectedFilePath() {
    return this.currentFilePath;
  }

  setTabManager(tabManager) {
    this.tabManager = tabManager;
  }

  /**
   * 添加文件
   */
  addFile(filePath, content) {
    // 检查是否为图片文件，如果是且已存在Data URL，则不覆盖
    const fileExt = this.getFileExtension(filePath);
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(fileExt) && this.files[filePath]) {
      console.log(`🛡️ 保护图片文件 ${filePath} 不被覆盖`);
      return;
    }

    this.files[filePath] = content;
    saveFileData(filePath, content);
    console.log('📝 添加文件:', filePath);
  }

  /**
   * 删除文件
   */
  deleteFile(filePath) {
    delete this.files[filePath];
    saveFileData(filePath, ''); // 清空内容
    console.log('🗑️ 删除文件:', filePath);
  }

  /**
   * 重命名文件
   */
  renameFile(oldPath, newPath) {
    if (this.files[oldPath]) {
      this.files[newPath] = this.files[oldPath];
      delete this.files[oldPath];

      // 更新存储
      saveFileData(oldPath, '');
      saveFileData(newPath, this.files[newPath]);

      console.log('✏️ 重命名文件:', oldPath, '->', newPath);
    }
  }

  /**
   * 查找对应的HTML文件
   * @param {string} baseName - 基础文件名
   * @returns {string} 对应的HTML文件路径
   */
  findCorrespondingHtmlFile(baseName) {
    // 对于模板文件，直接使用模板键名
    const templateFiles = ['chart-bar', 'chart-line', 'chart-pie', 'chart-scatter', 'dashboard-sales', 'dashboard-user', 'table-data', 'table-filter'];

    if (templateFiles.includes(baseName)) {
      const exactMatch = `html/${baseName}.html`;
      if (this.files[exactMatch]) {
        return exactMatch;
      }
    }

    // 对于非模板文件，使用原来的逻辑
    const exactMatch = `html/${baseName}.html`;
    if (this.files[exactMatch]) {
      return exactMatch;
    }

    // 如果没有完全匹配，查找包含相同名称的HTML文件
    const htmlFiles = Object.keys(this.files).filter(path =>
      path.startsWith('html/') && path.endsWith('.html') && path.includes(baseName)
    );

    if (htmlFiles.length > 0) {
      return htmlFiles[0]; // 返回第一个匹配的文件
    }

    // 默认返回index.html
    return 'html/index.html';
  }

  /**
   * 查找对应的CSS文件
   * @param {string} baseName - 基础文件名
   * @returns {string} 对应的CSS文件路径
   */
  findCorrespondingCssFile(baseName) {
    // 对于模板文件，直接使用模板键名
    const templateFiles = ['chart-bar', 'chart-line', 'chart-pie', 'chart-scatter', 'dashboard-sales', 'dashboard-user', 'table-data', 'table-filter'];

    if (templateFiles.includes(baseName)) {
      const exactMatch = `css/${baseName}.css`;
      if (this.files[exactMatch]) {
        return exactMatch;
      }
    }

    // 对于非模板文件，使用原来的逻辑
    const exactMatch = `css/${baseName}.css`;
    if (this.files[exactMatch]) {
      return exactMatch;
    }

    // 如果没有完全匹配，查找包含相同名称的CSS文件
    const cssFiles = Object.keys(this.files).filter(path =>
      path.startsWith('css/') && path.endsWith('.css') && path.includes(baseName)
    );

    if (cssFiles.length > 0) {
      return cssFiles[0]; // 返回第一个匹配的文件
    }

    // 默认返回style.css
    return 'css/style.css';
  }

  /**
   * 创建图片文件预览
   */
  createImagePreview(filePath) {
    const fileExt = this.getFileExtension(filePath);
    const fileName = filePath.split('/').pop();
    const content = this.files[filePath] || '';

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>图片预览</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #000;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .preview-image {
      max-width: 100vw;
      max-height: 100vh;
      width: 100vw;
      height: 100vh;
      object-fit: contain;
    }

    .error {
      color: white;
      text-align: center;
      padding: 40px;
      font-family: Arial, sans-serif;
    }
  </style>
</head>
<body>`;

    // 获取图片数据，进行多重检查
    let imageDataUrl = '';
    let dataSource = '';

    // 方法1: 从this.files获取原始图片数据
    if (this.files && this.files[filePath]) {
      const fileData = this.files[filePath];
      console.log('📁 检查this.files数据:', fileData.length, '字符, 开头:', fileData.substring(0, 50));

      if (fileData.startsWith('data:image/')) {
        imageDataUrl = fileData;
        dataSource = 'this.files[原始Data URL]';
      } else {
        console.log('⚠️ this.files中的数据不是Data URL格式');
      }
    }

    // 方法2: 如果方法1失败，尝试从content参数获取
    if (!imageDataUrl && content) {
      console.log('📄 检查content参数:', content.length, '字符, 开头:', content.substring(0, 50));

      // 检查content是否是Data URL
      if (content.startsWith('data:image/')) {
        imageDataUrl = content;
        dataSource = 'content[Data URL]';
      }
      // 检查content是否包含Data URL（从生成的注释中提取）
      else if (content.includes('const fullImageDataUrl = \'') && content.includes('data:image/')) {
        const match = content.match(/const fullImageDataUrl = '(data:image[^']+)'/);
        if (match && match[1]) {
          imageDataUrl = match[1];
          dataSource = 'content[提取的Data URL]';
        }
      }
    }

    if (imageDataUrl) {
      console.log('✅ 图片Data URL获取成功，来源:', dataSource, '长度:', imageDataUrl.length);
    } else {
      console.log('❌ 无法获取有效的图片Data URL');
    }

    if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
      console.log('✅ 图片Data URL有效，显示图片');
      html += `<img src="${imageDataUrl}" alt="${fileName}" class="preview-image"
        onerror="console.error('图片加载失败'); this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="error" style="display: none;">
          ⚠️ 图片加载失败<br>
          <small>图片数据可能已损坏</small>
        </div>`;
    } else {
      console.log('❌ 图片Data URL无效:', imageDataUrl ? imageDataUrl.substring(0, 50) + '...' : '空数据');
      html += `<div class="error">
        ⚠️ 无法预览图片<br>
        <small>图片数据格式不支持或文件为空</small>
      </div>`;
    }

    html += `
  <script>
    console.log('🖼️ 图片预览已加载: ${filePath}');
  </script>
</body>
</html>`;

    return { html };
  }

  /**
   * 创建文档文件预览
   */
  createDocumentPreview(filePath) {
    const fileExt = this.getFileExtension(filePath);
    const fileName = filePath.split('/').pop();
    const content = this.files[filePath] || '';

    // 如果是PPT文件，使用特殊的PPT预览器
    if (['ppt', 'pptx'].includes(fileExt)) {
      return this.createPPTPreview(filePath, fileName, content);
    }

    // 其他文档类型的预览
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>文档预览: ${fileName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    .file-info {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .info-item {
      background: rgba(255,255,255,0.2);
      padding: 10px 20px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
    }

    .content {
      padding: 40px;
    }

    .preview-placeholder {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .preview-placeholder .icon {
      font-size: 5rem;
      margin-bottom: 20px;
    }

    .preview-placeholder h3 {
      font-size: 1.5rem;
      margin-bottom: 15px;
      color: #333;
    }

    .preview-placeholder p {
      margin-bottom: 15px;
      line-height: 1.6;
    }

    .actions {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 30px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 25px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f8f9fa;
      color: #495057;
      border: 2px solid #dee2e6;
    }

    .btn-secondary:hover {
      background: #e9ecef;
    }

    .data-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }

    .data-info h4 {
      color: #495057;
      margin-bottom: 10px;
    }

    .data-info pre {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 15px;
      font-size: 0.9rem;
      color: #6c757d;
      overflow-x: auto;
      word-break: break-all;
    }

    @media (max-width: 768px) {
      .header {
        padding: 20px;
      }

      .header h1 {
        font-size: 2rem;
      }

      .file-info {
        gap: 15px;
      }

      .content {
        padding: 20px;
      }

      .actions {
        flex-direction: column;
        align-items: center;
      }

      .btn {
        width: 100%;
        max-width: 300px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 文档预览</h1>
      <div class="file-info">
        <div class="info-item">
          <span>📁 文件名: ${fileName}</span>
        </div>
        <div class="info-item">
          <span>📝 类型: ${fileExt.toUpperCase()}</span>
        </div>
        <div class="info-item">
          <span>📊 大小: ${new Blob([content]).size} 字节</span>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="preview-placeholder">
        <div class="icon">📋</div>
        <h3>${this.getDocumentType(fileExt)}文档</h3>
        <p>这是一个 <strong>${fileExt.toUpperCase()}</strong> 格式的文档文件</p>
        <p>文档内容已存储为二进制数据，可以通过以下方式查看或下载</p>

        <div class="actions">
          <button class="btn btn-primary" onclick="downloadDocument()">
            <span>📥</span> 下载文档
          </button>
          <button class="btn btn-secondary" onclick="viewInNewTab()">
            <span>🔗</span> 新窗口打开
          </button>
        </div>

        <div class="data-info">
          <h4>📊 文件信息</h4>
          <p><strong>文件路径:</strong> ${filePath}</p>
          <p><strong>数据类型:</strong> Binary Data URL</p>
          <p><strong>存储大小:</strong> ${content.length.toLocaleString()} 字符</p>
          <p><strong>存储状态:</strong> ✅ 已完整保存</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    // 获取文档数据
    const documentData = ${JSON.stringify(content)};
    const fileName = '${fileName}';
    const filePath = '${filePath}';

    function downloadDocument() {
      try {
        // 创建下载链接
        const a = document.createElement('a');
        a.href = documentData;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log('✅ 文档下载开始:', fileName);
      } catch (error) {
        console.error('❌ 文档下载失败:', error);
        alert('文档下载失败，请重试');
      }
    }

    function viewInNewTab() {
      try {
        const newWindow = window.open(documentData, '_blank');
        if (newWindow) {
          console.log('✅ 文档在新窗口中打开');
        } else {
          alert('无法打开新窗口，请检查浏览器弹窗设置');
        }
      } catch (error) {
        console.error('❌ 打开新窗口失败:', error);
        alert('无法在新窗口中打开文档');
      }
    }

    console.log('📄 文档预览已加载:', filePath);
    console.log('📊 文档数据长度:', documentData.length, '字符');
  </script>
</body>
</html>`;

    return { html };
  }

  /**
   * 创建PPT预览 - 使用图片预览方式
   */
  createPPTPreview(filePath, fileName, content) {
    // 查找PPT的文档ID
    const docId = this.findDocumentId(filePath, fileName);

    if (docId) {
      // 如果找到了文档ID，使用服务器端的图片预览
      const imageViewerUrl = `http://localhost:${FRONTEND_PORT}/ppt-viewer/image-viewer.html?id=${docId}`;

      // 返回一个重定向页面
      return {
        html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>PPT预览: ${fileName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background: #1a1a1a;
    }
    .loading {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      color: white;
      flex-direction: column;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #333;
      border-top: 4px solid #4A90E2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <h2>正在加载PPT预览...</h2>
    <p>${fileName}</p>
  </div>
  <script>
    // 自动跳转到图片预览器
    setTimeout(() => {
      window.location.href = '${imageViewerUrl}';
    }, 1000);
  </script>
</body>
</html>`
      };
    } else {
      // 如果没有找到文档ID，显示简单的占位页面
      return this.createPPTPlaceholder(fileName);
    }
  }

  /**
   * 查找文档ID
   */
  findDocumentId(filePath, fileName) {
    // 从localStorage中的文档查找ID
    try {
      const documents = JSON.parse(localStorage.getItem('documents') || '[]');
      const doc = documents.find(d =>
        d.file_name === fileName ||
        d.title === fileName ||
        d.file_name === filePath
      );
      return doc ? doc.id : null;
    } catch (error) {
      console.error('查找文档ID失败:', error);
      return null;
    }
  }

  /**
   * 创建PPT占位页面
   */
  createPPTPlaceholder(fileName) {
    return {
      html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>PPT预览: ${fileName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white min-h-screen flex items-center justify-center">
  <div class="max-w-md mx-auto text-center">
    <div class="mb-8">
      <svg class="w-24 h-24 mx-auto text-blue-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
        <path d="M8 12h8v2H8zm0 4h8v2H8z"/>
      </svg>
    </div>
    <h1 class="text-2xl font-bold mb-4">${fileName}</h1>
    <p class="text-gray-400 mb-6">这是一个PowerPoint演示文稿</p>
    <div class="bg-gray-800 rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold mb-3">PPT预览功能</h2>
      <ul class="text-left text-gray-300 space-y-2">
        <li>• 支持多页幻灯片预览</li>
        <li>• 提供缩放和导航功能</li>
        <li>• 支持全屏演示模式</li>
        <li>• 保留原始格式和样式</li>
      </ul>
    </div>
    <p class="text-sm text-gray-500">请先上传文件到系统中以启用完整预览功能</p>
  </div>
</body>
</html>`
    };
  }

  /**
   * 获取文档类型描述
   */
  getDocumentType(fileExt) {
    const types = {
      'ppt': 'PowerPoint 演示文稿',
      'pptx': 'PowerPoint 演示文稿',
      'pdf': 'PDF 文档',
      'doc': 'Word 文档',
      'docx': 'Word 文档',
      'xls': 'Excel 表格',
      'xlsx': 'Excel 表格'
    };
    return types[fileExt] || '未知类型';
  }

  /**
   * 查找对应的JS文件
   * @param {string} baseName - 基础文件名
   * @returns {string} 对应的JS文件路径
   */
  findCorrespondingJsFile(baseName) {
    // 对于模板文件，直接使用模板键名
    const templateFiles = ['chart-bar', 'chart-line', 'chart-pie', 'chart-scatter', 'dashboard-sales', 'dashboard-user', 'table-data', 'table-filter'];

    if (templateFiles.includes(baseName)) {
      const exactMatch = `js/${baseName}.js`;
      if (this.files[exactMatch]) {
        return exactMatch;
      }
    }

    // 对于非模板文件，使用原来的逻辑
    const exactMatch = `js/${baseName}.js`;
    if (this.files[exactMatch]) {
      return exactMatch;
    }

    // 如果没有完全匹配，查找包含相同名称的JS文件
    const jsFiles = Object.keys(this.files).filter(path =>
      path.startsWith('js/') && path.endsWith('.js') && path.includes(baseName)
    );

    if (jsFiles.length > 0) {
      return jsFiles[0]; // 返回第一个匹配的文件
    }

    // 默认返回main.js
    return 'js/main.js';
  }
}