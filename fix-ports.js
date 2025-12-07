// 修复端口的脚本
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'main.html');
let content = fs.readFileSync(filePath, 'utf8');

// 替换所有 5025 为 5024
const count = (content.match(/localhost:5025/g) || []).length;
content = content.replace(/localhost:5025/g, 'localhost:5024');

fs.writeFileSync(filePath, content, 'utf8');
console.log(`已替换 ${count} 处 localhost:5025 为 localhost:5024`);
