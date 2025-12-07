# 可视化编程演示

## HTML基础演示

```html
<style>
    .demo-container {
        font-family: Arial, sans-serif;
        color: #333;
        padding: 10px;
    }
    .section {
        background: white;
        margin-bottom: 20px;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        border: 1px solid #eee;
    }
    .tag {
        display: inline-block;
        background: #667eea;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        margin-right: 5px;
        margin-bottom: 10px;
    }
    .form-group { margin-bottom: 10px; }
    label { display: inline-block; width: 60px; }
    input, textarea { padding: 5px; border: 1px solid #ddd; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; }
</style>

<div class="demo-container">
    <div class="section">
        <h3>语义化标签</h3>
        <span class="tag">HTML5</span>
        <article>
            <header>
                <h4>文章标题</h4>
                <time datetime="2024-01-01" style="color: #666; font-size: 0.9em;">2024年1月1日</time>
            </header>
            <section>
                <p>这是文章的主要内容段落。HTML5提供了丰富的语义化标签，让页面结构更清晰。</p>
            </section>
            <footer>
                <p style="color: #888; font-size: 0.9em;">文章作者：Demo</p>
            </footer>
        </article>
    </div>

    <div class="section">
        <h3>表单元素</h3>
        <span class="tag">表单</span>
        <form onsubmit="event.preventDefault(); alert('表单已提交！');">
            <fieldset style="border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                <legend>个人信息</legend>
                <div class="form-group">
                    <label>姓名:</label>
                    <input type="text" placeholder="请输入姓名" required>
                </div>
                <div class="form-group">
                    <label>邮箱:</label>
                    <input type="email" placeholder="example@email.com">
                </div>
                <button type="submit" style="background:#667eea; color:white; border:none; padding:5px 15px; border-radius:4px; cursor:pointer;">提交</button>
            </fieldset>
        </form>
    </div>

    <div class="section">
        <h3>数据展示</h3>
        <span class="tag">表格</span>
        <table>
            <thead>
                <tr>
                    <th>产品</th>
                    <th>价格</th>
                    <th>库存</th>
                    <th>状态</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>笔记本电脑</td>
                    <td>¥5999</td>
                    <td>15</td>
                    <td style="color: green;">有货</td>
                </tr>
                <tr>
                    <td>智能手机</td>
                    <td>¥2999</td>
                    <td>30</td>
                    <td style="color: orange;">库存紧张</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
```

---

## CSS样式演示

```html
<style>
    .css-demo-root {
        --primary: #667eea;
        --secondary: #764ba2;
        padding: 10px;
        font-family: sans-serif;
    }
    .grid-box {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 20px;
    }
    .grid-item {
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: white;
        padding: 15px;
        text-align: center;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .flex-box {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
    }
    .flex-item {
        flex: 1;
        background: linear-gradient(45deg, #ff6b6b, #ee5a24);
        color: white;
        padding: 15px;
        text-align: center;
        border-radius: 8px;
    }
    .anim-box {
        width: 60px;
        height: 60px;
        background: var(--primary);
        margin: 20px auto;
        border-radius: 8px;
        animation: rotate 2s infinite linear;
    }
    @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .hover-btn {
        background: var(--secondary);
        color: white;
        padding: 10px 20px;
        text-align: center;
        border-radius: 8px;
        transition: all 0.3s;
        cursor: pointer;
        width: 120px;
        margin: 0 auto;
    }
    .hover-btn:hover {
        transform: scale(1.1);
        background: var(--primary);
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    .text-grad {
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #667eea);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        margin: 20px 0;
    }
</style>

<div class="css-demo-root">
    <h3 style="text-align:center; color:#667eea;">CSS Grid布局</h3>
    <div class="grid-box">
        <div class="grid-item">1</div>
        <div class="grid-item">2</div>
        <div class="grid-item">3</div>
    </div>

    <h3 style="text-align:center; color:#667eea;">Flexbox布局</h3>
    <div class="flex-box">
        <div class="flex-item">Item A</div>
        <div class="flex-item">Item B</div>
        <div class="flex-item">Item C</div>
    </div>

    <div style="display:flex; justify-content:space-around; align-items:center; margin-top:30px;">
        <div>
            <h4 style="text-align:center">动画</h4>
            <div class="anim-box"></div>
        </div>
        <div>
            <h4 style="text-align:center">交互</h4>
            <div class="hover-btn">悬停我</div>
        </div>
    </div>

    <div class="text-grad">渐变文字效果演示</div>
</div>
```

---

## JavaScript交互演示

```html
<style>
    .js-demo-container {
        font-family: Arial, sans-serif;
        padding: 10px;
    }
    .demo-section {
        background: white;
        padding: 15px;
        margin: 10px 0;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        border: 1px solid #eee;
    }
    button {
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin: 5px;
    }
    button:hover { background: #5a6fd8; }
    input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin: 5px; }
    .highlight { background: yellow; }
    #color-box {
        width: 100%; height: 80px; background: #667eea;
        color: white; display: flex; align-items: center; justify-content: center;
        border-radius: 8px; transition: all 0.3s;
    }
    #todo-list li {
        padding: 8px; margin: 5px 0; background: #f9f9f9;
        display: flex; justify-content: space-between;
    }
</style>

<div class="js-demo-container">
    <div class="demo-section">
        <h3>DOM操作</h3>
        <input type="text" id="text-input" placeholder="输入文本">
        <button onclick="addText()">添加</button>
        <button onclick="document.getElementById('text-output').innerHTML = ''">清空</button>
        <div id="text-output" style="margin-top:10px; min-height:50px; background:#f8f9fa; padding:10px;"></div>
    </div>

    <div class="demo-section">
        <h3>事件处理</h3>
        <div id="color-box" onmouseover="this.style.background='#ff6b6b'" onmouseout="this.style.background='#667eea'">
            悬停改变颜色
        </div>
    </div>

    <div class="demo-section">
        <h3>计数器: <span id="counter" style="color:#667eea; font-weight:bold;">0</span></h3>
        <button onclick="updateCounter(1)">+1</button>
        <button onclick="updateCounter(-1)">-1</button>
    </div>
</div>

<script>
    function addText() {
        const input = document.getElementById('text-input');
        if(input.value) {
            const p = document.createElement('p');
            p.textContent = input.value;
            document.getElementById('text-output').appendChild(p);
            input.value = '';
        }
    }
    
    let count = 0;
    function updateCounter(diff) {
        count += diff;
        document.getElementById('counter').textContent = count;
    }
</script>
```

---

## SVG图形演示

```svg
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg" style="background: #f8f9fa; border-radius: 8px; border: 1px solid #eee;">
    <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
    </defs>

    <!-- 基本形状 -->
    <rect x="50" y="50" width="100" height="100" rx="10" fill="url(#grad1)" filter="url(#shadow)" />
    <circle cx="250" cy="100" r="50" fill="#ff6b6b" stroke="#333" stroke-width="2" />
    
    <!-- 路径 -->
    <path d="M 400 100 Q 450 50 500 100 T 500 150" fill="none" stroke="#4ecdc4" stroke-width="5" stroke-linecap="round" />

    <!-- 动画 -->
    <circle cx="100" cy="250" r="30" fill="#ffd93d">
        <animate attributeName="r" values="30;40;30" dur="2s" repeatCount="indefinite" />
    </circle>

    <rect x="200" y="220" width="60" height="60" fill="#ff6f69">
        <animateTransform attributeName="transform" type="rotate" from="0 230 250" to="360 230 250" dur="3s" repeatCount="indefinite" />
    </rect>

    <!-- 文字 -->
    <text x="300" y="350" text-anchor="middle" font-family="Arial" font-size="24" fill="#333">SVG Graphics Demo</text>
</svg>
```

---

## Canvas动画演示

```html
<div style="text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">
    <canvas id="demoCanvas" width="600" height="400" style="background: white; border: 1px solid #ddd; border-radius: 4px;"></canvas>
    <div style="margin-top: 10px;">
        <button onclick="toggleAnimation()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">开始/暂停</button>
        <button onclick="resetAnimation()" style="padding: 8px 16px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">重置</button>
    </div>
</div>

<script>
    const canvas = document.getElementById('demoCanvas');
    const ctx = canvas.getContext('2d');
    let animationId = null;
    let particles = [];

    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
            this.radius = Math.random() * 5 + 2;
            this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
            if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    function init() {
        particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        animationId = requestAnimationFrame(animate);
    }

    function toggleAnimation() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        } else {
            animate();
        }
    }

    function resetAnimation() {
        if (animationId) cancelAnimationFrame(animationId);
        animationId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        init();
        animate();
    }

    // Start automatically
    init();
    animate();
</script>
```