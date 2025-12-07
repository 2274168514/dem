/**
 * 文件操作管理器
 * 处理新建、删除、重命名、导入等文件操作
 */

export class FileOperations {
  constructor(fileManager) {
    console.log('🏗️ 构造FileOperations实例');

    if (!fileManager) {
      throw new Error('fileManager参数是必需的');
    }

    this.fileManager = fileManager;
    this.contextMenu = document.getElementById('context-menu');
    this.currentTarget = null;
    this.fileTree = document.getElementById('file-tree');

    console.log('🔍 检查必要元素:', {
      fileManager: !!fileManager,
      contextMenu: !!this.contextMenu,
      fileTree: !!this.fileTree
    });

    this.init();
  }

  /**
   * 安全获取文件扩展名
   * @param {string} filePath - 文件路径
   * @returns {string} 扩展名（小写）
   */
  getFileExtension(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return '';
      }

      const parts = filePath.split('.');
      if (parts.length < 2) {
        console.warn(`⚠️ 文件路径缺少扩展名: ${filePath}`);
        return '';
      }

      const ext = parts.pop().toLowerCase();
      if (!ext || ext.length === 0) {
        console.warn(`⚠️ 文件扩展名为空: ${filePath}`);
        return '';
      }

      return ext;
    } catch (error) {
      console.error(`❌ 获取文件扩展名失败: ${filePath}`, error);
      return '';
    }
  }

  init() {
    try {
      console.log('🚀 初始化FileOperations模块');

      // 重新获取元素引用（确保DOM已加载）
      this.fileTree = document.getElementById('file-tree');

      if (!this.fileTree) {
        console.error('❌ 找不到文件树元素，停止初始化');
        return;
      }

      console.log('✅ 文件树元素存在:', !!this.fileTree);

      // 按顺序初始化各个组件
      this.setupFileTreeEvents();
      this.setupContextMenu();
      this.setupFileImport();

      console.log('✅ FileOperations模块初始化完成');

    } catch (error) {
      console.error('❌ FileOperations初始化失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
    }
  }

  /**
   * 设置文件树事件
   */
  setupFileTreeEvents() {
    const fileTree = document.getElementById('file-tree');

    // 右键菜单
    fileTree.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const item = e.target.closest('.folder, .file');
      if (item) {
        this.currentTarget = item;
        this.showContextMenu(e.clientX, e.clientY);
      }
    });

    // 文件选择
    fileTree.addEventListener('click', (e) => {
      const file = e.target.closest('.file');
      if (file) {
        this.selectFile(file.dataset.path);
      }
    });
  }

  /**
   * 设置右键菜单
   */
  setupContextMenu() {
    const menuItems = this.contextMenu.querySelectorAll('.menu-item');

    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;

        switch (action) {
          case 'new-file':
            this.createNewFile();
            break;
          case 'new-folder':
            this.createNewFolder();
            break;
          case 'import-file':
            this.triggerFileImport();
            break;
          case 'rename':
            this.renameItem();
            break;
          case 'delete':
            this.deleteItem();
            break;
        }

        this.hideContextMenu();
      });
    });

    // 添加全局点击事件监听器，用于隐藏右键菜单
    document.addEventListener('click', (e) => {
      // 如果点击的不是右键菜单本身或菜单内的元素，则隐藏菜单
      if (!this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // 添加全局右键事件监听器，处理文件树外的右键点击
    document.addEventListener('contextmenu', (e) => {
      // 如果右键点击的不是文件树区域，隐藏菜单
      if (!this.fileTree.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // 添加键盘事件监听器，按ESC键隐藏菜单
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
      }
    });
  }

  /**
   * 选择文件
   */
  selectFile(filePath) {
    // 更新选中状态
    this.fileTree.querySelectorAll('.file').forEach(f => {
      f.classList.remove('active');
    });

    const currentFile = this.fileTree.querySelector(`[data-path="${filePath}"]`);
    if (currentFile) {
      currentFile.classList.add('active');
    }

    // 通过文件管理器处理文件选择
    if (this.fileManager && this.fileManager.selectFile) {
      this.fileManager.selectFile(filePath);
    }

    // 更新Tab管理器
    if (window.tabManager) {
      const tabManager = window.tabManager;
      const fileName = filePath.split('/').pop();

      console.log('🔄 更新Tab:', filePath, fileName);

      // 如果Tab不存在，创建新Tab
      if (!tabManager.hasTab(filePath)) {
        tabManager.createTab(filePath, fileName, true);
        console.log('✅ 创建新Tab:', filePath);
      } else {
        // 设置为活动Tab
        tabManager.setActiveTab(filePath);
        console.log('✅ 激活现有Tab:', filePath);
      }
    }
  }

  /**
   * 显示右键菜单（带动画效果）
   */
  showContextMenu(x, y) {
    // 设置初始状态
    this.contextMenu.style.opacity = '0';
    this.contextMenu.style.transform = 'scale(0.8) translateY(-10px)';
    this.contextMenu.style.display = 'block';
    this.contextMenu.style.transition = 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    // 设置位置
    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';

    // 根据目标类型调整菜单项
    const isFolder = this.currentTarget.classList.contains('folder');
    const deleteItem = this.contextMenu.querySelector('[data-action="delete"]');

    // 防止删除根文件夹
    const rootFolders = ['html', 'css', 'js', 'data'];
    if (isFolder && rootFolders.includes(this.currentTarget.dataset.path)) {
      const contents = this.currentTarget.querySelector('.folder-contents');
      const hasFiles = contents && contents.children.length > 0;
      deleteItem.style.display = hasFiles ? 'none' : 'block';
    } else {
      deleteItem.style.display = 'block';
    }

    // 触发显示动画
    setTimeout(() => {
      this.contextMenu.style.opacity = '1';
      this.contextMenu.style.transform = 'scale(1) translateY(0)';
    }, 10);

    // 添加可见类
    this.contextMenu.classList.add('visible');
    this.contextMenu.classList.remove('hidden');
  }

  /**
   * 隐藏右键菜单（带动画效果）
   */
  hideContextMenu() {
    // 添加隐藏动画
    this.contextMenu.style.opacity = '0';
    this.contextMenu.style.transform = 'scale(0.8) translateY(-10px)';

    // 更新类状态
    this.contextMenu.classList.remove('visible');
    this.contextMenu.classList.add('hidden');

    // 等待动画完成后隐藏
    setTimeout(() => {
      this.contextMenu.style.display = 'none';
      this.currentTarget = null;
    }, 200);
  }

  /**
   * 创建新文件
   */
  createNewFile() {
    console.log('🆕 开始创建新文件...');

    const folder = this.currentTarget.classList.contains('folder') ?
      this.currentTarget : this.currentTarget.parentElement;

    const contents = folder.querySelector('.folder-contents');
    if (!contents) {
      console.error('❌ 找不到文件夹内容容器');
      return;
    }

    // 确保文件夹展开
    this.ensureFolderExpanded(folder);

    const folderPath = folder.dataset.path;
    console.log('📁 目标文件夹:', folderPath);

    // 根据文件夹类型设置默认文件扩展名
    let defaultExt = 'html';
    switch (folderPath) {
      case 'html': defaultExt = 'html'; break;
      case 'css': defaultExt = 'css'; break;
      case 'js': defaultExt = 'js'; break;
      case 'data': defaultExt = 'json'; break;
    }

    const fileName = this.getUniqueFileName(folderPath, `untitled.${defaultExt}`);
    const filePath = `${folderPath}/${fileName}`;

    console.log('📝 新文件路径:', filePath);
    console.log('📝 新文件名:', fileName);

    // 创建文件元素
    const fileElement = this.createFileElement(filePath, fileName);
    console.log('✅ 文件元素创建完成');

    // 添加到DOM
    contents.appendChild(fileElement);
    console.log('✅ 文件已添加到DOM，子元素数量:', contents.children.length);

    // 添加默认内容并保存到文件管理器
    const defaultContent = this.getDefaultContent(filePath, defaultExt);
    if (this.fileManager && this.fileManager.addFile) {
      this.fileManager.addFile(filePath, defaultContent);
      console.log('✅ 文件已添加到文件管理器，内容长度:', defaultContent.length);
    }

    // 立即开始重命名
    setTimeout(() => {
      this.startEditing(fileElement.querySelector('.file-name'), (newName) => {
        console.log('✏️ 重命名完成:', newName);
        // 重命名完成后选择文件
        this.selectFile(`${folderPath}/${newName}`);
      });
    }, 100);
  }

  /**
   * 创建新文件夹
   */
  createNewFolder() {
    const folder = this.currentTarget.classList.contains('folder') ?
      this.currentTarget : this.currentTarget.parentElement;

    const contents = folder.querySelector('.folder-contents');
    if (!contents) return;

    // 确保文件夹展开
    this.ensureFolderExpanded(folder);

    const folderName = this.getUniqueFolderName(folder.dataset.path, 'New Folder');
    const folderPath = `${folder.dataset.path}/${folderName}`;

    const folderElement = this.createFolderElement(folderPath, folderName);
    contents.appendChild(folderElement);

    // 立即开始重命名
    this.startEditing(folderElement.querySelector('.folder-name'), () => {
      // 折叠新建的空文件夹
      const header = folderElement.querySelector('.folder-header');
      header.click();
    });
  }

  /**
   * 重命名项目
   */
  renameItem() {
    const nameElement = this.currentTarget.classList.contains('folder') ?
      this.currentTarget.querySelector('.folder-name') :
      this.currentTarget.querySelector('.file-name');

    this.startEditing(nameElement);
  }

  /**
   * 删除项目
   */
  deleteItem() {
    const isFolder = this.currentTarget.classList.contains('folder');
    const name = isFolder ?
      this.currentTarget.querySelector('.folder-name').textContent :
      this.currentTarget.querySelector('.file-name').textContent;

    if (confirm(`确定要删除 ${isFolder ? '文件夹' : '文件'} "${name}" 吗？`)) {
      // 从文件管理器中删除
      const filePath = this.currentTarget.dataset.path;
      if (this.fileManager && this.fileManager.deleteFile) {
        this.fileManager.deleteFile(filePath);
      }

      this.currentTarget.remove();

      // 如果删除的是当前选中的文件，清除选中状态
      if (this.currentTarget.classList.contains('file') &&
          this.currentTarget.classList.contains('active')) {
        // 选择第一个文件
        const firstFile = this.fileTree.querySelector('.file');
        if (firstFile) {
          this.selectFile(firstFile.dataset.path);
        }
      }
    }
  }

  /**
   * 确保文件夹展开
   */
  ensureFolderExpanded(folder) {
    if (!folder.classList.contains('open')) {
      folder.classList.add('open');
      const contents = folder.querySelector('.folder-contents');
      const arrow = folder.querySelector('.folder-arrow');
      if (contents && arrow) {
        contents.style.display = 'block';
        arrow.textContent = '▼';
      }
    }
  }

  /**
   * 创建文件元素
   */
  createFileElement(path, name) {
    const li = document.createElement('li');
    li.className = 'file';
    li.dataset.path = path;

    const icon = this.getFileIcon(name);
    li.innerHTML = `
      <span class="file-icon">${icon}</span>
      <span class="file-name">${name}</span>
    `;

    return li;
  }

  /**
   * 创建文件夹元素
   */
  createFolderElement(path, name) {
    const li = document.createElement('li');
    li.className = 'folder';
    li.dataset.path = path;

    li.innerHTML = `
      <div class="folder-header">
        <span class="folder-arrow">▶</span>
        <span class="folder-icon">📁</span>
        <span class="folder-name">${name}</span>
      </div>
      <ul class="folder-contents" style="display: none;"></ul>
    `;

    return li;
  }

  /**
   * 获取文件图标
   */
  getFileIcon(fileName) {
    const ext = this.getFileExtension(fileName);
    const icons = {
      'html': '📄', 'htm': '📄',
      'css': '🎨', 'scss': '🎨', 'sass': '🎨', 'less': '🎨',
      'js': '⚡', 'jsx': '⚡', 'ts': '⚡', 'tsx': '⚡',
      'json': '📊', 'csv': '📊', 'xml': '📊', 'yaml': '📊', 'yml': '📊',
      'md': '📝', 'txt': '📝',
      'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
      'webp': '🖼️', 'ico': '🖼️'
    };
    return icons[ext] || '📄';
  }

  /**
   * 开始编辑名称
   */
  startEditing(element, callback) {
    const originalText = element.textContent;
    const input = document.createElement('input');
    input.className = 'edit-input';
    input.value = originalText;

    // 设置输入框样式
    input.style.cssText = `
      background: var(--bg-color);
      color: var(--text-color);
      border: 1px solid var(--primary-color);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: inherit;
      font-family: inherit;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    `;

    element.style.display = 'none';
    element.parentNode.insertBefore(input, element);
    input.focus();
    input.select();

    const finishEdit = () => {
      const newText = input.value.trim();

      try {
        if (newText && newText !== originalText) {
          // 更新文件路径
          const item = element.closest('[data-path]');
          if (item) {
            const currentPath = item.dataset.path;
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            const newPath = `${parentPath}/${newText}`;
            item.dataset.path = newPath;

            // 通知文件管理器
            if (this.fileManager && this.fileManager.renameFile) {
              this.fileManager.renameFile(currentPath, newPath);
            }
          }
          element.textContent = newText;
        } else if (!newText) {
          element.textContent = originalText;
        }
      } catch (error) {
        console.warn('Error during edit:', error);
      }

      element.style.display = '';

      // 安全移除input元素
      if (input && input.parentNode) {
        input.parentNode.removeChild(input);
      }

      if (callback) callback();
    };

    input.addEventListener('blur', finishEdit, { once: true });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit();
      } else if (e.key === 'Escape') {
        element.textContent = originalText;
        element.style.display = '';
        if (input && input.parentNode) {
          input.parentNode.removeChild(input);
        }
      }
    });
  }

  /**
   * 获取唯一文件名
   */
  getUniqueFileName(folderPath, baseName) {
    const contents = this.fileTree.querySelector(`[data-path="${folderPath}"] .folder-contents`);
    if (!contents) return baseName;

    const existingFiles = Array.from(contents.querySelectorAll('.file')).map(
      file => file.querySelector('.file-name').textContent
    );

    let counter = 1;
    let name = baseName;

    while (existingFiles.includes(name)) {
      const parts = baseName.split('.');
      const ext = parts.pop();
      const base = parts.join('.');
      name = `${base}${counter}.${ext}`;
      counter++;
    }

    return name;
  }

  /**
   * 获取唯一文件夹名
   */
  getUniqueFolderName(parentPath, baseName) {
    const contents = this.fileTree.querySelector(`[data-path="${parentPath}"] .folder-contents`);
    if (!contents) return baseName;

    const existingFolders = Array.from(contents.querySelectorAll('.folder')).map(
      folder => folder.querySelector('.folder-name').textContent
    );

    let counter = 1;
    let name = baseName;

    while (existingFolders.includes(name)) {
      name = `${baseName} ${counter}`;
      counter++;
    }

    return name;
  }

  /**
   * 设置文件导入
   */
  setupFileImport() {
    try {
      console.log('🔧 开始设置文件导入...');

      // 检查是否已存在file-input，如果不存在则创建
      let fileInput = document.getElementById('file-input');
      console.log('🔍 初始fileInput查找结果:', !!fileInput);

      if (!fileInput) {
        console.log('🔧 创建新的文件输入元素');
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'file-input';
        fileInput.style.display = 'none';
        fileInput.multiple = true;
        fileInput.accept = '.html,.css,.js,.json,.csv,.md,.txt,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico';
        document.body.appendChild(fileInput);
        console.log('✅ 新fileInput已创建并添加到DOM');
      } else {
        console.log('✅ 使用现有的文件输入元素');
        console.log('🔍 原始fileInput属性:', {
          id: fileInput.id,
          type: fileInput.type,
          multiple: fileInput.multiple,
          accept: fileInput.accept
        });
        // 确保accept属性包含所有需要的文件类型
        fileInput.accept = '.html,.css,.js,.json,.csv,.md,.txt,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico';
        fileInput.multiple = true;
      }

      // 移除现有的事件监听器（避免重复绑定）
      const newFileInput = fileInput.cloneNode(true);
      fileInput.parentNode.replaceChild(newFileInput, fileInput);
      console.log('✅ 已重置fileInput以避免重复事件监听器');

      // 监听文件选择
      newFileInput.addEventListener('change', (e) => {
        console.log('🚀 文件输入变化事件触发，文件数量:', e.target.files.length);
        if (e.target.files.length > 0) {
          console.log('📁 即将处理导入的文件:', Array.from(e.target.files).map(f => f.name));
          this.handleFileImport(e.target.files);
          e.target.value = ''; // 重置输入
        }
      });

      // 添加标记以便调试
      newFileInput.setAttribute('data-change-listener', 'true');
      console.log('✅ 文件导入change事件监听器已绑定');

      // 绑定导入按钮事件
      this.bindImportButtons();
      console.log('✅ 文件导入设置完成');

    } catch (error) {
      console.error('❌ 设置文件导入失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
    }
  }

  /**
   * 绑定导入按钮事件
   */
  bindImportButtons() {
    try {
      console.log('🔗 开始绑定导入按钮事件');

      // 绑定工具栏中的导入按钮
      const importBtn = document.getElementById('import-btn');
      if (importBtn) {
        // 移除现有事件监听器
        const newImportBtn = importBtn.cloneNode(true);
        importBtn.parentNode.replaceChild(newImportBtn, importBtn);

        newImportBtn.addEventListener('click', () => {
          console.log('📁 工具栏导入按钮被点击');
          this.triggerFileImport();
        });
        console.log('✅ 工具栏导入按钮绑定成功');
      } else {
        console.warn('⚠️ 找不到工具栏导入按钮');
      }

    } catch (error) {
      console.error('❌ 绑定导入按钮失败:', error);
    }
  }

  /**
   * 触发文件导入
   */
  triggerFileImport() {
    try {
      console.log('🔍 开始触发文件导入...');
      const fileInput = document.getElementById('file-input');
      console.log('🔍 fileInput元素:', {
        exists: !!fileInput,
        id: fileInput?.id,
        multiple: fileInput?.multiple,
        accept: fileInput?.accept,
        hasChangeListener: fileInput?.onchange !== null || fileInput?.hasAttribute('data-change-listener')
      });

      if (fileInput) {
        console.log('🚀 触发文件导入对话框');
        fileInput.click();

        // 检查点击后是否有任何变化
        setTimeout(() => {
          console.log('🔍 文件输入状态检查:', {
            value: fileInput.value,
            filesLength: fileInput.files?.length || 0
          });
        }, 100);
      } else {
        console.error('❌ 找不到文件输入元素');
      }
    } catch (error) {
      console.error('❌ 触发文件导入失败:', error);
    }
  }

  /**
   * 处理文件导入
   */
  async handleFileImport(files) {
    console.log(`🚀 开始导入 ${files.length} 个文件`);

    for (const file of files) {
      try {
        console.log(`📁 处理文件: ${file.name} (${file.type || 'unknown type'}, ${(file.size / 1024).toFixed(2)} KB)`);

        const content = await this.readFileContent(file);
        const fileName = file.name;

        // 根据文件类型确定目标文件夹
        const folderPath = this.getFolderForFile(fileName);
        const filePath = `${folderPath}/${fileName}`;

        console.log(`📂 目标路径: ${filePath}`);

        // 添加到文件管理器
        if (this.fileManager && this.fileManager.addFile) {
          this.fileManager.addFile(filePath, content);
          console.log(`✅ 文件已添加到管理器: ${filePath}`);
        } else {
          console.warn('⚠️ 文件管理器不可用');
        }

        // 添加到文件树
        this.addFileToTree(filePath);
        console.log(`🌳 文件已添加到文件树`);

        // 如果是图片文件，显示特殊消息
        if (file.type && file.type.startsWith('image/')) {
          console.log(`🖼️ 图片文件导入成功: ${fileName}`);
          // 可以在这里添加通知或提示
        }

        console.log(`✅ 导入完成: ${fileName} -> ${folderPath}`);
      } catch (error) {
        console.error(`❌ 导入文件失败: ${file.name}`, error);
        // 可以在这里显示错误通知
      }
    }

    console.log(`🎉 文件导入处理完成`);
  }

  /**
   * 读取文件内容
   */
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  /**
   * 获取文件默认内容
   */
  getDefaultContent(filePath, fileExt) {
    // 处理图片文件的特殊情况
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(fileExt)) {
      const fileName = filePath.split('/').pop();
      return `/* 图片文件信息
 * 文件名: ${fileName}
 * 文件类型: ${fileExt.toUpperCase()} 图片
 *
 * 这是一个图片文件，包含了二进制数据。
 * 在HTML中可以通过以下方式引用:
 * <img src="../data/${fileName}" alt="${fileName}">
 *
 * 或者使用CSS背景图片:
 * background-image: url('../data/${fileName}');
 *
 * 当前显示的是图片的Data URL或二进制数据表示。
 */
`;
    }

    // 复用FileManager中的默认内容逻辑
    if (fileExt === 'html') {
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>新建HTML文件</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>这是你新建的HTML文件</p>
</body>
</html>`;
    } else if (fileExt === 'css') {
      return `/* 新建CSS文件 */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}`;
    } else if (fileExt === 'js') {
      return `// 新建JavaScript文件
console.log('Hello World!');

function main() {
  // 在这里编写你的JavaScript代码
}

document.addEventListener('DOMContentLoaded', main);`;
    } else if (fileExt === 'json') {
      return `{
  "name": "新建JSON文件",
  "version": "1.0.0",
  "description": "这是一个JSON数据文件"
}`;
    } else if (fileExt === 'md') {
      return `# 新建Markdown文件

这是一个Markdown文件。

## 功能特性

- 支持实时预览
- 支持语法高亮
- 支持文件管理`;
    } else {
      return `// ${filePath} - 新建文件
// 在这里开始编写你的代码`;
    }
  }

  /**
   * 根据文件名获取目标文件夹
   */
  getFolderForFile(fileName) {
    const ext = this.getFileExtension(fileName);

    const htmlExts = ['html', 'htm'];
    const cssExts = ['css', 'scss', 'sass', 'less'];
    const jsExts = ['js', 'jsx', 'ts', 'tsx'];
    const dataExts = ['json', 'csv', 'xml', 'yaml', 'yml'];
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'];

    if (htmlExts.includes(ext)) return 'html';
    if (cssExts.includes(ext)) return 'css';
    if (jsExts.includes(ext)) return 'js';
    if (dataExts.includes(ext) || imageExts.includes(ext)) return 'data';

    return 'js'; // 默认
  }

  /**
   * 添加文件到文件树
   */
  addFileToTree(filePath) {
    try {
      if (!filePath) {
        console.warn('⚠️ 文件路径为空');
        return;
      }

      const parts = filePath.split('/');
      if (parts.length !== 2) {
        console.warn('⚠️ 文件路径格式错误:', filePath);
        return;
      }

      const [folderPath, fileName] = filePath.split('/');

      if (!folderPath || !fileName) {
        console.warn('⚠️ 文件路径组件缺失:', { folderPath, fileName });
        return;
      }

      const folder = this.fileTree.querySelector(`[data-path="${folderPath}"]`);

      if (!folder) {
        console.warn('⚠️ 找不到目标文件夹:', folderPath);
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

      // 确保文件夹展开
      this.ensureFolderExpanded(folder);

      const fileElement = this.createFileElement(filePath, fileName);
      if (fileElement) {
        contents.appendChild(fileElement);
        console.log(`✅ 文件已添加到文件树: ${fileName}`);
      } else {
        console.warn('⚠️ 创建文件元素失败:', fileName);
      }
    } catch (error) {
      console.error('❌ 添加文件到文件树失败:', error);
    }
  }
}