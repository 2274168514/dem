class NotesApp {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.currentCategory = '全部';
        this.searchTerm = '';

        this.categories = ['全部', '工作', '学习', '生活', '创意', '其他'];

        this.init();
    }

    init() {
        this.loadNotes();
        this.bindEvents();
        this.renderCategories();
        this.renderNotes();
    }

    bindEvents() {
        // 搜索功能
        const searchBtn = document.getElementById('search-btn');
        const closeSearchBtn = document.getElementById('close-search');
        const searchInput = document.getElementById('search-input');
        const searchBar = document.getElementById('search-bar');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                searchBar.classList.remove('hidden');
                searchInput.focus();
            });
        }

        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => {
                searchBar.classList.add('hidden');
                searchInput.value = '';
                this.searchTerm = '';
                this.renderNotes();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderNotes();
            });
        }

        // 新建笔记
        const newNoteBtn = document.getElementById('new-note-btn');
        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => {
                this.createNewNote();
            });
        }

        // 编辑器按钮
        const saveBtn = document.getElementById('save-note');
        const cancelBtn = document.getElementById('cancel-note');
        const deleteBtn = document.getElementById('delete-note');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCurrentNote();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.cancelEdit();
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteCurrentNote();
            });
        }

        // 实时保存
        const titleInput = document.getElementById('note-title');
        const contentTextarea = document.getElementById('note-content');

        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.updateWordCount();
                this.updateNotePreview();
            });
        }

        if (contentTextarea) {
            contentTextarea.addEventListener('input', () => {
                this.updateWordCount();
                this.updateNotePreview();
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+S 保存
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.currentNote) {
                    this.saveCurrentNote();
                }
            }
            // Ctrl+N 新建
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.createNewNote();
            }
            // Escape 取消编辑
            if (e.key === 'Escape') {
                this.cancelEdit();
            }
        });
    }

    loadNotes() {
        const savedNotes = localStorage.getItem('notes-app-data');
        if (savedNotes) {
            try {
                this.notes = JSON.parse(savedNotes);
            } catch (e) {
                console.error('加载笔记失败:', e);
                this.notes = this.getDefaultNotes();
            }
        } else {
            this.notes = this.getDefaultNotes();
        }
    }

    getDefaultNotes() {
        return [
            {
                id: this.generateId(),
                title: '欢迎使用智能记事本',
                content: '这是一个功能完整的记事本应用。\n\n主要功能：\n• 创建和编辑笔记\n• 分类管理\n• 实时搜索\n• 自动保存\n• 字数统计\n\n点击"新建"按钮开始创建你的第一条笔记吧！',
                category: '其他',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                title: '待办事项模板',
                content: '今日待办：\n\n☐ 完成项目报告\n☐ 回复重要邮件\n☐ 准备明天的会议\n☐ 学习新技术\n☐ 锻炼身体\n\n记得及时完成并标记完成状态！',
                category: '工作',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                title: '学习笔记',
                content: 'JavaScript 学习要点：\n\n1. 变量和数据类型\n2. 函数和作用域\n3. 对象和数组\n4. 异步编程\n5. DOM操作\n\n重要概念：\n• 闭包\n• 原型链\n• 事件循环\n• Promise/async-await',
                category: '学习',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    saveNotes() {
        localStorage.setItem('notes-app-data', JSON.stringify(this.notes));
    }

    renderCategories() {
        const categoryList = document.getElementById('category-list');
        if (!categoryList) return;

        categoryList.innerHTML = this.categories.map(category => {
            const count = category === '全部'
                ? this.notes.length
                : this.notes.filter(note => note.category === category).length;

            return `
                <div class="category-item ${this.currentCategory === category ? 'active' : ''}"
                     data-category="${category}">
                    <span>${category}</span>
                    <span class="category-count">${count}</span>
                </div>
            `;
        }).join('');

        // 绑定分类点击事件
        categoryList.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                const category = item.dataset.category;
                this.currentCategory = category;
                this.renderCategories();
                this.renderNotes();
            });
        });
    }

    renderNotes() {
        const content = document.querySelector('.content');
        if (!content) return;

        let filteredNotes = this.notes;

        // 按分类过滤
        if (this.currentCategory !== '全部') {
            filteredNotes = filteredNotes.filter(note => note.category === this.currentCategory);
        }

        // 按搜索词过滤
        if (this.searchTerm) {
            filteredNotes = filteredNotes.filter(note =>
                note.title.toLowerCase().includes(this.searchTerm) ||
                note.content.toLowerCase().includes(this.searchTerm)
            );
        }

        // 按更新时间排序
        filteredNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        if (filteredNotes.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <h3>暂无笔记</h3>
                    <p>点击"新建"按钮创建你的第一条笔记</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="notes-list">
                ${filteredNotes.map(note => this.renderNoteItem(note)).join('')}
            </div>
        `;

        // 绑定笔记项点击事件
        content.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.note-actions')) {
                    const noteId = item.dataset.noteId;
                    this.editNote(noteId);
                }
            });
        });
    }

    renderNoteItem(note) {
        const preview = note.content.length > 100
            ? note.content.substring(0, 100) + '...'
            : note.content;

        const date = new Date(note.updatedAt).toLocaleDateString();

        return `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-header">
                    <h3 class="note-title">${note.title}</h3>
                    <div class="note-meta">
                        <span class="note-category">${note.category}</span>
                        <span>${date}</span>
                    </div>
                </div>
                <div class="note-preview">${preview.replace(/\n/g, ' ')}</div>
                <div class="note-actions">
                    <button class="btn-edit" onclick="notesApp.editNote('${note.id}')">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn-delete" onclick="notesApp.deleteNote('${note.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    }

    createNewNote() {
        this.currentNote = {
            id: this.generateId(),
            title: '',
            content: '',
            category: '其他',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.showEditor();
    }

    editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNote = { ...note };
        this.showEditor();
    }

    showEditor() {
        const content = document.querySelector('.content');
        const notesList = content.querySelector('.notes-list');
        const editor = content.querySelector('.editor');

        if (notesList) notesList.style.display = 'none';
        if (editor) editor.classList.add('active');

        // 填充编辑器内容
        const titleInput = document.getElementById('note-title');
        const contentTextarea = document.getElementById('note-content');
        const categorySelect = document.getElementById('note-category');

        if (titleInput) titleInput.value = this.currentNote.title;
        if (contentTextarea) contentTextarea.value = this.currentNote.content;
        if (categorySelect) {
            categorySelect.innerHTML = this.categories
                .filter(cat => cat !== '全部')
                .map(cat => `<option value="${cat}" ${this.currentNote.category === cat ? 'selected' : ''}>${cat}</option>`)
                .join('');
        }

        this.updateWordCount();

        // 聚焦标题输入框
        if (titleInput) {
            setTimeout(() => titleInput.focus(), 100);
        }
    }

    saveCurrentNote() {
        if (!this.currentNote) return;

        const titleInput = document.getElementById('note-title');
        const contentTextarea = document.getElementById('note-content');
        const categorySelect = document.getElementById('note-category');

        if (titleInput && contentTextarea && categorySelect) {
            this.currentNote.title = titleInput.value.trim() || '无标题';
            this.currentNote.content = contentTextarea.value;
            this.currentNote.category = categorySelect.value;
            this.currentNote.updatedAt = new Date().toISOString();

            // 检查是否为新笔记
            const existingIndex = this.notes.findIndex(n => n.id === this.currentNote.id);
            if (existingIndex >= 0) {
                this.notes[existingIndex] = this.currentNote;
            } else {
                this.notes.unshift(this.currentNote);
            }

            this.saveNotes();
            this.hideEditor();
            this.renderCategories();
            this.renderNotes();
        }
    }

    deleteNote(noteId) {
        if (confirm('确定要删除这条笔记吗？')) {
            this.notes = this.notes.filter(note => note.id !== noteId);
            this.saveNotes();
            this.renderCategories();
            this.renderNotes();
        }
    }

    deleteCurrentNote() {
        if (this.currentNote && confirm('确定要删除这条笔记吗？')) {
            this.notes = this.notes.filter(note => note.id !== this.currentNote.id);
            this.saveNotes();
            this.hideEditor();
            this.renderCategories();
            this.renderNotes();
        }
    }

    cancelEdit() {
        this.currentNote = null;
        this.hideEditor();
    }

    hideEditor() {
        const content = document.querySelector('.content');
        const notesList = content.querySelector('.notes-list');
        const editor = content.querySelector('.editor');

        if (notesList) notesList.style.display = 'block';
        if (editor) editor.classList.remove('active');

        this.currentNote = null;
    }

    updateWordCount() {
        const contentTextarea = document.getElementById('note-content');
        const wordCount = document.getElementById('word-count');

        if (contentTextarea && wordCount) {
            const text = contentTextarea.value;
            const charCount = text.length;
            const wordCountText = text.trim() ? text.trim().split(/\s+/).length : 0;

            wordCount.textContent = `字数: ${wordCountText} | 字符: ${charCount}`;
        }
    }

    updateNotePreview() {
        // 这里可以添加实时预览功能
        // 暂时只更新字数统计
        this.updateWordCount();
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.notesApp = new NotesApp();
    console.log('记事本应用已加载');
});