/**
 * Vercel无服务器API入口
 * 包装Express应用以适应Vercel环境
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 创建Express应用
const app = express();

// 基础中间件
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '..')));

// 内存数据存储（模拟数据库）
const memoryStorage = {
  users: [
    { id: 1, username: 'admin', password: '123123', role: 'admin', email: 'admin@example.com' },
    { id: 2, username: 'teacher1', password: '123123', role: 'teacher', email: 'teacher@example.com' },
    { id: 3, username: 'student1', password: '123123', role: 'student', email: 'student@example.com' }
  ],
  courses: [
    { id: 1, title: 'Web开发基础', description: 'HTML, CSS, JavaScript基础', teacher_id: 2, created_at: new Date().toISOString() },
    { id: 2, title: '高级JavaScript', description: 'ES6+、异步编程、框架入门', teacher_id: 2, created_at: new Date().toISOString() }
  ],
  assignments: [
    { id: 1, title: '创建个人主页', description: '使用HTML和CSS创建个人介绍页面', course_id: 1, teacher_id: 2, created_at: new Date().toISOString() }
  ]
};

// API路由
app.post('/api/users/login', (req, res) => {
  try {
    const { username, password } = req.body;

    const user = memoryStorage.users.find(u => u.username === username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    res.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      },
      token: 'mock-token-' + Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/users/register', (req, res) => {
  try {
    const { username, email, password, role = 'student' } = req.body;

    const newUser = {
      id: Date.now(),
      username,
      email,
      password,
      role,
      created_at: new Date().toISOString()
    };

    memoryStorage.users.push(newUser);

    res.status(201).json({
      success: true,
      message: '注册成功',
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 1,
      username: 'student1',
      email: 'student@example.com',
      role: 'student',
      created_at: new Date().toISOString()
    }
  });
});

app.get('/api/courses', (req, res) => {
  res.json({
    success: true,
    courses: memoryStorage.courses
  });
});

app.get('/api/assignments', (req, res) => {
  res.json({
    success: true,
    assignments: memoryStorage.assignments
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Vercel API 运行正常',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless'
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 默认路由 - 返回index.html（支持SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'main.html'));
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 导出给Vercel使用
module.exports = app;