class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.bindEvents();
        this.render();
        this.updateStats();
    }

    bindEvents() {
        const addBtn = document.getElementById('add-btn');
        const input = document.getElementById('todo-input');
        const clearBtn = document.getElementById('clear-completed');
        const filterBtns = document.querySelectorAll('.filter-btn');

        addBtn.addEventListener('click', () => this.addTodo());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        clearBtn.addEventListener('click', () => this.clearCompleted());

        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
    }

    addTodo() {
        const input = document.getElementById('todo-input');
        const text = input.value.trim();

        if (text === '') return;

        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toLocaleString('zh-CN')
        };

        this.todos.unshift(todo);
        this.saveTodos();
        this.render();
        this.updateStats();

        input.value = '';
        input.focus();
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.render();
            this.updateStats();
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.render();
        this.updateStats();
    }

    clearCompleted() {
        this.todos = this.todos.filter(t => !t.completed);
        this.saveTodos();
        this.render();
        this.updateStats();
    }

    setFilter(filter) {
        this.currentFilter = filter;

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        this.render();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    render() {
        const todoList = document.getElementById('todo-list');
        const filteredTodos = this.getFilteredTodos();

        if (filteredTodos.length === 0) {
            todoList.innerHTML = `
                <div class="empty-state">
                    ${this.currentFilter === 'completed' ? '没有已完成的待办事项' :
                      this.currentFilter === 'active' ? '没有进行中的待办事项' :
                      '暂无待办事项，添加一个吧！'}
                </div>
            `;
            return;
        }

        todoList.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-checkbox" onclick="app.toggleTodo(${todo.id})"></div>
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <span class="todo-date">${todo.createdAt}</span>
                <button class="delete-btn" onclick="app.deleteTodo(${todo.id})">删除</button>
            </li>
        `).join('');
    }

    updateStats() {
        const totalCount = document.getElementById('total-count');
        const completedCount = document.getElementById('completed-count');
        const clearBtn = document.getElementById('clear-completed');

        totalCount.textContent = `总计: ${this.todos.length}`;
        completedCount.textContent = `已完成: ${this.todos.filter(t => t.completed).length}`;

        clearBtn.disabled = this.todos.filter(t => t.completed).length === 0;
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
const app = new TodoApp();