class ImageSlider {
    constructor() {
        this.currentIndex = 0;
        this.slides = document.querySelectorAll('.slide');
        this.indicators = document.querySelectorAll('.indicator');
        this.totalSlides = this.slides.length;
        this.autoPlayInterval = null;
        this.isPlaying = true;
        this.slideSpeed = 5; // 秒

        this.init();
    }

    init() {
        this.updateSlide();
        this.startAutoPlay();
        this.setupKeyboardControls();
        this.setupTouchControls();
        this.updateInfo();
    }

    updateSlide() {
        // 隐藏所有幻灯片
        this.slides.forEach(slide => slide.classList.remove('active'));
        this.indicators.forEach(indicator => indicator.classList.remove('active'));

        // 显示当前幻灯片
        this.slides[this.currentIndex].classList.add('active');
        this.indicators[this.currentIndex].classList.add('active');

        // 更新图片信息
        this.updateInfo();
    }

    updateInfo() {
        const currentSlide = this.slides[this.currentIndex];
        const title = currentSlide.querySelector('.slide-caption').textContent;

        document.getElementById('current-title').textContent = title;
        document.getElementById('current-index').textContent = this.currentIndex + 1;
        document.getElementById('total-slides').textContent = this.totalSlides;
        document.getElementById('autoplay-status').textContent = this.isPlaying ? '开启' : '关闭';
    }

    goToSlide(index) {
        if (index >= 0 && index < this.totalSlides) {
            this.currentIndex = index;
            this.updateSlide();
            this.resetAutoPlay();
        }
    }

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.totalSlides;
        this.updateSlide();
        this.resetAutoPlay();
    }

    previousSlide() {
        this.currentIndex = (this.currentIndex - 1 + this.totalSlides) % this.totalSlides;
        this.updateSlide();
        this.resetAutoPlay();
    }

    startAutoPlay() {
        if (this.isPlaying) {
            this.stopAutoPlay();
            this.autoPlayInterval = setInterval(() => {
                this.nextSlide();
            }, this.slideSpeed * 1000);
        }
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    resetAutoPlay() {
        if (this.isPlaying) {
            this.startAutoPlay();
        }
    }

    toggleAutoPlay() {
        this.isPlaying = !this.isPlaying;

        if (this.isPlaying) {
            this.startAutoPlay();
            document.getElementById('play-pause-icon').textContent = '⏸️';
            document.getElementById('play-pause-text').textContent = '暂停';
        } else {
            this.stopAutoPlay();
            document.getElementById('play-pause-icon').textContent = '▶️';
            document.getElementById('play-pause-text').textContent = '播放';
        }

        this.updateInfo();
    }

    setSpeed(speed) {
        this.slideSpeed = parseInt(speed);
        document.getElementById('speed-value').textContent = speed;

        if (this.isPlaying) {
            this.resetAutoPlay();
        }
    }

    toggleFullscreen() {
        const container = document.querySelector('.slider-container');

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.previousSlide();
                    break;
                case 'ArrowRight':
                    this.nextSlide();
                    break;
                case ' ':
                    e.preventDefault();
                    this.toggleAutoPlay();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
            }
        });
    }

    setupTouchControls() {
        const sliderWrapper = document.querySelector('.slider-wrapper');
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        sliderWrapper.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            isDragging = true;
            sliderWrapper.style.cursor = 'grabbing';
        });

        sliderWrapper.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            currentX = e.clientX;
        });

        sliderWrapper.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            sliderWrapper.style.cursor = 'grab';

            const diffX = startX - currentX;
            if (Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    this.nextSlide();
                } else {
                    this.previousSlide();
                }
            }
        });

        sliderWrapper.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                sliderWrapper.style.cursor = 'grab';
            }
        });

        // 触摸事件
        sliderWrapper.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });

        sliderWrapper.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            currentX = e.touches[0].clientX;
        });

        sliderWrapper.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;

            const diffX = startX - currentX;
            if (Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    this.nextSlide();
                } else {
                    this.previousSlide();
                }
            }
        });
    }
}

// 页面可见性检测
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        slider.stopAutoPlay();
    } else if (slider.isPlaying) {
        slider.startAutoPlay();
    }
});

// 初始化轮播器
const slider = new ImageSlider();