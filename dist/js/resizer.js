/**
 * 可拖拽调整大小功能模块
 */

export class Resizer {
  constructor() {
    this.resizers = [];
    this.isResizing = false;
    this.currentResizer = null;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;

    this.init();
  }

  /**
   * 初始化分隔栏拖拽功能
   */
  init() {
    // 查找所有分隔栏
    this.resizers = document.querySelectorAll('.resizer');

    this.resizers.forEach(resizer => {
      this.setupResizer(resizer);
    });

    // 从本地存储加载大小设置
    this.loadSizes();
  }

  /**
   * 设置单个分隔栏
   */
  setupResizer(resizer) {
    const type = resizer.dataset.resizer;

    if (type === 'sidebar') {
      // 资源管理器垂直分隔栏
      this.setupSidebarResizer(resizer);
    } else if (type === 'editor') {
      // 编辑器和预览区之间的垂直分隔栏
      this.setupEditorResizer(resizer);
    }
  }

  /**
   * 设置侧边栏分隔栏（调整侧边栏宽度）
   */
  setupSidebarResizer(resizer) {
    resizer.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      this.currentResizer = resizer;
      this.startX = e.clientX;

      const sidebar = document.getElementById('sidebar');
      this.startWidth = sidebar.offsetWidth;

      document.addEventListener('mousemove', this.handleSidebarMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);

      e.preventDefault();
      e.stopPropagation();
    });
  }

  /**
   * 设置编辑器分隔栏（调整编辑器和预览区比例）
   */
  setupEditorResizer(resizer) {
    resizer.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      this.currentResizer = resizer;
      this.startX = e.clientX;

      // 获取编辑网格容器
      const editorGrid = document.querySelector('.editor-grid');
      this.startGridWidth = editorGrid.offsetWidth;

      // 获取当前的网格列比例
      const computedStyle = window.getComputedStyle(editorGrid);
      const gridTemplateColumns = computedStyle.gridTemplateColumns;
      const columns = gridTemplateColumns.split(' ').filter(col => col.trim());

      this.startColumns = columns.map(col => {
        if (col.includes('fr')) {
          return parseFloat(col);
        } else if (col.includes('px')) {
          return parseFloat(col);
        }
        return 0;
      });

      document.addEventListener('mousemove', this.handleEditorMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);

      e.preventDefault();
      e.stopPropagation();
    });
  }

  /**
   * 处理侧边栏拖拽
   */
  handleSidebarMouseMove = (e) => {
    if (!this.isResizing || this.currentResizer?.dataset.resizer !== 'sidebar') return;

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const deltaX = e.clientX - this.startX;
    const newWidth = Math.max(200, Math.min(600, this.startWidth + deltaX));

    sidebar.style.width = `${newWidth}px`;

    // 实时更新
    document.body.style.cursor = 'ew-resize';
  };

  /**
   * 处理编辑器分隔栏拖拽（调整编辑器和预览区比例）
   */
  handleEditorMouseMove = (e) => {
    if (!this.isResizing || this.currentResizer?.dataset.resizer !== 'editor') return;

    const editorGrid = document.querySelector('.editor-grid');
    if (!editorGrid) return;

    const deltaX = e.clientX - this.startX;
    const containerWidth = this.startGridWidth;
    const ratio = Math.max(0.2, Math.min(0.8, (this.startColumns[0] + deltaX) / containerWidth));

    // 设置新的网格比例：编辑器区域 分隔栏(4px) 预览区域
    const editorFr = Math.max(0.5, ratio * 2); // 编辑器比例
    const previewFr = Math.max(0.3, 2 - editorFr); // 预览区比例

    editorGrid.style.gridTemplateColumns = `minmax(0, ${editorFr}fr) 4px minmax(0, ${previewFr}fr)`;

    // 实时更新
    document.body.style.cursor = 'ew-resize';
  };

  /**
   * 处理鼠标释放
   */
  handleMouseUp = () => {
    if (this.isResizing) {
      this.isResizing = false;
      this.currentResizer = null;

      // 保存大小设置
      this.saveSizes();

      // 恢复鼠标样式
      document.body.style.cursor = '';

      // 移除事件监听器
      document.removeEventListener('mousemove', this.handleSidebarMouseMove);
      document.removeEventListener('mousemove', this.handleEditorMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
    }
  };

  /**
   * 保存大小设置到本地存储
   */
  saveSizes() {
    try {
      const settings = {
        sidebarWidth: document.getElementById('sidebar')?.offsetWidth || 240,
        editorGridColumns: document.querySelector('.editor-grid')?.style.gridTemplateColumns || ''
      };
      localStorage.setItem('resizer-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save resizer settings:', error);
    }
  }

  /**
   * 从本地存储加载大小设置
   */
  loadSizes() {
    try {
      const saved = localStorage.getItem('resizer-settings');
      if (saved) {
        const settings = JSON.parse(saved);

        // 恢复侧边栏宽度
        if (settings.sidebarWidth && document.getElementById('sidebar')) {
          document.getElementById('sidebar').style.width = `${settings.sidebarWidth}px`;
        }

        // 恢复编辑器网格比例
        if (settings.editorGridColumns) {
          const editorGrid = document.querySelector('.editor-grid');
          if (editorGrid) {
            editorGrid.style.gridTemplateColumns = settings.editorGridColumns;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load resizer settings:', error);
    }
  }

  /**
   * 获取当前编辑器比例
   */
  getCurrentEditorRatio() {
    const editorGrid = document.querySelector('.editor-grid');
    if (!editorGrid) return 0.5;

    const computedStyle = window.getComputedStyle(editorGrid);
    const gridTemplateColumns = computedStyle.gridTemplateColumns;
    const columns = gridTemplateColumns.split(' ').filter(col => col.trim());

    const frValues = columns.map(col => {
      if (col.includes('fr')) {
        return parseFloat(col);
      }
      return 0;
    });

    const total = frValues.reduce((sum, val) => sum + val, 0);
    if (total === 0) return 0.5;

    return frValues[1] / total; // 右侧（预览区）的比例
  }

  /**
   * 重置为默认大小
   */
  resetToDefaults() {
    // 重置侧边栏宽度
    if (document.getElementById('sidebar')) {
      document.getElementById('sidebar').style.width = '240px';
    }

    // 重置编辑器比例
    const editorGrid = document.querySelector('.editor-grid');
    if (editorGrid) {
      editorGrid.style.gridTemplateColumns = 'minmax(0, 1.1fr) 4px minmax(0, 0.9fr)';
    }

    // 保存默认设置
    this.saveSizes();
  }

  /**
   * 获取当前设置
   */
  getCurrentSettings() {
    return {
      sidebarWidth: document.getElementById('sidebar')?.offsetWidth || 240,
      editorRatio: this.getCurrentEditorRatio()
    };
  }
}