/**
 * 权限管理系统
 * 控制用户对不同页面和功能的访问权限
 */

import { USER_ROLES, PERMISSIONS } from './userAuth.js';

export class PermissionManager {
  constructor() {
    this.currentPage = null;
  }

  /**
   * 检查用户是否有权限访问特定路由
   */
  canAccessRoute(user, route) {
    if (!user) {
      return this.isPublicRoute(route);
    }

    const routePermissions = {
      '/dashboard': [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT],
      '/admin': [USER_ROLES.ADMIN],
      '/admin/users': [USER_ROLES.ADMIN],
      '/admin/courses': [USER_ROLES.ADMIN],
      '/teacher': [USER_ROLES.TEACHER, USER_ROLES.ADMIN],
      '/teacher/courses': [USER_ROLES.TEACHER, USER_ROLES.ADMIN],
      '/teacher/assignments': [USER_ROLES.TEACHER, USER_ROLES.ADMIN],
      '/teacher/students': [USER_ROLES.TEACHER, USER_ROLES.ADMIN],
      '/student': [USER_ROLES.STUDENT, USER_ROLES.ADMIN],
      '/student/courses': [USER_ROLES.STUDENT, USER_ROLES.ADMIN],
      '/student/assignments': [USER_ROLES.STUDENT, USER_ROLES.ADMIN],
      '/editor': [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.ADMIN],
      '/profile': [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT],
      '/login': [],
      '/register': []
    };

    const allowedRoles = routePermissions[route] || [];
    return allowedRoles.includes(user.role) || allowedRoles.length === 0;
  }

  /**
   * 检查是否为公共路由（无需登录即可访问）
   */
  isPublicRoute(route) {
    const publicRoutes = ['/login', '/register', '/forgot-password'];
    return publicRoutes.includes(route);
  }

  /**
   * 检查用户是否有特定角色
   */
  hasRole(user, role) {
    if (!user) return false;
    return user.role === role;
  }

  /**
   * 获取用户可访问的菜单项（适配main.html）
   */
  getAccessibleMenuItems(user) {
    const userRole = user.role || user; // 兼容两种传参方式
    const menuItems = [
      {
        id: 'dashboard',
        label: '仪表盘',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>',
        roles: ['admin', 'teacher', 'student']
      }
    ];

    // 管理员课程管理
    if (userRole === 'admin') {
      menuItems.push(
        {
          id: 'courses',
          label: '课程管理',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>',
          roles: ['admin']
        }
      );
    }

    // 管理员专有菜单
    if (userRole === 'admin') {
      menuItems.push(
        {
          id: 'users',
          label: '用户管理',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z"></path>',
          roles: ['admin']
        },
        {
          id: 'teachers',
          label: '教师管理',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>',
          roles: ['admin']
        },
        {
          id: 'students',
          label: '学生管理',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z"></path>',
          roles: ['admin']
        }
      );
    }

    // 教师和管理员菜单
    if (userRole === 'teacher' || userRole === 'admin') {
      menuItems.push(
        {
          id: 'assignments',
          label: '作业管理',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>',
          roles: ['teacher', 'admin']
        }
      );
    }

  
    // 所有用户都有个人资料
    menuItems.push(
      {
        id: 'profile',
        label: '个人资料',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>',
        roles: ['admin', 'teacher', 'student']
      }
    );

    return menuItems.filter(item => item.roles.includes(userRole));
  }

  /**
   * 检查用户是否有执行特定操作的权限
   */
  hasPermission(user, permission) {
    if (!user) return false;

    const rolePermissions = {
      [USER_ROLES.ADMIN]: [
        // 用户管理权限
        'user:create', 'user:read', 'user:update', 'user:delete',
        // 课程管理权限
        'course:create', 'course:read', 'course:update', 'course:delete',
        // 作业管理权限
        'assignment:create', 'assignment:read', 'assignment:update',
        'assignment:delete', 'assignment:submit', 'assignment:grade',
        // 系统管理权限
        'system:manage', 'system:backup', 'system:settings'
      ],
      [USER_ROLES.TEACHER]: [
        'user:read', 'user:update', // 只能查看和更新学生信息
        'course:read', 'course:update', // 只能管理自己负责的课程
        'assignment:create', 'assignment:read', 'assignment:update',
        'assignment:delete', 'assignment:grade'
      ],
      [USER_ROLES.STUDENT]: [
        'user:update', // 只能更新自己的信息
        'course:read', // 只能查看已报名的课程
        'assignment:read', 'assignment:submit' // 只能查看和提交作业
      ]
    };

    return rolePermissions[user.role]?.includes(permission) || false;
  }

  /**
   * 获取用户的导航菜单
   */
  getNavigationMenu(user) {
    if (!user) {
      return [
        { title: '登录', path: '/login', icon: '🔑' },
        { title: '注册', path: '/register', icon: '📝' }
      ];
    }

    const baseMenu = [
      { title: '仪表盘', path: '/dashboard', icon: '📊' },
      { title: '个人资料', path: '/profile', icon: '👤' },
      { title: '代码编辑器', path: '/editor', icon: '💻' }
    ];

    const adminMenu = [
      { title: '管理员面板', path: '/admin', icon: '⚙️', submenu: [
        { title: '用户管理', path: '/admin/users', icon: '👥' },
        { title: '课程管理', path: '/admin/courses', icon: '📚' },
        { title: '系统设置', path: '/admin/settings', icon: '🔧' }
      ]}
    ];

    const teacherMenu = [
      { title: '教师面板', path: '/teacher', icon: '🎓', submenu: [
        { title: '我的课程', path: '/teacher/courses', icon: '📖' },
        { title: '作业管理', path: '/teacher/assignments', icon: '📋' },
        { title: '学生管理', path: '/teacher/students', icon: '👨‍🎓' }
      ]}
    ];

    const studentMenu = [
      { title: '学生面板', path: '/student', icon: '🎓', submenu: [
        { title: '我的课程', path: '/student/courses', icon: '📚' },
        { title: '我的作业', path: '/student/assignments', icon: '📝' },
        { title: '成绩查询', path: '/student/grades', icon: '📊' }
      ]}
    ];

    let menu = [...baseMenu];

    switch (user.role) {
      case USER_ROLES.ADMIN:
        menu = [...menu, ...adminMenu];
        break;
      case USER_ROLES.TEACHER:
        menu = [...menu, ...teacherMenu];
        break;
      case USER_ROLES.STUDENT:
        menu = [...menu, ...studentMenu];
        break;
    }

    menu.push({ title: '退出登录', path: '/logout', icon: '🚪' });

    return menu;
  }

  /**
   * 获取用户可操作的数据范围
   */
  getDataScope(user, dataType) {
    if (!user) return null;

    const dataScopes = {
      user: {
        [USER_ROLES.ADMIN]: 'all', // 可以访问所有用户
        [USER_ROLES.TEACHER]: 'student', // 只能访问学生
        [USER_ROLES.STUDENT]: 'self' // 只能访问自己
      },
      course: {
        [USER_ROLES.ADMIN]: 'all', // 可以访问所有课程
        [USER_ROLES.TEACHER]: 'managed', // 只能访问自己管理的课程
        [USER_ROLES.STUDENT]: 'enrolled' // 只能访问自己报名的课程
      },
      assignment: {
        [USER_ROLES.ADMIN]: 'all', // 可以访问所有作业
        [USER_ROLES.TEACHER]: 'created', // 只能访问自己创建的作业
        [USER_ROLES.STUDENT]: 'assigned' // 只能访问分配给自己的作业
      }
    };

    return dataScopes[dataType]?.[user.role] || null;
  }

  /**
   * 检查用户是否可以访问特定资源
   */
  canAccessResource(user, resourceType, resourceId) {
    if (!user) return false;

    // 管理员可以访问所有资源
    if (user.role === USER_ROLES.ADMIN) {
      return true;
    }

    switch (resourceType) {
      case 'user':
        // 用户只能访问自己的资源
        return user.id === resourceId;

      case 'course':
        // 教师只能访问自己管理的课程
        if (user.role === USER_ROLES.TEACHER) {
          return this.isCourseManagedByTeacher(resourceId, user.id);
        }
        // 学生只能访问自己报名的课程
        if (user.role === USER_ROLES.STUDENT) {
          return this.isCourseEnrolledByStudent(resourceId, user.id);
        }
        break;

      case 'assignment':
        // 教师只能访问自己创建的作业
        if (user.role === USER_ROLES.TEACHER) {
          return this.isAssignmentCreatedByTeacher(resourceId, user.id);
        }
        // 学生只能访问分配给自己的作业
        if (user.role === USER_ROLES.STUDENT) {
          return this.isAssignmentAssignedToStudent(resourceId, user.id);
        }
        break;
    }

    return false;
  }

  /**
   * 检查教师是否管理特定课程
   */
  isCourseManagedByTeacher(courseId, teacherId) {
    const courses = JSON.parse(localStorage.getItem('oj-courses') || '[]');
    const course = courses.find(c => c.id === courseId);
    return course && course.teacherId === teacherId;
  }

  /**
   * 检查学生是否报名特定课程
   */
  isCourseEnrolledByStudent(courseId, studentId) {
    const courses = JSON.parse(localStorage.getItem('oj-courses') || '[]');
    const course = courses.find(c => c.id === courseId);
    return course && course.enrolledStudents?.includes(studentId);
  }

  /**
   * 检查作业是否由特定教师创建
   */
  isAssignmentCreatedByTeacher(assignmentId, teacherId) {
    const assignments = JSON.parse(localStorage.getItem('oj-assignments') || '[]');
    const assignment = assignments.find(a => a.id === assignmentId);
    return assignment && assignment.teacherId === teacherId;
  }

  /**
   * 检查作业是否分配给特定学生
   */
  isAssignmentAssignedToStudent(assignmentId, studentId) {
    const assignments = JSON.parse(localStorage.getItem('oj-assignments') || '[]');
    const assignment = assignments.find(a => a.id === assignmentId);
    return assignment && assignment.assignedStudents?.includes(studentId);
  }

  /**
   * 获取页面标题
   */
  getPageTitle(user, route) {
    if (!user) {
      return 'OnlineJudge - 在线编程评测平台';
    }

    const titles = {
      '/dashboard': `${this.getRoleDisplayName(user.role)}仪表盘`,
      '/admin': '管理员面板',
      '/admin/users': '用户管理',
      '/admin/courses': '课程管理',
      '/admin/settings': '系统设置',
      '/teacher': '教师面板',
      '/teacher/courses': '我的课程',
      '/teacher/assignments': '作业管理',
      '/teacher/students': '学生管理',
      '/student': '学生面板',
      '/student/courses': '我的课程',
      '/student/assignments': '我的作业',
      '/student/grades': '成绩查询',
      '/editor': '代码编辑器',
      '/profile': '个人资料'
    };

    return titles[route] || 'OnlineJudge - 在线编程评测平台';
  }

  /**
   * 获取角色显示名称
   */
  getRoleDisplayName(role) {
    const roleNames = {
      [USER_ROLES.ADMIN]: '管理员',
      [USER_ROLES.TEACHER]: '教师',
      [USER_ROLES.STUDENT]: '学生'
    };

    return roleNames[role] || '用户';
  }

  /**
   * 权限拦截器 - 在路由变化时检查权限
   */
  routeGuard(user, to, from) {
    if (!this.canAccessRoute(user, to)) {
      if (!user) {
        // 未登录用户跳转到登录页
        return { redirect: '/login', message: '请先登录' };
      } else {
        // 已登录用户无权限访问
        return { redirect: '/dashboard', message: '您没有权限访问该页面' };
      }
    }

    return { redirect: null };
  }

  /**
   * 获取用户在页面上的可用操作按钮
   */
  getPageActions(user, page, data = {}) {
    const actions = [];

    switch (page) {
      case '/admin/users':
        actions.push(
          { text: '添加用户', action: 'create-user', permission: 'user:create' },
          { text: '编辑用户', action: 'edit-user', permission: 'user:update', needSelection: true },
          { text: '删除用户', action: 'delete-user', permission: 'user:delete', needSelection: true }
        );
        break;

      case '/teacher/courses':
        actions.push(
          { text: '创建课程', action: 'create-course', permission: 'course:create' },
          { text: '编辑课程', action: 'edit-course', permission: 'course:update', needSelection: true }
        );
        break;

      case '/teacher/assignments':
        actions.push(
          { text: '创建作业', action: 'create-assignment', permission: 'assignment:create' },
          { text: '批改作业', action: 'grade-assignment', permission: 'assignment:grade', needSelection: true }
        );
        break;

      case '/student/assignments':
        actions.push(
          { text: '提交作业', action: 'submit-assignment', permission: 'assignment:submit', needSelection: true },
          { text: '查看详情', action: 'view-assignment', permission: 'assignment:read', needSelection: true }
        );
        break;
    }

    // 过滤用户有权限的操作
    return actions.filter(action => this.hasPermission(user, action.permission));
  }
}

// 创建全局实例
export const permissionManager = new PermissionManager();