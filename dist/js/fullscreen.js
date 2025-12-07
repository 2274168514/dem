/**
 * 全屏预览功能模块
 * 处理预览区域的全屏显示和退出
 */
export class FullscreenManager {
    constructor() {
        this.previewFrame = document.getElementById('preview');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.isFullscreen = false;
        this.originalContent = '';

        this.init();
    }

    /**
     * 初始化全屏管理器
     */
    init() {
        // 绑定全屏按钮点击事件
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // 监听ESC键退出全屏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                this.exitFullscreen();
            }
        });

        // 监听全屏状态变化事件
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });

        // 监听全屏错误事件
        document.addEventListener('fullscreenerror', (e) => {
            console.error('❌ 全屏失败:', e);
            this.showNotification('无法进入全屏模式', 'error');
        });
    }

    /**
     * 切换全屏模式
     */
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    /**
     * 进入全屏模式
     */
    enterFullscreen() {
        try {
            // 创建全屏容器
            const fullscreenContainer = this.createFullscreenContainer();

            // 复制预览内容到全屏容器
            this.copyPreviewContent(fullscreenContainer);

            // 添加到页面并进入全屏
            document.body.appendChild(fullscreenContainer);

            // 使用requestAnimationFrame确保DOM更新完成后再进入全屏
            requestAnimationFrame(() => {
                fullscreenContainer.requestFullscreen().then(() => {
                    this.isFullscreen = true;
                    this.fullscreenBtn.innerHTML = '⊟'; // 改为退出全屏图标
                    this.fullscreenBtn.title = '退出全屏';
                    console.log('✅ 成功进入全屏模式');
                }).catch((error) => {
                    console.error('❌ 进入全屏失败:', error);
                    this.showNotification('无法进入全屏模式', 'error');
                    document.body.removeChild(fullscreenContainer);
                });
            });
        } catch (error) {
            console.error('❌ 全屏操作失败:', error);
            this.showNotification('全屏操作失败', 'error');
        }
    }

    /**
     * 退出全屏模式
     */
    exitFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen().then(() => {
                this.isFullscreen = false;
                this.fullscreenBtn.innerHTML = '⛶'; // 恢复进入全屏图标
                this.fullscreenBtn.title = '全屏预览';
                console.log('✅ 成功退出全屏模式');
            }).catch((error) => {
                console.error('❌ 退出全屏失败:', error);
                this.showNotification('退出全屏失败', 'error');
            });
        }
    }

    /**
     * 处理全屏状态变化
     */
    handleFullscreenChange() {
        const fullscreenElement = document.fullscreenElement;

        if (!fullscreenElement && this.isFullscreen) {
            // 如果不是通过代码主动退出全屏（比如按ESC键），清理全屏容器
            this.cleanupFullscreen();
            this.isFullscreen = false;
            this.fullscreenBtn.innerHTML = '⛶';
            this.fullscreenBtn.title = '全屏预览';
        }
    }

    /**
     * 创建全屏容器
     */
    createFullscreenContainer() {
        const container = document.createElement('div');
        container.id = 'fullscreen-preview-container';
        container.style.cssText = `
            width: 100vw;
            height: 100vh;
            background: #ffffff;
            position: relative;
        `;

        // 直接在容器上创建iframe，不需要额外的包装容器
        return container;
    }

    /**
     * 复制预览内容到全屏容器
     */
    copyPreviewContent(fullscreenContainer) {
        if (!this.previewFrame) return;

        // 直接在容器中创建iframe
        const fullscreenIframe = document.createElement('iframe');
        fullscreenIframe.style.cssText = `
            width: 100vw;
            height: 100vh;
            border: none;
            background: #ffffff;
            position: absolute;
            top: 0;
            left: 0;
        `;
        fullscreenIframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-modals';
        fullscreenIframe.title = '全屏预览';

        // 复制原iframe的内容
        try {
            const originalDoc = this.previewFrame.contentDocument || this.previewFrame.contentWindow.document;
            if (originalDoc) {
                // 延迟设置内容以确保iframe完全加载
                setTimeout(() => {
                    const newDoc = fullscreenIframe.contentDocument || fullscreenIframe.contentWindow.document;
                    if (newDoc && originalDoc.documentElement) {
                        newDoc.open();
                        newDoc.write(originalDoc.documentElement.outerHTML);
                        newDoc.close();
                    }
                }, 100);
            }
        } catch (error) {
            console.warn('⚠️ 无法复制预览内容，尝试其他方法:', error);

            // 如果无法直接复制，尝试获取编译后的内容
            if (window.preview) {
                setTimeout(() => {
                    try {
                        const html = window.fileManager?.files?.['html/index.html'] || '';
                        const css = window.fileManager?.files?.['css/style.css'] || '';
                        const js = window.fileManager?.files?.['js/main.js'] || '';

                        if (html) {
                            const compiledContent = window.preview.compileCode(html, css, js);
                            const newDoc = fullscreenIframe.contentDocument || fullscreenIframe.contentWindow.document;
                            newDoc.open();
                            newDoc.write(compiledContent);
                            newDoc.close();
                        }
                    } catch (compileError) {
                        console.error('❌ 编译内容失败:', compileError);
                    }
                }, 100);
            }
        }

        fullscreenContainer.appendChild(fullscreenIframe);
    }

    /**
     * 清理全屏容器
     */
    cleanupFullscreen() {
        const container = document.getElementById('fullscreen-preview-container');
        if (container) {
            document.body.removeChild(container);
        }
    }

    /**
     * 显示通知消息
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 0.75rem 1rem;
            background: ${type === 'error' ? '#ff6b81' : '#3ea7ff'};
            color: white;
            border-radius: 4px;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // 显示动画
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });

        // 3秒后自动消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// 创建全局实例
window.fullscreenManager = new FullscreenManager();