/**
 * 批量修复所有文件中的端口配置
 * 将 localhost:5025 替换为 localhost:5024
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
    'index.html',
    'public/index.html'
];

const baseDir = __dirname;

console.log('🔧 开始修复端口配置...\n');

let totalFixed = 0;

filesToFix.forEach(file => {
    const filePath = path.join(baseDir, file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 文件不存在: ${file}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 统计替换次数
    const matches = (content.match(/localhost:5025/g) || []).length;
    
    if (matches === 0) {
        console.log(`✅ ${file}: 已经是正确的端口配置`);
        return;
    }
    
    // 执行替换
    const newContent = content.replace(/localhost:5025/g, 'localhost:5024');
    
    // 写入文件
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    totalFixed += matches;
    console.log(`✅ ${file}: 修复了 ${matches} 处端口配置`);
});

console.log(`\n🎉 完成！共修复 ${totalFixed} 处端口配置`);
console.log('📌 所有 API 调用现在使用正确的端口 5024');
