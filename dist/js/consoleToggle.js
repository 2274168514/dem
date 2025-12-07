/**
 * 控制台隐藏/展开管理器
 */

export class ConsoleToggle {
  constructor() {
    this.consolePanel = document.getElementById('console-panel');
    this.toggleBtn = document.getElementById('toggle-console');
    this.restoreBtn = document.getElementById('restore-console');
    this.mainArea = document.querySelector('.main-area');
    this.toggleIcon = this.toggleBtn?.querySelector('.toggle-icon');

    this.isVisible = true;

    this.init();
  }

  /**
   * 初始化控制台切换功能
   */
  init() {
    if (!this.consolePanel || !this.toggleBtn || !this.restoreBtn || !this.mainArea) {
      console.warn('Console toggle elements not found');
      return;
    }

    // 绑定切换按钮事件
    this.toggleBtn.addEventListener('click', () => {
      this.hideConsole();
    });

    // 绑定恢复按钮事件
    this.restoreBtn.addEventListener('click', () => {
      this.showConsole();
    });

    // 添加键盘快捷键 (Ctrl/Cmd + `)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        this.toggle();
      }
    });

    // 设置初始状态
    this.mainArea.classList.add('console-visible');
  }

  /**
   * 隐藏控制台
   */
  hideConsole() {
    if (!this.isVisible) return;

    this.consolePanel.classList.add('hidden');
    this.mainArea.classList.remove('console-visible');
    this.mainArea.classList.add('console-hidden');
    this.restoreBtn.style.display = 'flex';

    // 更新按钮图标
    if (this.toggleIcon) {
      this.toggleIcon.textContent = '▲';
    }

    // 更新按钮标题
    this.toggleBtn.title = '显示控制台';

    this.isVisible = false;

    // 保存状态到本地存储
    this.saveState(false);

    // 触发隐藏事件
    this.dispatchToggleEvent('hidden');
  }

  /**
   * 显示控制台
   */
  showConsole() {
    if (this.isVisible) return;

    this.consolePanel.classList.remove('hidden');
    this.mainArea.classList.remove('console-hidden');
    this.mainArea.classList.add('console-visible');
    this.restoreBtn.style.display = 'none';

    // 更新按钮图标
    if (this.toggleIcon) {
      this.toggleIcon.textContent = '▼';
    }

    // 更新按钮标题
    this.toggleBtn.title = '隐藏控制台';

    this.isVisible = true;

    // 保存状态到本地存储
    this.saveState(true);

    // 触发显示事件
    this.dispatchToggleEvent('shown');
  }

  /**
   * 切换控制台显示/隐藏
   */
  toggle() {
    if (this.isVisible) {
      this.hideConsole();
    } else {
      this.showConsole();
    }
  }

  /**
   * 获取控制台显示状态
   */
  isVisible() {
    return this.isVisible;
  }

  /**
   * 保存状态到本地存储
   */
  saveState(visible) {
    try {
      localStorage.setItem('console-visible', visible.toString());
    } catch (error) {
      // 忽略存储错误
    }
  }

  /**
   * 从本地存储加载状态
   */
  loadState() {
    try {
      const saved = localStorage.getItem('console-visible');
      if (saved !== null) {
        const shouldBeVisible = saved === 'true';
        if (shouldBeVisible !== this.isVisible) {
          if (shouldBeVisible) {
            this.showConsole();
          } else {
            this.hideConsole();
          }
        }
      }
    } catch (error) {
      // 忽略读取错误，使用默认状态
    }
  }

  /**
   * 触发切换事件
   */
  dispatchToggleEvent(action) {
    const event = new CustomEvent('consoleToggle', {
      detail: {
        action: action,
        visible: this.isVisible
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * 设置控制台高度
   */
  setHeight(height) {
    if (this.consolePanel) {
      this.consolePanel.style.height = `${height}px`;
    }
  }

  /**
   * 获取控制台当前高度
   */
  getHeight() {
    if (this.consolePanel) {
      return parseInt(this.consolePanel.style.height || '220');
    }
    return 220;
  }

  /**
   * 初始化状态（从本地存储加载）
   */
  initializeState() {
    this.loadState();
  }
}