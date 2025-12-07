/**
 * 动态Tab管理器
 * 管理编辑器Tab的创建、切换和关闭
 */

export class TabManager {
  constructor() {
    this.tabContainer = document.getElementById('tab-container');
    this.tabs = new Map(); // 存储Tab信息
    this.activeTab = null;
    this.onTabChange = null;

    this.init();
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
      return ext || '';
    } catch (error) {
      console.error(`❌ TabManager获取文件扩展名失败: ${filePath}`, error);
      return '';
    }
  }

  /**
   * 初始化Tab管理器
   */
  init() {
    // 等待DOM完全加载后再创建默认Tab
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          this.createDefaultTabs();
        }, 100);
      });
    } else {
      setTimeout(() => {
        this.createDefaultTabs();
      }, 100);
    }
  }

  /**
   * 创建默认Tab
   */
  createDefaultTabs() {
    // 清空现有Tab
    this.tabContainer.innerHTML = '';
    this.tabs.clear();

    // 创建默认Tab - 使用新的文件结构
    this.createTab('html/index.html', 'index.html', true);
    this.createTab('css/style.css', 'style.css', false);
    this.createTab('js/main.js', 'main.js', false);
  }

  /**
   * 创建新Tab
   */
  createTab(filePath, fileName, isActive = false) {
    // 检查Tab是否已存在
    if (this.tabs.has(filePath)) {
      this.setActiveTab(filePath);
      return;
    }

    const tabElement = document.createElement('button');
    tabElement.className = 'tab';
    tabElement.dataset.file = filePath;

    // 为新创建的Tab添加入场动画
    tabElement.style.opacity = '0';
    tabElement.style.transform = 'translateY(-10px) scale(0.9)';
    tabElement.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    const fileNameSpan = document.createElement('span');
    fileNameSpan.className = 'tab-file-name';
    fileNameSpan.textContent = fileName;

    // 如果不是默认文件，添加关闭按钮
    if (filePath !== 'html/index.html' &&
        filePath !== 'css/style.css' &&
        filePath !== 'js/main.js') {
      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(filePath);
      });
      tabElement.appendChild(fileNameSpan);
      tabElement.appendChild(closeBtn);
    } else {
      tabElement.appendChild(fileNameSpan);
    }

    // 添加点击事件
    tabElement.addEventListener('click', () => {
      this.setActiveTab(filePath);
    });

    this.tabContainer.appendChild(tabElement);
    this.tabs.set(filePath, {
      element: tabElement,
      fileName: fileName
    });

    // 触发入场动画
    setTimeout(() => {
      tabElement.style.opacity = '1';
      tabElement.style.transform = 'translateY(0) scale(1)';
    }, 50);

    if (isActive) {
      this.setActiveTab(filePath);
    }

    return tabElement;
  }

  /**
   * 设置活动Tab
   */
  setActiveTab(filePath) {
    if (!this.tabs.has(filePath)) {
      return;
    }

    const previousTab = this.activeTab;

    // 如果是同一个Tab，不执行任何操作
    if (previousTab === filePath) {
      return;
    }

    // 移除所有Tab的active状态
    this.tabs.forEach((tab) => {
      tab.element.classList.remove('is-active', 'active');
      // 重置所有Tab的变换状态
      tab.element.style.transform = 'translateY(0)';
      tab.element.style.transition = 'transform 0.2s ease';
    });

    // 设置当前Tab为active，并添加动画
    const tab = this.tabs.get(filePath);
    tab.element.classList.add('is-active', 'active');

    // 添加切换动画效果
    tab.element.style.transform = 'translateY(-2px)';
    setTimeout(() => {
      tab.element.style.transform = 'translateY(0)';
    }, 100);

    this.activeTab = filePath;

    // 更新编辑器面板标题
    this.updatePaneHeader(filePath);

    // 触发Tab变化回调（带延迟以配合动画）
    setTimeout(() => {
      if (this.onTabChange) {
        this.onTabChange(filePath);
      }
    }, 150);
  }

  /**
   * 更新编辑器面板标题
   */
  updatePaneHeader(filePath) {
    const fileType = this.getFileType(filePath);
    const fileName = filePath.split('/').pop();
    const pane = document.querySelector(`.pane.code-pane[data-file="${fileType}"]`);

    if (pane) {
      const filenameElement = pane.querySelector('.pane-filename');
      const tagElement = pane.querySelector('.pane-tag');

      if (filenameElement) {
        filenameElement.textContent = fileName;
      }

      if (tagElement) {
        const tagText = this.getFileTypeTagFromPath(filePath);
        tagElement.textContent = tagText;
      }
    }
  }

  /**
   * 获取文件类型标签
   */
  getFileTypeTag(fileType) {
    const tags = {
      'html': 'HTML',
      'css': 'CSS',
      'js': 'JavaScript'
    };
    return tags[fileType] || 'TEXT';
  }

  /**
   * 根据文件路径获取正确的标签
   */
  getFileTypeTagFromPath(filePath) {
    const ext = this.getFileExtension(filePath);
    const tags = {
      'html': 'HTML',
      'htm': 'HTML',
      'css': 'CSS',
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'json': 'JSON',
      'csv': 'CSV',
      'md': 'Markdown',
      'txt': 'Text',
      'png': 'PNG',
      'jpg': 'JPEG',
      'jpeg': 'JPEG',
      'gif': 'GIF',
      'svg': 'SVG',
      'webp': 'WebP',
      'ico': 'ICO'
    };
    return tags[ext] || ext.toUpperCase();
  }

  /**
   * 关闭Tab
   */
  closeTab(filePath) {
    if (!this.tabs.has(filePath)) {
      return;
    }

    const tab = this.tabs.get(filePath);

    // 不能关闭默认的三个文件
    if (filePath === 'html/index.html' ||
        filePath === 'css/style.css' ||
        filePath === 'js/main.js') {
      return;
    }

    // 添加关闭动画
    const tabElement = tab.element;
    tabElement.style.transition = 'all 0.2s ease';
    tabElement.style.opacity = '0';
    tabElement.style.transform = 'translateY(10px) scale(0.8)';
    tabElement.style.marginLeft = '-20px';
    tabElement.style.marginRight = '-20px';

    // 等待动画完成后移除元素
    setTimeout(() => {
      tabElement.remove();
      this.tabs.delete(filePath);

      // 如果关闭的是当前活动Tab，切换到其他Tab
      if (this.activeTab === filePath) {
        const remainingTabs = Array.from(this.tabs.keys());
        if (remainingTabs.length > 0) {
          this.setActiveTab(remainingTabs[0]);
        }
      }
    }, 200);
  }

  /**
   * 根据文件路径获取文件类型
   */
  getFileType(filePath) {
    const ext = this.getFileExtension(filePath);
    switch (ext) {
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return 'js';
      case 'json':
      case 'csv':
      case 'md':
      case 'txt':
        return 'js'; // 这些文件类型使用JS编辑器
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
      case 'ico':
        return 'js'; // 图片文件也使用JS编辑器显示占位符
      default:
        return 'js'; // 未知文件类型默认使用JS编辑器
    }
  }

  /**
   * 检查Tab是否存在
   */
  hasTab(filePath) {
    return this.tabs.has(filePath);
  }

  /**
   * 获取当前活动Tab
   */
  getActiveTab() {
    return this.activeTab;
  }

  /**
   * 获取所有Tab
   */
  getAllTabs() {
    return Array.from(this.tabs.keys());
  }

  /**
   * 更新Tab名称（用于重命名）
   */
  updateTabName(oldPath, newPath, newName) {
    if (!this.tabs.has(oldPath)) {
      return;
    }

    const tab = this.tabs.get(oldPath);

    // 更新Tab属性
    tab.fileName = newName;
    tab.element.dataset.file = newPath;
    tab.element.querySelector('.tab-file-name').textContent = newName;

    // 更新Map的key
    this.tabs.delete(oldPath);
    this.tabs.set(newPath, tab);

    // 如果是当前活动Tab，更新activeTab
    if (this.activeTab === oldPath) {
      this.activeTab = newPath;
    }
  }

  /**
   * 设置Tab变化回调
   */
  onTabChange(callback) {
    this.onTabChange = callback;
  }
}