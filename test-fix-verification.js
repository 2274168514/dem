
// 模拟浏览器环境
const window = {
    editors: {
        getValue: (type) => {
            if (type === 'html') return '<html>这是学生修改后的HTML代码</html>';
            if (type === 'css') return 'body { color: red; } /* 学生修改的CSS */';
            if (type === 'js') return 'console.log("学生修改的JS");';
            return '';
        }
    },
    fileManager: {
        files: {
            // 模拟旧数据：有些是字符串，有些是对象，且内容是旧的
            'html/index.html': '<html>原始默认HTML</html>', 
            'css/style.css': { content: 'body { color: blue; } /* 原始默认CSS */' },
            'js/main.js': 'console.log("原始默认JS");'
        }
    }
};

console.log('--- 测试开始 ---');
console.log('1. 初始状态 (fileManager中的数据):');
console.log(JSON.stringify(window.fileManager.files, null, 2));

console.log('\n2. 编辑器中的最新数据 (模拟学生输入):');
console.log('HTML:', window.editors.getValue('html'));
console.log('CSS:', window.editors.getValue('css'));
console.log('JS:', window.editors.getValue('js'));

console.log('\n3. 执行修复后的同步逻辑...');

// --- 这里是修复后的核心逻辑 (从 main.js 复制) ---

// FIX: 强制从编辑器同步最新内容到 fileManager
if (window.editors && window.fileManager) {
    try {
    // 同步 HTML
    const htmlContent = window.editors.getValue('html');
    if (htmlContent !== undefined) {
        window.fileManager.files['html/index.html'] = htmlContent;
    }
    
    // 同步 CSS
    const cssContent = window.editors.getValue('css');
    if (cssContent !== undefined) {
        window.fileManager.files['css/style.css'] = cssContent;
    }
    
    // 同步 JS
    const jsContent = window.editors.getValue('js');
    if (jsContent !== undefined) {
        window.fileManager.files['js/main.js'] = jsContent;
    }
    console.log('✅ 已从编辑器同步最新代码到文件管理器');
    } catch (e) {
    console.error('同步编辑器内容失败:', e);
    }
}

const files = [];
const allFiles = window.fileManager.files;

// 检查数据结构并使用相应的方法
if (typeof allFiles === 'object') {
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

// --- 逻辑结束 ---

console.log('\n4. 最终收集到的提交数据 (files数组):');
console.log(JSON.stringify(files, null, 2));

// 验证结果
const htmlFile = files.find(f => f.name === 'html/index.html');
const cssFile = files.find(f => f.name === 'css/style.css');

let success = true;
if (htmlFile.content !== '<html>这是学生修改后的HTML代码</html>') {
    console.error('❌ HTML内容未更新！');
    success = false;
}
if (cssFile.content !== 'body { color: red; } /* 学生修改的CSS */') {
    console.error('❌ CSS内容未更新！');
    success = false;
}

if (success) {
    console.log('\n✅ 测试通过！逻辑可以正确捕获学生的修改。');
} else {
    console.log('\n❌ 测试失败！');
}
