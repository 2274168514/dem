/**
 * 路由管理系统
 * 处理页面导航、权限验证和动态内容加载
 */

import { userAuth, USER_ROLES } from './userAuth.js';
import { permissionManager } from './permissionManager.js';

export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.defaultRoute = '/dashboard';
    this.init();
  }

  /**
   * 初始化路由系统
   */
  init() {
    // 监听浏览器前进后退
    window.addEventListener('popstate', (e) => {
      this.navigate(e.state?.route || window.location.pathname, false);
    });

    // 监听页面加载
    window.addEventListener('load', () => {
      const initialRoute = this.getRouteFromURL();
      this.navigate(initialRoute, false);
    });

    // 注册所有路由
    this.registerRoutes();
  }

  /**
   * 注册路由
   */
  registerRoutes() {
    // 公共路由
    this.register('/', () => this.handleDefaultRoute());
    this.register('/login', () => this.handleLoginRoute());
    this.register('/register', () => this.handleRegisterRoute());

    // 仪表盘路由
    this.register('/dashboard', () => this.handleDashboardRoute());

    // 管理员路由
    this.register('/admin', () => this.handleAdminRoute());
    this.register('/admin/users', () => this.handleAdminUsersRoute());
    this.register('/admin/courses', () => this.handleAdminCoursesRoute());
    this.register('/admin/settings', () => this.handleAdminSettingsRoute());

    // 教师路由
    this.register('/teacher', () => this.handleTeacherRoute());
    this.register('/teacher/courses', () => this.handleTeacherCoursesRoute());
    this.register('/teacher/assignments', () => this.handleTeacherAssignmentsRoute());
    this.register('/teacher/students', () => this.handleTeacherStudentsRoute());

    // 学生路由
    this.register('/student', () => this.handleStudentRoute());
    this.register('/student/courses', () => this.handleStudentCoursesRoute());
    this.register('/student/assignments', () => this.handleStudentAssignmentsRoute());
    this.register('/student/grades', () => this.handleStudentGradesRoute());

    // 编辑器路由
    this.register('/editor', () => this.handleEditorRoute());

    // 个人资料路由
    this.register('/profile', () => this.handleProfileRoute());

    // 登出路由
    this.register('/logout', () => this.handleLogoutRoute());
  }

  /**
   * 注册单个路由
   */
  register(path, handler) {
    this.routes.set(path, handler);
  }

  /**
   * 导航到指定路由
   */
  async navigate(path, updateHistory = true) {
    const currentUser = userAuth.getCurrentUser();

    // 权限检查
    const routeGuard = permissionManager.routeGuard(currentUser, path, this.currentRoute);
    if (routeGuard.redirect) {
      this.navigate(routeGuard.redirect, false);
      this.showMessage(routeGuard.message, 'warning');
      return;
    }

    try {
      // 更新浏览器历史
      if (updateHistory) {
        history.pushState({ route: path }, '', path);
      }

      // 执行路由处理器
      const handler = this.routes.get(path);
      if (handler) {
        await handler();
      } else {
        this.handle404();
      }

      this.currentRoute = path;
      this.updateActiveNavigation(path);
      this.updatePageTitle(path);

    } catch (error) {
      console.error('路由导航错误:', error);
      this.showMessage('页面加载失败: ' + error.message, 'error');
    }
  }

  /**
   * 从URL获取当前路由
   */
  getRouteFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');

    if (pageParam) {
      return `/${pageParam}`;
    }

    // 如果没有页面参数，根据用户角色重定向
    const currentUser = userAuth.getCurrentUser();
    if (currentUser) {
      switch (currentUser.role) {
        case USER_ROLES.ADMIN:
          return '/admin';
        case USER_ROLES.TEACHER:
          return '/teacher';
        case USER_ROLES.STUDENT:
          return '/student';
        default:
          return '/dashboard';
      }
    }

    return window.location.pathname || '/';
  }

  /**
   * 处理默认路由
   */
  async handleDefaultRoute() {
    const currentUser = userAuth.getCurrentUser();

    if (!currentUser) {
      window.location.href = 'main.html';
      return;
    }

    // 根据用户角色重定向到对应的仪表盘
    switch (currentUser.role) {
      case USER_ROLES.ADMIN:
        await this.navigate('/admin');
        break;
      case USER_ROLES.TEACHER:
        await this.navigate('/teacher');
        break;
      case USER_ROLES.STUDENT:
        await this.navigate('/student');
        break;
      default:
        await this.navigate('/dashboard');
    }
  }

  /**
   * 处理登录路由
   */
  async handleLoginRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (currentUser) {
      await this.navigate('/dashboard');
      return;
    }

    window.location.href = 'main.html';
  }

  /**
   * 处理注册路由
   */
  async handleRegisterRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (currentUser) {
      await this.navigate('/dashboard');
      return;
    }

    window.location.href = 'main.html#register';
  }

  /**
   * 处理仪表盘路由
   */
  async handleDashboardRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser) {
      await this.navigate('/login');
      return;
    }

    await this.loadDashboardContent(currentUser);
  }

  /**
   * 处理管理员路由
   */
  async handleAdminRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(currentUser, USER_ROLES.ADMIN)) {
      await this.navigate('/login');
      return;
    }

    await this.loadAdminContent();
  }

  /**
   * 处理管理员用户管理路由
   */
  async handleAdminUsersRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(currentUser, USER_ROLES.ADMIN)) {
      await this.navigate('/login');
      return;
    }

    await this.loadAdminUsersContent();
  }

  /**
   * 处理管理员课程管理路由
   */
  async handleAdminCoursesRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(currentUser, USER_ROLES.ADMIN)) {
      await this.navigate('/login');
      return;
    }

    await this.loadAdminCoursesContent();
  }

  /**
   * 处理管理员设置路由
   */
  async handleAdminSettingsRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.ADMIN)) {
      await this.navigate('/login');
      return;
    }

    await this.loadAdminSettingsContent();
  }

  /**
   * 处理教师路由
   */
  async handleTeacherRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.TEACHER)) {
      await this.navigate('/login');
      return;
    }

    await this.loadTeacherContent();
  }

  /**
   * 处理教师课程路由
   */
  async handleTeacherCoursesRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.TEACHER)) {
      await this.navigate('/login');
      return;
    }

    await this.loadTeacherCoursesContent();
  }

  /**
   * 处理教师作业路由
   */
  async handleTeacherAssignmentsRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.TEACHER)) {
      await this.navigate('/login');
      return;
    }

    await this.loadTeacherAssignmentsContent();
  }

  /**
   * 处理教师学生路由
   */
  async handleTeacherStudentsRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.TEACHER)) {
      await this.navigate('/login');
      return;
    }

    await this.loadTeacherStudentsContent();
  }

  /**
   * 处理学生路由
   */
  async handleStudentRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.STUDENT)) {
      await this.navigate('/login');
      return;
    }

    await this.loadStudentContent();
  }

  /**
   * 处理学生课程路由
   */
  async handleStudentCoursesRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.STUDENT)) {
      await this.navigate('/login');
      return;
    }

    await this.loadStudentCoursesContent();
  }

  /**
   * 处理学生作业路由
   */
  async handleStudentAssignmentsRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.STUDENT)) {
      await this.navigate('/login');
      return;
    }

    await this.loadStudentAssignmentsContent();
  }

  /**
   * 处理学生成绩路由
   */
  async handleStudentGradesRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser || !permissionManager.hasRole(USER_ROLES.STUDENT)) {
      await this.navigate('/login');
      return;
    }

    await this.loadStudentGradesContent();
  }

  /**
   * 处理编辑器路由
   */
  async handleEditorRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser) {
      await this.navigate('/login');
      return;
    }

    await this.loadEditorContent();
  }

  /**
   * 处理个人资料路由
   */
  async handleProfileRoute() {
    const currentUser = userAuth.getCurrentUser();
    if (!currentUser) {
      await this.navigate('/login');
      return;
    }

    await this.loadProfileContent();
  }

  /**
   * 处理登出路由
   */
  async handleLogoutRoute() {
    userAuth.logout();
    this.showMessage('已成功登出', 'success');
    window.location.href = 'main.html';
  }

  /**
   * 处理404错误
   */
  handle404() {
    this.showMessage('页面不存在', 'error');
  }

  /**
   * 加载仪表盘内容
   */
  async loadDashboardContent(user) {
    const mainContent = document.getElementById('main-content') || document.querySelector('.main-area');
    if (!mainContent) return;

    const content = await this.getDashboardHTML(user);
    mainContent.innerHTML = content;
    this.initializeDashboardScripts(user);
  }

  /**
   * 获取仪表盘HTML
   */
  async getDashboardHTML(user) {
    const roleDisplayName = permissionManager.getRoleDisplayName(user.role);

    return `
      <div class="dashboard-container p-6">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            欢迎，${user.fullName}
          </h1>
          <p class="text-gray-600">${roleDisplayName}仪表盘</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-blue-100 rounded-lg">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">我的课程</p>
                <p class="text-2xl font-bold text-gray-900" id="course-count">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-green-100 rounded-lg">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">已完成作业</p>
                <p class="text-2xl font-bold text-gray-900" id="completed-assignments">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-yellow-100 rounded-lg">
                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">待完成作业</p>
                <p class="text-2xl font-bold text-gray-900" id="pending-assignments">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-purple-100 rounded-lg">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">平均成绩</p>
                <p class="text-2xl font-bold text-gray-900" id="average-grade">-</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">最近活动</h2>
            <div id="recent-activities" class="space-y-3">
              <p class="text-gray-500">加载中...</p>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">快速操作</h2>
            <div class="grid grid-cols-2 gap-4">
              <button onclick="router.navigate('/editor')" class="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                </svg>
                <p class="font-medium">代码编辑器</p>
              </button>

              ${user.role === USER_ROLES.STUDENT ? `
                <button onclick="router.navigate('/student/assignments')" class="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <p class="font-medium">我的作业</p>
                </button>
              ` : ''}

              ${user.role === USER_ROLES.TEACHER ? `
                <button onclick="router.navigate('/teacher/courses')" class="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  <p class="font-medium">课程管理</p>
                </button>
                <button onclick="router.navigate('/teacher/assignments')" class="p-4 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                  <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <p class="font-medium">作业管理</p>
                </button>
              ` : ''}

              ${user.role === USER_ROLES.ADMIN ? `
                <button onclick="router.navigate('/admin/users')" class="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                  <p class="font-medium">用户管理</p>
                </button>
                <button onclick="router.navigate('/admin/courses')" class="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  <p class="font-medium">课程管理</p>
                </button>
              ` : ''}

              <button onclick="router.navigate('/profile')" class="p-4 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <p class="font-medium">个人资料</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初始化仪表盘脚本
   */
  initializeDashboardScripts(user) {
    // 这里可以添加仪表盘特定的JavaScript逻辑
    console.log('仪表盘已加载，用户角色:', user.role);

    // 异步加载统计数据
    this.loadDashboardStats(user);
  }

  /**
   * 加载仪表盘统计数据
   */
  async loadDashboardStats(user) {
    try {
      // 动态导入相关模块
      const { courseManager } = await import('./courseManager.js');
      const { assignmentManager } = await import('./assignmentManager.js');

      let courseCount = 0;
      let completedAssignments = 0;
      let pendingAssignments = 0;
      let averageGrade = 0;

      if (user.role === USER_ROLES.STUDENT) {
        // 学生数据
        const studentCourses = courseManager.getStudentCourses(user.id);
        courseCount = studentCourses.length;

        const studentSubmissions = assignmentManager.getStudentSubmissions(user.id);
        completedAssignments = studentSubmissions.filter(s => s.status === 'graded').length;
        pendingAssignments = assignmentManager.getAssignments().filter(a =>
          !studentSubmissions.some(s => s.assignmentId === a.id) &&
          a.status === 'published'
        ).length;

        const gradedSubmissions = studentSubmissions.filter(s => s.status === 'graded' && s.grade);
        if (gradedSubmissions.length > 0) {
          const totalGrade = gradedSubmissions.reduce((sum, s) => sum + (s.finalScore || s.grade), 0);
          averageGrade = (totalGrade / gradedSubmissions.length).toFixed(1);
        }
      } else if (user.role === USER_ROLES.TEACHER) {
        // 教师数据
        const teacherCourses = courseManager.getTeacherCourses(user.id);
        courseCount = teacherCourses.length;

        const teacherAssignments = assignmentManager.getAssignments();
        completedAssignments = teacherAssignments.length;
        pendingAssignments = teacherAssignments.filter(a => a.status === 'draft').length;
      } else if (user.role === USER_ROLES.ADMIN) {
        // 管理员数据
        const allCourses = courseManager.getCourses();
        courseCount = allCourses.length;

        const allAssignments = assignmentManager.getAssignments();
        completedAssignments = allAssignments.length;
        pendingAssignments = 0; // 管理员可能没有待完成的概念
      }

      // 更新DOM
      document.getElementById('course-count').textContent = courseCount;
      document.getElementById('completed-assignments').textContent = completedAssignments;
      document.getElementById('pending-assignments').textContent = pendingAssignments;
      document.getElementById('average-grade').textContent = averageGrade || '-';

    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }

  /**
   * 加载编辑器内容
   */
  async loadEditorContent() {
    // 集成现有的js-editor
    const mainContent = document.getElementById('main-content') || document.querySelector('.main-area');
    if (mainContent) {
      // 这里可以加载完整的编辑器界面
      // 或者重定向到现有的index.html
      window.location.href = 'index.html';
    }
  }

  /**
   * 更新活动导航状态
   */
  updateActiveNavigation(currentPath) {
    const navLinks = document.querySelectorAll('[data-route]');
    navLinks.forEach(link => {
      const route = link.getAttribute('data-route');
      if (route === currentPath || (route && currentPath.startsWith(route))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * 更新页面标题
   */
  updatePageTitle(path) {
    const currentUser = userAuth.getCurrentUser();
    const title = permissionManager.getPageTitle(currentUser, path);
    document.title = title;
  }

  /**
   * 显示消息
   */
  showMessage(message, type = 'info') {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'warning' ? 'bg-yellow-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // 3秒后自动移除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  /**
   * 加载管理员内容
   */
  async loadAdminContent() {
    const mainContent = document.getElementById('main-content') || document.querySelector('.main-area');
    if (!mainContent) return;

    const content = await this.getAdminHTML();
    mainContent.innerHTML = content;
    this.initializeAdminScripts();
  }

  /**
   * 获取管理员界面HTML
   */
  async getAdminHTML() {
    return `
      <div class="admin-dashboard p-6">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">管理员仪表盘</h1>
          <p class="text-gray-600">系统管理和监控</p>
        </div>

        <!-- 统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-purple-100 rounded-lg">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">总用户数</p>
                <p class="text-2xl font-bold text-gray-900" id="total-users">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-blue-100 rounded-lg">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">课程数量</p>
                <p class="text-2xl font-bold text-gray-900" id="total-courses">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-green-100 rounded-lg">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">作业数量</p>
                <p class="text-2xl font-bold text-gray-900" id="total-assignments">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-yellow-100 rounded-lg">
                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">提交数量</p>
                <p class="text-2xl font-bold text-gray-900" id="total-submissions">-</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 快速操作 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">用户管理</h2>
            <div class="space-y-3">
              <button onclick="router.navigate('/admin/users')" class="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                管理用户
              </button>
              <button onclick="showAddUserModal()" class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                添加用户
              </button>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">课程管理</h2>
            <div class="space-y-3">
              <button onclick="router.navigate('/admin/courses')" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                管理课程
              </button>
              <button onclick="showAddCourseModal()" class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                添加课程
              </button>
            </div>
          </div>
        </div>

        <!-- 系统状态 -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">系统状态</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 bg-green-50 rounded-lg">
              <p class="text-sm text-green-600 font-medium">系统状态</p>
              <p class="text-lg font-bold text-green-800">正常运行</p>
            </div>
            <div class="p-4 bg-blue-50 rounded-lg">
              <p class="text-sm text-blue-600 font-medium">最后备份</p>
              <p class="text-lg font-bold text-blue-800">今天 02:00</p>
            </div>
            <div class="p-4 bg-purple-50 rounded-lg">
              <p class="text-sm text-purple-600 font-medium">版本</p>
              <p class="text-lg font-bold text-purple-800">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初始化管理员脚本
   */
  async initializeAdminScripts() {
    console.log('管理员界面已加载');

    // 加载统计数据
    this.loadAdminStats();
  }

  /**
   * 加载管理员统计数据
   */
  async loadAdminStats() {
    try {
      const { courseManager } = await import('./courseManager.js');
      const { assignmentManager } = await import('./assignmentManager.js');
      const userStats = userAuth.getUserStats();
      const courseStats = courseManager.getCourseStats();
      const assignmentStats = assignmentManager.getAssignmentStats();

      document.getElementById('total-users').textContent = userStats.total;
      document.getElementById('total-courses').textContent = courseStats.totalCourses;
      document.getElementById('total-assignments').textContent = assignmentStats.totalAssignments;
      document.getElementById('total-submissions').textContent = assignmentStats.totalSubmissions;
    } catch (error) {
      console.error('加载管理员统计数据失败:', error);
    }
  }

  /**
   * 加载教师内容
   */
  async loadTeacherContent() {
    const mainContent = document.getElementById('main-content') || document.querySelector('.main-area');
    if (!mainContent) return;

    const content = await this.getTeacherHTML();
    mainContent.innerHTML = content;
    this.initializeTeacherScripts();
  }

  /**
   * 获取教师界面HTML
   */
  async getTeacherHTML() {
    return `
      <div class="teacher-dashboard p-6">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">教师仪表盘</h1>
          <p class="text-gray-600">课程和作业管理</p>
        </div>

        <!-- 教师统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-blue-100 rounded-lg">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">我的课程</p>
                <p class="text-2xl font-bold text-gray-900" id="teacher-courses">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-green-100 rounded-lg">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">学生总数</p>
                <p class="text-2xl font-bold text-gray-900" id="teacher-students">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-yellow-100 rounded-lg">
                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">作业总数</p>
                <p class="text-2xl font-bold text-gray-900" id="teacher-assignments">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-purple-100 rounded-lg">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">待批改</p>
                <p class="text-2xl font-bold text-gray-900" id="pending-grading">-</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 快速操作 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">课程管理</h2>
            <div class="space-y-3">
              <button onclick="router.navigate('/teacher/courses')" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                查看课程
              </button>
              <button onclick="showCreateAssignmentModal()" class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                创建作业
              </button>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">作业管理</h2>
            <div class="space-y-3">
              <button onclick="router.navigate('/teacher/assignments')" class="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors">
                查看作业
              </button>
              <button onclick="router.navigate('/teacher/students')" class="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                学生管理
              </button>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">工具</h2>
            <div class="space-y-3">
              <button onclick="router.navigate('/editor')" class="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                代码编辑器
              </button>
              <button onclick="router.navigate('/profile')" class="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                个人资料
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初始化教师脚本
   */
  async initializeTeacherScripts() {
    console.log('教师界面已加载');

    // 加载教师统计数据
    this.loadTeacherStats();
  }

  /**
   * 加载教师统计数据
   */
  async loadTeacherStats() {
    try {
      const { courseManager } = await import('./courseManager.js');
      const { assignmentManager } = await import('./assignmentManager.js');
      const currentUser = userAuth.getCurrentUser();

      const teacherCourses = courseManager.getTeacherCourses(currentUser.id);
      const teacherAssignments = assignmentManager.getAssignments();
      const allSubmissions = assignmentManager.submissions;

      // 计算学生总数
      let totalStudents = 0;
      teacherCourses.forEach(course => {
        totalStudents += course.enrolledStudents.length;
      });

      // 计算待批改数量
      const pendingGrading = allSubmissions.filter(s =>
        teacherAssignments.some(a => a.id === s.assignmentId && a.teacherId === currentUser.id) &&
        s.status === 'submitted'
      ).length;

      document.getElementById('teacher-courses').textContent = teacherCourses.length;
      document.getElementById('teacher-students').textContent = totalStudents;
      document.getElementById('teacher-assignments').textContent = teacherAssignments.length;
      document.getElementById('pending-grading').textContent = pendingGrading;
    } catch (error) {
      console.error('加载教师统计数据失败:', error);
    }
  }

  /**
   * 加载学生内容
   */
  async loadStudentContent() {
    const mainContent = document.getElementById('main-content') || document.querySelector('.main-area');
    if (!mainContent) return;

    const content = await this.getStudentHTML();
    mainContent.innerHTML = content;
    this.initializeStudentScripts();
  }

  /**
   * 获取学生界面HTML
   */
  async getStudentHTML() {
    return `
      <div class="student-dashboard p-6">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">学生仪表盘</h1>
          <p class="text-gray-600">课程学习和作业提交</p>
        </div>

        <!-- 学生统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-blue-100 rounded-lg">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">已报名课程</p>
                <p class="text-2xl font-bold text-gray-900" id="student-courses">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-green-100 rounded-lg">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">已完成作业</p>
                <p class="text-2xl font-bold text-gray-900" id="completed-assignments">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-yellow-100 rounded-lg">
                <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">待完成作业</p>
                <p class="text-2xl font-bold text-gray-900" id="pending-assignments">-</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 bg-purple-100 rounded-lg">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">平均成绩</p>
                <p class="text-2xl font-bold text-gray-900" id="average-grade">-</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 快速操作 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">课程学习</h2>
            <div class="space-y-3">
              <button onclick="router.navigate('/student/courses')" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                我的课程
              </button>
              <button onclick="router.navigate('/student/grades')" class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                成绩查询
              </button>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">作业提交</h2>
            <div class="space-y-3">
              <button onclick="router.navigate('/student/assignments')" class="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors">
                我的作业
              </button>
              <button onclick="showAssignmentList()" class="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                待完成作业
              </button>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">工具</h2>
            <div class="space-y-3">
              <button onclick="router.navigate('/editor')" class="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                代码编辑器
              </button>
              <button onclick="router.navigate('/profile')" class="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                个人资料
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初始化学生脚本
   */
  async initializeStudentScripts() {
    console.log('学生界面已加载');

    // 加载学生统计数据
    this.loadStudentStats();
  }

  /**
   * 加载学生统计数据
   */
  async loadStudentStats() {
    try {
      const { courseManager } = await import('./courseManager.js');
      const { assignmentManager } = await import('./assignmentManager.js');
      const currentUser = userAuth.getCurrentUser();

      const studentCourses = courseManager.getStudentCourses(currentUser.id);
      const studentSubmissions = assignmentManager.getStudentSubmissions(currentUser.id);
      const allAssignments = assignmentManager.getAssignments();

      const completedAssignments = studentSubmissions.filter(s => s.status === 'graded').length;
      const pendingAssignments = allAssignments.filter(a =>
        !studentSubmissions.some(s => s.assignmentId === a.id) &&
        a.status === 'published'
      ).length;

      const gradedSubmissions = studentSubmissions.filter(s => s.status === 'graded' && s.grade);
      const averageGrade = gradedSubmissions.length > 0
        ? (gradedSubmissions.reduce((sum, s) => sum + (s.finalScore || s.grade), 0) / gradedSubmissions.length).toFixed(1)
        : '-';

      document.getElementById('student-courses').textContent = studentCourses.length;
      document.getElementById('completed-assignments').textContent = completedAssignments;
      document.getElementById('pending-assignments').textContent = pendingAssignments;
      document.getElementById('average-grade').textContent = averageGrade;
    } catch (error) {
      console.error('加载学生统计数据失败:', error);
    }
  }

  /**
   * 获取管理员用户管理界面HTML
   */
  async getAdminUsersHTML() {
    return `
      <div class="admin-users-page p-6">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">用户管理</h1>
          <p class="text-gray-600">管理系统用户账号和权限</p>
        </div>

        <!-- 操作工具栏 -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <input type="text" id="user-search" placeholder="搜索用户..." class="input-field px-4 py-2 rounded-lg text-white placeholder-gray-500">
              <select id="role-filter" class="input-field px-4 py-2 rounded-lg text-white">
                <option value="">所有角色</option>
                <option value="admin">管理员</option>
                <option value="teacher">教师</option>
                <option value="student">学生</option>
              </select>
            </div>
            <div class="flex space-x-3">
              <button onclick="showAddUserModal()" class="btn-primary px-4 py-2 rounded-lg text-white">
                添加用户
              </button>
              <button onclick="refreshUserList()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                刷新
              </button>
            </div>
          </div>
        </div>

        <!-- 用户列表 -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户信息</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody id="user-table-body" class="bg-white divide-y divide-gray-200">
                <tr>
                  <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初始化管理员用户管理脚本
   */
  async initializeAdminUsersScripts() {
    console.log('用户管理界面已加载');
    this.loadUserList();

    // 绑定搜索事件
    document.getElementById('user-search')?.addEventListener('input', () => this.loadUserList());
    document.getElementById('role-filter')?.addEventListener('change', () => this.loadUserList());
  }

  /**
   * 加载用户列表
   */
  async loadUserList() {
    try {
      const users = userAuth.getAllUsers();
      const searchTerm = document.getElementById('user-search')?.value.toLowerCase() || '';
      const roleFilter = document.getElementById('role-filter')?.value || '';

      const filteredUsers = users.filter(user => {
        const matchesSearch = !searchTerm ||
          user.fullName.toLowerCase().includes(searchTerm) ||
          user.username.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm);

        const matchesRole = !roleFilter || user.role === roleFilter;

        return matchesSearch && matchesRole;
      });

      this.renderUserTable(filteredUsers);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      this.showMessage('加载用户列表失败', 'error');
    }
  }

  /**
   * 渲染用户表格
   */
  renderUserTable(users) {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">
            没有找到用户
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <div class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
                ${user.fullName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${user.fullName}</div>
              <div class="text-sm text-gray-500">@${user.username}</div>
              ${user.studentId ? `<div class="text-xs text-gray-400">学号: ${user.studentId}</div>` : ''}
              ${user.employeeId ? `<div class="text-xs text-gray-400">工号: ${user.employeeId}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
            user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'
          }">
            ${user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${user.email}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }">
            ${user.isActive ? '活跃' : '禁用'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : '从未登录'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button onclick="editUser('${user.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">
            编辑
          </button>
          <button onclick="toggleUserStatus('${user.id}')" class="text-yellow-600 hover:text-yellow-900 mr-3">
            ${user.isActive ? '禁用' : '启用'}
          </button>
          <button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-900">
            删除
          </button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * 获取管理员课程管理界面HTML
   */
  async getAdminCoursesContent() {
    return `
      <div class="admin-courses-page p-6">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">课程管理</h1>
          <p class="text-gray-600">管理所有课程信息</p>
        </div>

        <!-- 操作工具栏 -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <input type="text" placeholder="搜索课程..." class="input-field px-4 py-2 rounded-lg text-white placeholder-gray-500">
            </div>
            <div class="flex space-x-3">
              <button onclick="showAddCourseModal()" class="btn-primary px-4 py-2 rounded-lg text-white">
                添加课程
              </button>
              <button onclick="refreshCourseList()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                刷新
              </button>
            </div>
          </div>
        </div>

        <!-- 课程列表 -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">课程信息</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">授课教师</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学生数量</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody id="course-table-body" class="bg-white divide-y divide-gray-200">
                <tr>
                  <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初始化管理员课程管理脚本
   */
  async initializeAdminCoursesScripts() {
    console.log('课程管理界面已加载');
    this.loadCourseList();
  }

  /**
   * 加载课程列表
   */
  async loadCourseList() {
    try {
      const { courseManager } = await import('./courseManager.js');
      const courses = courseManager.getCourses();
      this.renderCourseTable(courses);
    } catch (error) {
      console.error('加载课程列表失败:', error);
      this.showMessage('加载课程列表失败', 'error');
    }
  }

  /**
   * 渲染课程表格
   */
  renderCourseTable(courses) {
    const tbody = document.getElementById('course-table-body');
    if (!tbody) return;

    if (courses.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">
            没有找到课程
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = courses.map(course => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${course.name}</div>
          <div class="text-sm text-gray-500">${course.code}</div>
          <div class="text-xs text-gray-400">${course.description || ''}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${course.teacherName || '-'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${course.enrolledStudents?.length || 0}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            course.status === 'active' ? 'bg-green-100 text-green-800' :
            course.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
            'bg-yellow-100 text-yellow-800'
          }">
            ${course.status === 'active' ? '进行中' : course.status === 'inactive' ? '未开始' : '已结束'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${new Date(course.createdAt).toLocaleDateString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button onclick="editCourse('${course.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">
            编辑
          </button>
          <button onclick="deleteCourse('${course.id}')" class="text-red-600 hover:text-red-900">
            删除
          </button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * 获取管理员设置界面HTML
   */
  async getAdminSettingsContent() {
    return `
      <div class="admin-settings-page p-6">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">系统设置</h1>
          <p class="text-gray-600">配置系统参数和全局设置</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 系统信息 -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">系统信息</h2>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600">系统版本</span>
                <span class="font-medium">v1.0.0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">运行时间</span>
                <span class="font-medium">正常运行</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">数据存储</span>
                <span class="font-medium">本地存储</span>
              </div>
            </div>
          </div>

          <!-- 数据统计 -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">数据统计</h2>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-600">总用户数</span>
                <span class="font-medium" id="total-users-count">-</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">总课程数</span>
                <span class="font-medium" id="total-courses-count">-</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">总作业数</span>
                <span class="font-medium" id="total-assignments-count">-</span>
              </div>
            </div>
          </div>

          <!-- 数据管理 -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">数据管理</h2>
            <div class="space-y-3">
              <button onclick="exportData()" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                导出数据
              </button>
              <button onclick="clearCache()" class="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                清理缓存
              </button>
            </div>
          </div>

          <!-- 系统维护 -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">系统维护</h2>
            <div class="space-y-3">
              <button onclick="resetSystem()" class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                重置系统
              </button>
              <button onclick="checkSystem()" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                系统检查
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初始化管理员设置脚本
   */
  async initializeAdminSettingsScripts() {
    console.log('系统设置界面已加载');
    this.loadSettingsStats();
  }

  /**
   * 加载设置统计数据
   */
  async loadSettingsStats() {
    try {
      const userStats = userAuth.getUserStats();
      const { courseManager } = await import('./courseManager.js');
      const { assignmentManager } = await import('./assignmentManager.js');

      const courseStats = courseManager.getCourseStats();
      const assignmentStats = assignmentManager.getAssignmentStats();

      document.getElementById('total-users-count').textContent = userStats.total;
      document.getElementById('total-courses-count').textContent = courseStats.totalCourses;
      document.getElementById('total-assignments-count').textContent = assignmentStats.totalAssignments;
    } catch (error) {
      console.error('加载设置统计数据失败:', error);
    }
  }

  /**
   * 加载页面内容（适配main.html）
   */
  async loadPage(pageId) {
    const currentUser = userAuth.getCurrentUser();
    const pageContent = document.getElementById('page-content');

    if (!pageContent) return;

    switch (pageId) {
      case 'dashboard':
        // 加载仪表盘内容
        await this.loadDashboardPage();
        break;

      case 'users':
        if (!currentUser || !permissionManager.hasRole(currentUser, USER_ROLES.ADMIN)) {
          this.showMessage('您没有权限访问用户管理', 'error');
          return;
        }
        await this.loadUsersPage();
        break;

      case 'teachers':
        if (!currentUser || !permissionManager.hasRole(currentUser, USER_ROLES.ADMIN)) {
          this.showMessage('您没有权限访问教师管理', 'error');
          return;
        }
        await this.loadTeachersPage();
        break;

      case 'students':
        if (!currentUser || !permissionManager.hasRole(currentUser, USER_ROLES.ADMIN)) {
          this.showMessage('您没有权限访问学生管理', 'error');
          return;
        }
        await this.loadStudentsPage();
        break;

      case 'courses':
        if (!currentUser || !permissionManager.hasRole(currentUser, USER_ROLES.ADMIN)) {
          this.showMessage('您没有权限访问课程管理', 'error');
          return;
        }
        await this.loadCoursesPage();
        break;

      case 'assignments':
        if (!currentUser || (!permissionManager.hasRole(currentUser, USER_ROLES.TEACHER) &&
                           !permissionManager.hasRole(currentUser, USER_ROLES.ADMIN))) {
          this.showMessage('您没有权限访问作业管理', 'error');
          return;
        }
        await this.loadAssignmentsPage();
        break;

      case 'profile':
        await this.loadProfilePage();
        break;

      case 'editor':
        // 打开代码编辑器
        window.open('index.html', '_blank');
        break;

      default:
        console.warn('未知页面ID:', pageId);
    }
  }

  /**
   * 加载仪表盘页面
   */
  async loadDashboardPage() {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    const currentUser = userAuth.getCurrentUser();
    if (!currentUser) return;

    // 根据用户角色显示不同的仪表盘内容
    let dashboardHTML;

    if (currentUser.role === USER_ROLES.ADMIN) {
      dashboardHTML = await this.getAdminDashboardHTML();
    } else if (currentUser.role === USER_ROLES.TEACHER) {
      dashboardHTML = await this.getTeacherDashboardHTML();
    } else {
      dashboardHTML = await this.getStudentDashboardHTML();
    }

    pageContent.innerHTML = dashboardHTML;
  }

  /**
   * 获取管理员仪表盘HTML
   */
  async getAdminDashboardHTML() {
    const users = userAuth.getAllUsers();
    const { courseManager } = await import('./courseManager.js');
    const { assignmentManager } = await import('./assignmentManager.js');
    const courses = courseManager.getAllCourses();
    const assignments = assignmentManager.getAllAssignments();

    const teacherCount = users.filter(u => u.role === 'teacher').length;
    const studentCount = users.filter(u => u.role === 'student').length;

    return `
      <div class="animate-fade-in-up">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">管理员仪表盘</h1>
          <p class="text-gray-400">系统概览和统计数据</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="glass-effect rounded-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">教师数量</p>
                <p class="text-2xl font-bold text-white">${teacherCount}</p>
              </div>
              <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="glass-effect rounded-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">学生数量</p>
                <p class="text-2xl font-bold text-white">${studentCount}</p>
              </div>
              <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="glass-effect rounded-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">课程数量</p>
                <p class="text-2xl font-bold text-white">${courses.length}</p>
              </div>
              <div class="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="glass-effect rounded-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">作业总数</p>
                <p class="text-2xl font-bold text-white">${assignments.length}</p>
              </div>
              <div class="w-12 h-12 bg-orange-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="glass-effect rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4">最近活动</h3>
            <div class="space-y-3">
              <div class="flex items-center space-x-3 p-3 bg-gray-700 bg-opacity-50 rounded">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-gray-300">系统运行正常</span>
                <span class="text-gray-500 text-sm ml-auto">刚刚</span>
              </div>
              <div class="flex items-center space-x-3 p-3 bg-gray-700 bg-opacity-50 rounded">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span class="text-gray-300">新用户注册</span>
                <span class="text-gray-500 text-sm ml-auto">5分钟前</span>
              </div>
              <div class="flex items-center space-x-3 p-3 bg-gray-700 bg-opacity-50 rounded">
                <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span class="text-gray-300">作业系统更新</span>
                <span class="text-gray-500 text-sm ml-auto">1小时前</span>
              </div>
            </div>
          </div>
          <div class="glass-effect rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4">快捷操作</h3>
            <div class="grid grid-cols-2 gap-4">
              <button onclick="window.showAddUserModal()" class="p-4 bg-gray-700 bg-opacity-50 hover:bg-opacity-70 rounded-lg text-center transition-colors">
                <svg class="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                </svg>
                <span class="text-white text-sm">添加用户</span>
              </button>
              <button onclick="window.showAddCourseModal()" class="p-4 bg-gray-700 bg-opacity-50 hover:bg-opacity-70 rounded-lg text-center transition-colors">
                <svg class="w-8 h-8 text-purple-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span class="text-white text-sm">创建课程</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 获取教师仪表盘HTML
   */
  async getTeacherDashboardHTML() {
    return `
      <div class="animate-fade-in-up">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">教师仪表盘</h1>
          <p class="text-gray-400">课程和作业管理</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="glass-effect rounded-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">我的课程</p>
                <p class="text-2xl font-bold text-white">5</p>
              </div>
              <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="glass-effect rounded-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">作业总数</p>
                <p class="text-2xl font-bold text-white">12</p>
              </div>
              <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-effect rounded-lg p-6">
          <h3 class="text-lg font-semibold text-white mb-4">我的课程</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-700 bg-opacity-50 rounded-lg p-4">
              <h4 class="text-white font-medium mb-2">Web开发基础</h4>
              <p class="text-gray-400 text-sm">32 名学生</p>
            </div>
            <div class="bg-gray-700 bg-opacity-50 rounded-lg p-4">
              <h4 class="text-white font-medium mb-2">数据结构与算法</h4>
              <p class="text-gray-400 text-sm">28 名学生</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 获取学生仪表盘HTML
   */
  async getStudentDashboardHTML() {
    return `
      <div class="animate-fade-in-up">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">学生仪表盘</h1>
          <p class="text-gray-400">学习进度和作业</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="glass-effect rounded-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">已选课程</p>
                <p class="text-2xl font-bold text-white">4</p>
              </div>
              <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
            </div>
          </div>
          <div class="glass-effect rounded-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-400 text-sm">待完成作业</p>
                <p class="text-2xl font-bold text-white">5</p>
              </div>
              <div class="w-12 h-12 bg-orange-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-effect rounded-lg p-6">
          <h3 class="text-lg font-semibold text-white mb-4">我的课程</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-700 bg-opacity-50 rounded-lg p-4">
              <h4 class="text-white font-medium mb-2">Web开发基础</h4>
              <p class="text-gray-400 text-sm">李老师</p>
            </div>
            <div class="bg-gray-700 bg-opacity-50 rounded-lg p-4">
              <h4 class="text-white font-medium mb-2">数据结构与算法</h4>
              <p class="text-gray-400 text-sm">王老师</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 加载用户管理页面
   */
  async loadUsersPage() {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    const users = userAuth.getAllUsers();

    pageContent.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-white">用户管理</h1>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="glass-effect rounded-lg p-6 text-center">
            <div class="text-3xl font-bold text-blue-500 mb-2">${users.filter(u => u.role === 'teacher').length}</div>
            <div class="text-gray-300">教师数量</div>
          </div>
          <div class="glass-effect rounded-lg p-6 text-center">
            <div class="text-3xl font-bold text-green-500 mb-2">${users.filter(u => u.role === 'student').length}</div>
            <div class="text-gray-300">学生数量</div>
          </div>
        </div>

        <div class="glass-effect rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">用户名</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">姓名</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">角色</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">状态</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                ${users.map(user => `
                  <tr class="hover:bg-gray-700">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-white">${user.username}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-white">${user.fullName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }">
                        ${user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }">
                        ${user.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 加载教师管理页面
   */
  async loadTeachersPage() {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    const users = userAuth.getAllUsers();
    const teachers = users.filter(user => user.role === 'teacher');

    pageContent.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-white">教师管理</h1>
          <button onclick="window.showAddUserModal()" class="btn-primary px-4 py-2 rounded-lg text-white font-medium">
            添加教师
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${teachers.map(teacher => `
            <div class="glass-effect rounded-lg p-6 hover:transform hover:scale-105 transition-all">
              <div class="flex items-center mb-4">
                <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-4">
                  <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-white">${teacher.fullName}</h3>
                  <p class="text-gray-400 text-sm">${teacher.username}</p>
                </div>
              </div>
              <div class="space-y-2 text-sm text-gray-300 mb-4">
                <p>工号: ${teacher.employeeId || '未设置'}</p>
                <p>邮箱: ${teacher.email}</p>
                <p>状态: <span class="px-2 py-1 text-xs rounded-full ${teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${teacher.isActive ? '启用' : '禁用'}</span></p>
              </div>
              <div class="flex space-x-2">
                <button onclick="window.editUser('${teacher.id}')" class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                  编辑
                </button>
                <button onclick="window.toggleUserStatus('${teacher.id}')" class="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm">
                  ${teacher.isActive ? '禁用' : '启用'}
                </button>
                <button onclick="window.deleteUser('${teacher.id}')" class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
                  删除
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 加载学生管理页面
   */
  async loadStudentsPage() {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    const users = userAuth.getAllUsers();
    const students = users.filter(user => user.role === 'student');

    pageContent.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-white">学生管理</h1>
          <button onclick="window.showAddUserModal()" class="btn-primary px-4 py-2 rounded-lg text-white font-medium">
            添加学生
          </button>
        </div>

        <div class="glass-effect rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">学号</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">姓名</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">用户名</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">邮箱</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">状态</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                ${students.map(student => `
                  <tr class="hover:bg-gray-700">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-white">${student.studentId || '未设置'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-white">${student.fullName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${student.username}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${student.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        student.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }">
                        ${student.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <button onclick="window.editUser('${student.id}')" class="text-blue-400 hover:text-blue-300 mr-3">编辑</button>
                      <button onclick="window.toggleUserStatus('${student.id}')" class="text-yellow-400 hover:text-yellow-300 mr-3">
                        ${student.isActive ? '禁用' : '启用'}
                      </button>
                      <button onclick="window.deleteUser('${student.id}')" class="text-red-400 hover:text-red-300">删除</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 加载课程管理页面
   */
  async loadCoursesPage() {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    const { courseManager } = await import('./courseManager.js');
    const courses = courseManager.getAllCourses();

    pageContent.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-white">课程管理</h1>
          <button onclick="window.showAddCourseModal()" class="btn-primary px-4 py-2 rounded-lg text-white font-medium">
            创建课程
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${courses.map(course => `
            <div class="glass-effect rounded-lg p-6 hover:transform hover:scale-105 transition-all">
              <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-semibold text-white">${course.title}</h3>
                <span class="px-2 py-1 text-xs rounded-full ${
                  course.status === 'active' ? 'bg-green-100 text-green-800' :
                  course.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }">
                  ${course.status === 'active' ? '进行中' : course.status === 'inactive' ? '未开始' : '已结束'}
                </span>
              </div>
              <p class="text-gray-400 text-sm mb-4">${course.description}</p>
              <div class="space-y-2 text-sm text-gray-300 mb-4">
                <p>课程代码: ${course.code}</p>
                <p>授课教师: ${course.teacherName}</p>
                <p>学生人数: ${course.enrolledStudents?.length || 0}/${course.maxStudents}</p>
              </div>
              <div class="flex space-x-2">
                <button onclick="window.viewCourseDetails('${course.id}')" class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                  查看
                </button>
                <button onclick="window.editCourse('${course.id}')" class="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm">
                  编辑
                </button>
                <button onclick="window.deleteCourse('${course.id}')" class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
                  删除
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 加载作业管理页面
   */
  async loadAssignmentsPage() {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    const { assignmentManager } = await import('./assignmentManager.js');
    const assignments = assignmentManager.getAllAssignments();

    pageContent.innerHTML = `
      <div class="animate-fade-in-up">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold text-white">作业管理</h1>
          <button onclick="window.assignmentInterface.showCreateAssignmentModal()" class="btn-primary px-4 py-2 rounded-lg text-white font-medium">
            创建作业
          </button>
        </div>

        <div class="glass-effect rounded-lg overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">作业名称</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">课程</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">截止时间</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">提交数</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                ${assignments.map(assignment => `
                  <tr class="hover:bg-gray-700">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-white">${assignment.title}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-white">${assignment.courseName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${new Date(assignment.deadline).toLocaleString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${assignment.submissions?.length || 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <button onclick="window.assignmentInterface.viewAssignment('${assignment.id}')" class="text-blue-400 hover:text-blue-300 mr-3">查看</button>
                      <button onclick="window.assignmentInterface.editAssignment('${assignment.id}')" class="text-yellow-400 hover:text-yellow-300 mr-3">编辑</button>
                      <button onclick="window.assignmentInterface.deleteAssignment('${assignment.id}')" class="text-red-400 hover:text-red-300">删除</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 加载个人资料页面
   */
  async loadProfilePage() {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    const currentUser = userAuth.getCurrentUser();

    pageContent.innerHTML = `
      <div class="animate-fade-in-up">
        <h1 class="text-2xl font-bold text-white mb-6">个人资料</h1>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1">
            <div class="glass-effect rounded-lg p-6 text-center">
              <div class="w-20 h-20 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span class="text-2xl text-white font-bold">${(currentUser.fullName || currentUser.username).charAt(0).toUpperCase()}</span>
              </div>
              <h3 class="text-lg font-semibold text-white mb-2">${currentUser.fullName || currentUser.username}</h3>
              <p class="text-gray-400 mb-4">${currentUser.email}</p>
              <span class="px-3 py-1 text-sm rounded-full ${
                currentUser.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                currentUser.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }">
                ${currentUser.role === 'admin' ? '管理员' : currentUser.role === 'teacher' ? '教师' : '学生'}
              </span>
            </div>
          </div>

          <div class="lg:col-span-2">
            <div class="glass-effect rounded-lg p-6">
              <h3 class="text-lg font-semibold text-white mb-4">基本信息</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">用户名</label>
                  <input type="text" value="${currentUser.username}" disabled class="input-field w-full px-4 py-3 rounded-lg">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">姓名</label>
                  <input type="text" value="${currentUser.fullName}" class="input-field w-full px-4 py-3 rounded-lg">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">邮箱</label>
                  <input type="email" value="${currentUser.email}" class="input-field w-full px-4 py-3 rounded-lg">
                </div>
                ${currentUser.studentId || currentUser.employeeId ? `
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">${currentUser.studentId ? '学号' : '工号'}</label>
                    <input type="text" value="${currentUser.studentId || currentUser.employeeId}" class="input-field w-full px-4 py-3 rounded-lg">
                  </div>
                ` : ''}
              </div>
              <div class="mt-6 flex justify-end space-x-3">
                <button class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">取消</button>
                <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">保存</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 显示消息
   */
  showMessage(message, type = 'info') {
    if (window.app && window.app.showNotification) {
      window.app.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// 创建全局路由实例
export const router = new Router();

// 导航辅助函数
export function navigateTo(path) {
  router.navigate(path);
}

// 链接点击处理
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-route]');
  if (link) {
    e.preventDefault();
    const path = link.getAttribute('data-route');
    router.navigate(path);
  }
});