/**
 * JavaScript 可视化模块
 * 支持 D3.js 和 Recharts 的动态图表渲染
 */

class JsVisualizer {
    constructor() {
        this.d3 = null;
        this.recharts = null;
        this.react = null;
        this.reactDOM = null;
        this.sandbox = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        // 加载必要的库
        await this.loadLibraries();
        this.createSandbox();
        this.isInitialized = true;
    }

    async loadLibraries() {
        // 加载 D3.js
        if (!window.d3) {
            await this.loadScript('https://d3js.org/d3.v7.min.js');
        }
        this.d3 = window.d3;

        // 加载 React 和 Recharts (动态加载)
        if (!window.React) {
            await this.loadScript('https://unpkg.com/react@18/umd/react.production.min.js');
            await this.loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');
            await this.loadScript('https://unpkg.com/recharts@2.8.0/umd/Recharts.js');
        }
        this.react = window.React;
        this.reactDOM = window.ReactDOM;
        this.recharts = window.Recharts;
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

    createSandbox() {
        // 创建沙箱 iframe
        this.sandbox = document.createElement('iframe');
        this.sandbox.style.display = 'none';
        this.sandbox.id = 'js-viz-sandbox';
        document.body.appendChild(this.sandbox);

        // 初始化沙箱环境
        const sandboxDoc = this.sandbox.contentDocument || this.sandbox.contentWindow.document;
        sandboxDoc.open();
        sandboxDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                    #d3-container, #recharts-container {
                        width: 100%;
                        height: 400px;
                        border: 1px solid #ddd;
                        margin: 10px 0;
                    }
                    .error {
                        color: red;
                        padding: 10px;
                        background: #ffebee;
                        border-radius: 4px;
                    }
                </style>
                <script src="https://d3js.org/d3.v7.min.js"><\/script>
                <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
                <script src="https://unpkg.com/recharts@2.8.0/umd/Recharts.js"><\/script>
            </head>
            <body>
                <div id="root"></div>
                <div id="d3-container"></div>
                <div id="recharts-container"></div>
                <script>
                    window.d3 = d3;
                    window.React = React;
                    window.ReactDOM = ReactDOM;
                    window.Recharts = Recharts;
                <\/script>
            </body>
            </html>
        `);
        sandboxDoc.close();
    }

    runCode(button) {
        if (!this.isInitialized) {
            alert('可视化组件正在初始化，请稍后再试...');
            return;
        }

        const container = button.closest('.js-viz-container');
        const codeElement = container.querySelector('code');
        const outputElement = container.querySelector('.js-viz-output');

        if (!codeElement || !outputElement) return;

        const code = codeElement.textContent;
        const runButton = container.querySelector('.btn-run-viz');

        // 显示加载状态
        runButton.innerHTML = '<i class="icon-loader animate-spin"></i> 运行中...';
        runButton.disabled = true;
        outputElement.innerHTML = '<div class="loading">正在执行代码...</div>';

        // 清理之前的输出
        this.clearOutput(outputElement);

        // 在沙箱中执行代码
        try {
            const result = this.executeInSandbox(code);

            if (result && result.type === 'd3') {
                this.renderD3Visualization(result.config, outputElement);
            } else if (result && result.type === 'recharts') {
                this.renderRechartsVisualization(result.component, outputElement);
            } else {
                // 尝试自动检测和执行
                this.executeAndRender(code, outputElement);
            }
        } catch (error) {
            outputElement.innerHTML = `
                <div class="error">
                    <strong>执行错误:</strong>
                    <pre>${this.escapeHtml(error.toString())}</pre>
                </div>
            `;
        } finally {
            runButton.innerHTML = '<i class="icon-play"></i> 运行';
            runButton.disabled = false;
        }
    }

    executeInSandbox(code) {
        const sandboxWindow = this.sandbox.contentWindow;

        // 创建一个安全的执行环境
        const wrappedCode = `
            (function() {
                const d3 = window.d3;
                const React = window.React;
                const ReactDOM = window.ReactDOM;
                const Recharts = window.Recharts;

                try {
                    ${code}

                    // 尝试检测返回的配置
                    if (typeof d3Config !== 'undefined') {
                        return { type: 'd3', config: d3Config };
                    }
                    if (typeof rechartsComponent !== 'undefined') {
                        return { type: 'recharts', component: rechartsComponent };
                    }
                } catch (e) {
                    return { error: e.message };
                }
            })()
        `;

        const func = new sandboxWindow.Function(wrappedCode);
        return func();
    }

    executeAndRender(code, outputElement) {
        const sandboxWindow = this.sandbox.contentWindow;

        // 检查是否包含 D3 代码
        if (code.includes('d3.') || code.includes('select') || code.includes('append')) {
            // 创建一个临时的 D3 可视化
            const tempDiv = document.createElement('div');
            tempDiv.style.width = '100%';
            tempDiv.style.height = '400px';
            tempDiv.style.border = '1px solid #ddd';
            tempDiv.style.overflow = 'auto';

            outputElement.appendChild(tempDiv);

            // 在沙箱中执行 D3 代码
            const d3Code = `
                (function() {
                    const container = document.createElement('div');
                    container.style.width = '100%';
                    container.style.height = '400px';
                    document.getElementById('d3-container').appendChild(container);

                    try {
                        ${code}
                    } catch (e) {
                        document.getElementById('d3-container').innerHTML = '<div class="error">D3 执行错误: ' + e.message + '</div>';
                    }
                })()
            `;

            const d3Func = new sandboxWindow.Function(d3Code);
            d3Func();

            // 复制沙箱内容到输出
            const sandboxContainer = sandboxWindow.document.getElementById('d3-container');
            if (sandboxContainer && sandboxContainer.firstChild) {
                tempDiv.innerHTML = sandboxContainer.firstChild.innerHTML || '';
            }
        }

        // 检查是否包含 Recharts 代码
        if (code.includes('Recharts') || code.includes('<BarChart') || code.includes('<LineChart')) {
            this.renderRechartsFromCode(code, outputElement);
        }
    }

    renderD3Visualization(config, outputElement) {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = config.height || '400px';
        container.style.border = '1px solid #ddd';
        container.style.overflow = 'auto';

        outputElement.appendChild(container);

        // 使用 D3 渲染
        if (config.type === 'bar') {
            this.renderD3BarChart(container, config);
        } else if (config.type === 'line') {
            this.renderD3LineChart(container, config);
        } else if (config.type === 'pie') {
            this.renderD3PieChart(container, config);
        } else {
            // 通用 D3 渲染
            const svg = this.d3.select(container)
                .append('svg')
                .attr('width', container.clientWidth)
                .attr('height', container.clientHeight || 400);

            if (config.render) {
                config.render(svg);
            }
        }
    }

    renderD3BarChart(container, config) {
        const data = config.data || [];
        const width = container.clientWidth || 800;
        const height = config.height || 400;
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = this.d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = this.d3.scaleBand()
            .rangeRound([0, innerWidth])
            .padding(0.1)
            .domain(data.map(d => d.label || d.name || d.x));

        const y = this.d3.scaleLinear()
            .rangeRound([innerHeight, 0])
            .domain([0, this.d3.max(data, d => d.value || d.y || 0)]);

        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(this.d3.axisBottom(x));

        g.append('g')
            .call(this.d3.axisLeft(y));

        g.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.label || d.name || d.x))
            .attr('y', d => y(d.value || d.y))
            .attr('width', x.bandwidth())
            .attr('height', d => innerHeight - y(d.value || d.y))
            .attr('fill', config.color || '#4f46e5');
    }

    renderD3LineChart(container, config) {
        const data = config.data || [];
        const width = container.clientWidth || 800;
        const height = config.height || 400;
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = this.d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = this.d3.scaleLinear()
            .rangeRound([0, innerWidth])
            .domain(this.d3.extent(data, d => d.x || 0));

        const y = this.d3.scaleLinear()
            .rangeRound([innerHeight, 0])
            .domain(this.d3.extent(data, d => d.y || 0));

        const line = this.d3.line()
            .x(d => x(d.x))
            .y(d => y(d.y));

        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(this.d3.axisBottom(x));

        g.append('g')
            .call(this.d3.axisLeft(y));

        g.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', config.color || '#4f46e5')
            .attr('stroke-width', 2)
            .attr('d', line);

        g.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 4)
            .attr('fill', config.color || '#4f46e5');
    }

    renderD3PieChart(container, config) {
        const data = config.data || [];
        const width = container.clientWidth || 800;
        const height = config.height || 400;
        const radius = Math.min(width, height) / 2;

        const svg = this.d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        const color = this.d3.scaleOrdinal(
            data.map((d, i) => this.d3.schemeCategory10[i % 10])
        );

        const pie = this.d3.pie()
            .value(d => d.value || d.y);

        const arc = this.d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        const arcs = svg.selectAll('.arc')
            .data(pie(data))
            .enter().append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', (d, i) => color(i));

        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .text(d => d.data.label || d.data.name);
    }

    renderRechartsVisualization(component, outputElement) {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '400px';
        outputElement.appendChild(container);

        try {
            const element = this.react.createElement(component);
            this.reactDOM.render(element, container);
        } catch (error) {
            outputElement.innerHTML = `
                <div class="error">
                    <strong>Recharts 渲染错误:</strong>
                    <pre>${this.escapeHtml(error.toString())}</pre>
                </div>
            `;
        }
    }

    renderRechartsFromCode(code, outputElement) {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '400px';
        outputElement.appendChild(container);

        try {
            // 创建一个包含 Recharts 代码的函数
            const renderFunc = new Function('React', 'Recharts', `
                ${code}
                return Component;
            `);

            const Component = renderFunc(this.react, this.recharts);

            if (Component) {
                const element = this.react.createElement(Component);
                this.reactDOM.render(element, container);
            }
        } catch (error) {
            outputElement.innerHTML = `
                <div class="error">
                    <strong>Recharts 代码执行错误:</strong>
                    <pre>${this.escapeHtml(error.toString())}</pre>
                </div>
            `;
        }
    }

    resetCode(button) {
        const container = button.closest('.js-viz-container');
        const outputElement = container.querySelector('.js-viz-output');

        if (outputElement) {
            this.clearOutput(outputElement);
            outputElement.innerHTML = '<div class="placeholder">点击运行按钮执行代码</div>';
        }
    }

    clearOutput(outputElement) {
        while (outputElement.firstChild) {
            outputElement.removeChild(outputElement.firstChild);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 提供一些预设的可视化模板
    getPresetTemplates() {
        return {
            d3BarChart: `// D3.js 柱状图示例
const data = [
    { label: 'A', value: 30 },
    { label: 'B', value: 80 },
    { label: 'C', value: 45 },
    { label: 'D', value: 60 },
    { label: 'E', value: 20 }
];

const d3Config = {
    type: 'bar',
    data: data,
    color: '#4f46e5',
    height: 400
};`,

            d3LineChart: `// D3.js 折线图示例
const data = [
    { x: 0, y: 20 },
    { x: 1, y: 35 },
    { x: 2, y: 45 },
    { x: 3, y: 25 },
    { x: 4, y: 60 },
    { x: 5, y: 40 }
];

const d3Config = {
    type: 'line',
    data: data,
    color: '#10b981',
    height: 400
};`,

            rechartsBarChart: `// Recharts 柱状图示例
const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = Recharts;

const data = [
    { name: 'A', value: 4000 },
    { name: 'B', value: 3000 },
    { name: 'C', value: 2000 },
    { name: 'D', value: 2780 },
    { name: 'E', value: 1890 }
];

const rechartsComponent = () => (
    <BarChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill="#8884d8" />
    </BarChart>
);`
        };
    }

    // 销毁实例
    destroy() {
        if (this.sandbox) {
            document.body.removeChild(this.sandbox);
            this.sandbox = null;
        }
        this.d3 = null;
        this.recharts = null;
        this.react = null;
        this.reactDOM = null;
        this.isInitialized = false;
    }
}

// 导出模块
window.JsVisualizer = JsVisualizer;