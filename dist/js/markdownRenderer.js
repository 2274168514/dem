/**
 * Markdown 渲染器模块
 * 集成 react-markdown 功能的纯 JavaScript 实现
 */

class MarkdownRenderer {
    constructor(container) {
        this.container = container;
        this.marked = null;
        this.hljs = null;
        this Prism = null;
        this.init();
    }

    async init() {
        // 动态加载 marked 库用于 Markdown 解析
        if (typeof marked !== 'undefined') {
            this.marked = marked;
        } else {
            await this.loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
            this.marked = marked;
        }

        // 加载代码高亮库
        if (typeof Prism !== 'undefined') {
            this.Prism = Prism;
        } else {
            await this.loadScript('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js');
            await this.loadScript('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js');
            await this.loadScript('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js');
            await this.loadScript('https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js');
            this.Prism = Prism;
        }

        // 配置 marked 选项
        this.configureMarked();
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    configureMarked() {
        if (!this.marked) return;

        // 配置渲染器
        const renderer = new this.marked.Renderer();

        // 自定义代码块渲染
        renderer.code = (code, language) => {
            const lang = language || 'text';

            // 特殊处理 javascript-viz
            if (lang === 'javascript-viz') {
                return `
                    <div class="js-viz-container">
                        <div class="js-viz-controls">
                            <button class="btn-run-viz" onclick="window.jsVisualizer?.runCode(this)">
                                <i class="icon-play"></i> 运行
                            </button>
                            <button class="btn-reset-viz" onclick="window.jsVisualizer?.resetCode(this)">
                                <i class="icon-refresh"></i> 重置
                            </button>
                        </div>
                        <pre><code class="language-javascript">${this.escapeHtml(code)}</code></pre>
                        <div class="js-viz-output"></div>
                    </div>
                `;
            }

            // 普通代码块
            const highlighted = this.Prism ? this.Prism.highlight(code, this.Prism.languages[lang] || this.Prism.languages.plainText, lang) : this.escapeHtml(code);

            return `
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-language">${lang}</span>
                        <button class="code-copy-btn" onclick="this.parentElement.parentElement.nextElementSibling.select(); document.execCommand('copy')" title="复制代码">
                            <i class="icon-copy"></i>
                        </button>
                    </div>
                    <pre><code class="language-${lang}">${highlighted}</code></pre>
                </div>
            `;
        };

        // 自定义链接渲染
        renderer.link = (href, title, text) => {
            const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
            const fileType = this.getFileType(href);

            if (fileType) {
                const icon = this.getFileIcon(fileType);
                const color = this.getFileColor(fileType);

                return `
                    <a href="${href}"
                       target="_blank"
                       rel="noopener noreferrer"
                       class="media-link"
                       style="background-color: ${color}20; color: ${color}; border-color: ${color}40;"
                       onclick="return window.mediaViewer?.handleMediaClick(event, '${href}')">
                        <i class="${icon}"></i>
                        ${text}
                        <i class="icon-external-link"></i>
                    </a>
                `;
            }

            return `
                <a href="${href}"
                   ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}
                   ${title ? `title="${title}"` : ''}>
                    ${text}
                </a>
            `;
        };

        // 自定义标题渲染，添加锚点
        renderer.heading = (text, level) => {
            const id = text.toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="${id}"><a href="#${id}" class="anchor-link">#</a>${text}</h${level}>`;
        };

        // 自定义表格渲染
        renderer.table = (header, body) => {
            return `
                <div class="table-wrapper">
                    <table>
                        <thead>${header}</thead>
                        <tbody>${body}</tbody>
                    </table>
                </div>
            `;
        };

        this.marked.setOptions({
            renderer: renderer,
            highlight: (code, lang) => {
                if (this.Prism && this.Prism.languages[lang]) {
                    return this.Prism.highlight(code, this.Prism.languages[lang], lang);
                }
                return code;
            },
            langPrefix: 'language-',
            breaks: true,
            gfm: true
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getFileType(url) {
        if (!url) return null;
        const ext = url.split('.').pop()?.toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
        if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
        if (['pdf'].includes(ext)) return 'pdf';
        if (['ppt', 'pptx'].includes(ext)) return 'ppt';
        if (['doc', 'docx'].includes(ext)) return 'doc';
        if (['xls', 'xlsx'].includes(ext)) return 'excel';
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
        if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return 'audio';

        return null;
    }

    getFileIcon(type) {
        const icons = {
            image: 'icon-image',
            video: 'icon-video',
            pdf: 'icon-file-text',
            ppt: 'icon-presentation',
            doc: 'icon-file-text',
            excel: 'icon-table',
            archive: 'icon-archive',
            audio: 'icon-music'
        };
        return icons[type] || 'icon-file';
    }

    getFileColor(type) {
        const colors = {
            image: '#10b981',
            video: '#f59e0b',
            pdf: '#ef4444',
            ppt: '#f59e0b',
            doc: '#3b82f6',
            excel: '#10b981',
            archive: '#6b7280',
            audio: '#8b5cf6'
        };
        return colors[type] || '#6b7280';
    }

    render(markdown) {
        if (!this.marked) {
            this.container.innerHTML = '<p>Loading Markdown renderer...</p>';
            return;
        }

        try {
            const html = this.marked.parse(markdown);
            this.container.innerHTML = html;

            // 初始化代码块功能
            this.initCodeBlocks();

            // 触发渲染完成事件
            this.container.dispatchEvent(new CustomEvent('markdownRendered', {
                bubbles: true,
                detail: { html }
            }));
        } catch (error) {
            console.error('Markdown rendering error:', error);
            this.container.innerHTML = `<div class="error">Markdown 渲染错误: ${error.message}</div>`;
        }
    }

    initCodeBlocks() {
        // 为所有代码块添加复制功能
        this.container.querySelectorAll('.code-copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const codeBlock = btn.parentElement.parentElement.querySelector('code');
                navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                    const originalIcon = btn.innerHTML;
                    btn.innerHTML = '<i class="icon-check"></i>';
                    setTimeout(() => {
                        btn.innerHTML = originalIcon;
                    }, 2000);
                });
            });
        });
    }

    // 添加 GFM 支持
    enableGFM() {
        if (!this.marked) return;

        // 任务列表
        const listItemRenderer = (text) => {
            const isTaskItem = /^\s*\[[x ]\]\s*/.test(text);
            if (isTaskItem) {
                const isChecked = /^\s*\[x\]\s*/.test(text);
                const cleanText = text.replace(/^\s*\[[x ]\]\s*/, '');
                return `
                    <li class="task-list-item ${isChecked ? 'checked' : ''}">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} disabled>
                        ${cleanText}
                    </li>
                `;
            }
            return `<li>${text}</li>`;
        };

        const renderer = this.marked.options.renderer;
        renderer.listitem = listItemRenderer;
    }

    // 清空容器
    clear() {
        this.container.innerHTML = '';
    }

    // 销毁实例
    destroy() {
        this.clear();
        this.container = null;
        this.marked = null;
        this.hljs = null;
        this.Prism = null;
    }
}

// 导出模块
window.MarkdownRenderer = MarkdownRenderer;