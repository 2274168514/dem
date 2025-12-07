/**
 * 媒体查看器模块
 * 支持图片、视频、PDF、PPT 等多种媒体格式的预览
 */

class MediaViewer {
    constructor() {
        this.modal = null;
        this.overlay = null;
        this.content = null;
        this.currentMedia = null;
        this.isFullscreen = false;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        // 创建模态框遮罩
        this.overlay = document.createElement('div');
        this.overlay.className = 'media-viewer-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // 创建模态框内容
        this.modal = document.createElement('div');
        this.modal.className = 'media-viewer-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            height: 90%;
            max-width: 1200px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            display: none;
            z-index: 10001;
            opacity: 0;
            transition: all 0.3s ease;
        `;

        // 创建工具栏
        const toolbar = document.createElement('div');
        toolbar.className = 'media-viewer-toolbar';
        toolbar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            border-radius: 8px 8px 0 0;
        `;

        // 标题
        const title = document.createElement('div');
        title.className = 'media-viewer-title';
        title.style.cssText = `
            font-size: 16px;
            font-weight: 500;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 60%;
        `;

        // 操作按钮组
        const actions = document.createElement('div');
        actions.className = 'media-viewer-actions';
        actions.style.cssText = `
            display: flex;
            gap: 8px;
        `;

        // 创建按钮
        const buttons = [
            {
                icon: 'icon-maximize-2',
                title: '全屏',
                onClick: () => this.toggleFullscreen()
            },
            {
                icon: 'icon-external-link',
                title: '在新窗口打开',
                onClick: () => this.openInNewWindow()
            },
            {
                icon: 'icon-download',
                title: '下载',
                onClick: () => this.download()
            },
            {
                icon: 'icon-x',
                title: '关闭',
                onClick: () => this.close()
            }
        ];

        buttons.forEach(btnConfig => {
            const btn = document.createElement('button');
            btn.className = 'media-viewer-btn';
            btn.style.cssText = `
                width: 36px;
                height: 36px;
                border: none;
                background: transparent;
                color: #666;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            `;
            btn.innerHTML = `<i class="${btnConfig.icon}"></i>`;
            btn.title = btnConfig.title;
            btn.addEventListener('click', btnConfig.onClick);
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#e9ecef';
                btn.style.color = '#333';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'transparent';
                btn.style.color = '#666';
            });
            actions.appendChild(btn);
        });

        toolbar.appendChild(title);
        toolbar.appendChild(actions);

        // 创建内容容器
        this.content = document.createElement('div');
        this.content.className = 'media-viewer-content';
        this.content.style.cssText = `
            height: calc(100% - 61px);
            overflow: auto;
            border-radius: 0 0 8px 8px;
        `;

        this.modal.appendChild(toolbar);
        this.modal.appendChild(this.content);

        // 添加到页面
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.modal);
    }

    bindEvents() {
        // 点击遮罩关闭
        this.overlay.addEventListener('click', () => this.close());

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.close();
            }
            if (e.key === 'F11' && this.isVisible()) {
                e.preventDefault();
                this.toggleFullscreen();
            }
        });

        // 防止内容区域的点击冒泡
        this.content.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 全屏变化监听
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                this.isFullscreen = false;
                this.updateFullscreenButton();
            }
        });
    }

    handleMediaClick(event, url) {
        event.preventDefault();
        const mediaType = this.getMediaType(url);

        if (mediaType) {
            this.open(url, mediaType);
        } else {
            // 如果不是支持的媒体类型，直接在新窗口打开
            window.open(url, '_blank');
        }

        return false;
    }

    getMediaType(url) {
        if (!url) return null;

        const ext = url.split('.').pop()?.toLowerCase();
        const protocol = url.split(':')[0]?.toLowerCase();

        // 图片
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
            return 'image';
        }

        // 视频
        if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
            return 'video';
        }

        // PDF
        if (ext === 'pdf') {
            return 'pdf';
        }

        // PPT
        if (['ppt', 'pptx'].includes(ext)) {
            return 'ppt';
        }

        // 音频
        if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
            return 'audio';
        }

        // 外部网站
        if (protocol && ['http', 'https'].includes(protocol)) {
            return 'iframe';
        }

        return null;
    }

    open(url, mediaType) {
        this.currentMedia = { url, type: mediaType };
        this.renderMedia();
        this.show();
    }

    renderMedia() {
        const { url, type } = this.currentMedia;

        // 更新标题
        const title = this.modal.querySelector('.media-viewer-title');
        const filename = url.split('/').pop() || '媒体文件';
        title.textContent = filename;

        // 清空内容
        this.content.innerHTML = '';

        // 根据类型渲染媒体
        switch (type) {
            case 'image':
                this.renderImage(url);
                break;
            case 'video':
                this.renderVideo(url);
                break;
            case 'pdf':
                this.renderPDF(url);
                break;
            case 'ppt':
                this.renderPPT(url);
                break;
            case 'audio':
                this.renderAudio(url);
                break;
            case 'iframe':
                this.renderIframe(url);
                break;
            default:
                this.renderError('不支持的媒体类型');
        }
    }

    renderImage(url) {
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            display: block;
            margin: 0 auto;
            object-fit: contain;
        `;
        this.content.appendChild(img);

        // 加载错误处理
        img.onerror = () => {
            this.renderError('图片加载失败');
        };
    }

    renderVideo(url) {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.style.cssText = `
            width: 100%;
            height: 100%;
            display: block;
            margin: 0 auto;
        `;
        this.content.appendChild(video);

        // 加载错误处理
        video.onerror = () => {
            this.renderError('视频加载失败');
        };
    }

    renderPDF(url) {
        // 先尝试直接使用浏览器内置的PDF查看器
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;
        this.content.appendChild(iframe);

        // 加载错误处理
        iframe.onerror = () => {
            // 如果直接加载失败，尝试创建下载提示
            this.renderPDFError(url);
        };

        // 检查iframe是否加载成功
        iframe.onload = () => {
            try {
                // 尝试访问iframe内容以检查是否加载成功
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (!iframeDoc || iframeDoc.title.includes('404') || iframeDoc.title.includes('Error')) {
                    this.renderPDFError(url);
                }
            } catch (e) {
                // 跨域错误，说明可能是PDF加载成功但无法访问内容
                // 这是正常情况，不需要处理
            }
        };
    }

    renderPDFError(url) {
        // PDF加载失败时显示错误信息和下载选项
        this.content.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px;">
                <i class="icon-file-text" style="font-size: 64px; color: #ef4444; margin-bottom: 16px;"></i>
                <h3 style="color: #333; margin-bottom: 16px;">无法在线预览此PDF文件</h3>
                <p style="color: #666; margin-bottom: 20px; text-align: center; max-width: 400px;">
                    可能的原因：<br>
                    • 文件不存在或路径错误<br>
                    • 文件格式不支持<br>
                    • 网络连接问题
                </p>
                <div style="display: flex; gap: 12px;">
                    <button onclick="window.mediaViewer.download()" style="
                        padding: 10px 20px;
                        background: #4f46e5;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">下载PDF</button>
                    <button onclick="window.mediaViewer.openInNewWindow()" style="
                        padding: 10px 20px;
                        background: #6b7280;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">在新窗口打开</button>
                </div>
            </div>
        `;
    }

    renderPPT(url) {
        // 使用 Office Online 查看器
        const iframe = document.createElement('iframe');
        iframe.src = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;
        this.content.appendChild(iframe);

        // 备用方案：下载提示
        iframe.onerror = () => {
            this.content.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <i class="icon-presentation" style="font-size: 64px; color: #666; margin-bottom: 16px;"></i>
                    <p style="color: #666; margin-bottom: 20px;">无法在线预览此文档</p>
                    <button onclick="window.mediaViewer.download()" style="
                        padding: 10px 20px;
                        background: #4f46e5;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                    ">下载文档</button>
                </div>
            `;
        };
    }

    renderAudio(url) {
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        audio.style.cssText = `
            width: 100%;
            margin-top: 50%;
            transform: translateY(-50%);
        `;
        this.content.appendChild(audio);

        // 音频封面
        const cover = document.createElement('div');
        cover.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            height: 60%;
            margin-bottom: 20px;
        `;
        cover.innerHTML = '<i class="icon-music" style="font-size: 128px; color: #ddd;"></i>';
        this.content.insertBefore(cover, audio);
    }

    renderIframe(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
        this.content.appendChild(iframe);

        // 加载错误处理
        iframe.onerror = () => {
            this.renderError('页面加载失败');
        };
    }

    renderError(message) {
        this.content.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                <i class="icon-alert-circle" style="font-size: 64px; color: #ef4444; margin-bottom: 16px;"></i>
                <p style="color: #666;">${message}</p>
            </div>
        `;
    }

    show() {
        this.overlay.style.display = 'block';
        this.modal.style.display = 'block';

        // 触发重排以应用过渡效果
        requestAnimationFrame(() => {
            this.overlay.style.opacity = '1';
            this.modal.style.opacity = '1';
            this.modal.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        // 禁用背景滚动
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.overlay.style.opacity = '0';
        this.modal.style.opacity = '0';
        this.modal.style.transform = 'translate(-50%, -50%) scale(0.95)';

        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.modal.style.display = 'none';

            // 退出全屏
            if (this.isFullscreen) {
                document.exitFullscreen();
                this.isFullscreen = false;
            }
        }, 300);

        // 恢复背景滚动
        document.body.style.overflow = '';
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.modal.requestFullscreen().then(() => {
                this.isFullscreen = true;
                this.modal.style.width = '100%';
                this.modal.style.height = '100%';
                this.modal.style.borderRadius = '0';
                this.updateFullscreenButton();
            }).catch(err => {
                console.error('无法进入全屏:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                this.isFullscreen = false;
                this.modal.style.width = '90%';
                this.modal.style.height = '90%';
                this.modal.style.borderRadius = '8px';
                this.updateFullscreenButton();
            });
        }
    }

    updateFullscreenButton() {
        const btn = this.modal.querySelector('.icon-maximize-2')?.parentElement;
        if (btn) {
            const icon = btn.querySelector('i');
            if (this.isFullscreen) {
                icon.className = 'icon-minimize-2';
                btn.title = '退出全屏';
            } else {
                icon.className = 'icon-maximize-2';
                btn.title = '全屏';
            }
        }
    }

    openInNewWindow() {
        if (this.currentMedia) {
            window.open(this.currentMedia.url, '_blank');
        }
    }

    download() {
        if (this.currentMedia) {
            const link = document.createElement('a');
            link.href = this.currentMedia.url;
            link.download = '';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    isVisible() {
        return this.overlay.style.display === 'block';
    }

    // 销毁实例
    destroy() {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.overlay = null;
        }
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
        }
        this.content = null;
        this.currentMedia = null;
    }
}

// 导出模块
window.MediaViewer = MediaViewer;