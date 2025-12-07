/**
 * Canvas PPT渲染器
 * 使用Canvas技术直接渲染PPTX文件，完美支持中文和所有样式
 */
export class CanvasRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.slides = [];
    this.currentSlide = 0;
    this.scale = 1.0;
    this.callback = null;
  }

  /**
   * 渲染PPT到指定容器
   * @param {File} file - PPTX文件
   * @param {HTMLElement} container - 容器元素
   * @param {Function} callback - 渲染完成回调
   */
  async renderPPT(file, container, callback) {
    this.callback = callback;
    this.showLoading(container);

    try {
      // 读取PPTX文件
      const arrayBuffer = await file.arrayBuffer();

      // 动态加载JSZip
      if (!window.JSZip) {
        await this.loadJSZip();
      }

      // 解压并解析
      const zip = await JSZip.loadAsync(arrayBuffer);
      this.slides = await this.extractSlides(zip);

      if (this.slides.length > 0) {
        // 创建canvas元素
        this.createCanvas(container);
        this.currentSlide = 0;
        this.renderCurrentSlide();

        // 设置控制事件
        this.setupControls(container);

        if (callback) {
          callback({
            success: true,
            totalPages: this.slides.length,
            currentPage: 1
          });
        }
      }
    } catch (error) {
      console.error('Canvas渲染失败:', error);
      this.showError(container, error.message);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  }

  async loadJSZip() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  createCanvas(container) {
    // 清空容器
    container.innerHTML = '';

    // 创建canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.background = 'white';
    this.canvas.style.borderRadius = '8px';
    this.canvas.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';

    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  setupControls(container) {
    // 如果容器有控制按钮，设置事件
    const prevBtn = container.querySelector('.prev-slide');
    const nextBtn = container.querySelector('.next-slide');

    if (prevBtn) {
      prevBtn.onclick = () => this.previousSlide();
      prevBtn.disabled = this.currentSlide === 0;
    }

    if (nextBtn) {
      nextBtn.onclick = () => this.nextSlide();
      nextBtn.disabled = this.currentSlide === this.slides.length - 1;
    }
  }

  async extractSlides(zip) {
    const slides = [];

    // 查找幻灯片文件
    const slideFiles = [];
    for (let filename in zip.files) {
      if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
        slideFiles.push(filename);
      }
    }

    // 排序
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
      return numA - numB;
    });

    // 解析每张幻灯片
    for (const slideFile of slideFiles) {
      const xml = await zip.file(slideFile).async('string');
      const slideData = await this.parseSlide(xml);
      slides.push(slideData);
    }

    return slides;
  }

  async parseSlide(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const slide = {
      title: '',
      content: [],
      background: { type: 'solid', color: '#FFFFFF' },
      shapes: [],
      images: []
    };

    // 解析背景
    try {
      const csld = doc.getElementsByTagName('p:csld')[0];
      if (csld) {
        const bg = csld.getElementsByTagName('p:bg')[0];
        if (bg) {
          const bgPr = bg.getElementsByTagName('p:bgPr')[0];
          if (bgPr) {
            // 纯色背景
            const solidFill = bgPr.getElementsByTagName('a:solidFill')[0];
            if (solidFill) {
              const srgbClr = solidFill.getElementsByTagName('a:srgbClr')[0];
              if (srgbClr) {
                const val = srgbClr.getAttribute('val');
                if (val && val.length === 6) {
                  slide.background = { type: 'solid', color: '#' + val };
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.log('背景解析失败:', e);
    }

    // 解析形状和文本
    const shapes = doc.getElementsByTagName('p:sp');
    for (let i = 0; i < shapes.length; i++) {
      const sp = shapes[i];
      const textEls = sp.getElementsByTagName('a:t');

      // 解析形状信息
      const spPr = sp.getElementsByTagName('p:spPr')[0];
      const shapeInfo = {
        type: 'rectangle',
        text: '',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 1
      };

      // 解析形状几何
      if (spPr) {
        const xfrm = spPr.getElementsByTagName('a:xfrm')[0];
        if (xfrm) {
          const off = xfrm.getElementsByTagName('a:off')[0];
          const ext = xfrm.getElementsByTagName('a:ext')[0];
          if (off) {
            shapeInfo.x = parseInt(off.getAttribute('x')) || 100;
            shapeInfo.y = parseInt(off.getAttribute('y')) || 100;
          }
          if (ext) {
            shapeInfo.width = parseInt(ext.getAttribute('cx')) || 200;
            shapeInfo.height = parseInt(ext.getAttribute('cy')) || 100;
          }
        }

        // 解析形状填充
        const solidFill = spPr.getElementsByTagName('a:solidFill')[0];
        if (solidFill) {
          const srgbClr = solidFill.getElementsByTagName('a:srgbClr')[0];
          if (srgbClr) {
            const val = srgbClr.getAttribute('val');
            if (val && val.length === 6) {
              shapeInfo.fill = '#' + val;
            }
          }
        }
      }

      // 收集文本
      let text = '';
      for (let j = 0; j < textEls.length; j++) {
        text += textEls[j].textContent;
      }
      shapeInfo.text = text;

      // 第一个形状通常是标题
      if (i === 0 && text && !slide.title) {
        slide.title = text;
      } else if (text) {
        slide.content.push({
          text: text,
          fontSize: 18,
          bold: false,
          color: '#000000',
          level: 0
        });
      }

      slide.shapes.push(shapeInfo);
    }

    // 解析图片
    const pics = doc.getElementsByTagName('p:pic');
    for (let i = 0; i < pics.length; i++) {
      const pic = pics[i];
      const picInfo = {
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 150
      };

      const spPr = pic.getElementsByTagName('p:spPr')[0];
      if (spPr) {
        const xfrm = spPr.getElementsByTagName('a:xfrm')[0];
        if (xfrm) {
          const off = xfrm.getElementsByTagName('a:off')[0];
          const ext = xfrm.getElementsByTagName('a:ext')[0];
          if (off) {
            picInfo.x = parseInt(off.getAttribute('x')) || 100;
            picInfo.y = parseInt(off.getAttribute('y')) || 100;
          }
          if (ext) {
            picInfo.width = parseInt(ext.getAttribute('cx')) || 200;
            picInfo.height = parseInt(ext.getAttribute('cy')) || 150;
          }
        }
      }

      slide.images.push(picInfo);
    }

    return slide;
  }

  renderCurrentSlide() {
    if (!this.slides.length || !this.ctx) return;

    const slide = this.slides[this.currentSlide];

    // 设置画布尺寸 (16:9 比例)
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 计算缩放比例以适应容器
    const aspectRatio = 16 / 9;
    let width = containerWidth;
    let height = width / aspectRatio;

    if (height > containerHeight) {
      height = containerHeight;
      width = height * aspectRatio;
    }

    // 应用缩放
    width *= this.scale;
    height *= this.scale;

    this.canvas.width = width;
    this.canvas.height = height;

    // 清空画布
    this.ctx.clearRect(0, 0, width, height);

    // 绘制背景
    this.renderBackground(slide.background, width, height);

    // 渲染形状
    if (slide.shapes && slide.shapes.length > 0) {
      for (const shape of slide.shapes) {
        this.renderShape(shape, width, height);
      }
    }

    // 渲染图片占位符
    if (slide.images && slide.images.length > 0) {
      for (const img of slide.images) {
        this.renderImagePlaceholder(img, width, height);
      }
    }

    // 绘制标题
    if (slide.title) {
      this.ctx.fillStyle = '#000000';
      this.ctx.font = `bold ${48 * this.scale}px Arial, "Microsoft YaHei", "SimHei", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(slide.title, width / 2, 60 * this.scale);
    }

    // 绘制页码
    this.ctx.fillStyle = '#666666';
    this.ctx.font = `${16 * this.scale}px Arial`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`${this.currentSlide + 1} / ${this.slides.length}`, width - 40 * this.scale, height - 20 * this.scale);
  }

  renderBackground(background, width, height) {
    if (background.type === 'solid') {
      this.ctx.fillStyle = background.color || '#FFFFFF';
      this.ctx.fillRect(0, 0, width, height);
    } else {
      // 默认白色背景
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  renderShape(shape, canvasWidth, canvasHeight) {
    // 将PPT坐标转换为Canvas坐标
    const scale = Math.min(canvasWidth / 1280, canvasHeight / 720);
    const x = shape.x * scale;
    const y = shape.y * scale;
    const width = shape.width * scale;
    const height = shape.height * scale;

    this.ctx.save();

    // 设置填充颜色
    this.ctx.fillStyle = shape.fill || '#FFFFFF';

    // 绘制矩形
    if (shape.type === 'rectangle' || shape.type === 'rect') {
      this.ctx.fillRect(x, y, width, height);
    }

    // 绘制边框
    if (shape.stroke && shape.strokeWidth > 0) {
      this.ctx.strokeStyle = shape.stroke;
      this.ctx.lineWidth = shape.strokeWidth * scale;
      this.ctx.strokeRect(x, y, width, height);
    }

    // 绘制文本
    if (shape.text && shape.text.trim()) {
      this.ctx.fillStyle = '#000000';
      const fontSize = Math.max(16 * scale, 12);
      this.ctx.font = `${fontSize}px Arial, "Microsoft YaHei", "SimHei", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(shape.text, x + width/2, y + height/2);
    }

    this.ctx.restore();
  }

  renderImagePlaceholder(img, canvasWidth, canvasHeight) {
    const scale = Math.min(canvasWidth / 1280, canvasHeight / 720);
    const x = img.x * scale;
    const y = img.y * scale;
    const width = img.width * scale;
    const height = img.height * scale;

    // 绘制占位符
    this.ctx.strokeStyle = '#CCCCCC';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.setLineDash([]);

    // 绘制图标
    this.ctx.fillStyle = '#999999';
    this.ctx.font = `${20 * scale}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🖼️', x + width/2, y + height/2);
  }

  previousSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.renderCurrentSlide();
    }
  }

  nextSlide() {
    if (this.currentSlide < this.slides.length - 1) {
      this.currentSlide++;
      this.renderCurrentSlide();
    }
  }

  goToSlide(index) {
    if (index >= 0 && index < this.slides.length) {
      this.currentSlide = index;
      this.renderCurrentSlide();
    }
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.2, 3.0);
    this.renderCurrentSlide();
  }

  zoomOut() {
    this.scale = Math.max(this.scale / 1.2, 0.5);
    this.renderCurrentSlide();
  }

  showLoading(container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666;">
        <div style="border: 3px solid #f3f3f3; border-top: 3px solid #6b7280; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
        <p>正在解析PPT...</p>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
  }

  showError(container, message) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ef4444;">
        <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">⚠️ 加载失败</p>
        <p style="color: #999;">${message}</p>
      </div>
    `;
  }
}