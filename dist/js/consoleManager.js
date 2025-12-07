/**
 * 增强控制台管理器
 * 提供调试控制台、终端、问题面板的完整功能
 */

const ConsoleManager = (function() {
    let instance = null;

    /**
     * 控制台管理器类
     */
    class ConsoleManager {
        constructor() {
            if (instance) {
                return instance;
            }

            this.currentTab = 'console';
            this.outputEl = document.getElementById('console-output');
            this.terminalOutputEl = null;
            this.problemsOutputEl = null;
            this.filters = {
                log: true,
                info: true,
                warn: true,
                error: true
            };
            this.consoleHistory = [];
            this.terminalHistory = [];
            this.problems = [];
            this.maxHistorySize = 1000;

            this.init();
            instance = this;
        }

        /**
         * 初始化控制台
         */
        init() {
            // 确保DOM已加载
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeComponents();
                });
            } else {
                this.initializeComponents();
            }
        }

        /**
         * 初始化各个组件
         */
        initializeComponents() {
            try {
                // 等待一小段时间确保DOM完全渲染
                setTimeout(() => {
                    this.setupTabSwitching();
                    this.setupFilters();
                    this.setupClearButton();
                    this.createTerminalPanel();
                    this.createProblemsPanel();
                    this.overrideConsoleMethods();
                    this.setupKeyboardShortcuts();
                    console.log('✅ 控制台管理器初始化完成');
                }, 50);
            } catch (error) {
                console.error('❌ 控制台管理器初始化失败:', error);
            }
        }

        /**
         * 设置Tab切换功能
         */
        setupTabSwitching() {
            const tabs = document.querySelectorAll('.panel-tab');
            const panels = {
                '调试控制台': this.outputEl.parentElement,
                '终端': null, // 将在createTerminalPanel中创建
                '问题': null // 将在createProblemsPanel中创建
            };

            tabs.forEach(tab => {
                if (tab.id === 'toggle-console') return;

                tab.addEventListener('click', () => {
                    // 移除所有active状态
                    tabs.forEach(t => t.classList.remove('is-active'));
                    tab.classList.add('is-active');

                    // 切换面板显示
                    const tabText = tab.textContent;
                    Object.keys(panels).forEach(key => {
                        if (panels[key]) {
                            panels[key].style.display = key === tabText ? 'block' : 'none';
                        }
                    });

                    // 特殊处理终端和问题面板
                    if (tabText === '终端') {
                        this.terminalOutputEl.parentElement.style.display = 'block';
                        this.outputEl.parentElement.style.display = 'none';
                        if (this.problemsOutputEl) {
                            this.problemsOutputEl.parentElement.style.display = 'none';
                        }
                    } else if (tabText === '问题') {
                        this.problemsOutputEl.parentElement.style.display = 'block';
                        this.outputEl.parentElement.style.display = 'none';
                        if (this.terminalOutputEl) {
                            this.terminalOutputEl.parentElement.style.display = 'none';
                        }
                    } else {
                        this.outputEl.parentElement.style.display = 'block';
                        if (this.terminalOutputEl) {
                            this.terminalOutputEl.parentElement.style.display = 'none';
                        }
                        if (this.problemsOutputEl) {
                            this.problemsOutputEl.parentElement.style.display = 'none';
                        }
                    }

                    this.currentTab = tabText === '调试控制台' ? 'console' :
                                     tabText === '终端' ? 'terminal' : 'problems';

                    // 如果切换到终端，聚焦输入框
                    if (this.currentTab === 'terminal') {
                        const terminalInput = document.getElementById('terminal-input');
                        if (terminalInput) {
                            terminalInput.focus();
                        }
                    }
                });
            });
        }

        /**
         * 创建终端面板
         */
        createTerminalPanel() {
            try {
                if (!this.outputEl || !this.outputEl.parentElement) {
                    console.warn('⚠️ 控制台输出元素不存在，跳过终端面板创建');
                    return;
                }

                const consoleContent = this.outputEl.parentElement;

                // 检查是否已经存在终端面板
                if (document.getElementById('terminal-output')) {
                    this.terminalOutputEl = document.getElementById('terminal-output');
                    return;
                }

                // 创建终端容器
                const terminalContainer = document.createElement('div');
                terminalContainer.className = 'console-content';
                terminalContainer.style.display = 'none';
                terminalContainer.innerHTML = `
                    <div class="terminal-output" id="terminal-output"></div>
                    <div class="terminal-input-container">
                        <span class="terminal-prompt">$</span>
                        <input type="text" id="terminal-input" class="terminal-input" placeholder="输入命令..." autocomplete="off">
                    </div>
                `;

                consoleContent.parentElement.appendChild(terminalContainer);
                this.terminalOutputEl = document.getElementById('terminal-output');

                // 设置终端输入处理
                const terminalInput = document.getElementById('terminal-input');
                if (terminalInput) {
                    terminalInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            this.executeTerminalCommand(terminalInput.value.trim());
                            terminalInput.value = '';
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            this.navigateTerminalHistory('up');
                        } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            this.navigateTerminalHistory('down');
                        }
                    });
                }
            } catch (error) {
                console.error('❌ 创建终端面板失败:', error);
            }
        }

        /**
         * 创建问题面板
         */
        createProblemsPanel() {
            try {
                if (!this.outputEl || !this.outputEl.parentElement) {
                    console.warn('⚠️ 控制台输出元素不存在，跳过问题面板创建');
                    return;
                }

                const consoleContent = this.outputEl.parentElement;

                // 检查是否已经存在问题面板
                if (document.getElementById('problems-output')) {
                    this.problemsOutputEl = document.getElementById('problems-output');
                    return;
                }

                // 创建问题容器
                const problemsContainer = document.createElement('div');
                problemsContainer.className = 'console-content';
                problemsContainer.style.display = 'none';
                problemsContainer.innerHTML = `
                    <div class="problems-header">
                        <div class="problems-count">
                            <span class="error-count">0 错误</span>
                            <span class="warning-count">0 警告</span>
                            <span class="info-count">0 信息</span>
                        </div>
                        <button class="clear-problems-btn">清空问题</button>
                    </div>
                    <div class="problems-output" id="problems-output"></div>
                `;

                consoleContent.parentElement.appendChild(problemsContainer);
                this.problemsOutputEl = document.getElementById('problems-output');

                // 设置清空问题按钮
                const clearProblemsBtn = problemsContainer.querySelector('.clear-problems-btn');
                if (clearProblemsBtn) {
                    clearProblemsBtn.addEventListener('click', () => {
                        this.clearProblems();
                    });
                }
            } catch (error) {
                console.error('❌ 创建问题面板失败:', error);
            }
        }

        /**
         * 设置过滤器功能
         */
        setupFilters() {
            const filterButtons = document.querySelectorAll('.filter-chip');

            filterButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const level = btn.dataset.level;
                    this.filters[level] = !this.filters[level];
                    btn.classList.toggle('is-active', this.filters[level]);
                    this.applyFilters();
                });
            });
        }

        /**
         * 设置清空按钮
         */
        setupClearButton() {
            const clearButton = document.getElementById('clear-console');
            clearButton.addEventListener('click', () => {
                if (this.currentTab === 'console') {
                    this.clearConsole();
                } else if (this.currentTab === 'terminal') {
                    this.clearTerminal();
                } else if (this.currentTab === 'problems') {
                    this.clearProblems();
                }
            });
        }

        /**
         * 重写控制台方法
         */
        overrideConsoleMethods() {
            const originalLog = console.log;
            const originalInfo = console.info;
            const originalWarn = console.warn;
            const originalError = console.error;

            console.log = (...args) => {
                originalLog.apply(console, args);
                this.append('log', args);
            };

            console.info = (...args) => {
                originalInfo.apply(console, args);
                this.append('info', args);
            };

            console.warn = (...args) => {
                originalWarn.apply(console, args);
                this.append('warn', args);
            };

            console.error = (...args) => {
                originalError.apply(console, args);
                this.append('error', args);
            };
        }

        /**
         * 设置键盘快捷键
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl+` 切换控制台
                if (e.ctrlKey && e.key === '`') {
                    e.preventDefault();
                    this.toggleConsole();
                }
                // Ctrl+L 清空当前面板
                if (e.ctrlKey && e.key === 'l') {
                    e.preventDefault();
                    if (this.currentTab === 'console') {
                        this.clearConsole();
                    } else if (this.currentTab === 'terminal') {
                        this.clearTerminal();
                    }
                }
            });
        }

        /**
         * 添加控制台消息
         */
        append(level, args = []) {
            const timestamp = new Date().toLocaleTimeString();
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg, null, 2);
                }
                return String(arg);
            }).join(' ');

            const line = document.createElement('div');
            line.className = `console-line console-line-${level}`;
            line.dataset.level = level;
            line.innerHTML = `
                <span class="console-timestamp">[${timestamp}]</span>
                <span class="console-level">[${level.toUpperCase()}]</span>
                <span class="console-message">${this.escapeHtml(message)}</span>
            `;

            if (!this.filters[level]) {
                line.classList.add('is-hidden');
            }

            this.outputEl.appendChild(line);
            this.outputEl.scrollTop = this.outputEl.scrollHeight;

            // 添加到历史记录
            this.consoleHistory.push({ level, message, timestamp });
            if (this.consoleHistory.length > this.maxHistorySize) {
                this.consoleHistory.shift();
            }
        }

        /**
         * 执行终端命令
         */
        executeTerminalCommand(command) {
            if (!command.trim()) return;

            // 添加命令到历史记录
            this.terminalHistory.push(command);
            if (this.terminalHistory.length > this.maxHistorySize) {
                this.terminalHistory.shift();
            }

            // 显示命令
            const commandLine = document.createElement('div');
            commandLine.className = 'terminal-line terminal-command';
            commandLine.innerHTML = `<span class="terminal-prompt">$</span> ${this.escapeHtml(command)}`;
            this.terminalOutputEl.appendChild(commandLine);

            // 执行命令
            try {
                const result = this.processCommand(command);
                if (result) {
                    const outputLine = document.createElement('div');
                    outputLine.className = 'terminal-line terminal-output';
                    outputLine.textContent = result;
                    this.terminalOutputEl.appendChild(outputLine);
                }
            } catch (error) {
                const errorLine = document.createElement('div');
                errorLine.className = 'terminal-line terminal-error';
                errorLine.textContent = `Error: ${error.message}`;
                this.terminalOutputEl.appendChild(errorLine);
            }

            this.terminalOutputEl.scrollTop = this.terminalOutputEl.scrollHeight;
        }

        /**
         * 处理终端命令
         */
        processCommand(command) {
            const cmd = command.toLowerCase();
            const args = command.split(' ').slice(1);

            switch (cmd) {
                case 'help':
                    return `可用命令:
  help - 显示帮助信息
  clear - 清空终端
  date - 显示当前时间
  echo [text] - 输出文本
  ls - 列出文件
  pwd - 显示当前目录
  whoami - 显示用户信息
  calc [expression] - 简单计算器
  color [color] - 改变终端颜色`;

                case 'clear':
                    this.clearTerminal();
                    return null;

                case 'date':
                    return new Date().toString();

                case 'echo':
                    return args.join(' ');

                case 'pwd':
                    return '/web-editor';

                case 'whoami':
                    return 'web-developer';

                case 'ls':
                    return 'html/  css/  js/  data/  lib/';

                default:
                    if (cmd.startsWith('calc ')) {
                        try {
                            const expression = args.join(' ');
                            return `= ${eval(expression)}`;
                        } catch {
                            return '计算错误';
                        }
                    }
                    return `未知命令: ${cmd}。输入 'help' 查看可用命令。`;
            }
        }

        /**
         * 导航终端历史记录
         */
        navigateTerminalHistory(direction) {
            const terminalInput = document.getElementById('terminal-input');
            if (!terminalInput) return;

            // 这里可以实现历史记录导航
            // 暂时简化处理
        }

        /**
         * 添加问题
         */
        addProblem(severity, message, file = '', line = 0, column = 0) {
            const problem = {
                id: Date.now() + Math.random(),
                severity,
                message,
                file,
                line,
                column,
                timestamp: new Date()
            };

            this.problems.push(problem);
            this.renderProblems();
            this.updateProblemsCount();
        }

        /**
         * 渲染问题列表
         */
        renderProblems() {
            this.problemsOutputEl.innerHTML = '';

            if (this.problems.length === 0) {
                this.problemsOutputEl.innerHTML = '<div class="no-problems">没有问题</div>';
                return;
            }

            this.problems.forEach(problem => {
                const problemEl = document.createElement('div');
                problemEl.className = `problem-item problem-${problem.severity}`;
                problemEl.innerHTML = `
                    <div class="problem-header">
                        <span class="problem-severity">${problem.severity.toUpperCase()}</span>
                        <span class="problem-location">${problem.file}:${problem.line}:${problem.column}</span>
                    </div>
                    <div class="problem-message">${this.escapeHtml(problem.message)}</div>
                `;
                this.problemsOutputEl.appendChild(problemEl);
            });
        }

        /**
         * 更新问题计数
         */
        updateProblemsCount() {
            const errorCount = this.problems.filter(p => p.severity === 'error').length;
            const warningCount = this.problems.filter(p => p.severity === 'warning').length;
            const infoCount = this.problems.filter(p => p.severity === 'info').length;

            const countEl = document.querySelector('.problems-count');
            if (countEl) {
                countEl.innerHTML = `
                    <span class="error-count">${errorCount} 错误</span>
                    <span class="warning-count">${warningCount} 警告</span>
                    <span class="info-count">${infoCount} 信息</span>
                `;
            }
        }

        /**
         * 应用过滤器
         */
        applyFilters() {
            const lines = this.outputEl.querySelectorAll('.console-line');
            lines.forEach(line => {
                const level = line.dataset.level;
                line.classList.toggle('is-hidden', this.filters[level] === false);
            });
        }

        /**
         * 清空控制台
         */
        clearConsole() {
            this.outputEl.innerHTML = '';
            this.consoleHistory = [];
            this.append('info', ['控制台已清空']);
        }

        /**
         * 清空终端
         */
        clearTerminal() {
            this.terminalOutputEl.innerHTML = '';
            this.terminalHistory = [];
        }

        /**
         * 清空问题
         */
        clearProblems() {
            this.problems = [];
            this.renderProblems();
            this.updateProblemsCount();
        }

        /**
         * 清空所有内容（控制台、终端、问题）
         */
        clear() {
            this.clearConsole();
            this.clearTerminal();
            this.clearProblems();
        }

        /**
         * 切换控制台显示（带动画效果）
         */
        toggleConsole() {
            const consolePanel = document.getElementById('console-panel');
            const restoreBtn = document.getElementById('restore-console');
            const isHidden = consolePanel.style.display === 'none';

            if (isHidden) {
                // 显示控制台动画
                consolePanel.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                consolePanel.style.opacity = '0';
                consolePanel.style.transform = 'translateY(20px)';
                consolePanel.style.display = 'block';

                setTimeout(() => {
                    consolePanel.style.opacity = '1';
                    consolePanel.style.transform = 'translateY(0)';
                }, 10);

                // 隐藏恢复按钮
                restoreBtn.style.transition = 'opacity 0.2s ease';
                restoreBtn.style.opacity = '0';
                setTimeout(() => {
                    restoreBtn.style.display = 'none';
                }, 200);
            } else {
                // 隐藏控制台动画
                consolePanel.style.transition = 'all 0.2s ease';
                consolePanel.style.opacity = '0';
                consolePanel.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    consolePanel.style.display = 'none';
                }, 200);

                // 显示恢复按钮
                restoreBtn.style.transition = 'opacity 0.2s ease';
                restoreBtn.style.opacity = '0';
                restoreBtn.style.display = 'flex';

                setTimeout(() => {
                    restoreBtn.style.opacity = '1';
                }, 10);
            }
        }

        /**
         * HTML转义
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        /**
         * 获取控制台统计信息
         */
        getStats() {
            return {
                consoleMessages: this.consoleHistory.length,
                terminalCommands: this.terminalHistory.length,
                problems: this.problems.length,
                currentTab: this.currentTab
            };
        }
    }

    return {
        /**
         * 初始化控制台管理器
         */
        init() {
            return new ConsoleManager();
        },

        /**
         * 获取控制台管理器实例
         */
        getInstance() {
            return instance;
        }
    };
})();

export default ConsoleManager;