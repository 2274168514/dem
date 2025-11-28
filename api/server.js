/**
 * 简单的Node.js后端API服务器
 * 用于处理前端与MySQL数据库的交互
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5024;

// 数据库配置
const dbConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123123',
    database: 'programming_platform',
    charset: 'utf8mb4'
};

// 性能监控对象
const performanceMonitor = {
    startTime: Date.now(),
    requestCount: 0,
    errorCount: 0,
    responseTimes: [],
    activeConnections: 0,
    maxConnections: 0,
    dbQueries: 0,
    dbErrors: 0,

    recordRequest(startTime) {
        const responseTime = Date.now() - startTime;
        this.responseTimes.push(responseTime);
        // 只保留最近1000个响应时间记录
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
        this.requestCount++;
    },

    recordError() {
        this.errorCount++;
    },

    recordDBQuery() {
        this.dbQueries++;
    },

    recordDBError() {
        this.dbErrors++;
    },

    getStats() {
        const uptime = Date.now() - this.startTime;
        const avgResponseTime = this.responseTimes.length > 0
            ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
            : 0;

        const sorted = [...this.responseTimes].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

        return {
            uptime: uptime,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount * 100).toFixed(2) : 0,
            avgResponseTime: avgResponseTime.toFixed(2),
            p95ResponseTime: p95,
            p99ResponseTime: p99,
            activeConnections: this.activeConnections,
            maxConnections: this.maxConnections,
            dbQueries: this.dbQueries,
            dbErrors: this.dbErrors,
            dbErrorRate: this.dbQueries > 0 ? (this.dbErrors / this.dbQueries * 100).toFixed(2) : 0,
            qps: (this.requestCount / (uptime / 1000)).toFixed(2)
        };
    },

    reset() {
        this.startTime = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        this.responseTimes = [];
        this.dbQueries = 0;
        this.dbErrors = 0;
    }
};

// 中间件 - 配置CORS允许前端访问
app.use(cors({
  origin: ['http://localhost:5020', 'http://localhost:5021', 'http://localhost:5024', 'http://localhost:5025', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:5020', 'http://127.0.0.1:5021', 'http://127.0.0.1:5024', 'http://127.0.0.1:5025', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '200mb' }));

// 为API响应设置UTF-8编码
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads', 'mdresource');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // 处理中文文件名编码 - 尝试多种编码方式
    let originalname = file.originalname;

    // 如果文件名包含非ASCII字符，尝试解码
    if (/[^\x00-\x7F]/.test(originalname)) {
      try {
        // 尝试从latin1解码
        originalname = Buffer.from(originalname, 'latin1').toString('utf8');
      } catch (e) {
        try {
          // 尝试从binary解码
          originalname = Buffer.from(originalname, 'binary').toString('utf8');
        } catch (e2) {
          // 如果都失败，保持原样但清理非法字符
          originalname = originalname.replace(/[^\x00-\x7F]/g, '?');
        }
      }
    }

    cb(null, uniqueSuffix + '-' + originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 允许的文件类型
    const allowedTypes = [
      'application/pdf',
      'text/markdown',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // 视频类型
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/mpeg',
      'video/3gpp',
      'video/x-flv'
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(md|markdown|pdf|ppt|pptx|doc|docx|xls|xlsx|jpg|jpeg|png|gif|webp|svg|mp4|webm|ogg|mov|avi|wmv|flv|mkv|3gp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型: ' + file.mimetype));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB限制
  }
});

// 静态文件服务（服务于前端文件）
app.use(express.static(__dirname));

// 上传文件静态访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 设置CSP策略以处理浏览器扩展
app.use((req, res, next) => {
    // 允许必要的资源，但限制危险的操作
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "img-src 'self' data: blob: https:; " +
        "media-src 'self' blob: https:; " +
        "connect-src 'self' ws: wss:; " +
        "frame-src 'self' https://view.officeapps.live.com https://docs.google.com; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self';"
    );

    // 设置其他安全头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    next();
});

// 错误处理中间件 - 处理multer错误
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件太大，请上传小于500MB的文件'
      });
    }
    return res.status(400).json({
      success: false,
      message: `文件上传错误: ${error.message}`
    });
  }

  // 其他错误
  console.error('服务器错误:', error);
  // 确保返回JSON而不是HTML
  res.status(500).json({
    success: false,
    message: '服务器内部错误: ' + (error.message || '未知错误')
  });
});

// 数据库连接池
let pool;

async function initDatabase() {
    try {
        // 首先尝试不使用连接池测试连接
        const connection = await mysql.createConnection(dbConfig);
        await connection.ping();
        await connection.end();

        // 然后创建连接池（支持高并发）
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 50,      // 增加到50个并发连接
            queueLimit: 100,          // 设置队列限制为100
            acquireTimeout: 60000,    // 获取连接超时时间（60秒）
            timeout: 60000,           // 查询超时时间（60秒）
            reconnect: true,          // 自动重连
            idleTimeout: 300000,      // 空闲连接超时时间（5分钟）
            maxIdle: 10               // 最大空闲连接数
        });

        console.log('✅ 数据库连接成功');
        return true;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        return false;
    }
}

// 创建文档表（如果不存在）
async function createDocumentsTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS documents (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL COMMENT '用户ID',
            title VARCHAR(200) NOT NULL COMMENT '文档标题',
            description TEXT COMMENT '文档描述',
            content LONGBLOB COMMENT '文档内容（Markdown或PDF二进制）',
            type ENUM('markdown', 'pdf', 'ppt', 'doc', 'xls', 'video', 'audio', 'image') NOT NULL COMMENT '文档类型',
            file_path VARCHAR(500) COMMENT '文件存储路径',
            file_size BIGINT COMMENT '文件大小（字节）',
            mime_type VARCHAR(100) COMMENT 'MIME类型',
            is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_user (user_id),
            INDEX idx_type (type),
            INDEX idx_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档表'
    `);

    // 检查并修改content字段类型为LONGBLOB（如果已存在但类型不对）
    try {
        // 获取当前content字段的类型信息
        const columns = await query(`
            SELECT COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'documents'
            AND COLUMN_NAME = 'content'
        `);

        if (columns.length > 0) {
            const columnType = columns[0].COLUMN_TYPE.toUpperCase();
            if (!columnType.includes('LONGBLOB') && !columnType.includes('BLOB')) {
                console.log('🔄 检测到content字段类型不是LONGBLOB，正在修改...');
                await query(`
                    ALTER TABLE documents
                    MODIFY COLUMN content LONGBLOB COMMENT '文档内容（Markdown或PDF二进制）'
                `);
                console.log('✅ content字段类型已成功修改为LONGBLOB');
            }
        }
    } catch (error) {
        console.log('ℹ️ 检查content字段类型时出错（可能是新表）:', error.message);
    }
}

// 设置文档相关的API路由
function setupDocumentRoutes() {

    // 通用数据库查询接口
    app.post('/api/database/query', async (req, res) => {
        try {
            const { sql, params } = req.body;

            if (!sql) {
                return res.status(400).json({
                    success: false,
                    message: 'SQL查询语句不能为空'
                });
            }

            // 安全检查：只允许SELECT查询
            if (!sql.trim().toLowerCase().startsWith('select')) {
                return res.status(400).json({
                    success: false,
                    message: '只允许SELECT查询'
                });
            }

            const results = await query(sql, params || []);

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            console.error('查询失败:', error);
            res.status(500).json({
                success: false,
                message: '查询失败: ' + error.message
            });
        }
    });

    // 创建文档
    app.post('/api/documents', async (req, res) => {
        try {
            const { user_id, title, description, content, type, is_public } = req.body;

            if (!user_id || !title || !type) {
                return res.status(400).json({
                    success: false,
                    message: '用户ID、标题和类型不能为空'
                });
            }

            const result = await query(`
                INSERT INTO documents (user_id, title, description, content, type, is_public)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [user_id, title, description || '', content || '', type, is_public || false]);

            res.json({
                success: true,
                message: '文档创建成功',
                data: {
                    id: result.insertId,
                    user_id,
                    title,
                    description,
                    content,
                    type,
                    is_public
                }
            });
        } catch (error) {
            console.error('创建文档失败:', error);
            res.status(500).json({
                success: false,
                message: '创建文档失败: ' + error.message
            });
        }
    });

    // 更新文档
    app.put('/api/documents/:id', async (req, res) => {
        try {
            const docId = req.params.id;
            const { user_id, title, description, content, type, is_public } = req.body;

            if (!user_id || !title || !type) {
                return res.status(400).json({
                    success: false,
                    message: '用户ID、标题和类型不能为空'
                });
            }

            // 检查文档是否存在且属于该用户
            const docs = await query(`
                SELECT id FROM documents WHERE id = ? AND user_id = ?
            `, [docId, user_id]);

            if (docs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文档不存在或无权限修改'
                });
            }

            await query(`
                UPDATE documents
                SET title = ?, description = ?, content = ?, type = ?, is_public = ?, updated_at = NOW()
                WHERE id = ? AND user_id = ?
            `, [title, description || '', content || '', type, is_public || false, docId, user_id]);

            res.json({
                success: true,
                message: '文档更新成功'
            });
        } catch (error) {
            console.error('更新文档失败:', error);
            res.status(500).json({
                success: false,
                message: '更新文档失败: ' + error.message
            });
        }
    });

    // 获取文档列表
    app.get('/api/documents', async (req, res) => {
        try {
            const { user_id, type, page = 1, limit = 10 } = req.query;

            let whereClause = 'WHERE 1=1';
            let params = [];

            if (user_id) {
                whereClause += ' AND user_id = ?';
                params.push(parseInt(user_id));
            }

            if (type) {
                whereClause += ' AND type = ?';
                params.push(type);
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offsetNum = (pageNum - 1) * limitNum;

            console.log('文档查询参数:', { pageNum, limitNum, offsetNum, params });

            // 获取总数
            const countResult = await query(`
                SELECT COUNT(*) as total FROM documents ${whereClause}
            `, params);

            // 获取文档列表 - 简化版本用于调试
            let documentsQuery, documentsParams;

            if (params.length === 0) {
                // 没有WHERE条件时直接查询
                documentsQuery = `
                    SELECT d.*, u.username, u.full_name as user_name
                    FROM documents d
                    LEFT JOIN users u ON d.user_id = u.id
                    ORDER BY d.created_at DESC
                    LIMIT ${limitNum} OFFSET ${offsetNum}
                `;
                documentsParams = [];
            } else {
                // 有WHERE条件时使用参数化查询
                documentsQuery = `
                    SELECT d.*, u.username, u.full_name as user_name
                    FROM documents d
                    LEFT JOIN users u ON d.user_id = u.id
                    ${whereClause}
                    ORDER BY d.created_at DESC
                    LIMIT ${limitNum} OFFSET ${offsetNum}
                `;
                documentsParams = params;
            }

            console.log('文档查询SQL:', documentsQuery);
            console.log('文档查询参数:', documentsParams);

            const documents = await query(documentsQuery, documentsParams);

            res.json({
                success: true,
                data: documents,
                pagination: {
                    page: parseInt(page),
                    limit: limitNum,
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limitNum)
                }
            });
        } catch (error) {
            console.error('获取文档列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取文档列表失败: ' + error.message
            });
        }
    });

    // 获取单个文档
    app.get('/api/documents/:id', async (req, res) => {
        try {
            const docId = req.params.id;

            const docs = await query(`
                SELECT * FROM documents WHERE id = ?
            `, [docId]);

            if (docs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文档不存在'
                });
            }

            res.json({
                success: true,
                data: docs[0]
            });
        } catch (error) {
            console.error('获取文档失败:', error);
            res.status(500).json({
                success: false,
                message: '获取文档失败: ' + error.message
            });
        }
    });

    // 删除文档
    app.delete('/api/documents/:id', async (req, res) => {
        try {
            const docId = req.params.id;

            await query(`
                DELETE FROM documents WHERE id = ?
            `, [docId]);

            res.json({
                success: true,
                message: '文档删除成功'
            });
        } catch (error) {
            console.error('删除文档失败:', error);
            res.status(500).json({
                success: false,
                message: '删除文档失败: ' + error.message
            });
        }
    });

    // 上传文档文件
    app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: '没有上传文件'
                });
            }

            const { type, user_id } = req.body;
            const file = req.file;

            // 验证用户ID
            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    message: '用户ID不能为空'
                });
            }

            try {
                // 处理中文文件名编码
                const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

                // 读取文件内容
                const fileContent = fs.readFileSync(file.path);

                // 对于PDF文件，将内容存储到数据库中
                let contentValue = null;
                let filePathValue = null;

                if (file.mimetype === 'application/pdf') {
                    // PDF文件：将二进制内容存储到数据库
                    contentValue = fileContent;
                    console.log('PDF文件大小:', fileContent.length, '字节');

                    // 使用原始连接执行二进制数据插入
                    const connection = await mysql.createConnection(dbConfig);
                    try {
                        const [result] = await connection.execute(`
                            INSERT INTO documents (user_id, title, description, type, file_path, file_size, mime_type, content)
                            VALUES (?, ?, '', ?, ?, ?, ?, ?)
                        `, [user_id, originalname, type, filePathValue, file.size, file.mimetype, contentValue]);

                        await connection.end();

                        // 对于PDF文件，删除临时文件（因为内容已存储在数据库中）
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                            console.log('已删除PDF临时文件:', file.path);
                        }

                        res.json({
                            success: true,
                            message: 'PDF文件已成功存储到数据库',
                            data: {
                                id: result.insertId,
                                fileName: originalname,
                                filePath: filePathValue,
                                size: file.size,
                                type: type,
                                storedInDatabase: true
                            }
                        });
                        return; // 提前返回，避免执行下面的代码
                    } catch (connError) {
                        await connection.end();
                        throw connError;
                    }
                } else {
                    // 其他文件：只存储文件路径
                    filePathValue = 'uploads/documents/' + file.filename;
                }

                const result = await query(`
                    INSERT INTO documents (user_id, title, description, type, file_path, file_size, mime_type, content)
                    VALUES (?, ?, '', ?, ?, ?, ?, ?)
                `, [user_id, originalname, type, filePathValue, file.size, file.mimetype, contentValue]);

                // 对于PDF文件，删除临时文件（因为内容已存储在数据库中）
                if (file.mimetype === 'application/pdf' && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                    console.log('已删除PDF临时文件:', file.path);
                }

                res.json({
                    success: true,
                    message: file.mimetype === 'application/pdf' ? 'PDF文件已成功存储到数据库' : '文件上传成功',
                    data: {
                        id: result.insertId,
                        fileName: originalname,
                        filePath: filePathValue,
                        size: file.size,
                        type: type,
                        storedInDatabase: file.mimetype === 'application/pdf'
                    }
                });
            } catch (dbError) {
                console.error('保存文档信息失败:', dbError);
                // 删除已上传的文件
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                res.status(500).json({
                    success: false,
                    message: '保存文档信息失败: ' + dbError.message
                });
            }
        } catch (error) {
            console.error('上传文档失败:', error);
            res.status(500).json({
                success: false,
                message: '上传文档失败: ' + error.message
            });
        }
    });

    // 文件下载API
    app.get('/api/documents/:id/download', async (req, res) => {
        try {
            const docId = req.params.id;

            // 获取文档信息
            const docs = await query(`
                SELECT * FROM documents WHERE id = ?
            `, [docId]);

            if (docs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '文档不存在'
                });
            }

            const doc = docs[0];

            // 检查文件是否存储在数据库中（PDF文件）
            if (doc.mime_type === 'application/pdf' && doc.content) {
                console.log('从数据库提供PDF文件:', doc.title);

                // 设置响应头
                res.setHeader('Content-Type', doc.mime_type);
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.title)}"`);
                res.setHeader('Content-Length', doc.content.length);

                // 直接从数据库发送文件内容
                res.send(doc.content);
                return;
            }

            // 对于存储在文件系统中的文件
            if (!doc.file_path) {
                return res.status(404).json({
                    success: false,
                    message: '文件路径不存在'
                });
            }

            const filePath = path.join(__dirname, doc.file_path);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    message: '文件不存在'
                });
            }

            // 设置下载头 - 处理中文文件名
            const filename = Buffer.from(doc.title, 'utf8').toString('latin1');
            res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', doc.file_size || 0);

            // 发送文件
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

        } catch (error) {
            console.error('下载文档失败:', error);
            res.status(500).json({
                success: false,
                message: '下载文档失败: ' + error.message
            });
        }
    });

    // 文件预览API（通过iframe可访问的URL）
    app.get('/api/documents/:id/view', async (req, res) => {
        try {
            const docId = req.params.id;

            // 获取文档信息
            const docs = await query(`
                SELECT * FROM documents WHERE id = ?
            `, [docId]);

            if (docs.length === 0) {
                return res.status(404).send('文档不存在');
            }

            const doc = docs[0];

            // 检查文件是否存储在数据库中（PDF文件）
            if (doc.mime_type === 'application/pdf' && doc.content) {
                console.log('从数据库提供PDF预览:', doc.title);

                // 设置响应头用于内联显示
                res.setHeader('Content-Type', doc.mime_type);
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.title)}"`);
                res.setHeader('Content-Length', doc.content.length);
                res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时

                // 允许跨域iframe嵌入
                res.setHeader('X-Frame-Options', 'ALLOWALL');
                res.setHeader('Access-Control-Allow-Origin', '*');

                // 直接从数据库发送文件内容
                res.send(doc.content);
                return;
            }

            // 对于存储在文件系统中的文件
            if (!doc.file_path) {
                return res.status(404).send('文件路径不存在');
            }

            const filePath = path.join(__dirname, doc.file_path);

            if (!fs.existsSync(filePath)) {
                return res.status(404).send('文件不存在');
            }

            // 设置适当的Content-Type - 处理中文文件名
            const filename = Buffer.from(doc.title, 'utf8').toString('latin1');
            res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.setHeader('Content-Length', doc.file_size || 0);

            // 允许跨域iframe嵌入（覆盖全局设置）
            res.setHeader('X-Frame-Options', 'ALLOWALL');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // 发送文件用于预览
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

        } catch (error) {
            console.error('预览文档失败:', error);
            res.status(500).send('预览文档失败: ' + error.message);
        }
    });
}

// 数据库查询函数
async function query(sql, params = []) {
    if (!pool) {
        throw new Error('数据库连接池未初始化');
    }

    // 记录数据库查询
    performanceMonitor.recordDBQuery();

    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        // 记录数据库错误
        performanceMonitor.recordDBError();
        console.error('❌ 数据库查询错误:', error.message);
        throw new Error(`数据库查询失败: ${error.message}`);
    }
}

// 创建数据库表（如果不存在）
async function createTablesIfNotExists() {
    // 课程表
    await query(`
        CREATE TABLE IF NOT EXISTS courses (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(200) NOT NULL COMMENT '课程标题',
            description TEXT COMMENT '课程描述',
            teacher_id INT NOT NULL COMMENT '教师ID，外键关联users表',
            category VARCHAR(100) DEFAULT '编程基础' COMMENT '课程分类',
            difficulty ENUM('初级', '中级', '高级') DEFAULT '初级' COMMENT '课程难度',
            tags JSON COMMENT '课程标签，JSON数组格式',
            cover_image VARCHAR(500) COMMENT '封面图片URL',
            status ENUM('草稿', '已发布', '已结束') DEFAULT '草稿' COMMENT '课程状态',
            max_students INT DEFAULT 50 COMMENT '最大学生数量',
            current_students INT DEFAULT 0 COMMENT '当前学生数量',
            start_date DATE COMMENT '开课日期',
            end_date DATE COMMENT '结课日期',
            is_public BOOLEAN DEFAULT TRUE COMMENT '是否公开课程',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_teacher (teacher_id),
            INDEX idx_status (status),
            INDEX idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表'
    `);

    // 课程选课表
    await query(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            course_id INT NOT NULL COMMENT '课程ID',
            student_id INT NOT NULL COMMENT '学生ID',
            enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '选课时间',
            status ENUM('已选课', '已完成', '已退课') DEFAULT '已选课' COMMENT '选课状态',
            progress DECIMAL(5,2) DEFAULT 0.00 COMMENT '课程进度百分比',
            completion_date TIMESTAMP NULL COMMENT '完成时间',
            UNIQUE KEY unique_enrollment (course_id, student_id),
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_course (course_id),
            INDEX idx_student (student_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程选课表'
    `);

    // 作业表
    await query(`
        CREATE TABLE IF NOT EXISTS assignments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            course_id INT NOT NULL COMMENT '所属课程ID',
            title VARCHAR(200) NOT NULL COMMENT '作业标题',
            description TEXT COMMENT '作业描述',
            instructions TEXT COMMENT '作业说明和要求',
            teacher_id INT NOT NULL COMMENT '创建作业的教师ID',
            assignment_type ENUM('编程练习', '项目作业', '测验', '考试') DEFAULT '编程练习' COMMENT '作业类型',
            difficulty ENUM('简单', '中等', '困难') DEFAULT '中等' COMMENT '作业难度',
            template_files JSON COMMENT '模板文件，JSON格式存储文件结构',
            example_solution JSON COMMENT '示例解决方案，JSON格式存储代码',
            test_cases JSON COMMENT '测试用例，JSON格式存储输入输出',
            max_attempts INT DEFAULT 0 COMMENT '最大提交次数，0表示无限制',
            time_limit INT DEFAULT 120 COMMENT '时间限制（分钟）',
            start_time TIMESTAMP NULL COMMENT '开始时间',
            end_time TIMESTAMP NULL COMMENT '截止时间',
            max_score DECIMAL(5,2) DEFAULT 100.00 COMMENT '满分',
            allow_late_submission BOOLEAN DEFAULT FALSE COMMENT '是否允许迟交',
            auto_grade BOOLEAN DEFAULT TRUE COMMENT '是否自动评分',
            is_published BOOLEAN DEFAULT FALSE COMMENT '是否已发布',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_course (course_id),
            INDEX idx_teacher (teacher_id),
            INDEX idx_type (assignment_type),
            INDEX idx_published (is_published),
            INDEX idx_start_end (start_time, end_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作业表'
    `);

    // 作业提交表
    await query(`
        CREATE TABLE IF NOT EXISTS assignment_submissions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            assignment_id INT NOT NULL COMMENT '作业ID',
            student_id INT NOT NULL COMMENT '学生ID',
            submission_files JSON COMMENT '提交的文件，JSON格式存储文件结构',
            score DECIMAL(5,2) DEFAULT 0.00 COMMENT '得分',
            max_score DECIMAL(5,2) DEFAULT 100.00 COMMENT '满分',
            submission_status ENUM('已提交', '已评分', '需要重做') DEFAULT '已提交' COMMENT '提交状态',
            feedback TEXT COMMENT '教师反馈',
            teacher_comments TEXT COMMENT '教师评语',
            auto_test_results JSON COMMENT '自动测试结果',
            plagiarism_check JSON COMMENT '抄袭检查结果',
            submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
            graded_time TIMESTAMP NULL COMMENT '评分时间',
            graded_by INT NULL COMMENT '评分教师ID',
            attempt_count INT DEFAULT 1 COMMENT '提交次数',
            FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE KEY unique_submission (assignment_id, student_id),
            INDEX idx_assignment (assignment_id),
            INDEX idx_student (student_id),
            INDEX idx_status (submission_status),
            INDEX idx_score (score)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作业提交表'
    `);

    // 插入示例课程数据
    try {
        const existingCourses = await query('SELECT COUNT(*) as count FROM courses');
        if (existingCourses[0].count === 0) {
        await query(`
            INSERT INTO courses (title, description, teacher_id, category, difficulty, tags, status, max_students, start_date, end_date) VALUES
            ('Web前端开发基础', '学习HTML、CSS和JavaScript基础知识，掌握现代Web开发技术', 6, '前端开发', '初级', '["HTML", "CSS", "JavaScript", "Web"]', '已发布', 30, '2025-11-01', '2025-12-31'),
            ('Python编程入门', '从零开始学习Python编程，包括基础语法、数据结构和面向对象编程', 6, '后端开发', '初级', '["Python", "编程基础", "算法"]', '已发布', 40, '2025-11-15', '2026-01-15'),
            ('数据结构与算法', '深入理解常用数据结构和算法，提升编程能力和问题解决技巧', 6, '计算机科学', '中级', '["数据结构", "算法", "编程思维"]', '草稿', 25, '2025-12-01', '2026-02-28')
        `);

        // 为示例课程添加选课记录 - 为所有学生用户自动分配课程
        try {
            // 获取所有学生用户
            const students = await query('SELECT id FROM users WHERE role = ?', ['student']);

            // 为每个学生分配到所有课程
            for (const student of students) {
                await query(`
                    INSERT IGNORE INTO course_enrollments (course_id, student_id, status, progress)
                    VALUES (1, ?, '已选课', ?), (2, ?, '已选课', ?)
                `, [student.id, Math.random() * 50, student.id, Math.random() * 80]);
            }

            console.log(`✅ 已为 ${students.length} 个学生创建课程报名记录`);
        } catch (enrollmentError) {
            console.log('⚠️ 课程报名记录创建失败:', enrollmentError.message);
        }

        console.log('✅ 已创建示例课程数据');
        }
    } catch (error) {
        // 忽略示例数据插入错误，表可能刚创建
        console.log('ℹ️  示例数据插入跳过或失败:', error.message);
    }
}

// 检查并添加用户表缺失的字段
async function checkAndAddUserTableFields() {
    try {
        console.log('🔍 检查用户表字段...');

        // 获取用户表的字段信息
        const columns = await query('SHOW COLUMNS FROM users');
        const columnNames = columns.map(col => col.Field);

        console.log('📋 当前用户表字段:', columnNames);

        // 需要添加的字段（按正确顺序）
        const requiredFields = [
            { name: 'student_id', sql: 'ADD COLUMN student_id VARCHAR(50) DEFAULT NULL COMMENT \'学号\' AFTER role' },
            { name: 'major', sql: 'ADD COLUMN major VARCHAR(100) DEFAULT NULL COMMENT \'专业\' AFTER student_id' },
            { name: 'grade', sql: 'ADD COLUMN grade VARCHAR(50) DEFAULT NULL COMMENT \'年级\' AFTER major' },
            { name: 'employee_id', sql: 'ADD COLUMN employee_id VARCHAR(50) DEFAULT NULL COMMENT \'工号\' AFTER grade' },
            { name: 'department', sql: 'ADD COLUMN department VARCHAR(100) DEFAULT NULL COMMENT \'院系\' AFTER employee_id' },
            { name: 'phone', sql: 'ADD COLUMN phone VARCHAR(20) DEFAULT NULL COMMENT \'手机号\' AFTER department' }
        ];

        // 检查每个字段并添加缺失的字段
        for (const field of requiredFields) {
            if (!columnNames.includes(field.name)) {
                console.log(`➕ 添加缺失字段: ${field.name}`);
                await query(`ALTER TABLE users ${field.sql}`);
                console.log(`✅ 已添加字段: ${field.name}`);
            } else {
                console.log(`✅ 字段已存在: ${field.name}`);
            }
        }

        console.log('✅ 用户表字段检查完成');

    } catch (error) {
        console.error('❌ 检查用户表字段失败:', error.message);
        throw error;
    }
}

// 用户登录API
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        console.log(`🔐 登录请求: ${username}`);

        // 查询用户
        const users = await query(
            'SELECT id, username, email, password_hash, full_name, role, student_id, employee_id, is_active, last_login FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        const user = users[0];

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: '用户账户已被禁用'
            });
        }

        // 验证密码 - 暂时使用明文比较
        if (password !== user.password_hash) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 更新最后登录时间
        await query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // 返回用户信息（不包含密码）
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            studentId: user.student_id,
            employeeId: user.employee_id,
            isActive: user.is_active,
            lastLogin: user.last_login
        };

        res.json({
            success: true,
            message: '登录成功',
            user: userResponse
        });

    } catch (error) {
        console.error('登录API错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败：' + error.message
        });
    }
});

// 获取当前用户信息API
app.get('/api/users/me', async (req, res) => {
    try {
        // 从请求头或查询参数获取用户信息
        const authHeader = req.headers.authorization;
        const userIdFromQuery = req.query.userId;

        let userId = null;

        // 尝试从不同来源获取用户ID
        if (authHeader && authHeader.startsWith('Bearer ')) {
            // 如果使用Bearer token（这里简化处理，实际项目中应该验证JWT）
            userId = authHeader.substring(7);
        } else if (userIdFromQuery) {
            // 从查询参数获取
            userId = userIdFromQuery;
        } else {
            // 从session或其他方式获取（这里简化处理）
            return res.status(401).json({
                success: false,
                message: '未提供身份验证信息'
            });
        }

        // 从数据库获取用户信息
        const users = await query(`
            SELECT id, username, email, full_name, role, student_id, employee_id,
                   department, phone, major, grade, is_active, created_at, updated_at, last_login
            FROM users
            WHERE id = ? AND is_active = 1
        `, [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在或已被禁用'
            });
        }

        const user = users[0];

        res.json({
            success: true,
            message: '获取用户信息成功',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                studentId: user.student_id,
                employeeId: user.employee_id,
                department: user.department,
                phone: user.phone,
                major: user.major,
                grade: user.grade,
                isActive: user.is_active,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        console.error('获取用户信息API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误：' + error.message
        });
    }
});

// 公开用户注册API（任何人都可以注册）
app.post('/api/public/register', async (req, res) => {
    try {
        const { username, email, password, fullName, role, studentId, employeeId, department, phone, major, grade } = req.body;

        // 参数验证 - 邮箱不再是必填项
        if (!username || !password || !fullName || !role) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        // 限制只能注册学生和教师角色
        if (!['student', 'teacher'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: '公开注册只支持学生和教师角色'
            });
        }

        // 只检查用户名是否已存在，不检查邮箱
        const existingUser = await query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 密码强度验证
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少6位'
            });
        }

        // 暂时不使用哈希，直接存储明文密码
        const passwordHash = password;

        // 如果没有提供邮箱，使用默认邮箱
        const defaultEmail = email || `${username}@example.com`;

        // 创建用户
        const result = await query(
            `INSERT INTO users (username, email, password_hash, full_name, role, student_id, employee_id, department, phone, major, grade)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, defaultEmail, passwordHash, fullName, role, studentId || null, employeeId || null, department || null, phone || null, major || null, grade || null]
        );

        console.log(`✅ 新用户注册成功: ${username} (${role})`);

        res.json({
            success: true,
            message: '注册成功！您现在可以使用账号登录了',
            userId: result.insertId
        });

    } catch (error) {
        console.error('公开注册API错误:', error);
        res.status(500).json({
            success: false,
            message: '注册失败：' + error.message
        });
    }
});

// 用户注册API（仅管理员可用）
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, email, password, fullName, role, studentId, employeeId, department, phone, major, grade } = req.body;

        // 参数验证 - 邮箱不再是必填项
        if (!username || !password || !fullName || !role) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        // 验证角色
        if (!['admin', 'teacher', 'student'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: '无效的用户角色'
            });
        }

        // 只检查用户名是否已存在，不检查邮箱
        const existingUser = await query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 密码强度验证
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少6位'
            });
        }

        // 暂时不使用哈希，直接存储明文密码
        const passwordHash = password;

        // 如果没有提供邮箱，使用默认邮箱
        const defaultEmail = email || `${username}@example.com`;

        // 创建用户
        const result = await query(
            `INSERT INTO users (username, email, password_hash, full_name, role, student_id, employee_id, department, phone, major, grade)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, defaultEmail, passwordHash, fullName, role, studentId || null, employeeId || null, department || null, phone || null, major || null, grade || null]
        );

        res.json({
            success: true,
            message: '用户创建成功',
            userId: result.insertId
        });

    } catch (error) {
        console.error('注册API错误:', error);
        res.status(500).json({
            success: false,
            message: '注册失败：' + error.message
        });
    }
});

// 获取所有用户列表（管理员功能）
app.get('/api/users', async (req, res) => {
    try {
        const { role } = req.query;

        let sql = `
            SELECT id, username, email, full_name, role,
                   student_id, employee_id, department, phone, major, is_active, last_login, created_at
            FROM users
        `;

        if (role) {
            sql += ` WHERE role = '${role}'`;
        }

        sql += ' ORDER BY created_at DESC';

        // 直接执行查询，不使用参数化查询
        const users = await query(sql, []);

        res.json({
            success: true,
            data: users,
            total: users.length
        });

    } catch (error) {
        console.error('获取用户列表API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户列表失败：' + error.message
        });
    }
});

// 更新用户信息
app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { fullName, email, studentId, employeeId, department, phone, isActive } = req.body;

        // 检查用户是否存在
        const existingUser = await query('SELECT * FROM users WHERE id = ?', [userId]);
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const user = existingUser[0];

        // 检查邮箱唯一性
        if (email && email !== user.email) {
            const emailExists = await query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            if (emailExists.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: '邮箱已被其他用户使用'
                });
            }
        }

        // 构建更新语句
        const updates = [];
        const updateParams = [];

        if (fullName !== undefined) {
            updates.push('full_name = ?');
            updateParams.push(fullName);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            updateParams.push(email);
        }
        if (studentId !== undefined) {
            updates.push('student_id = ?');
            updateParams.push(studentId);
        }
        if (employeeId !== undefined) {
            updates.push('employee_id = ?');
            updateParams.push(employeeId);
        }
        if (department !== undefined) {
            updates.push('department = ?');
            updateParams.push(department);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            updateParams.push(phone);
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            updateParams.push(isActive);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有需要更新的字段'
            });
        }

        updates.push('updated_at = NOW()');
        updateParams.push(userId);

        await query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            updateParams
        );

        res.json({
            success: true,
            message: '用户信息更新成功'
        });

    } catch (error) {
        console.error('更新用户API错误:', error);
        res.status(500).json({
            success: false,
            message: '更新用户失败：' + error.message
        });
    }
});

// 删除用户
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // 检查用户是否存在
        const existingUser = await query('SELECT id FROM users WHERE id = ?', [userId]);
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 删除用户
        await query('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: '用户删除成功'
        });

    } catch (error) {
        console.error('删除用户API错误:', error);
        res.status(500).json({
            success: false,
            message: '删除用户失败：' + error.message
        });
    }
});

// 重置用户密码
app.post('/api/users/:id/reset-password', async (req, res) => {
    try {
        const userId = req.params.id;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: '新密码不能为空'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少6位'
            });
        }

        // 检查用户是否存在
        const existingUser = await query('SELECT id FROM users WHERE id = ?', [userId]);
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 暂时不使用哈希
        const passwordHash = newPassword;

        // 更新密码
        await query(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [passwordHash, userId]
        );

        res.json({
            success: true,
            message: '密码重置成功'
        });

    } catch (error) {
        console.error('重置密码API错误:', error);
        res.status(500).json({
            success: false,
            message: '重置密码失败：' + error.message
        });
    }
});

// 切换用户激活状态API
app.put('/api/users/:userId/toggle-status', async (req, res) => {
    try {
        const { userId } = req.params;

        // 检查用户是否存在
        const user = await query('SELECT id, is_active FROM users WHERE id = ?', [userId]);
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 切换激活状态
        const newStatus = user[0].is_active ? 0 : 1;
        await query(
            'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
            [newStatus, userId]
        );

        res.json({
            success: true,
            message: `用户已${newStatus ? '激活' : '禁用'}`,
            isActive: newStatus === 1
        });

    } catch (error) {
        console.error('切换用户状态API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// 获取用户统计信息
app.get('/api/users/stats', async (req, res) => {
    try {
        const stats = await query(`
            SELECT
                role,
                COUNT(*) as count,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
            FROM users
            GROUP BY role
        `);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('获取用户统计API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户统计失败：' + error.message
        });
    }
});

// 同步用户数据API（用于兼容旧版前端）
app.post('/api/users/sync', async (req, res) => {
    try {
        const { users } = req.body;

        if (!Array.isArray(users)) {
            return res.status(400).json({
                success: false,
                message: '用户数据必须是数组格式'
            });
        }

        console.log(`📊 [API] 收到用户同步请求，包含 ${users.length} 个用户`);

        let syncedCount = 0;
        let skippedCount = 0;

        // 真正处理每个用户数据
        for (const user of users) {
            try {
                // 检查必要字段
                if (!user.username || !user.email || !user.fullName || !user.role) {
                    console.log(`⚠️  跳过用户 ${user.username}: 缺少必要字段`);
                    skippedCount++;
                    continue;
                }

                // 检查用户是否已存在
                const existingUsers = await query(
                    'SELECT id FROM users WHERE username = ? OR email = ?',
                    [user.username, user.email]
                );

                if (existingUsers.length > 0) {
                    console.log(`⚠️  跳过用户 ${user.username}: 已存在`);
                    skippedCount++;
                    continue;
                }

                // 插入新用户到数据库
                const insertResult = await query(`
                    INSERT INTO users (username, email, password_hash, full_name, role, student_id, employee_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    user.username.trim(),
                    user.email.trim(),
                    user.password || '123123', // 默认密码
                    user.fullName.trim(),
                    user.role,
                    user.studentId?.trim() || null,
                    user.employeeId?.trim() || null
                ]);

                console.log(`✅ 成功创建用户: ${user.username} (ID: ${insertResult.insertId})`);
                syncedCount++;

            } catch (error) {
                console.error(`❌ 创建用户 ${user.username} 失败:`, error.message);
                skippedCount++;
            }
        }

        res.json({
            success: true,
            message: `用户同步完成：成功创建 ${syncedCount} 个用户，跳过 ${skippedCount} 个用户`,
            synced: syncedCount,
            skipped: skippedCount,
            total: users.length
        });

    } catch (error) {
        console.error('用户同步API错误:', error);
        res.status(500).json({
            success: false,
            message: '用户同步失败：' + error.message
        });
    }
});

// 简单用户查询API（用于调试）
app.get('/api/users/simple', async (req, res) => {
    try {
        // 使用原生查询
        const [rows] = await pool.execute('SELECT username, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 10');

        res.json({
            success: true,
            count: rows.length,
            users: rows
        });
    } catch (error) {
        console.error('简单用户查询错误:', error);
        res.status(500).json({
            success: false,
            message: '查询失败: ' + error.message
        });
    }
});

// 修复中文乱码的端点
app.post('/api/fix-encoding', async (req, res) => {
    try {
        const { userId, correctName } = req.body;

        if (!userId || !correctName) {
            return res.status(400).json({
                success: false,
                message: '缺少用户ID或正确姓名'
            });
        }

        // 直接更新数据库，确保使用正确的UTF-8编码
        await query(
            'UPDATE users SET full_name = ?, updated_at = NOW() WHERE id = ?',
            [correctName, userId]
        );

        res.json({
            success: true,
            message: '姓名已修复',
            userId: userId,
            correctName: correctName
        });

    } catch (error) {
        console.error('修复编码错误:', error);
        res.status(500).json({
            success: false,
            message: '修复失败: ' + error.message
        });
    }
});

// ==================== 课程管理API ====================

// 获取所有课程列表
app.get('/api/courses', async (req, res) => {
    try {
        const { category, difficulty, status, teacher_id, page = 1, limit = 20 } = req.query;

        let sql = `
            SELECT c.*, u.username as teacher_name, u.full_name as teacher_full_name,
                   (SELECT GROUP_CONCAT(ce.student_id) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status = '已选课') as enrolled_student_ids,
                   (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status = '已选课') as enrolled_students_count
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            WHERE 1=1
        `;

        const params = [];

        if (category) {
            sql += ' AND c.category = ?';
            params.push(category);
        }

        if (difficulty) {
            sql += ' AND c.difficulty = ?';
            params.push(difficulty);
        }

        if (status) {
            sql += ' AND c.status = ?';
            params.push(status);
        }

        if (teacher_id) {
            sql += ' AND c.teacher_id = ?';
            params.push(teacher_id);
        }

        sql += ' ORDER BY c.created_at DESC';

        // 分页
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const limitInt = parseInt(limit);
        sql += ` LIMIT ${limitInt} OFFSET ${offset}`;

        let courses = await query(sql, params);

        // 处理enrolled_student_ids字段，转换为数组
        courses = courses.map(course => ({
            ...course,
            enrolled_students: course.enrolled_student_ids ? course.enrolled_student_ids.split(',').map(id => id.trim()) : []
        }));

        // 删除临时字段
        courses = courses.map(course => {
            const { enrolled_student_ids, enrolled_students_count, ...cleanCourse } = course;
            return {
                ...cleanCourse,
                enrolled_students_count: enrolled_students_count
            };
        });

        // 获取总数
        let countSql = 'SELECT COUNT(*) as total FROM courses c WHERE 1=1';
        const countParams = [];

        if (category) {
            countSql += ' AND c.category = ?';
            countParams.push(category);
        }
        if (difficulty) {
            countSql += ' AND c.difficulty = ?';
            countParams.push(difficulty);
        }
        if (status) {
            countSql += ' AND c.status = ?';
            countParams.push(status);
        }
        if (teacher_id) {
            countSql += ' AND c.teacher_id = ?';
            countParams.push(teacher_id);
        }

        const countResult = await query(countSql, countParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            data: courses,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('获取课程列表API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取课程列表失败：' + error.message
        });
    }
});

// 获取单个课程详情
app.get('/api/courses/:id', async (req, res) => {
    try {
        const courseId = req.params.id;

        const courses = await query(`
            SELECT c.*, u.username as teacher_name, u.full_name as teacher_full_name,
                   (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.status = '已选课') as enrolled_students_count
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            WHERE c.id = ?
        `, [courseId]);

        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: '课程不存在'
            });
        }

        const course = courses[0];

        // 获取课程的选课统计
        const enrollmentStats = await query(`
            SELECT
                COUNT(*) as total_enrollments,
                SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed_count,
                AVG(progress) as avg_progress
            FROM course_enrollments
            WHERE course_id = ?
        `, [courseId]);

        course.enrollment_stats = enrollmentStats[0];

        res.json({
            success: true,
            data: course
        });

    } catch (error) {
        console.error('获取课程详情API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取课程详情失败：' + error.message
        });
    }
});

// 创建新课程
app.post('/api/courses', async (req, res) => {
    try {
        const {
            title, description, teacher_id, category = '编程基础',
            difficulty = '初级', tags = null, cover_image = null, status = '草稿',
            max_students = 50, start_date = null, end_date = null, is_public = true
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: '课程标题和描述不能为空'
            });
        }

        // 验证教师ID
        const parsedTeacherId = parseInt(teacher_id);
        if (!teacher_id || isNaN(parsedTeacherId)) {
            return res.status(400).json({
                success: false,
                message: '教师ID必须是有效的数字'
            });
        }

        // 验证教师是否存在
        const teachers = await query('SELECT id FROM users WHERE id = ? AND role = "teacher"', [parsedTeacherId]);
        if (teachers.length === 0) {
            return res.status(400).json({
                success: false,
                message: '指定的教师不存在或权限不足'
            });
        }

        const result = await query(`
            INSERT INTO courses (title, description, teacher_id, category, difficulty,
                                tags, cover_image, status, max_students, start_date, end_date, is_public)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title, description, parsedTeacherId, category, difficulty,
            tags ? JSON.stringify(tags) : null, cover_image, status,
            parseInt(max_students) || 50, start_date || null, end_date || null, is_public ? 1 : 0
        ]);

        res.json({
            success: true,
            message: '课程创建成功',
            courseId: result.insertId
        });

    } catch (error) {
        console.error('创建课程API错误:', error);
        res.status(500).json({
            success: false,
            message: '创建课程失败：' + error.message
        });
    }
});

// 更新课程信息
app.put('/api/courses/:id', async (req, res) => {
    try {
        const courseId = req.params.id;
        const updates = req.body;

        // 检查课程是否存在
        const existingCourse = await query('SELECT id FROM courses WHERE id = ?', [courseId]);
        if (existingCourse.length === 0) {
            return res.status(404).json({
                success: false,
                message: '课程不存在'
            });
        }

        // 构建更新语句
        const updateFields = [];
        const updateParams = [];

        const allowedFields = ['title', 'description', 'category', 'difficulty', 'tags',
                              'cover_image', 'status', 'max_students', 'start_date', 'end_date', 'is_public'];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                updateParams.push(field === 'tags' ? JSON.stringify(updates[field]) : updates[field]);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有需要更新的字段'
            });
        }

        updateFields.push('updated_at = NOW()');
        updateParams.push(courseId);

        await query(`
            UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?
        `, updateParams);

        res.json({
            success: true,
            message: '课程信息更新成功'
        });

    } catch (error) {
        console.error('更新课程API错误:', error);
        res.status(500).json({
            success: false,
            message: '更新课程失败：' + error.message
        });
    }
});

// 删除课程
app.delete('/api/courses/:id', async (req, res) => {
    try {
        const courseId = req.params.id;

        // 检查课程是否存在
        const existingCourse = await query('SELECT id FROM courses WHERE id = ?', [courseId]);
        if (existingCourse.length === 0) {
            return res.status(404).json({
                success: false,
                message: '课程不存在'
            });
        }

        try {
            // 删除课程相关的作业
            await query('DELETE FROM assignments WHERE course_id = ?', [courseId]);

            // 删除学生的课程注册记录
            await query('DELETE FROM course_enrollments WHERE course_id = ?', [courseId]);

            // 删除课程本身
            await query('DELETE FROM courses WHERE id = ?', [courseId]);

            res.json({
                success: true,
                message: '课程及其相关数据删除成功'
            });

        } catch (deleteError) {
            console.error('删除课程数据时出错:', deleteError);
            throw deleteError;
        }

    } catch (error) {
        console.error('删除课程API错误:', error);
        res.status(500).json({
            success: false,
            message: '删除课程失败：' + error.message
        });
    }
});

// 学生选课
app.post('/api/courses/:id/enroll', async (req, res) => {
    try {
        const courseId = req.params.id;
        const { student_id } = req.body;

        console.log('📝 选课请求 - 课程ID:', courseId, '学生ID:', student_id);

        if (!student_id) {
            console.log('❌ 学生ID为空');
            return res.status(400).json({
                success: false,
                message: '学生ID不能为空'
            });
        }

        // 检查课程是否存在且已发布
        const courses = await query('SELECT * FROM courses WHERE id = ?', [courseId]);
        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: '课程不存在'
            });
        }

        const course = courses[0];
        console.log('📚 课程信息:', course);
        if (course.status !== '已发布') {
            console.log('❌ 课程未发布，当前状态:', course.status);
            return res.status(400).json({
                success: false,
                message: '课程未发布，无法选课'
            });
        }

        // 检查是否已经选过课
        const existingEnrollment = await query(
            'SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?',
            [courseId, student_id]
        );

        console.log('🔍 重复选课检查:', existingEnrollment.length > 0 ? '已选过' : '未选过');

        if (existingEnrollment.length > 0) {
            console.log('❌ 学生已经选过此课程');
            return res.status(400).json({
                success: false,
                message: '已经选过此课程'
            });
        }

        // 检查课程人数是否已满
        const currentEnrollments = await query(
            'SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = ? AND status != "已退课"',
            [courseId]
        );

        console.log('👥 人数检查 - 当前人数:', currentEnrollments[0].count, '最大人数:', course.max_students);

        if (currentEnrollments[0].count >= course.max_students) {
            console.log('❌ 课程人数已满');
            return res.status(400).json({
                success: false,
                message: '课程人数已满'
            });
        }

        // 添加选课记录
        await query(`
            INSERT INTO course_enrollments (course_id, student_id, status)
            VALUES (?, ?, '已选课')
        `, [courseId, student_id]);

        // 更新课程当前学生数
        await query(`
            UPDATE courses SET current_students = current_students + 1 WHERE id = ?
        `, [courseId]);

        res.json({
            success: true,
            message: '选课成功'
        });

    } catch (error) {
        console.error('学生选课API错误:', error);
        res.status(500).json({
            success: false,
            message: '选课失败：' + error.message
        });
    }
});

// ==================== 作业管理API ====================

// 获取所有作业列表
app.get('/api/assignments', async (req, res) => {
    try {
        const { course_id, assignment_type, is_published, page = 1, limit = 20 } = req.query;

        let sql = `
            SELECT a.*, c.title as course_title, u.username as teacher_name, u.full_name as teacher_full_name,
                   (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id) as submission_count
            FROM assignments a
            LEFT JOIN courses c ON a.course_id = c.id
            LEFT JOIN users u ON a.teacher_id = u.id
            WHERE 1=1
        `;

        const params = [];

        if (course_id) {
            sql += ' AND a.course_id = ?';
            params.push(course_id);
        }

        if (assignment_type) {
            sql += ' AND a.assignment_type = ?';
            params.push(assignment_type);
        }

        if (is_published !== undefined) {
            sql += ' AND a.is_published = ?';
            params.push(is_published === 'true');
        }

        sql += ' ORDER BY a.created_at DESC';

        // 分页
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const limitInt = parseInt(limit);
        sql += ` LIMIT ${limitInt} OFFSET ${offset}`;

        const assignments = await query(sql, params);

        // 获取总数
        let countSql = 'SELECT COUNT(*) as total FROM assignments a WHERE 1=1';
        const countParams = [];

        if (course_id) {
            countSql += ' AND a.course_id = ?';
            countParams.push(course_id);
        }

        if (assignment_type) {
            countSql += ' AND a.assignment_type = ?';
            countParams.push(assignment_type);
        }

        if (is_published !== undefined) {
            countSql += ' AND a.is_published = ?';
            countParams.push(is_published === 'true');
        }

        const countResult = await query(countSql, countParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            data: assignments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('获取作业列表API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取作业列表失败：' + error.message
        });
    }
});

// 获取课程的所有作业
app.get('/api/courses/:courseId/assignments', async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const { is_published, assignment_type } = req.query;

        let sql = `
            SELECT a.*, u.username as teacher_name, u.full_name as teacher_full_name,
                   (SELECT COUNT(*) FROM assignment_submissions sub WHERE sub.assignment_id = a.id) as submission_count
            FROM assignments a
            LEFT JOIN users u ON a.teacher_id = u.id
            WHERE a.course_id = ?
        `;
        const params = [courseId];

        if (is_published !== undefined) {
            sql += ' AND a.is_published = ?';
            params.push(is_published === 'true');
        }

        if (assignment_type) {
            sql += ' AND a.assignment_type = ?';
            params.push(assignment_type);
        }

        sql += ' ORDER BY a.created_at DESC';

        const assignments = await query(sql, params);

        res.json({
            success: true,
            data: assignments
        });

    } catch (error) {
        console.error('获取作业列表API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取作业列表失败：' + error.message
        });
    }
});

// 创建新作业
app.post('/api/courses/:courseId/assignments', async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const {
            title, description, instructions, teacher_id, assignment_type = '编程练习',
            difficulty = '中等', template_files, example_solution, test_cases,
            max_attempts = 0, time_limit = 120, start_time, end_time,
            max_score = 100, allow_late_submission = false, auto_grade = true,
            is_published = false
        } = req.body;

        if (!title || !teacher_id) {
            return res.status(400).json({
                success: false,
                message: '作业标题和教师ID不能为空'
            });
        }

        // 验证课程是否存在
        const courses = await query('SELECT id FROM courses WHERE id = ?', [courseId]);
        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: '课程不存在'
            });
        }

        const result = await query(`
            INSERT INTO assignments (course_id, title, description, instructions, teacher_id,
                                    assignment_type, difficulty, template_files, example_solution,
                                    test_cases, max_attempts, time_limit, start_time, end_time,
                                    max_score, allow_late_submission, auto_grade, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            courseId, title, description, instructions, parseInt(teacher_id),
            assignment_type, difficulty,
            template_files ? JSON.stringify(template_files) : null,
            example_solution ? JSON.stringify(example_solution) : null,
            test_cases ? JSON.stringify(test_cases) : null,
            parseInt(max_attempts), parseInt(time_limit),
            start_time || null, end_time || null,
            parseFloat(max_score), allow_late_submission, auto_grade, is_published
        ]);

        res.json({
            success: true,
            message: '作业创建成功',
            assignmentId: result.insertId
        });

    } catch (error) {
        console.error('创建作业API错误:', error);
        res.status(500).json({
            success: false,
            message: '创建作业失败：' + error.message
        });
    }
});

// 获取单个作业详情
app.get('/api/assignments/:id', async (req, res) => {
    try {
        const assignmentId = req.params.id;

        const assignments = await query(`
            SELECT a.*, c.title as course_title, u.username as teacher_name, u.full_name as teacher_full_name
            FROM assignments a
            LEFT JOIN courses c ON a.course_id = c.id
            LEFT JOIN users u ON a.teacher_id = u.id
            WHERE a.id = ?
        `, [assignmentId]);

        if (assignments.length === 0) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }

        const assignment = assignments[0];

        // 获取提交统计
        const submissionStats = await query(`
            SELECT
                COUNT(*) as total_submissions,
                AVG(score) as avg_score,
                MAX(score) as max_score,
                SUM(CASE WHEN submission_status = '已评分' THEN 1 ELSE 0 END) as graded_count
            FROM assignment_submissions
            WHERE assignment_id = ?
        `, [assignmentId]);

        assignment.submission_stats = submissionStats[0];

        res.json({
            success: true,
            data: assignment
        });

    } catch (error) {
        console.error('获取作业详情API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取作业详情失败：' + error.message
        });
    }
});

// 提交作业
app.post('/api/assignments/submit', async (req, res) => {
    try {
        const {
            assignmentId,
            studentId,
            studentName,
            studentEmail,
            content,
            files
        } = req.body;

        // 验证必需字段
        if (!assignmentId || !studentId) {
            return res.status(400).json({
                success: false,
                message: '作业ID和学生ID不能为空'
            });
        }

        // 验证作业是否存在
        const assignments = await query('SELECT id, title FROM assignments WHERE id = ?', [assignmentId]);
        if (assignments.length === 0) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }

        // 验证学生是否存在
        const students = await query('SELECT id, username, full_name FROM users WHERE id = ? AND role = "student"', [studentId]);
        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: '学生不存在'
            });
        }

        // 检查是否已经提交过
        const existingSubmissions = await query(`
            SELECT id FROM assignment_submissions
            WHERE assignment_id = ? AND student_id = ?
        `, [assignmentId, studentId]);

        const now = new Date();
        const submissionFiles = JSON.stringify(files || []);
        const submissionContent = content || '';

        if (existingSubmissions.length > 0) {
            // 更新已存在的提交
            await query(`
                UPDATE assignment_submissions
                SET submission_files = ?,
                    feedback = ?,
                    submission_status = '已提交',
                    submission_time = NOW(),
                    attempt_count = attempt_count + 1
                WHERE assignment_id = ? AND student_id = ?
            `, [submissionFiles, submissionContent, assignmentId, studentId]);
        } else {
            // 创建新的提交记录
            await query(`
                INSERT INTO assignment_submissions
                (assignment_id, student_id, submission_files, feedback, submission_status, submission_time, attempt_count)
                VALUES (?, ?, ?, ?, '已提交', NOW(), 1)
            `, [assignmentId, studentId, submissionFiles, submissionContent]);
        }

        res.json({
            success: true,
            message: '作业提交成功',
            data: {
                assignmentId: assignmentId,
                studentId: studentId,
                submittedAt: now.toISOString()
            }
        });
    } catch (error) {
        console.error('作业提交失败:', error);
        res.status(500).json({
            success: false,
            message: '作业提交失败: ' + error.message
        });
    }
});

// 获取作业提交详情
app.get('/api/assignments/:id/submissions', async (req, res) => {
    try {
        const assignmentId = req.params.id;

        // 首先获取作业信息
        const assignments = await query(`
            SELECT a.*, c.title as course_title, u.username as teacher_name, u.full_name as teacher_full_name
            FROM assignments a
            LEFT JOIN courses c ON a.course_id = c.id
            LEFT JOIN users u ON a.teacher_id = u.id
            WHERE a.id = ?
        `, [assignmentId]);

        if (assignments.length === 0) {
            return res.status(404).json({
                success: false,
                message: '作业不存在'
            });
        }

        const assignment = assignments[0];

        // 获取所有提交详情
        const submissions = await query(`
            SELECT s.*, u.username as student_username, u.full_name as student_full_name, u.email as student_email
            FROM assignment_submissions s
            LEFT JOIN users u ON s.student_id = u.id
            WHERE s.assignment_id = ?
        `, [assignmentId]);

        // 获取课程的所有学生
        const courseStudents = await query(`
            SELECT u.id, u.username, u.full_name, u.email, u.student_id, u.major
            FROM course_enrollments uc
            JOIN users u ON uc.student_id = u.id
            WHERE uc.course_id = ?
            ORDER BY u.username
        `, [assignment.course_id]);

        res.json({
            success: true,
            data: {
                assignment: assignment,
                submissions: submissions,
                courseStudents: courseStudents
            }
        });

    } catch (error) {
        console.error('获取作业提交详情API错误:', error);
        res.status(500).json({
            success: false,
            message: '获取作业提交详情失败：' + error.message
        });
    }
});

// 临时修复：将作业教师ID从41修改为40，解决教师ID不匹配问题
app.post('/api/fix-assignment-teacher', async (req, res) => {
    try {
        console.log('🔧 开始修复作业教师ID...');

        // 将所有teacher_id为41的作业修改为40
        const result = await query(`
            UPDATE assignments
            SET teacher_id = 40
            WHERE teacher_id = 41
        `);

        console.log(`✅ 修复完成，影响了 ${result.affectedRows} 条作业记录`);

        // 同时修复课程的教师ID
        const courseResult = await query(`
            UPDATE courses
            SET teacher_id = 40
            WHERE teacher_id = 41
        `);

        console.log(`✅ 修复完成，影响了 ${courseResult.affectedRows} 条课程记录`);

        res.json({
            success: true,
            message: `修复完成：${result.affectedRows} 个作业，${courseResult.affectedRows} 个课程`,
            assignmentsFixed: result.affectedRows,
            coursesFixed: courseResult.affectedRows
        });

    } catch (error) {
        console.error('❌ 修复失败:', error);
        res.status(500).json({
            success: false,
            message: '修复失败: ' + error.message
        });
    }
});

// API测试端点
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API服务器正常运行',
        mode: '数据库模式',
        timestamp: new Date().toISOString(),
        server: 'Programming Platform API Server'
    });
});

// 默认路由 - 服务器首页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 添加性能监控中间件
app.use((req, res, next) => {
    performanceMonitor.activeConnections++;
    performanceMonitor.maxConnections = Math.max(
        performanceMonitor.maxConnections,
        performanceMonitor.activeConnections
    );

    const startTime = Date.now();

    res.on('finish', () => {
        performanceMonitor.activeConnections--;
        performanceMonitor.recordRequest(startTime);
        if (res.statusCode >= 400) {
            performanceMonitor.recordError();
        }
    });

    res.on('error', () => {
        performanceMonitor.activeConnections--;
        performanceMonitor.recordError();
    });

    next();
});

// 性能监控API端点
app.get('/api/stats/performance', (req, res) => {
    try {
        const stats = performanceMonitor.getStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 重置性能统计
app.post('/api/stats/performance/reset', (req, res) => {
    try {
        performanceMonitor.reset();
        res.json({
            success: true,
            message: '性能统计已重置'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 数据库连接池状态
app.get('/api/stats/database', async (req, res) => {
    try {
        if (!pool) {
            return res.json({
                success: false,
                message: '数据库连接池未初始化'
            });
        }

        const poolInfo = {
            totalConnections: pool._allConnections ? pool._allConnections.length : 0,
            freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
            acquiringConnections: pool._acquiringConnections ? pool._acquiringConnections.length : 0,
            connectionLimit: pool.config.connectionLimit,
            queueLimit: pool.config.queueLimit,
            waitingRequests: pool._connectionQueue ? pool._connectionQueue.length : 0
        };

        // 执行一个简单的数据库健康检查
        const dbHealth = await query('SELECT 1 as health');

        res.json({
            success: true,
            pool: poolInfo,
            database: {
                healthy: dbHealth.length > 0,
                connected: true
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            database: {
                healthy: false,
                connected: false
            }
        });
    }
});

// 系统资源使用情况
app.get('/api/stats/system', (req, res) => {
    try {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const uptime = process.uptime();

        res.json({
            success: true,
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                pid: process.pid,
                uptime: {
                    seconds: Math.floor(uptime),
                    human: Math.floor(uptime / 3600) + 'h ' +
                          Math.floor((uptime % 3600) / 60) + 'm ' +
                          Math.floor(uptime % 60) + 's'
                },
                memory: {
                    rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100, // MB
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
                    external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100 // MB
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 综合监控仪表盘数据
app.get('/api/stats/dashboard', async (req, res) => {
    try {
        const performance = {
            success: true,
            data: performanceMonitor.getStats()
        };

        const memUsage = process.memoryUsage();
        const system = {
            success: true,
            data: {
                memory: {
                    rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100
                }
            }
        };

        let dbStatus;
        try {
            if (!pool) {
                dbStatus = { success: false, message: '数据库连接池未初始化' };
            } else {
                const poolInfo = {
                    totalConnections: pool._allConnections ? pool._allConnections.length : 0,
                    freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
                    connectionLimit: pool.config.connectionLimit,
                    queueLimit: pool.config.queueLimit
                };
                const dbHealth = await query('SELECT 1 as health');
                dbStatus = {
                    success: true,
                    pool: poolInfo,
                    database: {
                        healthy: dbHealth.length > 0,
                        connected: true
                    }
                };
            }
        } catch (error) {
            dbStatus = { success: false, error: error.message };
        }

        res.json({
            success: true,
            performance: performance,
            database: dbStatus,
            system: system,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 启动服务器
async function startServer() {
    console.log('🚀 正在启动服务器...');
    const dbConnected = await initDatabase();

    if (dbConnected) {
        console.log('📊 使用数据库模式');

        // 创建课程和作业管理表
        try {
            await createTablesIfNotExists();
            console.log('✅ 数据库表检查完成');
        } catch (error) {
            console.error('创建数据库表失败:', error);
        }

        // 检查并添加用户表缺失字段
        try {
            await checkAndAddUserTableFields();
        } catch (error) {
            console.error('检查用户表字段失败:', error);
        }

        // 更新默认用户密码为明文
        try {
            await query(`
                UPDATE users SET password_hash = '123123'
                WHERE username IN ('admin', 'lixin', 'sgy')
            `);
            console.log('✅ 已更新默认用户密码为明文');
        } catch (error) {
            console.error('更新密码失败:', error);
        }

        // 创建文档表（如果不存在）
        try {
            await createDocumentsTable();
            console.log('✅ 文档表检查完成');
        } catch (error) {
            console.error('创建文档表失败:', error);
        }
    } else {
        console.log('⚠️  数据库连接失败');
        process.exit(1);
    }

    // 注册文档相关的API路由（移到数据库连接检查之外）
    setupDocumentRoutes();
    console.log('✅ 文档API路由注册完成');

    // 调试端点：查看选课数据
    app.get('/api/debug/enrollments', async (req, res) => {
        try {
            const enrollments = await query(`
                SELECT ce.*, c.title as course_title, u.full_name as student_name, u.username as student_username
                FROM course_enrollments ce
                JOIN courses c ON ce.course_id = c.id
                JOIN users u ON ce.student_id = u.id
                ORDER BY ce.id DESC
            `);

            res.json({
                success: true,
                data: enrollments,
                total: enrollments.length
            });
        } catch (error) {
            console.error('获取选课数据失败:', error);
            res.status(500).json({
                success: false,
                message: '获取选课数据失败：' + error.message
            });
        }
    });

    // 更新作业提交分数
app.post('/api/assignments/:assignmentId/submissions/:submissionId/grade', async (req, res) => {
    try {
        const assignmentId = req.params.assignmentId;
        const submissionId = req.params.submissionId;
        const { score, gradedBy } = req.body;

        // 验证分数
        if (typeof score !== 'number' || score < 0 || score > 100) {
            return res.status(400).json({
                success: false,
                message: '分数必须在0-100之间'
            });
        }

        // 检查提交是否存在
        const submissions = await query(`
            SELECT * FROM assignment_submissions
            WHERE id = ? AND assignment_id = ?
        `, [submissionId, assignmentId]);

        if (submissions.length === 0) {
            return res.status(404).json({
                success: false,
                message: '提交记录不存在'
            });
        }

        // 更新分数
        await query(`
            UPDATE assignment_submissions
            SET score = ?, graded_time = NOW(), graded_by = ?
            WHERE id = ? AND assignment_id = ?
        `, [score, gradedBy ? parseInt(gradedBy) : null, submissionId, assignmentId]);

        res.json({
            success: true,
            message: '分数更新成功',
            data: {
                score: score,
                gradedAt: new Date().toISOString(),
                gradedBy: gradedBy || '教师'
            }
        });
    } catch (error) {
        console.error('更新分数错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 临时API：为所有学生创建选课记录
app.post('/api/create-enrollments', async (req, res) => {
    try {
        console.log('🔧 开始创建学生选课记录...');

        // 获取所有课程
        const courses = await query('SELECT id FROM courses WHERE status = "已发布"');
        console.log(`📚 找到 ${courses.length} 门已发布课程`);

        // 获取所有学生
        const students = await query('SELECT id FROM users WHERE role = "student" AND is_active = 1');
        console.log(`👨‍🎓 找到 ${students.length} 个活跃学生`);

        let enrollmentCount = 0;

        // 为每个学生分配到所有课程
        for (const student of students) {
            for (const course of courses) {
                await query(`
                    INSERT IGNORE INTO course_enrollments (course_id, student_id, status, progress, enrollment_date)
                    VALUES (?, ?, '已选课', ?, NOW())
                `, [course.id, student.id, Math.floor(Math.random() * 100)]);
                enrollmentCount++;
            }
        }

        console.log(`✅ 成功创建 ${enrollmentCount} 条选课记录`);

        res.json({
            success: true,
            message: `成功为 ${students.length} 个学生创建了 ${enrollmentCount} 条选课记录`,
            data: {
                studentCount: students.length,
                courseCount: courses.length,
                enrollmentCount: enrollmentCount
            }
        });
    } catch (error) {
        console.error('创建选课记录失败:', error);
        res.status(500).json({
            success: false,
            message: '创建选课记录失败: ' + error.message
        });
    }
});

// 通用数据库查询接口
app.post('/api/database/query', async (req, res) => {
    try {
        const { sql, params } = req.body;

        if (!sql) {
            return res.status(400).json({
                success: false,
                message: 'SQL查询语句不能为空'
            });
        }

        // 安全检查：只允许SELECT查询
        if (!sql.trim().toLowerCase().startsWith('select')) {
            return res.status(400).json({
                success: false,
                message: '只允许SELECT查询'
            });
        }

        const results = await query(sql, params || []);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('查询失败:', error);
        res.status(500).json({
            success: false,
            message: '查询失败: ' + error.message
        });
    }
});







// PPT转图片预览API
app.get('/api/documents/:id/ppt-images', async (req, res) => {
    try {
        const docId = req.params.id;
        console.log('📸 PPT转图片请求:', docId);

        // 获取文档信息
        const docs = await query(`
            SELECT * FROM documents WHERE id = ?
        `, [docId]);

        if (docs.length === 0) {
            return res.status(404).json({
                success: false,
                message: '文档不存在'
            });
        }

        const doc = docs[0];

        // 检查是否为PPT文件
        if (!doc.mime_type || (!doc.mime_type.includes('presentation') && !doc.file_name.match(/\.(ppt|pptx)$/i))) {
            return res.status(400).json({
                success: false,
                message: '不是PPT文件格式'
            });
        }

        // 创建图片存储目录
        const imageDir = path.join(__dirname, 'uploads', 'ppt-images', docId);
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }

        let imageUrls = [];

        try {
            // 生成模拟的PPT页面图片
            const slideCount = 5; // 模拟5页PPT
            for (let i = 1; i <= slideCount; i++) {
                const imagePath = path.join(imageDir, `slide-${i}.png`);

                // 如果图片不存在，创建一个模拟图片
                if (!fs.existsSync(imagePath)) {
                    await createMockSlideImage(imagePath, doc.title || `PPT页面 ${i}`, i, slideCount);
                }

                imageUrls.push({
                    page: i,
                    url: `/api/documents/${docId}/ppt-images/slide-${i}`,
                    thumbUrl: `/api/documents/${docId}/ppt-images/thumb-${i}`
                });
            }

            res.json({
                success: true,
                data: {
                    document: {
                        id: doc.id,
                        title: doc.title || doc.file_name,
                        fileName: doc.file_name,
                        mimeType: doc.mime_type,
                        fileSize: doc.file_size || 0
                    },
                    slides: imageUrls,
                    totalSlides: imageUrls.length
                }
            });

        } catch (error) {
            console.error('PPT转图片失败:', error);
            res.status(500).json({
                success: false,
                message: 'PPT转图片失败: ' + error.message
            });
        }

    } catch (error) {
        console.error('PPT图片API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message
        });
    }
});

// 获取PPT单页图片
app.get('/api/documents/:id/ppt-images/slide-:page', async (req, res) => {
    try {
        const { id, page } = req.params;
        const imagePath = path.join(__dirname, 'uploads', 'ppt-images', id, `slide-${page}.png`);

        if (!fs.existsSync(imagePath)) {
            // 如果图片不存在，动态创建
            const docs = await query('SELECT * FROM documents WHERE id = ?', [id]);
            if (docs.length > 0) {
                const doc = docs[0];
                await createMockSlideImage(imagePath, doc.title || `PPT页面 ${page}`, parseInt(page), 5);
            } else {
                return res.status(404).send('图片不存在');
            }
        }

        res.sendFile(imagePath);

    } catch (error) {
        console.error('获取PPT图片失败:', error);
        res.status(500).send('获取图片失败');
    }
});

// 获取PPT缩略图
app.get('/api/documents/:id/ppt-images/thumb-:page', async (req, res) => {
    try {
        const { id, page } = req.params;
        const imagePath = path.join(__dirname, 'uploads', 'ppt-images', id, `slide-${page}.png`);

        if (!fs.existsSync(imagePath)) {
            const docs = await query('SELECT * FROM documents WHERE id = ?', [id]);
            if (docs.length > 0) {
                const doc = docs[0];
                await createMockSlideImage(imagePath, doc.title || `PPT页面 ${page}`, parseInt(page), 5);
            } else {
                return res.status(404).send('图片不存在');
            }
        }

        res.sendFile(imagePath);

    } catch (error) {
        console.error('获取PPT缩略图失败:', error);
        res.status(500).send('获取缩略图失败');
    }
});

// 创建模拟PPT页面图片的函数
async function createMockSlideImage(imagePath, title, page, totalSlides) {
    try {
        // 使用简单的SVG创建方法
        const svgContent = `
        <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#357ABD;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#bg)"/>
            <rect x="50" y="100" width="700" height="400" fill="white" rx="10"/>
            <text x="400" y="150" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#2C3E50">${title || 'PPT演示文稿'}</text>
            <text x="400" y="500" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#7F8C8D">第 ${page} 页 / 共 ${totalSlides} 页</text>
            <text x="100" y="220" font-family="Arial, sans-serif" font-size="24" fill="#34495E">• 这是PPT的第 ${page} 页内容</text>
            <text x="100" y="260" font-family="Arial, sans-serif" font-size="24" fill="#34495E">• 演示文稿预览功能</text>
            <text x="100" y="300" font-family="Arial, sans-serif" font-size="24" fill="#34495E">• 支持图片格式预览</text>
            <text x="100" y="340" font-family="Arial, sans-serif" font-size="24" fill="#34495E">• 自动生成幻灯片缩略图</text>
            <circle cx="700" cy="150" r="30" fill="#E74C3C"/>
            <rect x="600" y="180" width="80" height="20" fill="#F39C12"/>
        </svg>`;

        // 保存为SVG文件
        fs.writeFileSync(imagePath.replace('.png', '.svg'), svgContent);

        console.log(`创建PPT预览图片: ${imagePath}`);
    } catch (error) {
        console.error('创建PPT预览图片失败:', error);
        // 创建一个简单的文本文件作为备用
        fs.writeFileSync(imagePath, `PPT页面 ${page}: ${title}`);
    }
}

// 启动 markviz-presenter 的 API 端点
app.post('/api/start-markviz', async (req, res) => {
    try {
        const { spawn } = require('child_process');
        const path = require('path');
        const fs = require('fs');

        // markviz-presenter 目录路径
        const markvizPath = path.join(__dirname, 'markviz-presenter');

        // 检查目录是否存在
        if (!fs.existsSync(markvizPath)) {
            return res.status(404).json({
                success: false,
                message: 'markviz-presenter 目录不存在'
            });
        }

        // 检查 package.json 是否存在
        const packageJsonPath = path.join(markvizPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return res.status(404).json({
                success: false,
                message: 'markviz-presenter/package.json 不存在'
            });
        }

        // 检查是否已经在运行
        try {
            const response = await fetch('http://localhost:3000');
            if (response.ok) {
                return res.json({
                    success: true,
                    message: 'markviz-presenter 已经在运行',
                    url: 'http://localhost:3000'
                });
            }
        } catch (e) {
            // 服务器未运行，继续启动
        }

        // 检查 node_modules 是否存在
        const nodeModulesPath = path.join(markvizPath, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('正在安装 markviz-presenter 依赖...');
            // 静默安装依赖
            const npmInstall = spawn('npm', ['install'], {
                cwd: markvizPath,
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true,
                detached: true
            });

            npmInstall.on('error', (err) => {
                console.error('npm install 错误:', err);
            });

            npmInstall.on('close', (code) => {
                if (code === 0) {
                    console.log('依赖安装完成，启动开发服务器...');
                    startViteDev();
                } else {
                    console.error('依赖安装失败，退出码:', code);
                }
            });
        } else {
            startViteDev();
        }

        function startViteDev() {
            console.log('正在启动 markviz-presenter 开发服务器...');

            // 启动 vite 开发服务器
            const vite = spawn('npm', ['run', 'dev'], {
                cwd: markvizPath,
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true,
                detached: true
            });

            // 解耦进程
            vite.unref();

            vite.stdout.on('data', (data) => {
                console.log(`[markviz-presenter] ${data}`);
            });

            vite.stderr.on('data', (data) => {
                console.error(`[markviz-presenter] ${data}`);
            });

            vite.on('error', (err) => {
                console.error('启动 vite 错误:', err);
            });

            vite.on('close', (code) => {
                console.log(`markviz-presenter 进程退出，代码: ${code}`);
            });
        }

        // 立即返回响应，不等待启动完成
        res.json({
            success: true,
            message: '正在启动 markviz-presenter...',
            url: 'http://localhost:3000',
            estimatedWaitTime: '10-30秒'
        });

    } catch (error) {
        console.error('启动 markviz-presenter 失败:', error);
        res.status(500).json({
            success: false,
            message: '启动失败: ' + error.message
        });
    }
});

// 通用文件上传API - 用于Markdown编辑器
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有上传文件'
            });
        }

        // 处理文件名，确保正确的编码
        let originalname = req.file.originalname;
        try {
            originalname = Buffer.from(originalname, 'latin1').toString('utf8');
        } catch (e) {
            console.warn('文件名解码失败，使用原文件名:', e);
        }

        // 返回文件信息
        res.json({
            success: true,
            filename: req.file.filename,
            originalName: originalname,
            path: `/uploads/mdresource/${req.file.filename}`,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({
            success: false,
            message: '文件上传失败: ' + error.message
        });
    }
});

app.listen(PORT, () => {
        console.log(`\n🌟 服务器启动成功！`);
        console.log(`📡 服务器运行在: http://localhost:${PORT}`);
        console.log(`🔗 API端点: http://localhost:${PORT}/api`);
        console.log(`🏠 首页: http://localhost:${PORT}`);
        console.log(`\n📋 可用API端点:`);
        console.log(`   POST http://localhost:${PORT}/api/users/login (登录)`);
        console.log(`   POST http://localhost:${PORT}/api/users/register (注册)`);
        console.log(`   GET  http://localhost:${PORT}/api/test (测试)`);
        console.log(`   GET  http://localhost:${PORT}/api/stats/performance (性能统计)`);
        console.log(`   GET  http://localhost:${PORT}/api/stats/database (数据库状态)`);
        console.log(`   GET  http://localhost:${PORT}/api/stats/system (系统资源)`);
        console.log(`   GET  http://localhost:${PORT}/api/stats/dashboard (监控仪表盘)`);
        console.log(`\n💾 当前模式: 数据库模式`);
        console.log(`⚡ 数据库连接池: 最大50个连接，支持高并发访问`);
    });
}


// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n正在关闭服务器...');
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});

// 启动
startServer().catch(console.error);