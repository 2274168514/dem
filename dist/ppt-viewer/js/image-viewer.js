/**
 * PPT图片预览器
 * 基于图片的PPT幻灯片预览组件
 */

// 默认端口配置
const API_PORT = 5024;
const API_BASE = `http://localhost:${API_PORT}`;

class PPTImageViewer {
    constructor() {
        this.slides = [];
        this.currentSlide = 0;
        this.zoomLevel = 1;
        this.isLoading = false;

        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.loadPPTData();
    }

    bindElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            previewContainer: document.getElementById('preview-container'),
            slideImage: document.getElementById('slide-image'),
            slideCounter: document.getElementById('slide-counter'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            zoomIn: document.getElementById('zoom-in'),
            zoomOut: document.getElementById('zoom-out'),
            zoomFit: document.getElementById('zoom-fit'),
            zoomLevel: document.getElementById('zoom-level'),
            zoomContainer: document.getElementById('zoom-container'),
            thumbnails: document.getElementById('thumbnails'),
            retryBtn: document.getElementById('retry-btn'),
            fullscreenBtn: document.getElementById('fullscreen-btn')
        };
    }

    bindEvents() {
        // 导航按钮
        this.elements.prevBtn?.addEventListener('click', () => this.previousSlide());
        this.elements.nextBtn?.addEventListener('click', () => this.nextSlide());
        this.elements.retryBtn?.addEventListener('click', () => this.loadPPTData());

        // 缩放控制
        this.elements.zoomIn?.addEventListener('click', () => this.zoomIn());
        this.elements.zoomOut?.addEventListener('click', () => this.zoomOut());
        this.elements.zoomFit?.addEventListener('click', () => this.zoomFit());

        // 全屏控制
        this.elements.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());

        // 键盘导航
        document.addEventListener('keydown', (e) => {
            if (this.isLoading) return;

            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousSlide();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
            }
        });

        // 鼠标滚轮缩放
        this.elements.previewContainer?.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            }
        });
    }

    async loadPPTData() {
        try {
            this.showLoading(true);

            // 从URL获取文档ID
            const urlParams = new URLSearchParams(window.location.search);
            const docId = urlParams.get('id');

            if (!docId) {
                throw new Error('缺少文档ID参数');
            }

            console.log('📸 加载PPT图片数据:', docId);

            // 获取PPT图片数据
            const response = await fetch(`${API_BASE}/api/documents/${docId}/ppt-images`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || '获取PPT数据失败');
            }

            console.log('✅ PPT图片数据加载成功:', result.data);

            this.slides = result.data.slides || [];
            this.currentSlide = 0;

            if (this.slides.length === 0) {
                throw new Error('没有找到幻灯片图片');
            }

            this.renderThumbnails();
            this.showSlide(0);
            this.showLoading(false);
            this.showSuccess(`成功加载 ${this.slides.length} 页幻灯片`);

        } catch (error) {
            console.error('❌ 加载PPT数据失败:', error);
            this.showError(error.message);
            this.showLoading(false);

            // 尝试加载模拟数据
            setTimeout(() => {
                this.loadMockData();
            }, 2000);
        }
    }

    renderThumbnails() {
        if (!this.elements.thumbnails) return;

        this.elements.thumbnails.innerHTML = '';

        this.slides.forEach((slide, index) => {
            const thumbnailDiv = document.createElement('div');
            thumbnailDiv.className = `thumbnail flex-shrink-0 ${index === this.currentSlide ? 'active' : ''}`;
            thumbnailDiv.innerHTML = `
                <div class="relative">
                    <img src="${API_BASE}${slide.thumbUrl}"
                         alt="页面 ${slide.page}"
                         class="w-24 h-18 object-cover rounded border-2 border-gray-600"
                         loading="lazy">
                    <span class="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                        ${slide.page}
                    </span>
                </div>
            `;

            thumbnailDiv.addEventListener('click', () => {
                this.showSlide(index);
            });

            this.elements.thumbnails.appendChild(thumbnailDiv);
        });
    }

    showSlide(index) {
        if (index < 0 || index >= this.slides.length) return;

        this.currentSlide = index;
        const slide = this.slides[index];

        if (!slide || !this.elements.slideImage) return;

        // 更新图片
        this.elements.slideImage.src = `${API_BASE}${slide.url}`;
        this.elements.slideImage.alt = `第 ${slide.page} 页`;

        // 更新计数器
        this.updateSlideCounter();

        // 更新缩略图激活状态
        this.updateThumbnailActive();

        // 更新导航按钮状态
        this.updateNavigationButtons();

        // 重置缩放
        this.zoomFit();
    }

    updateSlideCounter() {
        if (this.elements.slideCounter) {
            this.elements.slideCounter.textContent = `${this.currentSlide + 1} / ${this.slides.length}`;
        }
    }

    updateThumbnailActive() {
        const thumbnails = this.elements.thumbnails?.querySelectorAll('.thumbnail');
        thumbnails?.forEach((thumb, index) => {
            if (index === this.currentSlide) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    updateNavigationButtons() {
        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = this.currentSlide === 0;
            this.elements.prevBtn.classList.toggle('opacity-50', this.currentSlide === 0);
        }

        if (this.elements.nextBtn) {
            this.elements.nextBtn.disabled = this.currentSlide === this.slides.length - 1;
            this.elements.nextBtn.classList.toggle('opacity-50', this.currentSlide === this.slides.length - 1);
        }
    }

    previousSlide() {
        if (this.currentSlide > 0) {
            this.showSlide(this.currentSlide - 1);
        }
    }

    nextSlide() {
        if (this.currentSlide < this.slides.length - 1) {
            this.showSlide(this.currentSlide + 1);
        }
    }

    zoomIn() {
        this.setZoom(this.zoomLevel + 0.2);
    }

    zoomOut() {
        this.setZoom(this.zoomLevel - 0.2);
    }

    zoomFit() {
        this.setZoom(1);
    }

    setZoom(level) {
        level = Math.max(0.5, Math.min(3, level));
        this.zoomLevel = level;

        if (this.elements.zoomContainer) {
            this.elements.zoomContainer.style.transform = `scale(${level})`;
        }

        if (this.elements.zoomLevel) {
            this.elements.zoomLevel.textContent = `${Math.round(level * 100)}%`;
        }
    }

    toggleFullscreen() {
        const container = this.elements.previewContainer;

        if (!document.fullscreenElement) {
            container?.requestFullscreen?.().catch(err => {
                console.error('无法进入全屏模式:', err);
            });
        } else {
            document.exitFullscreen?.();
        }
    }

    showLoading(show) {
        this.isLoading = show;

        if (this.elements.loading) {
            this.elements.loading.classList.toggle('hidden', !show);
        }

        if (this.elements.previewContainer) {
            this.elements.previewContainer.classList.toggle('hidden', show);
        }

        if (this.elements.error) {
            this.elements.error.classList.add('hidden');
        }
    }

    showError(message) {
        if (this.elements.error) {
            this.elements.error.classList.remove('hidden');
            const errorText = this.elements.error.querySelector('p.text-gray-400');
            if (errorText) {
                errorText.textContent = message || '加载失败';
            }
        }
    }

    showSuccess(message) {
        console.log('✅', message);
    }

    loadMockData() {
        try {
            console.log('🎭 加载模拟PPT数据...');
            this.showLoading(true);

            // 生成5页模拟幻灯片
            this.slides = [];
            const titles = ['项目介绍', '技术架构', '功能特性', '实现方案', '总结展望'];

            for (let i = 1; i <= 5; i++) {
                this.slides.push({
                    page: i,
                    url: this.generateMockSlide(i, titles[i-1]),
                    thumbUrl: this.generateMockThumb(i)
                });
            }

            this.currentSlide = 0;

            setTimeout(() => {
                this.renderThumbnails();
                this.showSlide(0);
                this.showLoading(false);
                this.showSuccess('已加载模拟PPT数据 (5页幻灯片)');
            }, 500);

        } catch (error) {
            console.error('❌ 加载模拟数据失败:', error);
            this.showError('无法加载模拟数据');
            this.showLoading(false);
        }
    }

    generateMockSlide(page, title) {
        const svgContent = `
            <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bg${page}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="800" height="600" fill="url(#bg${page})"/>
                <rect x="50" y="100" width="700" height="400" fill="white" rx="10"/>
                <text x="400" y="150" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#2C3E50">${title}</text>
                <text x="400" y="250" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#34495E">这是第 ${page} 页幻灯片</text>
                <circle cx="200" cy="350" r="40" fill="#E74C3C"/>
                <rect x="350" y="320" width="100" height="60" fill="#27AE60"/>
                <polygon points="550,320 600,380 500,380" fill="#F39C12"/>
                <text x="400" y="500" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#7F8C8D">第 ${page} 页 / 共 5 页</text>
            </svg>
        `;

        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
    }

    generateMockThumb(page) {
        const svgContent = `
            <svg width="160" height="120" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="thumbbg${page}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="160" height="120" fill="url(#thumbbg${page})"/>
                <rect x="10" y="20" width="140" height="80" fill="white" rx="2"/>
                <text x="80" y="40" font-family="Arial, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" fill="#2C3E50">第${page}页</text>
                <text x="80" y="70" font-family="Arial, sans-serif" font-size="8" text-anchor="middle" fill="#34495E">幻灯片内容</text>
            </svg>
        `;

        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new PPTImageViewer();
});

// 导出供测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PPTImageViewer;
}