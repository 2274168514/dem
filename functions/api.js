/**
 * Cloudflare Pages Function - 统一API路由处理器
 * 路径: /api/*
 */

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const method = request.method;

  // 添加CORS头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // 处理OPTIONS请求
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // 路由处理
    if (path === '/health' && method === 'GET') {
      return handleHealthCheck();
    }

    if (path === '/users/login' && method === 'POST') {
      return handleLogin(request);
    }

    if (path === '/users/register' && method === 'POST') {
      return handleRegister(request);
    }

    if (path === '/users/profile' && method === 'GET') {
      return handleProfile();
    }

    if (path === '/courses' && method === 'GET') {
      return handleCourses();
    }

    if (path === '/assignments' && method === 'GET') {
      return handleAssignments();
    }

    // 404处理
    return new Response(JSON.stringify({
      error: 'API端点不存在',
      path: path,
      method: method,
      availableEndpoints: ['/health', '/users/login', '/users/register', '/users/profile', '/courses', '/assignments']
    }), {
      status: 404,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: '服务器内部错误',
      message: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 处理健康检查
function handleHealthCheck() {
  return new Response(JSON.stringify({
    status: 'ok',
    message: 'API服务器运行正常',
    timestamp: new Date().toISOString(),
    environment: 'Cloudflare Pages',
    version: '1.0.0'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 处理用户登录
async function handleLogin(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 模拟用户数据库
    const users = [
      { id: 1, username: 'admin', role: 'admin', email: 'admin@example.com' },
      { id: 2, username: 'teacher1', role: 'teacher', email: 'teacher@example.com' },
      { id: 3, username: 'student1', role: 'student', email: 'student@example.com' }
    ];

    const user = users.find(u => u.username === username);
    if (!user) {
      return new Response(JSON.stringify({ error: '用户不存在' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 简化密码验证
    if (password !== '123123') {
      return new Response(JSON.stringify({ error: '密码错误' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      },
      token: 'mock-jwt-token-' + Date.now()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: '登录请求处理失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理用户注册
async function handleRegister(request) {
  try {
    const { username, email, password, role = 'student' } = await request.json();

    return new Response(JSON.stringify({
      success: true,
      message: '注册成功',
      user: {
        id: Date.now(),
        username: username,
        email: email,
        role: role,
        created_at: new Date().toISOString()
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: '注册请求处理失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理用户资料
function handleProfile() {
  return new Response(JSON.stringify({
    success: true,
    user: {
      id: 1,
      username: 'student1',
      email: 'student@example.com',
      role: 'student',
      full_name: '学生一',
      created_at: '2024-01-01T00:00:00Z',
      last_login: new Date().toISOString()
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 处理课程列表
function handleCourses() {
  const courses = [
    {
      id: 1,
      title: 'Web开发基础',
      description: 'HTML, CSS, JavaScript基础编程',
      teacher_name: '张老师',
      created_at: new Date().toISOString(),
      students_count: 15
    },
    {
      id: 2,
      title: '高级JavaScript',
      description: 'ES6+、异步编程、框架入门',
      teacher_name: '张老师',
      created_at: new Date().toISOString(),
      students_count: 8
    }
  ];

  return new Response(JSON.stringify({
    success: true,
    courses: courses
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 处理作业列表
function handleAssignments() {
  const assignments = [
    {
      id: 1,
      title: '创建个人主页',
      description: '使用HTML和CSS创建一个个人介绍页面',
      course_name: 'Web开发基础',
      teacher_name: '张老师',
      created_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      difficulty: 'beginner'
    }
  ];

  return new Response(JSON.stringify({
    success: true,
    assignments: assignments
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}