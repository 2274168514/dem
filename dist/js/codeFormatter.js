/**
 * 代码格式化工具模块
 * 提供HTML、CSS、JavaScript代码的美化格式化功能
 */
export class CodeFormatter {
    constructor() {
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 10;
        this.init();
    }

    /**
     * 初始化格式化工具
     */
    init() {
        console.log('🚀 CodeFormatter 初始化开始');

        // 延迟初始化，确保编辑器已经准备好
        this.delayedInit();
    }

    /**
     * 延迟初始化方法
     */
    delayedInit() {
        if (window.editors && window.editors.getCodemirrorInstance) {
            console.log('✅ 编辑器实例已就绪，开始绑定事件');
            this.bindEvents();
            this.initialized = true;
        } else if (this.retryCount < this.maxRetries) {
            console.log(`⏳ 等待编辑器实例就绪... (${this.retryCount + 1}/${this.maxRetries})`);
            this.retryCount++;
            setTimeout(() => this.delayedInit(), 500);
        } else {
            console.error('❌ 编辑器实例初始化超时，无法绑定格式化事件');
            this.showNotification('代码格式化功能初始化失败', 'error');
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        console.log('🔗 开始绑定格式化和清空按钮事件');

        // 格式化按钮事件
        const formatButtons = document.querySelectorAll('.format-btn');
        console.log(`📋 找到 ${formatButtons.length} 个格式化按钮`);
        formatButtons.forEach((btn, index) => {
            console.log(`🔗 绑定格式化按钮 ${index}:`, btn.dataset.file);
            btn.addEventListener('click', (e) => {
                console.log('📋 格式化按钮被点击:', e.currentTarget);
                // 使用currentTarget而不是target，确保获取到绑定事件的元素
                const fileType = e.currentTarget.dataset.file;
                if (fileType) {
                    this.formatCode(fileType);
                } else {
                    console.warn('⚠️ 格式化按钮没有data-file属性:', e.currentTarget);
                }
            });
        });

        // 清空按钮事件
        const clearButtons = document.querySelectorAll('.clear-btn');
        console.log(`🗑️ 找到 ${clearButtons.length} 个清空按钮`);
        clearButtons.forEach((btn, index) => {
            console.log(`🔗 绑定清空按钮 ${index}:`, btn.dataset.file);
            btn.addEventListener('click', (e) => {
                console.log('🗑️ 清空按钮被点击:', e.currentTarget);
                // 使用currentTarget而不是target，确保获取到绑定事件的元素
                const fileType = e.currentTarget.dataset.file;
                if (fileType) {
                    this.clearCode(fileType);
                } else {
                    console.warn('⚠️ 清空按钮没有data-file属性:', e.currentTarget);
                }
            });
        });

        console.log('✅ 所有按钮事件绑定完成');
    }

    /**
     * 格式化代码
     */
    formatCode(fileType) {
        try {
            console.log(`🎯 开始格式化 ${fileType} 代码`);

            // 验证fileType参数
            if (!fileType || typeof fileType !== 'string') {
                console.error('❌ 无效的文件类型参数:', fileType);
                this.showNotification('无法格式化：无效的文件类型', 'error');
                return;
            }

            // 检查是否已初始化
            if (!this.initialized) {
                this.showNotification('代码格式化功能正在初始化中，请稍后再试', 'warning');
                return;
            }

            const editor = this.getEditor(fileType);
            if (!editor) {
                console.error(`❌ 未找到 ${fileType} 编辑器`);
                this.showNotification(`未找到 ${fileType} 编辑器`, 'error');
                return;
            }

            const code = editor.getValue();
            console.log(`📝 原始代码长度: ${code.length} 字符`);
            if (!code.trim()) {
                this.showNotification('代码为空，无需格式化', 'info');
                return;
            }

            let formattedCode = '';

            switch (fileType) {
                case 'html':
                    formattedCode = this.formatHTML(code);
                    break;
                case 'css':
                    formattedCode = this.formatCSS(code);
                    break;
                case 'js':
                    formattedCode = this.formatJavaScript(code);
                    break;
                default:
                    console.warn(`⚠️ 不支持的文件类型: ${fileType}`);
                    return;
            }

            // 设置格式化后的代码
            editor.setValue(formattedCode);

            // 触发文件保存
            if (window.fileManager) {
                window.fileManager.saveCurrentFile();
            }

            this.showNotification(`${fileType.toUpperCase()} 代码格式化完成`, 'success');
            console.log(`✅ ${fileType.toUpperCase()} 代码已格式化`);

        } catch (error) {
            console.error(`❌ 格式化 ${fileType} 代码失败:`, error);
            this.showNotification(`格式化失败: ${error.message}`, 'error');
        }
    }

    /**
     * 清空代码
     */
    clearCode(fileType) {
        try {
            console.log(`🎯 开始清空 ${fileType} 代码`);

            // 验证fileType参数
            if (!fileType || typeof fileType !== 'string') {
                console.error('❌ 无效的文件类型参数:', fileType);
                this.showNotification('无法清空：无效的文件类型', 'error');
                return;
            }

            // 检查是否已初始化
            if (!this.initialized) {
                this.showNotification('代码格式化功能正在初始化中，请稍后再试', 'warning');
                return;
            }

            const editor = this.getEditor(fileType);
            if (!editor) {
                console.error(`❌ 未找到 ${fileType} 编辑器`);
                this.showNotification(`未找到 ${fileType} 编辑器`, 'error');
                return;
            }

            const currentCode = editor.getValue();
            console.log(`📝 当前代码长度: ${currentCode.length} 字符`);
            if (!currentCode.trim()) {
                this.showNotification('代码已经为空', 'info');
                return;
            }

            // 确认对话框
            if (confirm(`确定要清空 ${fileType.toUpperCase()} 代码吗？此操作无法撤销。`)) {
                editor.setValue('');

                // 触发文件保存
                if (window.fileManager) {
                    window.fileManager.saveCurrentFile();
                }

                this.showNotification(`${fileType.toUpperCase()} 代码已清空`, 'success');
                console.log(`✅ ${fileType.toUpperCase()} 代码已清空`);
            }
        } catch (error) {
            console.error(`❌ 清空 ${fileType} 代码失败:`, error);
            this.showNotification(`清空失败: ${error.message}`, 'error');
        }
    }

    /**
     * 获取指定类型的编辑器实例
     */
    getEditor(fileType) {
        console.log(`🔍 尝试获取 ${fileType} 编辑器实例`);

        if (!window.editors) {
            console.warn('⚠️ 编辑器实例未找到');
            return null;
        }

        if (!window.editors.getCodemirrorInstance) {
            console.warn('⚠️ getCodemirrorInstance 方法不存在');
            return null;
        }

        const editor = window.editors.getCodemirrorInstance(fileType);

        if (!editor) {
            console.warn(`❌ 未找到 ${fileType} 编辑器实例`);
            // 尝试备用方法
            return this.getEditorByDirectMethod(fileType);
        }

        console.log(`✅ 成功获取 ${fileType} 编辑器实例`);
        return editor;
    }

    /**
     * 备用方法：直接获取CodeMirror实例
     */
    getEditorByDirectMethod(fileType) {
        console.log(`🔧 使用备用方法获取 ${fileType} 编辑器`);

        // 尝试通过textarea元素直接获取CodeMirror实例
        const textarea = document.getElementById(`${fileType}-code`);
        if (!textarea) {
            console.warn(`⚠️ 未找到 ${fileType}-code textarea 元素`);
            return null;
        }

        // CodeMirror会在textarea上创建一个CodeMirror实例
        const cmInstance = textarea.CodeMirror;
        if (cmInstance) {
            console.log(`✅ 通过备用方法找到 ${fileType} 编辑器实例`);
            return cmInstance;
        }

        console.warn(`❌ 备用方法也未能找到 ${fileType} 编辑器实例`);
        return null;
    }

    /**
     * 格式化HTML代码
     */
    formatHTML(html) {
        try {
            // 基础HTML格式化
            let formatted = html
                .trim()
                // 标签名大写转换
                .replace(/<\s*([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
                    return match.toLowerCase();
                })
                .replace(/<\s*\/\s*([a-z][a-z0-9]*)\s*>/gi, (match, tag) => {
                    return match.toLowerCase();
                });

            // 简单的缩进格式化
            const lines = formatted.split('\n');
            const result = [];
            let indentLevel = 0;
            const indentSize = 2;

            for (let line of lines) {
                line = line.trim();

                // 空行直接添加
                if (!line) {
                    result.push('');
                    continue;
                }

                // 闭合标签减少缩进
                if (line.startsWith('</')) {
                    indentLevel = Math.max(0, indentLevel - 1);
                }

                // 添加当前行
                result.push(' '.repeat(indentLevel * indentSize) + line);

                // 开始标签增加缩进（但不包括自闭合标签）
                if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>') && !line.includes('</')) {
                    indentLevel++;
                }
            }

            return result.join('\n');
        } catch (error) {
            console.warn('⚠️ HTML格式化失败，返回原始代码');
            return html;
        }
    }

    /**
     * 格式化CSS代码
     */
    formatCSS(css) {
        try {
            let formatted = css.trim();

            // 移除多余的空白和换行
            formatted = formatted
                // 处理选择器和大括号
                .replace(/([^{]+)\s*{\s*/g, '$1 {\n  ')
                // 处理属性和值
                .replace(/;\s*/g, ';\n  ')
                // 处理闭合大括号
                .replace(/\s*}\s*/g, '\n}\n\n')
                // 移除多余的空行
                .replace(/\n\s*\n\s*\n/g, '\n\n');

            // 修复最后一个选择器后的多余空行
            formatted = formatted.replace(/\n\n$/, '\n');

            return formatted;
        } catch (error) {
            console.warn('⚠️ CSS格式化失败，返回原始代码');
            return css;
        }
    }

    /**
     * 格式化JavaScript代码
     */
    formatJavaScript(js) {
        try {
            // 基础JavaScript格式化
            let formatted = js.trim();

            // 添加基础的换行和缩进
            formatted = formatted
                // 大括号换行
                .replace(/\s*{\s*/g, ' {\n  ')
                .replace(/;\s*/g, ';\n  ')
                // 闭合大括号换行
                .replace(/\s*}\s*/g, '\n}\n\n')
                // 函数声明换行
                .replace(/function\s+(\w+)\s*\(/g, 'function $1(\n  ')
                // if语句换行
                .replace(/if\s*\(/g, 'if (\n  ')
                // for循环换行
                .replace(/for\s*\(/g, 'for (\n  ')
                // 移除多余的空行
                .replace(/\n\s*\n\s*\n/g, '\n\n');

            // 修复最后一个函数后的多余空行
            formatted = formatted.replace(/\n\n$/, '\n');

            return formatted;
        } catch (error) {
            console.warn('⚠️ JavaScript格式化失败，返回原始代码');
            return js;
        }
    }

    /**
     * 显示通知消息
     */
    showNotification(message, type = 'info') {
        try {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);

            // 创建通知元素
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 0.75rem 1rem;
                background: ${type === 'error' ? '#ff6b81' : type === 'success' ? '#2ea043' : type === 'warning' ? '#f0b27a' : '#3ea7ff'};
                color: white;
                border-radius: 4px;
                font-size: 14px;
                z-index: 9999;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            `;
            notification.textContent = message;

            document.body.appendChild(notification);

            // 显示动画
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            });

            // 3秒后自动消失
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);

        } catch (error) {
            console.warn('⚠️ 通知显示失败:', error.message);
            // 备用方案：直接使用alert
            alert(message);
        }
    }
}

// 创建全局实例
window.codeFormatter = new CodeFormatter();