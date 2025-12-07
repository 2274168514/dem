export class TemplateManager {
  constructor(fileManager, preview) {
    console.log('🏗️ TemplateManager 构造函数被调用');
    this.fileManager = fileManager;
    this.preview = preview;
    this.templates = new Map();

    console.log('📋 参数检查:', {
      fileManager: !!fileManager,
      preview: !!preview,
      templatesCount: this.templates.size
    });

    this.init();
  }

  init() {
    console.log('🚀 开始初始化 TemplateManager');
    this.setupEventListeners();
    this.registerTemplates();
    console.log('✅ TemplateManager 初始化完成');
  }

  setupEventListeners() {
    const templateBtn = document.getElementById('template-btn');
    console.log('🔍 查找模板按钮:', templateBtn);
    if (templateBtn) {
      console.log('✅ 找到模板按钮，绑定点击事件');

      // 直接绑定点击处理函数
      const clickHandler = () => {
        console.log('🎯 模板按钮被点击');
        console.log('🎯 this指向:', this);
        try {
          this.createDataAnalysisTemplate();
        } catch (error) {
          console.error('❌ 执行createDataAnalysisTemplate时出错:', error);
          console.error('❌ 错误堆栈:', error.stack);
        }
      };

      templateBtn.addEventListener('click', clickHandler);

      // 也绑定到window用于测试
      window.testCreateTemplate = () => {
        console.log('🧪 手动测试创建模板');
        this.createDataAnalysisTemplate();
      };

    } else {
      console.error('❌ 找不到模板按钮 #template-btn');
      // 打印所有按钮元素
      const allButtons = document.querySelectorAll('button');
      console.log('🔍 页面中所有按钮:', Array.from(allButtons).map(btn => ({
        id: btn.id,
        className: btn.className,
        text: btn.textContent
      })));
    }
  }

  registerTemplates() {
    // 简化模板系统，只需要chart模板
    this.templates.set('chart', {
      name: '编程语言数据可视化',
      description: '基于 data.json 和 data.csv 的编程语言数据可视化',
      category: '数据分析',
      icon: '📊'
    });
    console.log('📝 模板注册完成，模板数量:', this.templates.size);
  }

  
  /**
   * 创建编程语言数据分析模板
   */
  createDataAnalysisTemplate() {
    console.log('🚀 开始创建编程语言数据分析模板');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>编程语言交互式数据可视化</title>
  <link rel="stylesheet" href="css/chart.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>💻 编程语言交互式数据可视化</h1>
      <p class="subtitle">点击按钮切换不同图表类型，数据来自 Data 文件夹</p>
    </header>

    <nav class="controls">
      <div class="chart-buttons">
        <button onclick="showChart('bar')" class="chart-btn active" data-chart="bar">
          📊 柱状图
        </button>
        <button onclick="showChart('line')" class="chart-btn" data-chart="line">
          📈 折线图
        </button>
        <button onclick="showChart('pie')" class="chart-btn" data-chart="pie">
          🥧 饼图
        </button>
        <button onclick="showChart('doughnut')" class="chart-btn" data-chart="doughnut">
          🍩 环形图
        </button>
        <button onclick="showChart('area')" class="chart-btn" data-chart="area">
          📉 面积图
        </button>
        <button onclick="showChart('radar')" class="chart-btn" data-chart="radar">
          🕸️ 雷达图
        </button>
        <button onclick="showChart('polarArea')" class="chart-btn" data-chart="polarArea">
          🎯 极坐标图
        </button>
        <button onclick="loadData()" class="data-btn">
          🔄 重新加载数据
        </button>
      </div>
    </nav>

    <main class="content">
      <div class="chart-section">
        <div class="chart-container">
          <canvas id="mainChart"></canvas>
        </div>
        <div class="info-panel">
          <h3>📊 数据说明</h3>
          <div id="dataInfo">
            <p><strong>数据来源:</strong> <span id="dataSource">加载中...</span></p>
            <p><strong>数据描述:</strong> <span id="dataDescription">加载中...</span></p>
            <p><strong>语言数量:</strong> <span id="languageCount">0</span> 种</p>
          </div>
        </div>
      </div>

      <div class="data-table-section">
        <h3>📊 编程语言详细数据</h3>
        <div class="table-controls">
          <input type="text" id="searchInput" placeholder="搜索编程语言...">
          <select id="sortSelect">
            <option value="">排序方式</option>
            <option value="popularity">按流行度排序</option>
            <option value="salary">按薪资排序</option>
            <option value="name">按名称排序</option>
          </select>
        </div>
        <div class="table-container">
          <table id="dataTable">
            <thead>
              <tr>
                <th>编程语言</th>
                <th>流行度</th>
                <th>可视化</th>
                <th>平均年薪</th>
                <th>学习难度</th>
                <th>就业机会</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr>
                <td colspan="6">🔄 正在加载数据...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <footer class="footer">
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">语言数量:</span>
          <span id="dataCount" class="stat-value">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">平均薪资:</span>
          <span id="dataSum" class="stat-value">$0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">高薪语言:</span>
          <span id="dataAvg" class="stat-value">0</span>
        </div>
      </div>
    </footer>
  </div>

  <script src="js/chart.js"></script>
</body>
</html>`;

    const js = `/**
 * 编程语言数据分析可视化平台
 * 从 data.json 或 data.csv 加载编程语言数据
 */

let currentChart = null;
let currentData = null;
let currentChartType = 'bar';
const chartColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎨 编程语言数据分析平台加载完成');
  initChart();
  loadData();
});

/**
 * 初始化图表
 */
function initChart() {
  const ctx = document.getElementById('mainChart');
  if (!ctx) return;

  currentChart = new Chart(ctx, {
    type: currentChartType,
    data: { labels: [], datasets: [{ data: [] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '编程语言流行度分析',
          font: { size: 20, weight: 'bold' },
          color: '#2c3e50'
        },
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  });
}

/**
 * 显示不同类型的图表
 */
function showChart(type) {
  if (!currentChart) return;

  // 更新按钮状态
  document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(\`[data-chart="\${type}"]\`).classList.add('active');

  currentChartType = type;

  // 根据图表类型调整选项
  if (type === 'pie' || type === 'doughnut' || type === 'polarArea') {
    currentChart.options.scales = {};
    currentChart.options.plugins.legend.display = true;

    if (type === 'polarArea') {
      currentChart.options.scales = {
        r: {
          beginAtZero: true,
          ticks: { stepSize: 10 }
        }
      };
    }
  } else if (type === 'radar') {
    currentChart.options.scales = {
      r: {
        beginAtZero: true,
        ticks: { stepSize: 10 },
        pointLabels: {
          font: { size: 12 }
        }
      }
    };
  } else {
    currentChart.options.scales = {
      y: {
        beginAtZero: true,
        title: { display: true, text: '流行度 (%)' },
        ticks: { callback: function(value) { return value + '%'; } }
      },
      x: {
        title: { display: true, text: '编程语言' },
        ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 }
      }
    };
    currentChart.options.plugins.legend.display = false;
  }

  // 特殊处理面积图
  if (type === 'area') {
    currentChart.config.type = 'line';
    currentChart.config.data.datasets[0].fill = true;
    currentChart.config.data.datasets[0].backgroundColor = 'rgba(54, 162, 235, 0.2)';
    currentChart.config.data.datasets[0].tension = 0.4;
  } else {
    currentChart.config.type = type;
    currentChart.config.data.datasets[0].fill = false;
    currentChart.config.data.datasets[0].tension = 0;
  }

  currentChart.update();
  console.log(\`✅ 切换到\${type}图表\`);
}

/**
 * 加载数据（优先JSON，备选CSV）
 */
async function loadData() {
  console.log('📊 开始加载编程语言数据');

  // 显示加载状态
  const tableBody = document.getElementById('tableBody');
  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="6">🔄 正在加载数据...</td></tr>';
  }

  try {
    // 首先尝试从父窗口获取数据
    if (window.parent && window.parent.fileManager) {
      console.log('🔍 尝试从父窗口获取JSON数据');
      const jsonData = window.parent.fileManager.getDefaultContent('data/data.json');
      if (jsonData && jsonData.startsWith('{')) {
        const data = JSON.parse(jsonData);
        console.log('✅ 从父窗口获取JSON数据成功:', data);
        processData(data);
        updateDataInfo(data);
        return;
      }
    }
  } catch (error) {
    console.log('⚠️ 从父窗口获取数据失败:', error);
  }

  try {
    // 尝试加载JSON文件（从项目根目录）
    console.log('🔍 尝试加载JSON文件: data/data.json');
    const jsonResponse = await fetch('data/data.json');
    console.log('📡 JSON响应状态:', jsonResponse.status, jsonResponse.statusText);

    if (jsonResponse.ok) {
      const jsonData = await jsonResponse.json();
      console.log('✅ JSON数据加载成功:', jsonData);
      processData(jsonData);
      updateDataInfo(jsonData);
      console.log('✅ JSON数据处理完成');
      return;
    } else {
      console.warn('⚠️ JSON文件响应异常:', jsonResponse.status);
    }
  } catch (error) {
    console.log('⚠️ JSON文件加载失败，尝试CSV文件');
    console.error('❌ JSON加载错误详情:', error);
  }

  try {
    // 尝试从父窗口获取CSV数据
    if (window.parent && window.parent.fileManager) {
      console.log('🔍 尝试从父窗口获取CSV数据');
      const csvData = window.parent.fileManager.getDefaultContent('data/data.csv');
      if (csvData && csvData.includes('编程语言')) {
        const data = parseCSV(csvData);
        console.log('✅ 从父窗口获取CSV数据成功:', data);
        processData(data);
        updateCSVDataInfo(data);
        return;
      }
    }
  } catch (error) {
    console.log('⚠️ 从父窗口获取CSV数据失败:', error);
  }

  try {
    // 尝试加载CSV文件（从项目根目录）
    console.log('🔍 尝试加载CSV文件: data/data.csv');
    const csvResponse = await fetch('data/data.csv');
    console.log('📡 CSV响应状态:', csvResponse.status, csvResponse.statusText);

    if (csvResponse.ok) {
      const csvText = await csvResponse.text();
      console.log('📄 CSV文件内容前100字符:', csvText.substring(0, 100));
      const csvData = parseCSV(csvText);
      console.log('✅ CSV数据解析成功:', csvData);
      processData(csvData);
      updateCSVDataInfo(csvData);
      console.log('✅ CSV数据处理完成');
      return;
    } else {
      console.warn('⚠️ CSV文件响应异常:', csvResponse.status);
    }
  } catch (error) {
    console.log('⚠️ CSV文件加载失败');
    console.error('❌ CSV加载错误详情:', error);
  }

  // 如果都失败，显示提示信息
  console.log('❌ 所有数据加载方式都失败，显示无数据提示');
  showNoDataMessage();
}

/**
 * 更新数据信息面板（JSON数据）
 */
function updateDataInfo(data) {
  // 安全地更新DOM元素
  const dataSource = document.getElementById('dataSource');
  const dataDescription = document.getElementById('dataDescription');
  const languageCount = document.getElementById('languageCount');

  if (dataSource) {
    dataSource.textContent = data.title || 'JSON数据文件';
  }
  if (dataDescription) {
    dataDescription.textContent = data.description || '编程语言流行度数据分析';
  }
  if (languageCount) {
    languageCount.textContent = data.labels ? data.labels.length : '0';
  }
}

/**
 * 更新数据信息面板（CSV数据）
 */
function updateCSVDataInfo(data) {
  // 安全地更新DOM元素
  const dataSource = document.getElementById('dataSource');
  const dataDescription = document.getElementById('dataDescription');
  const languageCount = document.getElementById('languageCount');

  if (dataSource) {
    dataSource.textContent = 'CSV数据文件';
  }
  if (dataDescription) {
    dataDescription.textContent = '编程语言流行度、薪资及难度数据';
  }
  if (languageCount) {
    languageCount.textContent = data.length || '0';
  }
}

/**
 * 处理数据并更新图表
 */
function processData(data) {
  if (!data) {
    showNoDataMessage();
    return;
  }

  currentData = data;

  // 处理JSON格式的编程语言数据
  if (data.labels && data.values) {
    updateLanguageChart(data);
    updateLanguageTable(data);
    updateStats(data.values);
    updateInfoPanel(data);
  }
  // 处理CSV格式的数据
  else if (Array.isArray(data) && data.length > 0) {
    updateCSVChart(data);
    updateCSVTable(data);
    updateCSVStats(data);
  }

  currentChart.update();
}

/**
 * 更新编程语言图表（JSON数据）
 */
function updateLanguageChart(data) {
  currentChart.data.labels = data.labels;
  currentChart.data.datasets[0] = {
    label: data.title || '编程语言流行度 (%)',
    data: data.values,
    backgroundColor: chartColors.slice(0, data.labels.length),
    borderColor: chartColors.slice(0, data.labels.length).map(color => color.replace('0.8', '1')),
    borderWidth: 2,
    hoverBorderWidth: 3
  };

  currentChart.options.plugins.title.text = data.title || '编程语言流行度分析';
}

/**
 * 更新编程语言数据表格（JSON数据）
 */
function updateLanguageTable(data) {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  const total = data.values.reduce((sum, val) => sum + val, 0);

  data.labels.forEach((label, index) => {
    const value = data.values[index];
    const percentage = ((value / data.values.length) * 100).toFixed(1);

    const row = tableBody.insertRow();
    row.innerHTML = '<td><strong>' + label + '</strong></td>' +
                   '<td>' + value.toFixed(1) + '%</td>' +
                   '<td>' +
                   '  <div class="progress-bar">' +
                   '    <div class="progress-fill" style="width: ' + value + '%"></div>' +
                   '  </div>' +
                   '</td>';
  });
}

/**
 * 解析CSV文件
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    data.push(row);
  }

  return data;
}

/**
 * 更新CSV数据图表
 */
function updateCSVChart(data) {
  const languages = data.map(row => row['编程语言']);
  const popularity = data.map(row => parseFloat(row['流行度百分比']) || 0);

  currentChart.data.labels = languages;
  currentChart.data.datasets[0] = {
    label: '流行度 (%)',
    data: popularity,
    backgroundColor: chartColors.slice(0, languages.length),
    borderColor: chartColors.slice(0, languages.length),
    borderWidth: 2
  };

  currentChart.options.plugins.title.text = '编程语言流行度分析 (CSV数据)';
}

/**
 * 更新CSV数据表格
 */
function updateCSVTable(data) {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  data.forEach(row => {
    const tr = tableBody.insertRow();
    const language = row['编程语言'] || '';
    const popularity = row['流行度百分比'] || '';
    const salary = row['平均年薪(美元)'] || '';
    const difficulty = row['学习难度'] || '';
    const opportunity = row['就业机会'] || '';

    tr.innerHTML = '<td><strong>' + language + '</strong></td>' +
                   '<td>' + popularity + '%</td>' +
                   '<td>$' + parseInt(salary).toLocaleString() + '</td>' +
                   '<td><span class="difficulty-' + difficulty.toLowerCase() + '">' + difficulty + '</span></td>' +
                   '<td><span class="opportunity-' + opportunity.toLowerCase() + '">' + opportunity + '</span></td>';
  });
}

/**
 * 更新统计信息（JSON数据）
 */
function updateStats(values) {
  if (!values || values.length === 0) {
    document.getElementById('dataCount').textContent = '0';
    document.getElementById('dataSum').textContent = '0';
    document.getElementById('dataAvg').textContent = '0';
    return;
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;

  document.getElementById('dataCount').textContent = values.length;
  document.getElementById('dataSum').textContent = sum.toFixed(1) + '%';
  document.getElementById('dataAvg').textContent = avg.toFixed(1) + '%';
}

/**
 * 更新统计信息（CSV数据）
 */
function updateCSVStats(data) {
  if (!data || data.length === 0) return;

  const avgSalary = data.reduce((sum, row) => sum + parseInt(row['平均年薪(美元)']) || 0, 0) / data.length;
  const highSalaryJobs = data.filter(row => parseInt(row['平均年薪(美元)']) > 75000).length;

  document.getElementById('dataCount').textContent = data.length;
  document.getElementById('dataSum').textContent = '$' + Math.round(avgSalary).toLocaleString();
  document.getElementById('dataAvg').textContent = highSalaryJobs + ' 个高薪语言';
}

/**
 * 更新信息面板
 */
function updateInfoPanel(data) {
  const infoPanel = document.querySelector('.info-panel');
  if (!infoPanel || !data.description) return;

  infoPanel.innerHTML = \`
    <h3>📊 数据说明</h3>
    <p><strong>数据源:</strong> \${data.title}</p>
    <p><strong>描述:</strong> \${data.description}</p>
    <div class="language-categories">
      <h4>🏷️ 语言分类:</h4>
      \${Object.entries(data.categories || {}).map(([category, langs]) =>
        \`<div class="category-tag">\${category}: \${langs.join(', ')}</div>\`
      ).join('')}
    </div>
  \`;
}

/**
 * 显示无数据提示
 */
function showNoDataMessage() {
  const tableBody = document.getElementById('tableBody');
  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="5">暂无数据，请确保 data.json 或 data.csv 文件存在</td></tr>';
  }

  if (currentChart) {
    currentChart.data.labels = ['无数据'];
    currentChart.data.datasets[0] = {
      label: '数据集',
      data: [1],
      backgroundColor: chartColors[0]
    };
    currentChart.update();
  }

  document.getElementById('dataCount').textContent = '0';
  document.getElementById('dataSum').textContent = '0';
  document.getElementById('dataAvg').textContent = '0';
}

/**
 * 搜索功能
 */
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const rows = document.querySelectorAll('#tableBody tr');

      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
      });
    });
  }
});

// 全局暴露
window.showChart = showChart;
window.loadData = loadData;

console.log('🎉 编程语言数据分析平台初始化完成');`;

    // 创建模板文件（只生成HTML、CSS、JS文件）
    console.log('📝 调用createTemplateFiles方法');
    this.createTemplateFiles('chart', html, js);

    console.log('📁 已创建编程语言数据可视化模板，文件前缀为chart');
  }

  /**
   * 转义HTML字符防止XSS攻击
   * @param {string} text - 需要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    try {
      if (text === null || text === undefined) {
        return '';
      }
      if (typeof text !== 'string') {
        text = String(text);
      }
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    } catch (error) {
      console.error('❌ HTML转义失败:', error);
      return '';
    }
  }

  /**
   * 创建模板文件
   * @param {string} templateKey - 模板键名
   * @param {string} html - HTML内容
   * @param {string} js - JavaScript内容
   */
  createTemplateFiles(templateKey, html, js) {
    console.log('📋 createTemplateFiles 被调用，参数:', templateKey);
    try {
      const template = this.templates.get(templateKey);
      const templateName = template?.name || 'Template';

      console.log('🏷️ 模板信息:', templateName);

      // 使用chart前缀生成文件名
      const baseName = 'chart'; // 固定使用chart前缀

      const htmlPath = `html/${baseName}.html`;
      const jsPath = `js/${baseName}.js`;
      const cssPath = `css/${baseName}.css`;

      console.log('📂 文件路径:', { htmlPath, jsPath, cssPath });

      // 生成CSS样式
      const css = this.generateTemplateCSS(templateKey);
      console.log('🎨 CSS生成完成，长度:', css.length);

      // 修正HTML中的CSS和JS引用路径
      console.log('📝 开始修正HTML路径');
      console.log('🔍 原始HTML片段:', html.substring(0, 200) + '...');
      console.log('📂 目标CSS路径:', cssPath);
      console.log('📂 目标JS路径:', jsPath);

      const fixedHtml = this.fixHtmlReferences(html, cssPath, jsPath);
      console.log('🔧 HTML路径修正完成');
      console.log('📝 修正后HTML片段:', fixedHtml.substring(0, 200) + '...');

      // 添加所有文件
      console.log('💾 开始添加文件到fileManager');
      this.fileManager.addFile(htmlPath, fixedHtml);
      this.fileManager.addFile(jsPath, js);
      this.fileManager.addFile(cssPath, css);
      console.log('✅ 文件已添加到fileManager');
      console.log('📄 生成的HTML内容预览:');
      console.log(fixedHtml.match(/<link[^>]*>/)?.[0] || '未找到CSS链接');
      console.log(fixedHtml.match(/<script[^>]*chart\.js[^>]*>/)?.[0] || '未找到JS链接');

      setTimeout(() => {
        console.log('⏰ 开始添加文件到文件树');
        this.addToFileTree(htmlPath);
        this.addToFileTree(jsPath);
        this.addToFileTree(cssPath);
        this.fileManager.selectFile(htmlPath);
        console.log(`✅ 模板已创建: ${templateName}`);
        console.log(`📁 创建文件: ${htmlPath}, ${jsPath}, ${cssPath}`);
      }, 100);
    } catch (error) {
      console.error('❌ 创建模板文件失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
    }
  }

  /**
   * 修正HTML文件中的CSS和JS引用路径
   * @param {string} html - 原始HTML内容
   * @param {string} cssPath - CSS文件路径
   * @param {string} jsPath - JS文件路径
   * @returns {string} 修正后的HTML内容
   */
  fixHtmlReferences(html, cssPath, jsPath) {
    // HTML模板中已经使用了正确的项目根目录相对路径
    // 直接返回，不做任何修改
    console.log('🔧 HTML使用项目根目录路径，无需修正');
    console.log('📂 CSS路径: css/chart.css');
    console.log('📂 JS路径: js/chart.js');
    return html;
  }

  /**
   * 获取相对于HTML文件的路径
   * @param {string} targetPath - 目标文件路径
   * @returns {string} 相对路径
   */
  getRelativePath(targetPath) {
    try {
      if (!targetPath) return '';

      const parts = targetPath.split('/');
      if (parts.length !== 2) {
        // 如果不是标准的folder/file格式，直接返回文件名
        return parts[parts.length - 1];
      }

      const [folder, fileName] = parts;

      // 根据目标文件夹确定相对路径
      switch (folder) {
        case 'css':
          return `../css/${fileName}`;
        case 'js':
          return `../js/${fileName}`;
        case 'html':
          return fileName; // 同级目录
        case 'data':
          return `../data/${fileName}`;
        default:
          return fileName;
      }
    } catch (error) {
      console.error('❌ 计算相对路径失败:', error);
      return targetPath;
    }
  }

  /**
   * 生成模板CSS样式
   * @param {string} templateKey - 模板键名
   * @returns {string} CSS内容
   */
  generateTemplateCSS(templateKey) {
    // 简化系统，只支持chart模板
    if (templateKey === 'chart') {
      return this.generateDataAnalysisCSS();
    }
    return '';
  }

  /**
   * 生成数据分析模板的CSS样式
   * @returns {string} CSS内容
   */
  generateDataAnalysisCSS() {
    return `
/* 编程语言数据分析平台样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
  color: #2c3e50;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 10px;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  backdrop-filter: blur(20px);
}

/* 头部样式 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
  opacity: 0.3;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 0.5rem;
  letter-spacing: 2px;
  position: relative;
  z-index: 1;
}

.subtitle {
  font-size: 1rem;
  opacity: 0.9;
  font-weight: 300;
  position: relative;
  z-index: 1;
}

/* 控制面板 */
.controls {
  background: #f8f9fa;
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.chart-buttons, .data-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 1rem;
}

.chart-buttons {
  justify-content: center;
}

.data-buttons {
  justify-content: center;
  margin-bottom: 0;
}

.chart-btn, .data-btn {
  background: white;
  color: #495057;
  border: 2px solid #dee2e6;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.chart-btn:hover, .data-btn:hover {
  border-color: #667eea;
  color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.2);
}

.chart-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

.chart-btn.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%);
  animation: shine 2s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.data-btn.danger {
  border-color: #dc3545;
  color: #dc3545;
}

.data-btn.danger:hover {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

/* 主要内容区域 */
.content {
  padding: 2rem;
}

.chart-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.analysis-panel {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.analysis-panel h3 {
  color: #495057;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.analysis-grid {
  display: grid;
  gap: 1.5rem;
}

.analysis-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #667eea;
}

.analysis-item h4 {
  color: #495057;
  margin-bottom: 0.8rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.analysis-item p {
  color: #6c757d;
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
}

.analysis-item strong {
  color: #495057;
  font-weight: 600;
}

/* 数据表格部分 */
.data-table-section {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.data-table-section h3 {
  color: #495057;
  margin-bottom: 1.5rem;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.table-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

#searchInput {
  flex: 1;
  min-width: 200px;
  padding: 12px 20px;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  font-size: 14px;
  transition: all 0.3s ease;
}

#searchInput:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

#sortSelect {
  padding: 12px 20px;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

#sortSelect:focus {
  outline: none;
  border-color: #667eea;
}

.table-container {
  overflow-x: auto;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th, td {
  padding: 15px;
  text-align: left;
  border-bottom: 1px solid #f1f3f4;
}

th {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 1px;
  position: sticky;
  top: 0;
  z-index: 10;
}

tr:hover {
  background: #f8f9fa;
}

tr:last-child td {
  border-bottom: none;
}

/* 页脚统计 */
.footer {
  background: #f8f9fa;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e9ecef;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .chart-section {
    grid-template-columns: 1fr;
  }

  .analysis-panel {
    order: 2;
  }
}

@media (max-width: 768px) {
  .container {
    border-radius: 15px;
  }

  .header {
    padding: 1.5rem;
  }

  .header h1 {
    font-size: 2rem;
  }

  .content {
    padding: 1rem;
  }

  .chart-buttons, .data-buttons {
    justify-content: center;
  }

  .chart-btn, .data-btn {
    font-size: 12px;
    padding: 8px 16px;
  }

  .stats {
    gap: 1.5rem;
  }

  .stat-value {
    font-size: 1.2rem;
  }

  .table-controls {
    flex-direction: column;
  }

  #searchInput {
    width: 100%;
  }
}

/* 动画效果 */
.chart-container, .analysis-panel, .data-table-section {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 编程语言特定样式 */
.progress-bar {
  width: 100px;
  height: 20px;
  background-color: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  transition: width 0.3s ease;
  min-width: 2px;
}

.difficulty-简单 {
  background-color: #28a745;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.difficulty-中等 {
  background-color: #ffc107;
  color: #212529;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.difficulty-困难 {
  background-color: #dc3545;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.opportunity-高 {
  background-color: #28a745;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.opportunity-中等 {
  background-color: #ffc107;
  color: #212529;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.opportunity-低 {
  background-color: #6c757d;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.language-categories {
  margin-top: 15px;
}

.category-tag {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 0 6px 6px 0;
  font-size: 0.9rem;
  color: #495057;
}

/* 增强的表格样式 */
.table-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

#sortSelect {
  padding: 12px 20px;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;
}

#sortSelect:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Canvas 响应式 */
canvas {
  max-width: 100%;
  height: auto !important;
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

/* 编程语言主题色彩 */
.chart-container::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #667eea, #764ba2, #667eea);
  border-radius: 17px;
  opacity: 0.1;
  z-index: -1;
}

.chart-container {
  position: relative;
  z-index: 1;
}
`;
  }

  /**
   * 将文件添加到文件树显示
   * @param {string} filePath - 文件路径
   */
  addToFileTree(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        console.warn('⚠️ 无效的文件路径:', filePath);
        return;
      }

      const [folderPath, fileName] = filePath.split('/');
      if (!folderPath || !fileName) {
        console.warn('⚠️ 文件路径格式错误:', filePath);
        return;
      }

      const fileTree = document.getElementById('file-tree');
      if (!fileTree) {
        console.warn('⚠️ 找不到文件树元素');
        return;
      }

      const folder = fileTree.querySelector(`[data-path="${folderPath}"]`);
      if (!folder) {
        console.warn('⚠️ 找不到文件夹:', folderPath);
        return;
      }

      const contents = folder.querySelector('.folder-contents');
      if (!contents) {
        console.warn('⚠️ 文件夹内容容器不存在');
        return;
      }

      // 检查文件是否已存在
      const existingFile = contents.querySelector(`[data-path="${filePath}"]`);
      if (existingFile) {
        console.log(`⚠️ 文件已存在，跳过添加: ${fileName}`);
        return;
      }

      // 展开文件夹
      folder.classList.add('open');
      const arrow = folder.querySelector('.folder-arrow');
      if (arrow) arrow.textContent = '▼';
      contents.style.display = 'block';

      // 创建文件元素
      const fileElement = this.createFileElement(filePath, fileName);
      if (fileElement) {
        contents.appendChild(fileElement);
        console.log(`✅ 文件已添加到文件树: ${fileName}`);
      }
    } catch (error) {
      console.error('❌ 添加文件到文件树失败:', error);
    }
  }

  /**
   * 创建文件元素
   * @param {string} filePath - 文件路径
   * @param {string} fileName - 文件名
   * @returns {HTMLElement} 文件元素
   */
  createFileElement(filePath, fileName) {
    try {
      if (!filePath || !fileName) {
        console.warn('⚠️ 文件路径或文件名为空');
        return null;
      }

      const li = document.createElement('li');
      li.className = 'file';
      li.dataset.path = filePath;

      const icon = this.getFileIcon(fileName);
      li.innerHTML = `
        <span class="file-icon">${icon}</span>
        <span class="file-name">${this.escapeHtml(fileName)}</span>
      `;

      return li;
    } catch (error) {
      console.error('❌ 创建文件元素失败:', error);
      return null;
    }
  }

  /**
   * 根据文件名获取文件图标
   * @param {string} fileName - 文件名
   * @returns {string} 文件图标emoji
   */
  getFileIcon(fileName) {
    try {
      if (!fileName || typeof fileName !== 'string') {
        return '📄';
      }

      const parts = fileName.split('.');
      if (parts.length < 2) {
        return '📄';
      }

      const ext = parts.pop().toLowerCase();
      const icons = {
        'html': '📄', 'htm': '📄',
        'css': '🎨', 'scss': '🎨', 'less': '🎨',
        'js': '⚡', 'jsx': '⚡', 'ts': '⚡', 'tsx': '⚡',
        'json': '📊', 'csv': '📊', 'xml': '📊',
        'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
        'pdf': '📑', 'doc': '📝', 'docx': '📝', 'txt': '📝',
        'zip': '📦', 'rar': '📦', 'tar': '📦', 'gz': '📦'
      };
      return icons[ext] || '📄';
    } catch (error) {
      console.error('❌ 获取文件图标失败:', error);
      return '📄';
    }
  }
}