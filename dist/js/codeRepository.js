/**
 * 代码库管理模块
 * 教师可以在在线编辑器中将当前代码保存为“案例”，存入本地代码库
 * 数据存储在 localStorage('oj-code-repository')，方便课堂演示和复用
 */

export class CodeRepositoryManager {
  constructor(fileManager) {
    this.fileManager = fileManager;
  }

  init() {
    console.log('🚀 CodeRepositoryManager init() 开始...');

    const saveBtn = document.getElementById('save-to-repo-btn');
    const modal = document.getElementById('code-repo-modal');
    const closeBtn = document.getElementById('close-code-repo');
    const cancelBtn = document.getElementById('cancel-code-repo');
    const form = document.getElementById('code-repo-form');

    console.log('CodeRepositoryManager DOM元素查找结果:', {
      saveBtn,
      modal,
      closeBtn,
      cancelBtn,
      form
    });

    if (!saveBtn || !modal || !form) {
      console.warn('代码库组件初始化失败：缺少必要的 DOM 元素', {
        saveBtn: !!saveBtn,
        modal: !!modal,
        form: !!form
      });
      return;
    }

    console.log('为保存按钮添加点击事件监听器...');
    saveBtn.addEventListener('click', (e) => {
      console.log('🎯 保存按钮被点击！事件对象:', e);
      e.preventDefault();
      e.stopPropagation();
      this.showModal();
    });
    console.log('点击事件监听器已添加');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideModal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideModal());
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal();
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSave();
    });

    // 如果有待打开的代码库案例，则加载到当前编辑器
    console.log('📋 即将调用 applyPendingOpen()...');
    this.applyPendingOpen();
  }

  showModal() {
    console.log('showModal() 被调用...');
    const modal = document.getElementById('code-repo-modal');
    const titleInput = document.getElementById('repo-title');
    const status = document.getElementById('code-repo-status');

    console.log('showModal DOM元素查找:', { modal, titleInput, status });

    if (!modal) {
      console.error('找不到模态框元素!');
      return;
    }

    console.log('设置模态框显示样式...');
    modal.style.display = 'flex';
    console.log('模态框应该已经显示了');

    if (status) {
      status.style.display = 'none';
      status.textContent = '';
    }

    // 如果标题为空，尝试用当前文件名或作业标题填充
    if (titleInput && !titleInput.value.trim()) {
      let defaultTitle = this.getDefaultTitleFromContext();
      if (!defaultTitle) {
        defaultTitle = '未命名案例';
      }
      titleInput.value = defaultTitle;
    }
  }

  hideModal() {
    const modal = document.getElementById('code-repo-modal');
    if (!modal) return;

    modal.style.display = 'none';
  }

  /**
   * 如果主界面请求“在编辑器中打开案例”，在初始化时加载该案例
   */
  applyPendingOpen() {
    console.log('🔍 applyPendingOpen() 开始执行...');
    try {
      const raw = localStorage.getItem('oj-current-repo-open');
      console.log('📦 localStorage 数据:', raw ? '找到数据' : '没有数据');

      if (!raw) {
        console.log('❌ 没有待打开的案例数据');
        return;
      }

      const repo = JSON.parse(raw);
      console.log('🔍 解析后的repo数据:', {
        repo: repo,
        hasFiles: !!repo.files,
        filesType: typeof repo.files,
        isArray: Array.isArray(repo.files),
        filesLength: repo.files ? repo.files.length : 'N/A',
        hasFileManager: !!this.fileManager
      });

      if (!repo || !Array.isArray(repo.files) || !this.fileManager) {
        console.error('❌ 数据验证失败:', {
          hasRepo: !!repo,
          hasFiles: !!repo.files,
          isArray: Array.isArray(repo.files),
          hasFileManager: !!this.fileManager
        });
        localStorage.removeItem('oj-current-repo-open');
        return;
      }

      console.log('🔄 开始加载代码库案例:', repo.title);
      console.log('📁 文件列表:', repo.files.map(f => f.name));

      repo.files.forEach(file => {
        if (!file || !file.name || typeof file.content !== 'string') {
          console.warn('⚠️ 跳过无效文件:', file);
          return;
        }

        // 根据文件扩展名确定文件类型
        const fileExt = file.name.split('.').pop().toLowerCase();
        let fileType = 'text';
        switch (fileExt) {
          case 'html':
          case 'htm':
            fileType = 'html';
            break;
          case 'css':
            fileType = 'css';
            break;
          case 'js':
          case 'javascript':
            fileType = 'javascript';
            break;
          default:
            fileType = 'text';
        }

        // 将文件内容添加到FileManager中
        this.fileManager.files[file.name] = {
          content: file.content,
          type: fileType,
          modified: new Date().toISOString()
        };

        // 同时更新编辑器内容
        if (this.fileManager.editors && this.fileManager.editors[fileType]) {
          this.fileManager.editors[fileType].setValue(file.content);
        }

        // 使用storage的updateFile函数来更新基本文件类型
        if (fileType === 'html') {
          this.fileManager.storage.updateFile('html', file.content);
        } else if (fileType === 'css') {
          this.fileManager.storage.updateFile('css', file.content);
        } else if (fileType === 'javascript') {
          this.fileManager.storage.updateFile('js', file.content);
        }

        console.log(`✅ 已加载文件: ${file.name} (${fileType})`);
      });

      // 重新渲染文件树
      if (typeof this.fileManager.generateFileTree === 'function') {
        this.fileManager.generateFileTree();
      }

      // 等待文件树渲染完成后再打开文件
      setTimeout(() => {
        // 打开主文件
        if (window.tabManager && typeof window.tabManager.openFile === 'function') {
          const mainFile =
            repo.files.find(f => f.name.endsWith('.html') || f.name.endsWith('.htm')) ||
            repo.files.find(f => f.name.endsWith('.js')) ||
            repo.files[0];
          if (mainFile && mainFile.name) {
            console.log('🎯 打开主文件:', mainFile.name);
            window.tabManager.openFile(mainFile.name);
          }
        }
      }, 500);

      console.log('📂 已从代码库加载案例:', repo.title);
      localStorage.removeItem('oj-current-repo-open');
    } catch (error) {
      console.error('❌ 加载代码库案例失败:', error);
      localStorage.removeItem('oj-current-repo-open');
    }
  }

  /**
   * 尝试根据当前上下文生成一个默认标题
   * 优先使用作业标题，其次使用当前选中文件名
   */
  getDefaultTitleFromContext() {
    try {
      // 作业模式下，标题已经写在页面标题中
      if (document.title && document.title.includes('- OnlineJudge 代码编辑器')) {
        return document.title.replace('- OnlineJudge 代码编辑器', '').trim();
      }
    } catch (error) {
      // ignore
    }

    try {
      const activePane = document.querySelector('.pane.code-pane.is-active .pane-filename');
      if (activePane && activePane.textContent) {
        return activePane.textContent.trim().replace(/\.[^.]+$/, '') || null;
      }
    } catch (error) {
      // ignore
    }

    return null;
  }

  handleSave() {
    const titleInput = document.getElementById('repo-title');
    const descInput = document.getElementById('repo-description');
    const categoryInput = document.getElementById('repo-category');
    const difficultySelect = document.getElementById('repo-difficulty');
    const tagsInput = document.getElementById('repo-tags');
    const publicCheckbox = document.getElementById('repo-public');
    const status = document.getElementById('code-repo-status');

    if (!titleInput) {
      return;
    }

    const title = titleInput.value.trim();
    if (!title) {
      this.showStatus('请输入案例标题', false);
      return;
    }

    const description = descInput ? descInput.value.trim() : '';
    const category = categoryInput ? categoryInput.value.trim() : '';
    const difficulty = difficultySelect ? difficultySelect.value : 'easy';
    const tags = tagsInput && tagsInput.value.trim()
      ? tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const isPublic = publicCheckbox ? !!publicCheckbox.checked : true;

    const files = this.collectCurrentFiles();
    if (files.length === 0) {
      this.showStatus('当前没有可保存的代码文件', false);
      return;
    }

    const author = this.getCurrentUserName();
    const now = new Date().toISOString();

    const repoItem = {
      id: `repo_${Date.now()}`,
      title,
      description,
      category,
      difficulty,
      tags,
      isPublic,
      author,
      createdAt: now,
      files
    };

    try {
      const list = this.loadRepositoryList();
      list.unshift(repoItem);
      localStorage.setItem('oj-code-repository', JSON.stringify(list));

      this.showStatus('案例已保存到本地代码库', true);

      // 短暂延时后关闭对话框
      setTimeout(() => {
        this.hideModal();
      }, 800);
    } catch (error) {
      console.error('保存代码库案例失败:', error);
      this.showStatus('保存失败，请稍后重试', false);
    }
  }

  /**
   * 收集当前虚拟文件系统中的文件
   */
  collectCurrentFiles() {
    const files = [];

    if (!this.fileManager || !this.fileManager.files) {
      return files;
    }

    try {
      // fileManager.files 是一个 Map
      this.fileManager.files.forEach((fileData, fileName) => {
        if (!fileData || typeof fileData.content !== 'string') {
          return;
        }

        const content = fileData.content.trim();
        if (!content) {
          return;
        }

        const type = fileName.endsWith('.html')
          ? 'html'
          : fileName.endsWith('.css')
          ? 'css'
          : fileName.endsWith('.js')
          ? 'javascript'
          : 'text';

        files.push({
          name: fileName,
          content,
          type
        });
      });
    } catch (error) {
      console.error('收集文件失败:', error);
    }

    return files;
  }

  /**
   * 从 localStorage 加载当前代码库列表
   */
  loadRepositoryList() {
    try {
      const stored = localStorage.getItem('oj-code-repository');
      if (stored) {
        const list = JSON.parse(stored);
        return Array.isArray(list) ? list : [];
      }
      return [];
    } catch (error) {
      console.error('加载代码库列表失败:', error);
      return [];
    }
  }

  /**
   * 获取当前登录用户姓名（用于显示案例作者）
   */
  getCurrentUserName() {
    try {
      const userStr = localStorage.getItem('oj-current-user');
      if (!userStr) return '本地用户';
      const user = JSON.parse(userStr);
      return user.fullName || user.username || '本地用户';
    } catch (error) {
      return '本地用户';
    }
  }

  showStatus(message, success) {
    const status = document.getElementById('code-repo-status');
    if (!status) return;

    status.textContent = message;
    status.classList.remove('error-message', 'success-message');
    status.classList.add(success ? 'success-message' : 'error-message');
    status.style.display = 'block';
  }
}
