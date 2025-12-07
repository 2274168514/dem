/**
 * AI编程助手
 * 基于智谱清言API的AI代码生成助手
 */

export class AIAssistant {
  constructor(fileManager) {
    this.fileManager = fileManager;
    this.apiKey = '22fc0be60e314d57a43449a79e8cc8a0.CaWMtILxRfAZmO14';
    this.apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    this.pendingFiles = null; // 存储待确认的文件
    this.init();
  }

  /**
   * 初始化AI编程助手
   */
  init() {
    console.log('🤖 AI编程助手初始化...');
    this.bindEvents();
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    const aiBtn = document.getElementById('ai-assistant-btn');
    const closeBtn = document.getElementById('close-ai-assistant');
    const cancelBtn = document.getElementById('cancel-ai-btn');
    const generateBtn = document.getElementById('generate-code-btn');
    const confirmBtn = document.getElementById('confirm-files-btn');

    if (aiBtn) {
      aiBtn.addEventListener('click', () => this.showModal());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideModal());
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateCode());
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmCreateFiles());
    }

    // 点击背景关闭模态框
    const modal = document.getElementById('ai-assistant-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideModal();
        }
      });
    }

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal();
      }
    });
  }

  /**
   * 显示AI助手对话框
   */
  showModal() {
    const modal = document.getElementById('ai-assistant-modal');
    if (modal) {
      // 设置初始状态
      modal.style.opacity = '0';
      modal.style.display = 'flex';

      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.style.transform = 'scale(0.8) translateY(20px)';
        modalContent.style.opacity = '0';
        modalContent.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      }

      // 触发动画
      setTimeout(() => {
        modal.style.transition = 'opacity 0.2s ease';
        modal.style.opacity = '1';

        if (modalContent) {
          modalContent.style.transform = 'scale(1) translateY(0)';
          modalContent.style.opacity = '1';
        }
      }, 10);

      modal.classList.add('show');
    }
  }

  /**
   * 隐藏AI助手对话框（带动画效果）
   */
  hideModal() {
    const modal = document.getElementById('ai-assistant-modal');
    if (modal) {
      const modalContent = modal.querySelector('.modal-content');

      // 添加退出动画
      modal.style.transition = 'opacity 0.2s ease';
      modal.style.opacity = '0';

      if (modalContent) {
        modalContent.style.transition = 'all 0.2s ease';
        modalContent.style.transform = 'scale(0.8) translateY(20px)';
        modalContent.style.opacity = '0';
      }

      modal.classList.remove('show');

      // 等待动画完成后隐藏
      setTimeout(() => {
        modal.style.display = 'none';
        this.resetForm();
      }, 200);
    }
  }

  /**
   * 重置表单
   */
  resetForm() {
    const prompt = document.getElementById('ai-prompt');
    const folder = document.getElementById('target-folder');

    if (prompt) prompt.value = '';
    if (folder) folder.value = '';

    // 重置按钮状态
    this.resetButtonState();
  }

  /**
   * 重置按钮状态
   */
  resetButtonState() {
    const generateBtn = document.getElementById('generate-code-btn');
    const confirmBtn = document.getElementById('confirm-files-btn');

    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.querySelector('.btn-text').style.display = 'inline';
      generateBtn.querySelector('.btn-loading').style.display = 'none';
      generateBtn.style.display = 'inline-block';
    }

    if (confirmBtn) {
      confirmBtn.style.display = 'none';
    }
  }

  /**
   * 生成代码
   */
  async generateCode() {
    const prompt = document.getElementById('ai-prompt').value.trim();
    const generationType = document.getElementById('generation-type').value;
    const targetFolder = document.getElementById('target-folder').value;
    const overwrite = document.getElementById('overwrite-files').checked;

    if (!prompt) {
      this.showError('请描述您的需求');
      return;
    }

    // 显示加载状态
    this.setLoadingState(true);

    try {
      console.log('🚀 开始AI代码生成...', generationType, targetFolder);

      // 构建完整的提示词
      const fullPrompt = this.buildPrompt(prompt, generationType, this.fileManager);

      // 调用AI API
      const response = await this.callAI(fullPrompt);

      if (response.success) {
        // 解析AI响应并创建文件
        const files = this.parseAIResponse(response.content, generationType);

        if (files.length > 0) {
          // 根据用户提示生成智能文件名
          const filesWithSmartNames = this.generateSmartFileNames(files, prompt);

          // 存储文件信息，等待用户确认
          this.pendingFiles = {
            files: filesWithSmartNames,
            generationType: generationType,
            targetFolder: targetFolder,
            overwrite: overwrite
          };

          // 显示确认按钮
          this.showConfirmButton();
        } else {
          this.showError('AI未能生成有效的文件内容');
        }
      } else {
        this.showError(response.error || '代码生成失败');
      }
    } catch (error) {
      console.error('❌ AI代码生成失败:', error);
      this.showError('代码生成失败: ' + error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * 构建AI提示词
   */
  buildPrompt(userPrompt, generationType, fileManager) {
    let prompt = `你是一个专业的前端开发助手。请根据用户的需求生成完整的前端代码文件。

用户需求: ${userPrompt}

要求:
1. 生成完整、可运行的代码文件
2. 代码要现代、规范、有良好的注释
3. 使用现代CSS特性和原生JavaScript
4. 确保生成的代码可以直接在浏览器中运行`;

    if (generationType === 'single-html') {
      prompt += `

生成方式: 单文件HTML
5. 请生成一个完整的HTML文件，包含所有CSS样式和JavaScript代码
6. CSS放在<style>标签内，JavaScript放在<script>标签内
7. 确保HTML文件可以独立运行，不依赖外部文件

请按照以下格式返回:

---index.html---
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>页面标题</title>
  <style>
    /* CSS样式 */
  </style>
</head>
<body>
  <!-- 页面内容 -->
  <script>
    // JavaScript代码
  </script>
</body>
</html>`;
    } else {
      prompt += `

生成方式: 分离式文件
5. 请分别生成HTML、CSS、JavaScript三个文件
6. HTML文件命名为index.html，CSS文件命名为style.css，JS文件命名为main.js
7. HTML文件通过相对路径引用CSS和JS文件：href="../css/style.css" 和 src="../js/main.js"
8. CSS文件只包含样式代码，JS文件只包含JavaScript代码

请按照以下格式返回文件内容，每个文件用 ---文件名--- 分隔:

---index.html---
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>页面标题</title>
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <!-- 页面内容 -->
  <script type="module" src="../js/main.js"></script>
</body>
</html>
---style.css---
/* CSS样式 */
---main.js---
// JavaScript代码`;
    }

    // 添加现有项目结构信息
    if (fileManager && fileManager.files) {
      const existingFiles = Object.keys(fileManager.files);
      if (existingFiles.length > 0) {
        prompt += `\n\n当前项目已有文件:\n${existingFiles.slice(0, 10).join('\n')}`;
      }
    }

    prompt += `

请确保生成的代码完整且可以直接运行。`;

    return prompt;
  }

  /**
   * 调用AI API
   */
  async callAI(prompt) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API请求失败: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        return {
          success: true,
          content: data.choices[0].message.content
        };
      } else {
        throw new Error('API返回数据格式错误');
      }
    } catch (error) {
      console.error('AI API调用失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 解析AI响应
   */
  parseAIResponse(content, generationType) {
    const files = [];

    // 使用正则表达式分割文件
    const filePattern = /---([^---]+)---/g;
    const parts = content.split(filePattern);

    for (let i = 1; i < parts.length; i += 2) {
      const fileName = parts[i].trim();
      const fileContent = parts[i + 1] ? parts[i + 1].trim() : '';

      if (fileName && fileContent) {
        files.push({
          name: fileName,
          content: fileContent
        });
      }
    }

    // 如果是单文件HTML模式且没有解析出文件，尝试从整个内容中提取
    if (files.length === 0 && generationType === 'single-html') {
      // 尝试从整个响应中提取HTML内容
      const htmlMatch = content.match(/<!DOCTYPE html[\s\S]*?<\/html>/i);
      if (htmlMatch) {
        files.push({
          name: 'index.html',
          content: htmlMatch[0].trim()
        });
      } else {
        // 如果没有找到完整HTML，将整个内容作为单个文件
        files.push({
          name: 'index.html',
          content: content.trim()
        });
      }
    }

    return files;
  }

  /**
   * 生成智能文件名
   */
  generateSmartFileNames(files, userPrompt) {
    return files.map(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      let baseName = file.name.replace(`.${extension}`, '');

      // 根据用户提示和文件类型生成更合适的文件名
      const prompt = userPrompt.toLowerCase();

      if (extension === 'html') {
        // HTML文件名生成
        if (prompt.includes('导航')) {
          baseName = 'navbar';
        } else if (prompt.includes('页脚') || prompt.includes('footer')) {
          baseName = 'footer';
        } else if (prompt.includes('表单') || prompt.includes('登录') || prompt.includes('注册')) {
          baseName = 'auth-form';
        } else if (prompt.includes('卡片') || prompt.includes('展示') || prompt.includes('作品')) {
          baseName = 'showcase';
        } else if (prompt.includes('计算器')) {
          baseName = 'calculator';
        } else if (prompt.includes('时钟') || prompt.includes('时间')) {
          baseName = 'clock';
        } else if (prompt.includes('图片') || prompt.includes('画廊')) {
          baseName = 'gallery';
        } else if (prompt.includes('表格') || prompt.includes('数据') || prompt.includes('列表')) {
          baseName = 'data-table';
        } else if (prompt.includes('博客') || prompt.includes('文章')) {
          baseName = 'blog';
        } else if (prompt.includes('产品') || prompt.includes('商品')) {
          baseName = 'product';
        } else {
          baseName = 'component';
        }
      } else if (extension === 'css') {
        // CSS文件名生成
        if (prompt.includes('动画')) {
          baseName = 'animations';
        } else if (prompt.includes('响应式') || prompt.includes('移动')) {
          baseName = 'responsive';
        } else if (prompt.includes('主题') || prompt.includes('深色') || prompt.includes('浅色')) {
          baseName = 'theme';
        } else if (prompt.includes('布局') || prompt.includes('网格')) {
          baseName = 'layout';
        } else {
          baseName = 'styles';
        }
      } else if (extension === 'js') {
        // JavaScript文件名生成
        if (prompt.includes('动画')) {
          baseName = 'animations';
        } else if (prompt.includes('表单') || prompt.includes('验证')) {
          baseName = 'form-validator';
        } else if (prompt.includes('轮播') || prompt.includes('幻灯片')) {
          baseName = 'slider';
        } else if (prompt.includes('模态框') || prompt.includes('弹窗')) {
          baseName = 'modal';
        } else if (prompt.includes('导航') || prompt.includes('菜单')) {
          baseName = 'navigation';
        } else if (prompt.includes('图表') || prompt.includes('数据')) {
          baseName = 'chart';
        } else if (prompt.includes('游戏')) {
          baseName = 'game';
        } else if (prompt.includes('时钟') || prompt.includes('计时器')) {
          baseName = 'timer';
        } else {
          baseName = 'main';
        }
      }

      return {
        name: `${baseName}.${extension}`,
        content: file.content
      };
    });
  }

  /**
   * 显示确认按钮
   */
  showConfirmButton() {
    const confirmBtn = document.getElementById('confirm-files-btn');
    const generateBtn = document.getElementById('generate-code-btn');

    if (confirmBtn && generateBtn) {
      // 隐藏生成按钮，显示确认按钮
      generateBtn.style.display = 'none';
      confirmBtn.style.display = 'inline-block';

      if (window.consoleManager) {
        window.consoleManager.append('info', [`🤖 AI生成完成，点击"确认并创建文件"`]);
      }
    }
  }

  /**
   * 确认创建文件
   */
  confirmCreateFiles() {
    if (!this.pendingFiles) {
      this.showError('没有待创建的文件');
      return;
    }

    try {
      const { files, generationType, targetFolder, overwrite } = this.pendingFiles;

      // 创建文件
      const createdFiles = this.createFiles(files, generationType, targetFolder, overwrite);

      this.showSuccess(`成功创建 ${files.length} 个文件`);

      // 自动打开第一个文件
      if (createdFiles.length > 0) {
        const firstFile = createdFiles[0];
        console.log(`🔄 自动打开文件: ${firstFile}`);
        this.openFileInEditor(firstFile);
      }

      // 重置按钮状态
      this.resetButtonState();

      // 清空待创建文件
      this.pendingFiles = null;

      // 关闭弹窗
      this.hideModal();

    } catch (error) {
      console.error('❌ 创建文件失败:', error);
      this.showError('创建文件失败: ' + error.message);
    }
  }

  
  /**
   * 在编辑器中打开文件
   */
  openFileInEditor(filePath) {
    try {
      console.log(`📂 在编辑器中打开文件: ${filePath}`);

      // 确保文件树已更新
      if (this.fileManager && this.fileManager.generateFileTree) {
        this.fileManager.generateFileTree();

        // 等待DOM更新完成后再选择文件
        setTimeout(() => {
          // 选择文件（这会自动加载文件内容和触发预览）
          if (this.fileManager && this.fileManager.selectFile) {
            this.fileManager.selectFile(filePath);
          }

          // 显示控制台消息
          if (window.consoleManager) {
            window.consoleManager.append('info', [`📂 已打开文件: ${filePath}`]);
          }
        }, 100);
      }

    } catch (error) {
      console.error('❌ 打开文件失败:', error);
      if (window.consoleManager) {
        window.consoleManager.append('error', [`❌ 打开文件失败: ${error.message}`]);
      }
    }
  }

  /**
   * 触发预览更新
   */
  triggerPreviewUpdate(filePath) {
    try {
      // 检查是否有预览功能
      if (window.preview && typeof window.preview.run === 'function') {
        // 获取所有编辑器内容并运行预览
        if (window.editors && typeof window.editors.getAllValues === 'function') {
          const payload = window.editors.getAllValues();
          window.preview.run(payload);
          console.log('✅ 预览已更新');
        }
      }

      // 或者通过文件管理器更新预览
      if (this.fileManager && this.fileManager.updatePreview) {
        this.fileManager.updatePreview(filePath);
      }

    } catch (error) {
      console.error('❌ 预览更新失败:', error);
    }
  }

  /**
   * 创建文件
   */
  createFiles(files, generationType, targetFolder, overwrite) {
    const createdFiles = [];

    for (const file of files) {
      let filePath = file.name;

      // 根据目标文件夹和生成类型确定文件路径
      if (targetFolder !== 'auto') {
        if (targetFolder === 'root') {
          // 根目录，不需要添加前缀
        } else {
          // 指定文件夹
          filePath = `${targetFolder}/${file.name}`;
        }
      } else if (generationType === 'separated') {
        // 自动分配模式
        if (file.name.endsWith('.html')) {
          filePath = `html/${file.name}`;
        } else if (file.name.endsWith('.css')) {
          filePath = `css/${file.name}`;
        } else if (file.name.endsWith('.js')) {
          filePath = `js/${file.name}`;
        }
      }

      // 检查文件是否已存在
      if (!overwrite && this.fileManager.files[filePath]) {
        console.warn(`⚠️ 文件已存在，跳过: ${filePath}`);
        continue;
      }

      // 添加文件到文件管理器
      if (this.fileManager && this.fileManager.addFile) {
        this.fileManager.addFile(filePath, file.content);
      }

      console.log(`✅ 创建文件: ${filePath}`);
      createdFiles.push(filePath);
    }

    // 更新文件树显示
    if (this.fileManager && this.fileManager.generateFileTree) {
      this.fileManager.generateFileTree();
    }

    return createdFiles;
  }

  /**
   * 设置加载状态
   */
  setLoadingState(loading) {
    const generateBtn = document.getElementById('generate-code-btn');
    if (generateBtn) {
      generateBtn.disabled = loading;
      const btnText = generateBtn.querySelector('.btn-text');
      const btnLoading = generateBtn.querySelector('.btn-loading');

      if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
      } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
      }
    }
  }

  /**
   * 显示成功消息
   */
  showSuccess(message) {
    this.showResponse(message, 'success');
    if (window.consoleManager) {
      window.consoleManager.append('info', [`🤖 ${message}`]);
    }
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    this.showResponse(message, 'error');
    if (window.consoleManager) {
      window.consoleManager.append('error', [`🤖 ${message}`]);
    }
  }

  /**
   * 显示响应结果
   */
  showResponse(message, type) {
    const response = document.getElementById('ai-response');
    if (response) {
      const responseContent = response.querySelector('.response-content');
      const responseStatus = response.querySelector('.response-status');

      responseContent.textContent = message;
      responseStatus.className = `response-status ${type}`;
      responseStatus.textContent = type === 'success' ? '成功' : '错误';

      response.style.display = 'block';
    }
  }
}