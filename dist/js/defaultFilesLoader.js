/**
 * 默认文件加载器
 * 用于加载项目默认的示例文件
 */

export class DefaultFilesLoader {
    constructor(fileManager) {
        this.fileManager = fileManager;
        this.defaultFiles = {
            'data/data.csv': `编程语言,流行度百分比,平均年薪(美元),学习难度,就业机会,主要用途
JavaScript,67.8,68000,中等,非常高,Web开发
Python,63.9,75000,简单,高,数据科学/AI/Web
Java,30.4,72000,中等,高,企业应用/安卓
TypeScript,38.5,80000,中等,高,Web开发/前端
C#,27.4,70000,中等,高,游戏开发/.NET
C++,23.5,78000,困难,中等,系统编程/游戏
PHP,21.2,55000,简单,中等,Web后端/WordPress
Go,18.3,85000,中等,中等,云计算/后端
Rust,13.2,90000,困难,低,系统编程/区块链
Swift,11.5,75000,中等,中等,iOS开发
Kotlin,9.2,73000,中等,中等,安卓开发
Ruby,5.8,65000,简单,低,Web开发/Rails
Dart,7.1,68000,简单,低,Flutter/跨平台
R,4.5,70000,中等,低,数据统计/分析`,

            'data/data.json': `{
  "title": "编程语言流行度数据分析",
  "labels": ["JavaScript", "Python", "Java", "TypeScript", "C#", "C++", "PHP", "Go", "Rust", "Swift"],
  "values": [67.8, 63.9, 60.4, 38.5, 27.4, 23.5, 21.2, 18.3, 13.2, 11.5],
  "description": "2024年开发者调查报告 - 编程语言流行度百分比",
  "categories": {
    "Web开发": ["JavaScript", "TypeScript", "PHP"],
    "数据科学": ["Python", "R", "Julia"],
    "移动开发": ["Swift", "Kotlin", "Dart"],
    "系统编程": ["C++", "Rust", "Go", "C"],
    "企业应用": ["Java", "C#", "Kotlin"]
  }
}`
        };

        this.init();
    }

    /**
     * 初始化默认文件加载器
     */
    init() {
        console.log('📁 默认文件加载器初始化...');

        // 等待文件管理器初始化完成
        setTimeout(() => {
            this.loadDefaultFiles();
        }, 1000);
    }

    /**
     * 加载默认文件
     */
    loadDefaultFiles() {
        try {
            console.log('🚀 开始加载默认文件...');

            Object.entries(this.defaultFiles).forEach(([filePath, content]) => {
                // 检查文件是否已存在
                if (!this.fileManager.files || !this.fileManager.files[filePath]) {
                    console.log(`📄 加载默认文件: ${filePath}`);

                    // 使用文件管理器添加文件
                    if (this.fileManager && this.fileManager.addFile) {
                        this.fileManager.addFile(filePath, content);
                    } else {
                        // 如果addFile方法不可用，直接操作files对象
                        if (this.fileManager && this.fileManager.files) {
                            this.fileManager.files[filePath] = content;
                        }
                    }
                } else {
                    console.log(`⚠️ 文件已存在，跳过: ${filePath}`);
                }
            });

            // 刷新文件树显示
            if (this.fileManager && this.fileManager.generateFileTree) {
                this.fileManager.generateFileTree();
                console.log('✅ 文件树已刷新');
            }

            console.log('✅ 默认文件加载完成');
        } catch (error) {
            console.error('❌ 加载默认文件失败:', error);
        }
    }

    /**
     * 确保data文件夹存在
     */
    ensureDataFolder() {
        // 这个方法可以确保data文件夹在文件树中正确显示
        if (this.fileManager && this.fileManager.files) {
            const hasDataFiles = Object.keys(this.fileManager.files).some(path =>
                path.startsWith('data/')
            );

            if (!hasDataFiles) {
                console.log('📁 检测到没有data文件夹文件，准备添加...');
            }
        }
    }
}