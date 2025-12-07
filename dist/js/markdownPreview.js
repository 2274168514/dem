/**
 * Markdown 预览面板组件
 * 集成 Markdown 渲染、JS 可视化和媒体查看功能
 */

class MarkdownPreview {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.editor = null;
        this.renderer = null;
        this.jsVisualizer = null;
        this.mediaViewer = null;
        this.debounceTimer = null;
        this.isVisible = true;
        this.currentContent = '';
        this.isInitialized = false;

        this.init();
    }

    async init() {
        // 创建面板结构
        this.createPanel();

        // 初始化子组件
        await this.initComponents();

        // 绑定事件
        this.bindEvents();

        this.isInitialized = true;
    }

    createPanel() {
        this.container.innerHTML = `
            <div class="markdown-preview-panel">
                <div class="preview-header">
                    <div class="preview-title">
                        <i class="icon-file-text"></i>
                        <span>Markdown 预览</span>
                    </div>
                    <div class="preview-actions">
                        <button class="btn-refresh" title="刷新预览">
                            <i class="icon-refresh"></i>
                        </button>
                        <button class="btn-toggle-sidebar" title="切换侧边栏">
                            <i class="icon-sidebar"></i>
                        </button>
                        <button class="btn-fullscreen" title="全屏预览">
                            <i class="icon-maximize-2"></i>
                        </button>
                    </div>
                </div>
                <div class="preview-content" id="${this.containerId}-content">
                    <div class="preview-placeholder">
                        <i class="icon-file-text"></i>
                        <p>Markdown 预览区域</p>
                        <small>编辑 Markdown 文件后将在此显示预览</small>
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        if (!document.getElementById('markdown-preview-styles')) {
            const link = document.createElement('link');
            link.id = 'markdown-preview-styles';
            link.rel = 'stylesheet';
            link.href = '/css/markdown-preview.css';
            document.head.appendChild(link);
        }
    }

    async initComponents() {
        // 初始化 Markdown 渲染器
        const contentDiv = document.getElementById(`${this.containerId}-content`);
        this.renderer = new MarkdownRenderer(contentDiv);

        // 初始化 JS 可视化器
        this.jsVisualizer = new JsVisualizer();
        window.jsVisualizer = this.jsVisualizer; // 全局暴露供代码调用

        // 初始化媒体查看器
        this.mediaViewer = new MediaViewer();
        window.mediaViewer = this.mediaViewer; // 全局暴露供链接调用
    }

    bindEvents() {
        // 刷新按钮
        this.container.querySelector('.btn-refresh').addEventListener('click', () => {
            this.refresh();
        });

        // 切换侧边栏按钮
        this.container.querySelector('.btn-toggle-sidebar').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // 全屏按钮
        this.container.querySelector('.btn-fullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // 监听 Markdown 渲染完成事件
        document.getElementById(`${this.containerId}-content`).addEventListener('markdownRendered', (e) => {
            this.onMarkdownRendered(e.detail);
        });

        // 监听编辑器变化（如果有编辑器实例）
        window.addEventListener('editor-content-change', (e) => {
            if (e.detail && e.detail.type === 'markdown') {
                this.updateContent(e.detail.content);
            }
        });
    }

    updateContent(content) {
        this.currentContent = content || '';

        // 防抖处理，避免频繁渲染
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.render();
        }, 400);
    }

    render() {
        if (!this.renderer || !this.isInitialized) return;

        const contentDiv = document.getElementById(`${this.containerId}-content`);

        // 清空加载占位符
        contentDiv.innerHTML = '';

        // 添加 markdown-preview 类
        contentDiv.classList.add('markdown-preview');

        // 渲染 Markdown 内容
        if (this.currentContent.trim()) {
            this.renderer.render(this.currentContent);
        } else {
            contentDiv.innerHTML = `
                <div class="preview-placeholder">
                    <i class="icon-file-text"></i>
                    <p>Markdown 预览区域</p>
                    <small>编辑 Markdown 文件后将在此显示预览</small>
                </div>
            `;
        }
    }

    refresh() {
        this.render();
    }

    show() {
        this.container.style.display = 'block';
        this.isVisible = true;
        this.render();
    }

    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    toggleSidebar() {
        // 切换侧边栏逻辑（根据主应用布局实现）
        const sidebar = document.querySelector('.file-manager') || document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }

    toggleFullscreen() {
        const content = this.container.querySelector('.preview-content');
        const btn = this.container.querySelector('.btn-fullscreen i');

        if (!document.fullscreenElement) {
            content.requestFullscreen().then(() => {
                btn.className = 'icon-minimize-2';
            });
        } else {
            document.exitFullscreen().then(() => {
                btn.className = 'icon-maximize-2';
            });
        }
    }

    onMarkdownRendered(detail) {
        // Markdown 渲染完成后的回调
        // 可以在这里添加额外的处理逻辑
    }

    // 导出 Markdown 为 HTML
    exportHTML() {
        if (!this.currentContent) return null;

        const html = this.renderer ? this.renderer.marked.parse(this.currentContent) : '';
        return {
            html,
            title: 'Markdown Export',
            timestamp: new Date().toISOString()
        };
    }

    // 导出为 PDF（需要额外的库支持）
    exportPDF() {
        // 这里可以使用 jsPDF 或类似库实现 PDF 导出
        console.log('PDF export not implemented yet');
    }

    // 打印预览
    print() {
        const content = document.getElementById(`${this.containerId}-content`);
        const printWindow = window.open('', '_blank');

        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Markdown Preview</title>
                    <link rel="stylesheet" href="/css/markdown-preview.css">
                    <style>
                        body { margin: 0; padding: 20px; }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    }

    // 设置编辑器实例（用于双向绑定）
    setEditor(editor) {
        this.editor = editor;

        // 监听编辑器变化
        if (editor && editor.on) {
            editor.on('change', () => {
                const content = editor.getValue();
                this.updateContent(content);
            });
        }
    }

    // 获取当前内容
    getContent() {
        return this.currentContent;
    }

    // 设置内容
    setContent(content) {
        this.currentContent = content || '';
        this.render();
    }

    // 销毁实例
    destroy() {
        // 清理定时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // 销毁子组件
        if (this.renderer) {
            this.renderer.destroy();
        }

        if (this.jsVisualizer) {
            this.jsVisualizer.destroy();
        }

        if (this.mediaViewer) {
            this.mediaViewer.destroy();
        }

        // 清理全局引用
        delete window.jsVisualizer;
        delete window.mediaViewer;

        // 清空容器
        this.container.innerHTML = '';
    }

    // 静态方法：创建新实例
    static create(containerId) {
        return new MarkdownPreview(containerId);
    }
}

// 导出模块
window.MarkdownPreview = MarkdownPreview;