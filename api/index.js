/**
 * Vercel无服务器API入口
 * 简化版本，专注于稳定性
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('🚀 API服务器启动中...');

// 创建Express应用
const app = express();

// 基础中间件
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 内存数据存储（模拟数据库）
const memoryStorage = {
  users: [
    { id: 1, username: 'admin', password: '123123', role: 'admin', email: 'admin@example.com', full_name: '系统管理员' },
    { id: 2, username: 'teacher1', password: '123123', role: 'teacher', email: 'teacher@example.com', full_name: '李老师' },
    { id: 3, username: 'student1', password: '123123', role: 'student', email: 'student@example.com', full_name: '张三' }
  ],
  courses: [
    { id: 1, title: 'Web开发基础', description: 'HTML, CSS, JavaScript基础', teacher_id: 2, created_at: new Date().toISOString() },
    { id: 2, title: '高级JavaScript', description: 'ES6+、异步编程、框架入门', teacher_id: 2, created_at: new Date().toISOString() }
  ],
  assignments: [
    { id: 1, title: '创建个人主页', description: '使用HTML和CSS创建个人介绍页面', course_id: 1, teacher_id: 2, created_at: new Date().toISOString() }
  ],
  notifications: []
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
    const { username, email, password, full_name, role = 'student' } = req.body;

    const newUser = {
      id: Date.now(),
      username,
      email,
      full_name: full_name || username,
      password,
      role,
      created_at: new Date().toISOString()
    };

    memoryStorage.users.push(newUser);

    // 创建新用户注册通知给管理员
    const adminUser = memoryStorage.users.find(u => u.role === 'admin');
    if (adminUser) {
      createNotification('user_registration', adminUser.id, {
        username,
        full_name: full_name || username,
        role,
        senderId: newUser.id,
        relatedType: 'user',
        relatedId: newUser.id
      });
    }

    res.status(201).json({
      success: true,
      message: '注册成功',
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role, full_name: newUser.full_name }
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
    data: memoryStorage.courses
  });
});

app.get('/api/assignments', (req, res) => {
  res.json({
    success: true,
    data: memoryStorage.assignments
  });
});

// 通知相关API
app.get('/api/notifications', (req, res) => {
  try {
    const { recipientId, limit = 10, offset = 0 } = req.query;

    let notifications = memoryStorage.notifications;

    if (recipientId) {
      notifications = notifications.filter(n => n.recipient_id == recipientId);
    }

    // 按创建时间倒序排列
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 分页
    const paginatedNotifications = notifications.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: paginatedNotifications,
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length
    });
  } catch (error) {
    console.error('获取通知失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/notifications', (req, res) => {
  try {
    const {
      type,
      recipient_id,
      title,
      message,
      sender_id = null,
      related_id = null,
      related_type = null,
      priority = 'normal'
    } = req.body;

    const notification = {
      id: Date.now(),
      type,
      recipient_id,
      title,
      message,
      sender_id,
      related_id,
      related_type,
      priority,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStorage.notifications.push(notification);

    res.status(201).json({
      success: true,
      message: '通知创建成功',
      data: notification
    });
  } catch (error) {
    console.error('创建通知失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.put('/api/notifications/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const notification = memoryStorage.notifications.find(n => n.id == id);

    if (!notification) {
      return res.status(404).json({ error: '通知不存在' });
    }

    notification.is_read = true;
    notification.read_at = new Date().toISOString();
    notification.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: '标记已读成功',
      data: notification
    });
  } catch (error) {
    console.error('标记已读失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.put('/api/notifications/mark-all-read', (req, res) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: '缺少接收者ID' });
    }

    const userNotifications = memoryStorage.notifications.filter(n => n.recipient_id == recipientId);
    userNotifications.forEach(notification => {
      notification.is_read = true;
      notification.read_at = new Date().toISOString();
      notification.updated_at = new Date().toISOString();
    });

    res.json({
      success: true,
      message: `已标记 ${userNotifications.length} 条通知为已读`,
      count: userNotifications.length
    });
  } catch (error) {
    console.error('标记全部已读失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 自动创建通知的辅助函数
function createNotification(type, recipientId, data) {
  const notification = {
    id: Date.now(),
    type,
    recipient_id: recipientId,
    title: data.title || getDefaultTitle(type, data),
    message: data.message || getDefaultMessage(type, data),
    sender_id: data.senderId || null,
    related_id: data.relatedId || null,
    related_type: data.relatedType || null,
    priority: data.priority || 'normal',
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  memoryStorage.notifications.push(notification);
  return notification;
}

// 获取默认通知标题
function getDefaultTitle(type, data) {
  const titles = {
    'user_registration': '新用户注册',
    'course_assignment': '课程分配通知',
    'assignment_submission': '作业提交通知',
    'grade_assigned': '作业评分通知',
    'course_enrollment': '课程报名通知',
    'system_announcement': '系统公告'
  };
  return titles[type] || '通知';
}

// 获取默认通知消息
function getDefaultMessage(type, data) {
  const messages = {
    'user_registration': `用户 ${data.username || data.full_name || '新用户'} 已注册为${data.role || '用户'}`,
    'course_assignment': `您已被分配到课程：${data.courseName || '未知课程'}`,
    'assignment_submission': `学生 ${data.studentName || '未知学生'} 提交了作业：${data.assignmentTitle || '未知作业'}`,
    'grade_assigned': `您的作业 "${data.assignmentTitle || '未知作业'}" 已评分，得分：${data.grade || '未评分'}`,
    'course_enrollment': `学生 ${data.studentName || '未知学生'} 报名了您的课程：${data.courseName || '未知课程'}`,
    'system_announcement': data.message || '系统公告'
  };
  return messages[type] || '您有一条新通知';
}

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

// 主页路由 - 重定向到登录页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// 主应用页面路由
app.get('/main.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'main.html'));
});

// 登录页面路由
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// 处理其他HTML文件路由
app.get(/^.*\.html$/, (req, res) => {
  const filename = req.path;
  res.sendFile(path.join(__dirname, '..', filename));
});

// 静态文件服务 - 放在所有路由之后
app.use(express.static(path.join(__dirname, '..')));

// 处理其他路由 - 返回login.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// 404处理
app.use((req, res) => {
  console.log('404 - 未找到路径:', req.method, req.path);
  res.status(404).json({
    error: '未找到请求的资源',
    path: req.path,
    method: req.method
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

// 导出给Vercel使用
module.exports = app;

console.log('✅ API服务器配置完成');