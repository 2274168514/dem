/**
 * 简化的主文件
 */

import { RUN_DEBOUNCE_MS } from './config.js';
import { getFiles, updateFile, getSettings, updateSettings } from './storage.js';
import { initEditors } from './editor.js';
import { setupPreview } from './preview.js';
import ConsoleManager from './consoleManager.js';
import { FileManager } from './fileManager.js';
import { TabManager } from './tabManager.js';
import { ConsoleToggle } from './consoleToggle.js';
import { Resizer } from './resizer.js';
import { FileOperations } from './fileOperations.js';
import { TemplateManager } from './templateManager.js';
import { ExportManager } from './exportManager.js';
import { AIAssistant } from './aiAssistant.js';
import { ThemeManager } from './themeManager.js';
import { DefaultFilesLoader } from './defaultFilesLoader.js';
import { CodeRepositoryManager } from './codeRepository.js';
import './fullscreen.js';
import './codeFormatter.js';

// 语言管理器（如果还未初始化的话）
let languageManager = window.languageManager;

console.log('🎯 main.js 文件已加载！');

const statusText = document.getElementById('status-text');
const indicator = document.getElementById('compile-indicator');
const autoRunToggle = document.getElementById('auto-run');
const runButton = document.getElementById('run-btn');
const previewFrame = document.getElementById('preview');

// 初始化组件
const consoleManager = ConsoleManager.init();
const preview = setupPreview({
  frame: previewFrame,
  onConsoleMessage: handleConsoleMessage
});

let fileManager = null;
let tabManager = null;
let editors = null;
let compileTimer = null;

/**
 * 初始化应用
 */
function initializeApp() {
  console.log('🚀 应用初始化开始...');

  try {
    // 检查是否有作业上下文
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('assignment');
    const studentId = urlParams.get('student');
    const assignmentContext = localStorage.getItem('current-assignment-context');
    const mode = urlParams.get('mode') || (studentId ? 'review' : 'edit');

    // 强制清理所有作业相关的数据（用于调试代码库案例）
    // console.log('🧹 清理作业相关数据...');
    // localStorage.removeItem('current-assignment-context');
    // localStorage.removeItem('assignment-data');
    // localStorage.removeItem('assignment-submission');
    // sessionStorage.clear();

    // 恢复作业模式检测
    if (assignmentId || assignmentContext) {
      console.log('📝 检测到作业上下文，初始化作业模式...');
      console.log('🔍 assignmentId:', assignmentId);
      console.log('🔍 studentId:', studentId);
      console.log('🔍 assignmentContext:', assignmentContext);
      console.log('🔍 mode:', mode);
      initializeAssignmentMode(assignmentId, assignmentContext, { studentId, mode });
    } else {
      console.log('🎯 正常模式，继续标准初始化...');
    }

    // 检查必要的全局对象
    if (typeof window === 'undefined') {
      throw new Error('window对象不存在');
    }

    if (!window.CodeMirror) {
      console.error('CodeMirror not loaded yet, retrying...');
      setTimeout(initializeApp, 100);
      return;
    }

    // 检查必要的DOM元素
    const requiredElements = ['html-code', 'css-code', 'js-code', 'preview', 'status-text'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));

    if (missingElements.length > 0) {
      console.error('缺少必要的DOM元素:', missingElements);
      setStatus('DOM元素缺失', 'error');
      return;
    }

    // 初始化编辑器
    let filesFromStorage = {};
    try {
      filesFromStorage = getFiles();
    } catch (error) {
      console.warn('获取存储文件失败，使用默认文件:', error);
      filesFromStorage = {};
    }

    try {
      editors = initEditors({
        initialFiles: filesFromStorage,
        onChange: handleEditorChange
      });

      if (!editors) {
        throw new Error('编辑器初始化失败');
      }
    } catch (error) {
      console.error('❌ 编辑器初始化失败:', error);
      setStatus('编辑器初始化失败', 'error');
      return;
    }

    // 初始化Tab管理器
    try {
      tabManager = new TabManager();
      if (!tabManager) {
        throw new Error('Tab管理器初始化失败');
      }

      tabManager.onTabChange = (filePath) => {
        try {
          console.log('🔄 Tab切换到:', filePath);

          if (!filePath || typeof filePath !== 'string') {
            console.warn('⚠️ 无效的文件路径:', filePath);
            return;
          }

          const fileType = tabManager.getFileType(filePath);
          if (!fileType) {
            console.warn('⚠️ 无法确定文件类型:', filePath);
            return;
          }

          // 切换编辑器面板
          document.querySelectorAll('.pane.code-pane').forEach(pane => {
            pane.classList.remove('is-active');
          });
          const targetPane = document.querySelector(`.pane.code-pane[data-file="${fileType}"]`);
          if (targetPane) {
            targetPane.classList.add('is-active');
          }

          // 更新文件名
          const paneHeader = targetPane?.querySelector('.pane-filename');
          if (paneHeader) {
            const fileName = filePath.split('/').pop();
            paneHeader.textContent = fileName;
          }
        } catch (error) {
          console.error('❌ Tab切换处理失败:', error);
        }
      };
    } catch (error) {
      console.error('❌ Tab管理器初始化失败:', error);
    }

    // 初始化文件管理器
    try {
      fileManager = new FileManager(editors, { updateFile }, preview);
      if (!fileManager) {
        throw new Error('文件管理器初始化失败');
      }

      // 调用init方法来初始化文件树和事件监听器
      fileManager.init();
      fileManager.setTabManager(tabManager);
    } catch (error) {
      console.error('❌ 文件管理器初始化失败:', error);
      setStatus('文件管理器初始化失败', 'error');
      return;
    }

    // 暴露到全局（用于调试和扩展）
    window.fileManager = fileManager;
    window.tabManager = tabManager;
    window.editors = editors;

    // 暴露作业导航相关函数到全局作用域
    window.addAssignmentNavigationButtons = addAssignmentNavigationButtons;
    window.setupAssignmentEnvironment = setupAssignmentEnvironment;
    window.goBackToAssignment = goBackToAssignment;
    window.submitAssignment = submitAssignment;

    // 初始化文件操作模块
    try {
      console.log('🔧 初始化文件操作模块');
      const fileOperations = new FileOperations(fileManager);

      if (!fileOperations) {
        console.error('❌ 文件操作模块初始化失败');
        setStatus('文件操作初始化失败', 'error');
      } else {
        console.log('✅ 文件操作模块初始化成功');
        // 暴露到全局以便调试
        window.fileOperations = fileOperations;
      }
    } catch (error) {
      console.error('❌ 文件操作模块初始化失败:', error);
      setStatus('文件操作初始化失败', 'error');
    }

    // 初始化模板管理器
    try {
      const templateManager = new TemplateManager(fileManager, preview);
      if (templateManager) {
        window.templateManager = templateManager;
      }
    } catch (error) {
      console.warn('⚠️ 模板管理器初始化失败:', error);
    }

    // 初始化导出管理器
    try {
      const exportManager = new ExportManager(fileManager);
      if (exportManager) {
        window.exportManager = exportManager;
        console.log('✅ 导出管理器初始化成功');
      }
    } catch (error) {
      console.warn('⚠️ 导出管理器初始化失败:', error);
    }

    // 初始化代码库管理器 - 重新启用以支持代码案例功能
    try {
      console.log('🏗️ 开始初始化代码库管理器...');
      console.log('🔧 FileManager 状态:', fileManager ? '可用' : '不可用');
      const codeRepoManager = new CodeRepositoryManager(fileManager);
      console.log('📦 CodeRepositoryManager 实例创建完成');
      codeRepoManager.init();
      window.codeRepoManager = codeRepoManager;
      console.log('✅ 代码库管理器初始化成功');
    } catch (error) {
      console.warn('⚠️ 代码库管理器初始化失败:', error);
      console.error('❌ 详细错误:', error.stack);
    }

    // 初始化AI编程助手
    try {
      const aiAssistant = new AIAssistant(fileManager);
      if (aiAssistant) {
        window.aiAssistant = aiAssistant;
        console.log('✅ AI编程助手初始化成功');
      }
    } catch (error) {
      console.warn('⚠️ AI编程助手初始化失败:', error);
    }

    // 初始化其他组件
    try {
      new ConsoleToggle().initializeState();
      new Resizer();
    } catch (error) {
      console.warn('⚠️ UI组件初始化失败:', error);
    }

    // 初始化主题管理器
    try {
      const themeManager = new ThemeManager();
      if (themeManager) {
        window.themeManager = themeManager;
        console.log('✅ 主题管理器初始化成功');
      }
    } catch (error) {
      console.warn('⚠️ 主题管理器初始化失败:', error);
    }

    // 初始化默认文件加载器
    try {
      const defaultFilesLoader = new DefaultFilesLoader(fileManager);
      if (defaultFilesLoader) {
        console.log('✅ 默认文件加载器初始化成功');
      }
    } catch (error) {
      console.warn('⚠️ 默认文件加载器初始化失败:', error);
    }

    // 初始化设置
    try {
      const settings = getSettings();
      if (settings && typeof settings.autoRun === 'boolean') {
        autoRunToggle.checked = settings.autoRun;
      }
    } catch (error) {
      console.warn('⚠️ 设置初始化失败，使用默认值:', error);
      autoRunToggle.checked = DEFAULT_SETTINGS.autoRun;
    }

    // 加载默认文件并初始化Tab
    try {
      if (fileManager && typeof fileManager.selectFile === 'function') {
        fileManager.selectFile('html/index.html');
      }

      // 初始化Tab管理器的默认Tab
      if (tabManager && typeof tabManager.createDefaultTabs === 'function') {
        tabManager.createDefaultTabs();
      }
    } catch (error) {
      console.warn('⚠️ 文件和Tab初始化失败:', error);
    }

    console.log('🎯 应用初始化完成！');

    // 根据用户角色控制作业按钮显示
    controlAssignmentButtons();

    // 注释掉动态添加按钮的代码，因为我们已经在HTML中直接添加了按钮
    // 按钮现在是直接在HTML中定义的，不需要动态创建
    console.log('📝 作业导航按钮已在HTML中定义，跳过动态添加');

    // 初始运行
    try {
      const settings = getSettings();
      if (settings && settings.autoRun) {
        runCompilation();
      } else {
        setStatus('等待运行', 'idle');
      }
    } catch (error) {
      console.warn('⚠️ 初始运行失败:', error);
      setStatus('就绪', 'idle');
    }

  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    setStatus('初始化失败', 'error');

    // 尝试显示用户友好的错误信息
    if (error.message.includes('CodeMirror')) {
      setStatus('编辑器加载失败', 'error');
    } else if (error.message.includes('DOM')) {
      setStatus('页面加载失败', 'error');
    } else {
      setStatus('应用初始化失败', 'error');
    }
  }
}

/**
 * 处理编辑器变化
 */
function handleEditorChange(type, value) {
  updateFile(type, value);

  // 保存到文件管理器
  if (fileManager) {
    fileManager.saveCurrentFile();
  }

  if (autoRunToggle.checked) {
    scheduleCompile();
  } else {
    setStatus('等待运行', 'idle');
  }
}

/**
 * 调度编译
 */
function scheduleCompile() {
  clearTimeout(compileTimer);
  compileTimer = setTimeout(runCompilation, RUN_DEBOUNCE_MS);
}

/**
 * 运行编译
 */
function runCompilation() {
  setStatus('编译中…', 'running');
  consoleManager.clear();
  consoleManager.append('info', ['#' + new Date().toLocaleTimeString() + ' 触发运行']);

  // 保存当前文件
  if (fileManager) {
    fileManager.saveCurrentFile();
  }

  // 获取当前选中的文件
  const currentFilePath = fileManager ? fileManager.getSelectedFilePath() : null;

  if (currentFilePath) {
    // 使用文件管理器的预览逻辑
    fileManager.updatePreview(currentFilePath);
  } else {
    // 使用所有编辑器内容
    const payload = editors.getAllValues();
    preview.run(payload);
  }

  // 设置完成状态
  previewFrame.onload = () => {
    setStatus('编译完成 ' + new Date().toLocaleTimeString(), 'success');
  };
}

/**
 * 处理控制台消息
 */
function handleConsoleMessage(level, args) {
  consoleManager.append(level, args);
  if (level === 'error') {
    setStatus('运行出现错误', 'error');
  }
}

/**
 * 设置状态
 */
function setStatus(message, state = 'idle') {
  // 如果传入的是翻译key，则进行翻译
  let displayMessage = message;
  if (languageManager && typeof message === 'string' && message.includes('-')) {
    const translated = languageManager.t(message);
    displayMessage = translated !== message ? translated : message;
  }

  // 如果有时间，则添加时间
  if (state === 'compiled') {
    const now = new Date();
    const time = languageManager ?
      languageManager.formatTime(now) :
      now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const compiledMessage = languageManager ?
      languageManager.t('status-compiled') :
      '编译完成';
    displayMessage = `${compiledMessage} ${time}`;
  }

  statusText.textContent = displayMessage;
  indicator.dataset.state = state;
}

// 设置事件监听器
autoRunToggle.addEventListener('change', () => {
  updateSettings({ autoRun: autoRunToggle.checked });
  if (autoRunToggle.checked) {
    scheduleCompile();
  }
});

runButton.addEventListener('click', runCompilation);

/**
 * 初始化作业模式
 */
function initializeAssignmentMode(assignmentId, assignmentContext, options = {}) {
  let assignment = null;

  // 从URL参数或localStorage获取作业信息
  if (assignmentId) {
    try {
      // 动态导入assignmentManager获取作业信息
      import('./assignmentManager.js').then(({ assignmentManager }) => {
        try {
          assignment = assignmentManager.getAssignment(assignmentId);
          setupAssignmentEnvironment(assignment, options);
        } catch (error) {
          console.error('获取作业信息失败:', error);
          showAssignmentError('无法获取作业信息');
        }
      });
    } catch (error) {
      console.error('导入assignmentManager失败:', error);
    }
  } else if (assignmentContext) {
    try {
      assignment = JSON.parse(assignmentContext);
      setupAssignmentEnvironment(assignment, options);
    } catch (error) {
      console.error('解析作业上下文失败:', error);
    }
  }
}

/**
 * 设置作业环境
 */
function setupAssignmentEnvironment(assignment, options = {}) {
  console.log('🏁️ 开始设置作业环境...');

  const { mode, studentId } = options;
  const isReviewMode = mode === 'review';

  console.log('📋 作业环境配置:', {
    assignmentTitle: assignment.title,
    isReviewMode,
    studentId,
    hasAssignment: !!assignment
  });

  // 更新页面标题
  document.title = `${assignment.title} - OnlineJudge 代码编辑器`;

  // 删除任何可能存在的作业信息面板 - 根据用户要求删除多余显示
  const existingPanel = document.querySelector('.assignment-panel');
  if (existingPanel) {
    existingPanel.remove();
    console.log('🗑️ 已删除现有的作业信息面板');
  }

  // 注释掉作业信息面板创建代码
  // const assignmentPanel = createAssignmentPanel(assignment);
  // document.body.insertBefore(assignmentPanel, document.body.firstChild);

  // 设置作业模板文件
  if (assignment.templates && assignment.templates.length > 0) {
    console.log('📝 使用作业模板文件');
    setupAssignmentTemplates(assignment.templates);
  } else {
    console.log('📄 创建默认的HTML、CSS、JS文件');
    setupDefaultAssignmentFiles(assignment);
  }

  // 如果有已有提交记录，优先加载提交内容
  console.log('🔍 检查已有提交记录...');
  loadExistingSubmission(assignment, { studentId });

  // 根据模式显示相应的按钮
  console.log('🎛 根据模式添加导航按钮...');
  addAssignmentNavigationButtons(assignment, isReviewMode);

  // 学生做作业：启用自动保存
  if (!isReviewMode) {
    console.log('💾 启用自动保存功能');
    setupAutoSave(assignment.id);
  } else {
    console.log('ℹ️ 作业审阅模式：只显示返回按钮，不启用自动保存');
  }

  console.log('✅ 作业环境设置完成:', assignment.title);
}

/**
 * 创建作业信息面板
 */
function createAssignmentPanel(assignment) {
  const panel = document.createElement('div');
  panel.className = 'assignment-panel bg-gray-800 text-white p-4 border-b border-gray-700';
  panel.innerHTML = `
    <div class="container mx-auto flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <h1 class="text-xl font-bold">${assignment.title}</h1>
        <span class="text-sm text-gray-400">${assignment.courseName} - ${assignment.courseCode}</span>
      </div>
      <div class="flex items-center space-x-4">
        <div class="text-sm text-gray-400">
          截止时间: ${new Date(assignment.deadline).toLocaleString()}
        </div>
        <button id="close-assignment-panel" class="text-gray-400 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  // 绑定关闭事件
  panel.querySelector('#close-assignment-panel').addEventListener('click', () => {
    panel.remove();
    localStorage.removeItem('current-assignment-context');
    // 刷新页面清除URL参数
    window.location.href = 'index.html';
  });

  return panel;
}

/**
 * 设置作业模板文件
 */
function setupAssignmentTemplates(templates) {
  if (fileManager && tabManager) {
    templates.forEach(template => {
      const fileName = template.title.includes('HTML') ? 'index.html' :
                       template.title.includes('CSS') ? 'style.css' :
                       template.title.includes('JavaScript') ? 'script.js' : 'main.html';

      fileManager.updateFile(fileName, template.content);
    });

    // 重新加载文件树
    fileManager.renderFileTree();

    // 打开第一个文件
    if (templates.length > 0) {
      const firstFile = templates[0].title.includes('HTML') ? 'index.html' :
                       templates[0].title.includes('CSS') ? 'style.css' :
                       templates[0].title.includes('JavaScript') ? 'script.js' : 'index.html';
      tabManager.openFile(firstFile);
    }
  }
}

/**
 * 设置默认作业文件
 */
function setupDefaultAssignmentFiles(assignment) {
  console.log('setupDefaultAssignmentFiles 被调用，但暂时禁用以避免错误');
  // 暂时禁用这个函数，因为我们已经有简化的提交方式
  return;

  if (fileManager && tabManager) {
    // 创建基本的HTML文件
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${assignment.title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>${assignment.title}</h1>
  <p>${assignment.description}</p>

  <!-- 作业要求： -->
  <ul>
    ${assignment.requirements?.map(req => `<li>${req}</li>`).join('') || '<li>完成作业要求</li>'}
  </ul>

  <script src="script.js"></script>
</body>
</html>`;

    // 创建CSS文件
    const cssContent = `/* ${assignment.title} - 样式文件 */
body {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f5f5;
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 30px;
}

ul {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

li {
  margin-bottom: 10px;
  line-height: 1.6;
}`;

    // 创建JavaScript文件
    const jsContent = `// ${assignment.title} - JavaScript文件
console.log('作业已加载');

// 在此处编写您的JavaScript代码
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM内容已加载完成');

  // 您的代码写在这里
});`;

    fileManager.updateFile('index.html', htmlContent);
    fileManager.updateFile('style.css', cssContent);
    fileManager.updateFile('script.js', jsContent);

    // 重新加载文件树
    fileManager.renderFileTree();

    // 打开HTML文件
    tabManager.openFile('index.html');
  }
}

/**
 * 加载已有提交内容（学生二次进入或教师审阅）
 */
async function loadExistingSubmission(assignment, options = {}) {
  if (!fileManager) {
    return;
  }

  let targetStudentId = options.studentId || null;

  // 如果未显式指定学生，则尝试使用当前登录学生
  if (!targetStudentId) {
    try {
      // 统一用户信息获取方式
      const userStr = sessionStorage.getItem('current-user') ||
                      localStorage.getItem('currentUser') ||
                      localStorage.getItem('oj-current-user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      if (currentUser && currentUser.role === 'student') {
        targetStudentId = currentUser.id || currentUser.username;
      }
    } catch (error) {
      console.error('获取当前用户失败:', error);
    }
  }

  // 尝试从本地存储加载提交数据
  const localSubmissions = JSON.parse(localStorage.getItem('oj-assignment-submissions') || '[]');
  const assignmentSubmissions = localSubmissions.filter(s => s.assignmentId === assignment.id);

  // 尝试从API加载提交数据
  let apiSubmissions = [];
  try {
    const response = await fetch(`http://127.0.0.1:5024/api/assignments/${assignment.id}/submissions`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data && result.data.submissions) {
        apiSubmissions = result.data.submissions.map(s => {
            // 解析文件内容
            let files = [];
            try {
                const parsed = JSON.parse(s.submission_files || '[]');
                if (Array.isArray(parsed)) {
                    files = parsed;
                } else if (typeof parsed === 'object') {
                    // 兼容对象格式 { 'filename': 'content' }
                    files = Object.entries(parsed).map(([name, content]) => ({ 
                        name, 
                        content, 
                        type: name.endsWith('.html') ? 'html' : name.endsWith('.css') ? 'css' : 'javascript' 
                    }));
                }
            } catch (e) {
                console.warn('解析提交文件失败:', e);
                files = [];
            }

            return {
                id: s.id,
                assignmentId: String(s.assignment_id),
                studentId: String(s.student_id), // 确保ID格式一致
                files: files,
                submittedAt: s.submission_time
            };
        });
        console.log(`📥 从API加载了 ${apiSubmissions.length} 条提交记录`);
      }
    }
  } catch (e) {
    console.error('从API获取提交记录失败:', e);
  }

  // 合并本地、作业上下文和API的提交数据
  let allSubmissions = [];
  if (assignment.submissions && Array.isArray(assignment.submissions)) {
    allSubmissions = [...assignment.submissions];
  }
  
  // 合并本地提交
  assignmentSubmissions.forEach(sub => {
    if (!sub || !sub.studentId) return;
    const existingIndex = allSubmissions.findIndex(s => s && String(s.studentId) === String(sub.studentId));
    if (existingIndex === -1) {
      allSubmissions.push(sub);
    } else {
      const existing = allSubmissions[existingIndex];
      // 简单的比较：假设本地的总是更新的（或者应该比较时间）
      if (existing && sub.submittedAt && existing.submittedAt) {
        if (new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
            allSubmissions[existingIndex] = sub;
        }
      } else {
        // 如果没有时间戳，默认覆盖
        allSubmissions[existingIndex] = sub;
      }
    }
  });

  // 合并API提交 (API通常是最权威的)
  apiSubmissions.forEach(sub => {
    if (!sub || !sub.studentId) return;
    const existingIndex = allSubmissions.findIndex(s => s && String(s.studentId) === String(sub.studentId));
    if (existingIndex === -1) {
      allSubmissions.push(sub);
    } else {
      const existing = allSubmissions[existingIndex];
      // 如果API的时间更新，则覆盖
      if (existing && sub.submittedAt && existing.submittedAt) {
        if (new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
            allSubmissions[existingIndex] = sub;
        }
      } else {
        // API数据优先
        allSubmissions[existingIndex] = sub;
      }
    }
  });

  if (!targetStudentId || !Array.isArray(allSubmissions)) {
    return;
  }

  const existing = allSubmissions.find(
    s => String(s.studentId) === String(targetStudentId)
  );

  if (!existing || !Array.isArray(existing.files) || existing.files.length === 0) {
    console.log('⚠️ 未找到该学生的提交记录:', targetStudentId);
    return;
  }

  try {
    console.log(`📂 加载提交记录: ${existing.id} (时间: ${existing.submittedAt})`);
    // 将提交的文件内容写回编辑器
    existing.files.forEach(file => {
      if (file && file.name && typeof file.content === 'string') {
        fileManager.updateFile(file.name, file.content);
      }
    });

    if (typeof fileManager.renderFileTree === 'function') {
      fileManager.renderFileTree();
    }

    // 打开一个主要文件（优先 HTML）
    if (tabManager && typeof tabManager.openFile === 'function') {
      const mainFile =
        existing.files.find(f => f.name.endsWith('.html')) || existing.files[0];
      if (mainFile && mainFile.name) {
        tabManager.openFile(mainFile.name);
      }
    }

    console.log('✅ 已成功加载作业提交内容');
    showToast('已加载最新的作业提交内容', 'success');
  } catch (error) {
    console.error('加载已有提交内容失败:', error);
  }
}

/**
 * 添加作业导航按钮（返回和提交）
 */
function addAssignmentNavigationButtons(assignment, isReviewMode = false) {
  console.log('⚠️ addAssignmentNavigationButtons函数被调用，但已被禁用');
  console.log('按钮现在直接在HTML中定义，不再动态创建');
  return; // 直接返回，不创建任何按钮

  const commandActions = document.querySelector('.command-actions');
  if (!commandActions) {
    console.error('❌ 找不到command-actions容器');
    return;
  }

  console.log('✅ 找到command-actions容器');

  // 清理已存在的作业按钮
  const existingButtons = document.querySelectorAll('.assignment-nav-btn');
  existingButtons.forEach(btn => btn.remove());
  console.log(`🧹 清理了 ${existingButtons.length} 个已存在的作业按钮`);

  // 创建返回按钮
  const backButton = document.createElement('button');
  backButton.className = 'assignment-nav-btn px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium';
  backButton.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
      </svg>
      <span>返回</span>
    </div>
  `;

  // 添加事件监听器
  backButton.addEventListener('click', () => {
    console.log('🔙 返回按钮被点击');
    goBackToAssignment();
  });

  // 将返回按钮插入到command-actions的最前面
  commandActions.insertBefore(backButton, commandActions.firstChild);
  backButton.style.marginRight = '8px';
  console.log('✅ 返回按钮已添加到command-actions');

  // 只在非审阅模式下显示提交按钮
  if (!isReviewMode) {
    console.log('📝 非审阅模式，添加提交按钮');
    const submitButton = document.createElement('button');
    submitButton.className = 'assignment-nav-btn px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium';
    submitButton.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>提交</span>
      </div>
    `;

    submitButton.addEventListener('click', () => {
      console.log('📤 提交按钮被点击');
      submitAssignment(assignment);
    });

    commandActions.insertBefore(submitButton, backButton.nextSibling);
    submitButton.style.marginRight = '8px';
    console.log('✅ 提交按钮已添加到command-actions');
  } else {
    console.log('👀️ 审阅模式，不显示提交按钮');
  }

  const modeText = isReviewMode ? '审阅模式' : '编辑模式';
  console.log(`✅ 作业导航按钮添加完成 (${modeText})`);

  // 检查按钮是否真的被添加了
  const addedButtons = document.querySelectorAll('.assignment-nav-btn');
  console.log(`🔍 当前页面中的作业导航按钮数量: ${addedButtons.length}`);
  addedButtons.forEach((btn, index) => {
    console.log(`  - 按钮 ${index + 1}: ${btn.textContent.trim()}`);
  });
}

/**
 * 返回作业页面
 */
function goBackToAssignment() {
  // 获取当前用户信息 - 修复存储键名不一致问题
  let currentUser = null;

  // 尝试从多个位置获取用户信息
  const fromSessionStorage = sessionStorage.getItem('current-user');
  const fromLocalStorage = localStorage.getItem('currentUser');
  const fromOjLocalStorage = localStorage.getItem('oj-current-user');

  if (fromSessionStorage) {
    currentUser = JSON.parse(fromSessionStorage);
  } else if (fromLocalStorage) {
    currentUser = JSON.parse(fromLocalStorage);
  } else if (fromOjLocalStorage) {
    currentUser = JSON.parse(fromOjLocalStorage);
  }

  console.log('🔍 [goBackToAssignment] 用户信息检查:', {
    currentUser,
    hasSessionStorage: !!fromSessionStorage,
    hasLocalStorage: !!fromLocalStorage,
    hasOjLocalStorage: !!fromOjLocalStorage
  });

  // 检查用户是否已登录
  if (!currentUser || !currentUser.role) {
    console.warn('⚠️ [goBackToAssignment] 用户未登录，返回到主页面');
    window.location.href = 'main.html';
    return;
  }

  // 检查是否是教师审阅模式
  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('assignment');
  const mode = urlParams.get('mode');

  if (currentUser.role === 'teacher' && mode === 'review' && assignmentId) {
    console.log('👨‍🏫 [goBackToAssignment] 教师审阅模式，返回作业详情页');
    localStorage.setItem('editor-return-page', 'assignment-details');
    localStorage.setItem('return-assignment-id', assignmentId);
    window.location.href = 'main.html';
    return;
  }

  // 根据用户角色返回到对应的仪表盘
  if (currentUser.role === 'student') {
    console.log('👨‍🎓 [goBackToAssignment] 返回学生仪表盘');
    window.location.href = 'main.html?page=student';
  } else if (currentUser.role === 'teacher') {
    console.log('👨‍🏫 [goBackToAssignment] 返回教师仪表盘');
    window.location.href = 'main.html?page=teacher';
  } else if (currentUser.role === 'admin') {
    console.log('👨‍💼 [goBackToAssignment] 返回管理员仪表盘');
    window.location.href = 'main.html?page=admin';
  } else {
    // 默认返回到主页面
    console.log('🏠 [goBackToAssignment] 未知角色，返回主页面');
    window.location.href = 'main.html';
  }
}

/**
 * 添加作业提交按钮（原有版本，已弃用）
 */
function addAssignmentSubmitButton(assignment) {
  const submitButton = document.createElement('button');
  submitButton.className = 'fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-lg transition-colors z-50';
  submitButton.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>提交作业</span>
    </div>
  `;

  submitButton.addEventListener('click', () => {
    submitAssignment(assignment);
  });

  document.body.appendChild(submitButton);
}

/**
 * 提交作业
 */
function submitAssignment(assignment) {
  // 移除确认弹窗，直接提交

  if (!fileManager) {
    console.error('文件管理器未初始化，无法提交');
    showToast('系统未就绪，请刷新页面重试', 'error');
    return;
  }

  try {
    // 获取当前用户信息 - 统一存储键
    const userStr = sessionStorage.getItem('current-user') ||
                    localStorage.getItem('currentUser') ||
                    localStorage.getItem('oj-current-user');
    const currentUser = userStr ? JSON.parse(userStr) : {};

    // 收集所有文件内容
    const files = [];

    // FIX: 强制从编辑器同步最新内容到 fileManager (安全版)
    if (window.editors && window.fileManager) {
      try {
        // 1. 保存当前正在编辑的文件
        if (window.fileManager.saveCurrentFile) {
           window.fileManager.saveCurrentFile();
        }

        const currentPath = window.fileManager.currentFilePath;
        
        // 2. 同步标准文件 (仅当它们未被其他文件占用编辑器时)
        
        // 同步 HTML
        if (!currentPath || currentPath === 'html/index.html' || !currentPath.endsWith('.html')) {
           const htmlContent = window.editors.getValue('html');
           if (htmlContent !== undefined) {
             window.fileManager.files['html/index.html'] = htmlContent;
           }
        }

        // 同步 CSS
        if (!currentPath || currentPath === 'css/style.css' || !currentPath.endsWith('.css')) {
           const cssContent = window.editors.getValue('css');
           if (cssContent !== undefined) {
             window.fileManager.files['css/style.css'] = cssContent;
           }
        }

        // 同步 JS (最关键：避免用 JSON/其他JS 覆盖 main.js)
        if (!currentPath || currentPath === 'js/main.js') {
           const jsContent = window.editors.getValue('js');
           if (jsContent !== undefined) {
             window.fileManager.files['js/main.js'] = jsContent;
           }
        }
        
        console.log('✅ 已安全同步编辑器内容');
      } catch (e) {
        console.error('同步编辑器内容失败:', e);
      }
    }

    const allFiles = fileManager.files;

    try {
      // 检查数据结构并使用相应的方法
      if (typeof allFiles.entries === 'function') {
        // 如果是Map对象，使用entries()
        for (const [fileName, fileData] of allFiles.entries()) {
          if (fileData && fileData.content && fileData.content.trim()) {
            files.push({
              name: fileName,
              content: fileData.content,
              type: fileName.endsWith('.html') ? 'html' :
                    fileName.endsWith('.css') ? 'css' :
                    fileName.endsWith('.js') ? 'javascript' : 'text'
            });
          }
        }
      } else if (typeof allFiles === 'object') {
        // 如果是普通对象，使用Object.entries()
        for (const [fileName, fileData] of Object.entries(allFiles)) {
          // 兼容直接存储字符串的情况
          const content = (fileData && typeof fileData === 'object' && fileData.content) ? fileData.content : fileData;
          
          if (content && typeof content === 'string' && content.trim()) {
            files.push({
              name: fileName,
              content: content,
              type: fileName.endsWith('.html') ? 'html' :
                    fileName.endsWith('.css') ? 'css' :
                    fileName.endsWith('.js') ? 'javascript' : 'text'
            });
          }
        }
      }
    } catch (error) {
      console.error('收集文件失败:', error);
      // 备用方案：直接从编辑器获取
      if (window.editors) {
        if (window.editors.html && window.editors.html.getValue().trim()) {
          files.push({
            name: 'html/index.html',
            content: window.editors.html.getValue(),
            type: 'html'
          });
        }
        if (window.editors.css && window.editors.css.getValue().trim()) {
          files.push({
            name: 'css/style.css',
            content: window.editors.css.getValue(),
            type: 'css'
          });
        }
        if (window.editors.js && window.editors.js.getValue().trim()) {
          files.push({
            name: 'js/main.js',
            content: window.editors.js.getValue(),
            type: 'javascript'
          });
        }
      }
    }

    // 获取URL参数中的作业ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlAssignmentId = urlParams.get('assignment') || 'demo-assignment';

    // 准备提交数据 - 修复作业ID匹配问题
    const submissionData = {
      id: `sub_${Date.now()}`, // 添加唯一提交ID
      assignmentId: urlAssignmentId === 'demo-assignment' ? '111' : urlAssignmentId, // 如果是默认值，使用111作业的ID
      studentId: currentUser.id || currentUser.username,
      studentName: currentUser.fullName || currentUser.username,
      files: files,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };

    // 保存到本地存储（作为备用方案）
    const submissions = JSON.parse(localStorage.getItem('oj-assignment-submissions') || '[]');
    submissions.push(submissionData);
    localStorage.setItem('oj-assignment-submissions', JSON.stringify(submissions));

    // 同时也更新自动保存记录，确保提交时的状态被保存（防止提交失败后刷新丢失最后几秒的更改）
    try {
      const autoSaveFiles = {};
      files.forEach(f => {
        autoSaveFiles[f.name] = f.content;
      });
      localStorage.setItem(`assignment-autosave-${submissionData.assignmentId}`, JSON.stringify({
        files: autoSaveFiles,
        savedAt: new Date().toISOString()
      }));
      console.log('💾 提交前已强制更新自动保存记录');
    } catch (e) {
      console.error('提交前更新自动保存失败:', e);
    }

    // 显示调试信息
    showDebugInfo();

    // 在控制台也输出详细信息
    console.log('🎯 作业提交详细信息:', {
      urlAssignmentId: urlAssignmentId,
      finalAssignmentId: submissionData.assignmentId,
      studentId: submissionData.studentId,
      studentName: submissionData.studentName,
      submissionId: submissionData.id,
      fileCount: files.length,
      totalSubmissions: submissions.length
    });

    // 直接调用 API 提交作业到数据库
    const API_BASE = 'http://127.0.0.1:5024/api';
    
    // 转换文件格式为对象
    const filesObject = {};
    files.forEach(file => {
      filesObject[file.name] = file.content;
    });

    fetch(`${API_BASE}/assignments/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assignmentId: submissionData.assignmentId,
        studentId: currentUser.id,
        studentName: currentUser.fullName || currentUser.username,
        studentEmail: currentUser.email || '',
        files: filesObject,
        content: ''
      })
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        console.log('✅ 作业提交成功:', result);
        showToast('作业提交成功！正在返回...', 'success');
        
        // 清除自动保存
        localStorage.removeItem(`assignment-autosave-${submissionData.assignmentId}`);
        
        // 延迟跳转，让用户看到提示
        setTimeout(() => {
          goBackToAssignment();
        }, 1500);
      } else {
        console.error('❌ 作业提交失败:', result.message);
        showToast('提交失败: ' + result.message, 'error');
      }
    })
    .catch(error => {
      console.error('❌ API调用失败:', error);
      showToast('网络连接失败，作业已保存到本地', 'error');
      // 即使API失败，也返回到作业列表
      setTimeout(() => {
        goBackToAssignment();
      }, 2000);
    });

  } catch (error) {
    console.error('提交失败:', error);
    showToast('提交过程出错: ' + error.message, 'error');
  }
}

/**
 * 显示 Toast 通知
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6';
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  
  toast.style.cssText = `
    background-color: ${bgColor};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    min-width: 250px;
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: auto;
  `;
  
  toast.innerHTML = `<span style="font-size: 1.2em;">${icon}</span><span>${message}</span>`;
  
  container.appendChild(toast);
  
  // Animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * 设置自动保存
 */
function setupAutoSave(assignmentId) {
  console.log('💾 初始化自动保存功能, 作业ID:', assignmentId);
  
  // 1. 立即尝试恢复
  try {
    const autoSaveData = localStorage.getItem(`assignment-autosave-${assignmentId}`);
    if (autoSaveData) {
      const { files, savedAt } = JSON.parse(autoSaveData);
      console.log(`📂 发现自动保存的内容 (保存于 ${new Date(savedAt).toLocaleString()})`);
      
      // 恢复到 fileManager 和编辑器
      if (window.fileManager) {
        Object.entries(files).forEach(([fileName, content]) => {
           // 更新 fileManager
           if (window.fileManager.files instanceof Map) {
             window.fileManager.files.set(fileName, content);
           } else {
             window.fileManager.files[fileName] = content;
           }
           
           // 更新编辑器
           if (window.editors) {
             if (fileName.includes('html')) window.editors.setValue('html', content);
             else if (fileName.includes('css')) window.editors.setValue('css', content);
             else if (fileName.includes('js')) window.editors.setValue('js', content);
           }
        });
        console.log('✅ 自动保存内容已恢复到编辑器');
        showToast('已恢复上次未提交的作业内容', 'info');
      }
    }
  } catch (error) {
    console.error('恢复自动保存内容失败:', error);
  }

  // 2. 设置定时保存 (每5秒)
  setInterval(() => {
    try {
      // 检查必要对象是否存在
      if (!window.editors || !window.fileManager) {
        return;
      }

      // 强制从编辑器同步最新内容
      if (window.editors && window.fileManager) {
         const html = window.editors.getValue('html');
         const css = window.editors.getValue('css');
         const js = window.editors.getValue('js');
         
         if (html !== undefined) window.fileManager.files['html/index.html'] = html;
         if (css !== undefined) window.fileManager.files['css/style.css'] = css;
         if (js !== undefined) window.fileManager.files['js/main.js'] = js;
      }

      const files = {};
      const allFiles = window.fileManager.files;
      
      // 统一处理 Map 或 Object
      if (allFiles instanceof Map) {
        for (const [name, content] of allFiles.entries()) {
           files[name] = (typeof content === 'object' && content.content) ? content.content : content;
        }
      } else {
        for (const [name, content] of Object.entries(allFiles)) {
           files[name] = (typeof content === 'object' && content.content) ? content.content : content;
        }
      }

      localStorage.setItem(`assignment-autosave-${assignmentId}`, JSON.stringify({
        files,
        savedAt: new Date().toISOString()
      }));

      // console.log('💾 作业已自动保存'); // 减少日志噪音
      
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }, 5000);
}

/**
 * 显示作业错误
 */
function showAssignmentError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('📜 DOM内容已加载，开始应用初始化...');

  // 删除任何可能存在的作业信息面板 - 根据用户要求删除多余显示
  const existingPanel = document.querySelector('.assignment-panel');
  if (existingPanel) {
    existingPanel.remove();
    console.log('已删除现有的作业信息面板');
  }

  initializeApp();
});

// 显示测试面板信息
function showDebugInfo() {
  const debugPanel = document.getElementById('assignment-debug-panel');
  const debugContent = document.getElementById('debug-content');
  if (!debugPanel || !debugContent) return;

  const urlParams = new URLSearchParams(window.location.search);
  const assignmentId = urlParams.get('assignment') || 'demo-assignment';
  // 统一用户信息获取方式
    const userStr = sessionStorage.getItem('current-user') ||
                    localStorage.getItem('currentUser') ||
                    localStorage.getItem('oj-current-user');
    const currentUser = userStr ? JSON.parse(userStr) : {};
  const existingSubmissions = JSON.parse(localStorage.getItem('oj-assignment-submissions') || '[]');

  let debugText = `📋 作业提交调试信息
=====================
当前作业ID: ${assignmentId}
当前用户信息:
  - 用户名: ${currentUser.username || '未知'}
  - 姓名: ${currentUser.fullName || '未知'}
  - ID: ${currentUser.id || currentUser.username || '未知'}
  - 角色: ${currentUser.role || '未知'}

本地存储提交记录总数: ${existingSubmissions.length}

当前用户的提交记录:
`;

  const userSubmissions = existingSubmissions.filter(sub =>
    sub.studentId === (currentUser.id || currentUser.username) ||
    sub.studentName === (currentUser.fullName || currentUser.username)
  );

  if (userSubmissions.length === 0) {
    debugText += '  (无提交记录)\n';
  } else {
    userSubmissions.forEach((sub, index) => {
      debugText += `  记录${index + 1}:
    - 提交ID: ${sub.id}
    - 作业ID: ${sub.assignmentId}
    - 学生ID: ${sub.studentId}
    - 学生姓名: ${sub.studentName}
    - 提交时间: ${sub.submittedAt}
    - 文件数量: ${sub.files ? sub.files.length : 0}
    - 状态: ${sub.status || '未知'}
`;
    });
  }

  debugText += `
\n文件管理器状态:
  - 编辑器实例: ${window.editors ? '已加载' : '未加载'}
  - 文件管理器: ${window.fileManager ? '已加载' : '未加载'}
`;

  debugContent.textContent = debugText;
  debugPanel.style.display = 'block';
}

// 测试提交流程
function testSubmissionFlow() {
  const debugContent = document.getElementById('debug-content');
  if (!debugContent) return;

  let testResult = `🧪 测试提交流程
==================\n`;

  try {
    // 1. 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('assignment') || 'demo-assignment';
    testResult += `✅ URL参数检查: assignmentId = ${assignmentId}\n`;

    // 2. 检查用户信息
    // 统一用户信息获取方式
    const userStr = sessionStorage.getItem('current-user') ||
                    localStorage.getItem('currentUser') ||
                    localStorage.getItem('oj-current-user');
    const currentUser = userStr ? JSON.parse(userStr) : {};
    if (!currentUser.username) {
      testResult += `❌ 用户信息检查: 未找到有效用户\n`;
    } else {
      testResult += `✅ 用户信息检查: ${currentUser.fullName} (${currentUser.username})\n`;
    }

    // 3. 检查文件管理器
    if (!window.fileManager) {
      testResult += `❌ 文件管理器检查: 未找到文件管理器\n`;
    } else {
      testResult += `✅ 文件管理器检查: 已加载\n`;

      // 4. 检查文件数据
      const allFiles = window.fileManager.files;
      if (!allFiles) {
        testResult += `❌ 文件数据检查: 未找到文件数据\n`;
      } else {
        let fileCount = 0;
        try {
          if (typeof allFiles.entries === 'function') {
            for (const [fileName, fileData] of allFiles.entries()) {
              fileCount++;
            }
          } else if (typeof allFiles === 'object') {
            fileCount = Object.keys(allFiles).length;
          }
          testResult += `✅ 文件数据检查: 找到 ${fileCount} 个文件\n`;
        } catch (error) {
          testResult += `❌ 文件数据检查: ${error.message}\n`;
        }
      }
    }

    // 5. 检查本地存储
    const existingSubmissions = JSON.parse(localStorage.getItem('oj-assignment-submissions') || '[]');
    testResult += `✅ 本地存储检查: 找到 ${existingSubmissions.length} 条提交记录\n`;

    // 6. 模拟提交测试
    const mockSubmission = {
      id: `test_${Date.now()}`,
      assignmentId: assignmentId === 'demo-assignment' ? '111' : assignmentId,
      studentId: currentUser.id || currentUser.username || 'test_student',
      studentName: currentUser.fullName || currentUser.username || '测试学生',
      submittedAt: new Date().toISOString(),
      status: 'test_submission'
    };

    testResult += `✅ 模拟提交测试: 生成测试提交数据\n`;
    testResult += `   - 提交ID: ${mockSubmission.id}\n`;
    testResult += `   - 作业ID: ${mockSubmission.assignmentId}\n`;
    testResult += `   - 学生ID: ${mockSubmission.studentId}\n`;
    testResult += `   - 学生姓名: ${mockSubmission.studentName}\n`;

    // 7. 检查教师端匹配逻辑
    testResult += `\n🔍 教师端匹配测试:\n`;
    const mockStudent = {
      id: mockSubmission.studentId,
      username: mockSubmission.studentId,
      fullName: mockSubmission.studentName
    };

    const foundMatch = mockSubmission.studentId === mockStudent.id ||
                      mockSubmission.studentId === mockStudent.username ||
                      mockSubmission.studentId === mockStudent.studentId ||
                      mockSubmission.studentName === mockStudent.fullName ||
                      mockSubmission.studentName === mockStudent.username;

    testResult += foundMatch ? '✅ 匹配测试通过: 教师端能找到学生提交\n' : '❌ 匹配测试失败: 教师端无法匹配学生提交\n';

  } catch (error) {
    testResult += `❌ 测试过程中出现错误: ${error.message}\n`;
  }

  debugContent.textContent = testResult;
}

// 根据用户角色控制作业按钮显示
function controlAssignmentButtons() {
  // 统一用户信息获取方式
    const userStr = sessionStorage.getItem('current-user') ||
                    localStorage.getItem('currentUser') ||
                    localStorage.getItem('oj-current-user');
    const currentUser = userStr ? JSON.parse(userStr) : {};
  const submitBtn = document.getElementById('assignment-submit-btn');

  // 如果不是学生角色，隐藏提交按钮
  if (currentUser.role !== 'student') {
    if (submitBtn) {
      submitBtn.style.display = 'none';
    }
  } else {
    // 学生角色显示提交按钮
    if (submitBtn) {
      submitBtn.style.display = 'block';
    }
  }
}

// 调试信息已隐藏，仅在需要时手动调用
