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

// 静态文件服务
app.use(express.static(path.join(__dirname, '..')));

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
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: '注册失败' });
  }
});

app.get('/api/users/profile', (req, res) => {
  try {
    const { userId } = req.query;

    const user = memoryStorage.users.find(u => u.id == userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
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

// 用户相关API
app.get('/api/users', (req, res) => {
  const { role } = req.query;
  let users = memoryStorage.users;

  if (role) {
    users = users.filter(user => user.role === role);
  }

  res.json({
    success: true,
    data: users
  });
});

// 课程相关API
app.post('/api/courses', (req, res) => {
  try {
    const { title, description, teacher_id } = req.body;
    const newCourse = {
      id: Date.now(),
      title,
      description,
      teacher_id: teacher_id || 1,
      created_at: new Date().toISOString()
    };

    memoryStorage.courses.push(newCourse);

    res.json({
      success: true,
      message: '课程创建成功',
      data: newCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '创建课程失败'
    });
  }
});

// 课程注册API
app.post('/api/courses/:id/enroll', (req, res) => {
  try {
    const courseId = parseInt(req.params.id);
    const { user_id } = req.body;

    const course = memoryStorage.courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: '课程不存在'
      });
    }

    res.json({
      success: true,
      message: '注册课程成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '注册课程失败'
    });
  }
});

// 作业提交API
app.post('/api/assignments/:id/submissions', (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const { student_id, code_content, language } = req.body;

    const submission = {
      id: Date.now(),
      assignment_id: assignmentId,
      student_id,
      code_content,
      language,
      submitted_at: new Date().toISOString(),
      grade: null,
      feedback: null
    };

    res.json({
      success: true,
      message: '作业提交成功',
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '提交作业失败'
    });
  }
});

// 通知相关API
app.get('/api/notifications', (req, res) => {
  try {
    const { recipientId } = req.query;
    let notifications = memoryStorage.notifications;

    if (recipientId) {
      notifications = notifications.filter(n => n.recipient_id == recipientId);
    }

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ error: '获取通知失败' });
  }
});

// 创建通知的辅助函数
function createNotification(type, recipientId, data) {
  const notification = {
    id: Date.now(),
    type,
    recipient_id: recipientId,
    message: getNotificationMessage(type, data),
    created_at: new Date().toISOString(),
    read: false,
    ...data
  };

  memoryStorage.notifications.push(notification);
}

function getNotificationMessage(type, data) {
  const messages = {
    'user_registration': `新用户 ${data.username} 注册成功`,
    'assignment_graded': `作业 ${data.assignmentTitle} 已评分`,
    'course_enrollment': `用户 ${data.username} 加入了课程`,
    'new_assignment': `新作业 ${data.title} 已发布`
  };
  return messages[type] || '您有一条新通知';
}

// 通知操作API
app.post('/api/notifications', (req, res) => {
  try {
    const { type, recipientId, message, data = {} } = req.body;

    const notification = {
      id: Date.now(),
      type,
      recipient_id: recipientId,
      message: message || getNotificationMessage(type, data),
      created_at: new Date().toISOString(),
      read: false,
      ...data
    };

    memoryStorage.notifications.push(notification);

    res.status(201).json({
      success: true,
      message: '通知创建成功',
      data: notification
    });
  } catch (error) {
    res.status(500).json({ error: '创建通知失败' });
  }
});

app.put('/api/notifications/:id/read', (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const notification = memoryStorage.notifications.find(n => n.id === notificationId);

    if (!notification) {
      return res.status(404).json({ error: '通知不存在' });
    }

    notification.read = true;
    res.json({
      success: true,
      message: '通知已读'
    });
  } catch (error) {
    res.status(500).json({ error: '标记已读失败' });
  }
});

app.put('/api/notifications/mark-all-read', (req, res) => {
  try {
    const { recipientId } = req.body;
    const count = memoryStorage.notifications.filter(n => !n.read && (!recipientId || n.recipient_id == recipientId)).length;

    memoryStorage.notifications.forEach(n => {
      if (!n.read && (!recipientId || n.recipient_id == recipientId)) {
        n.read = true;
      }
    });

    res.json({
      success: true,
      message: `已标记 ${count} 条通知为已读`
    });
  } catch (error) {
    res.status(500).json({ error: '批量标记已读失败' });
  }
});

app.delete('/api/notifications/clear-all', (req, res) => {
  try {
    const { recipientId } = req.query;

    const originalLength = memoryStorage.notifications.length;

    if (recipientId) {
      memoryStorage.notifications = memoryStorage.notifications.filter(n => n.recipient_id != recipientId);
    } else {
      memoryStorage.notifications = [];
    }

    res.json({
      success: true,
      message: `已清理 ${originalLength - memoryStorage.notifications.length} 条通知`
    });
  } catch (error) {
    res.status(500).json({ error: '清理通知失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Vercel API 运行正常',
    timestamp: new Date().toISOString(),
    environment: 'Vercel Serverless'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件服务
app.use(express.static(path.join(__dirname, '..')));

// 特殊HTML页面路由
app.get('/main.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'main.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/editor.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'editor.html'));
});

// 根路径重定向到登录页面
app.get('/', (req, res) => {
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