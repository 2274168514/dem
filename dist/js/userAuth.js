/**
 * 用户认证系统
 * 支持管理员、教师、学生三种角色
 * 使用后端MySQL数据库存储用户信息
 */

// 默认端口配置
const API_PORT = 5024;
const API_BASE = `http://localhost:${API_PORT}/api`;

export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

export const PERMISSIONS = {
  // 用户管理权限
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // 课程管理权限
  COURSE_CREATE: 'course:create',
  COURSE_READ: 'course:read',
  COURSE_UPDATE: 'course:update',
  COURSE_DELETE: 'course:delete',

  // 作业管理权限
  ASSIGNMENT_CREATE: 'assignment:create',
  ASSIGNMENT_READ: 'assignment:read',
  ASSIGNMENT_UPDATE: 'assignment:update',
  ASSIGNMENT_DELETE: 'assignment:delete',
  ASSIGNMENT_SUBMIT: 'assignment:submit',
  ASSIGNMENT_GRADE: 'assignment:grade'
};

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.USER_CREATE, PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_DELETE,
    PERMISSIONS.COURSE_CREATE, PERMISSIONS.COURSE_READ, PERMISSIONS.COURSE_UPDATE, PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.ASSIGNMENT_CREATE, PERMISSIONS.ASSIGNMENT_READ, PERMISSIONS.ASSIGNMENT_UPDATE,
    PERMISSIONS.ASSIGNMENT_DELETE, PERMISSIONS.ASSIGNMENT_SUBMIT, PERMISSIONS.ASSIGNMENT_GRADE
  ],
  [USER_ROLES.TEACHER]: [
    PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE, // 只能查看和更新学生信息
    PERMISSIONS.COURSE_READ, PERMISSIONS.COURSE_UPDATE, // 只能管理自己负责的课程
    PERMISSIONS.ASSIGNMENT_CREATE, PERMISSIONS.ASSIGNMENT_READ,
    PERMISSIONS.ASSIGNMENT_UPDATE, PERMISSIONS.ASSIGNMENT_DELETE, PERMISSIONS.ASSIGNMENT_GRADE
  ],
  [USER_ROLES.STUDENT]: [
    PERMISSIONS.USER_UPDATE, // 只能更新自己的信息
    PERMISSIONS.COURSE_READ, // 只能查看已报名的课程
    PERMISSIONS.ASSIGNMENT_READ, PERMISSIONS.ASSIGNMENT_SUBMIT // 只能查看和提交作业
  ]
};

export class UserAuth {
  constructor() {
    this.currentUser = null;
    this.initializeAuth();
  }

  /**
   * 初始化认证系统
   */
  initializeAuth() {
    // 从localStorage获取保存的用户信息（仅用于会话保持）
    const savedUser = sessionStorage.getItem('current-user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (error) {
        console.error('解析用户信息失败:', error);
        sessionStorage.removeItem('current-user');
      }
    }
  }

  /**
   * 用户注册（仅管理员可用）
   */
  async register(userData) {
    console.log('🔍 [userAuth] register() 方法被调用');
    console.log('🔍 [userAuth] 接收到的 userData:', userData);
    console.log('🔍 [userAuth] 当前登录用户:', this.currentUser);

    const { username, password, email, role, fullName, studentId = null, employeeId = null } = userData;

    try {
      // 验证当前用户是否为管理员
      console.log('🔍 [userAuth] 检查管理员权限...');
      if (!this.hasRole(USER_ROLES.ADMIN)) {
        console.error('❌ [userAuth] 用户不是管理员，拒绝注册');
        return {
          success: false,
          message: '只有管理员可以创建用户'
        };
      }

      console.log('✅ [userAuth] 管理员权限验证通过');

      const requestData = {
        username: username.trim(),
        email: email.trim(),
        password: password,
        fullName: fullName.trim(),
        role: role,
        studentId: studentId?.trim() || null,
        employeeId: employeeId?.trim() || null
      };

      console.log('📡 [userAuth] 准备发送API请求到 /api/users/register');
      console.log('📦 [userAuth] 请求数据:', requestData);

      // 直接调用API注册用户
      const response = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('📨 [userAuth] API响应状态:', response.status, response.statusText);
      const result = await response.json();
      console.log('📨 [userAuth] API响应内容:', result);

      return result;

    } catch (error) {
      console.error('❌ [userAuth] 注册过程中发生错误:', error);
      return {
        success: false,
        message: error.message || '注册过程中发生错误，请重试'
      };
    }
  }

  /**
   * 用户登录
   */
  async login(username, password) {
    try {
      // 使用专门的登录API
      const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      const result = await response.json();

      if (result.success) {
        // 保存当前用户信息
        this.currentUser = result.user;
        const userStr = JSON.stringify(this.currentUser);

        // 保存到所有存储位置以保持一致性
        sessionStorage.setItem('current-user', userStr);
        localStorage.setItem('currentUser', userStr);
        localStorage.setItem('oj-current-user', userStr); // 为向后兼容

        console.log('✅ 用户信息已保存到所有存储位置');

        return {
          success: true,
          message: result.message,
          user: this.currentUser
        };
      } else {
        return {
          success: false,
          message: result.message
        };
      }
    } catch (error) {
      console.error('登录过程中发生错误:', error);
      return {
        success: false,
        message: '登录过程中发生错误，请重试'
      };
    }
  }

  /**
   * 用户登出
   */
  logout() {
    this.currentUser = null;
    // 清除所有可能存储用户信息的位置
    sessionStorage.removeItem('current-user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('oj-current-user');
    console.log('🚪 已清除所有用户登录信息');
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn() {
    return !!this.currentUser;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * 检查用户权限
   */
  hasPermission(permission) {
    if (!this.currentUser) {
      return false;
    }

    const userPermissions = ROLE_PERMISSIONS[this.currentUser.role] || [];
    return userPermissions.includes(permission);
  }

  /**
   * 检查用户角色
   */
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  /**
   * 获取所有用户（管理员功能）
   */
  async getAllUsers(role = null, page = 1, limit = 20) {
    try {
      // 验证当前用户是否为管理员
      if (!this.hasRole(USER_ROLES.ADMIN)) {
        throw new Error('只有管理员可以查看用户列表');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (role) {
        params.append('role', role);
      }

      const response = await fetch(`${API_BASE}/users?${params}`);
      const result = await response.json();

      if (result.success) {
        return {
          users: result.data,
          pagination: result.pagination
        };
      } else {
        throw new Error(result.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId, updatedData) {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData)
      });

      const result = await response.json();

      if (result.success) {
        // 如果更新的是当前用户，同时更新当前用户状态
        if (this.currentUser && this.currentUser.id === parseInt(userId)) {
          this.currentUser = { ...this.currentUser, ...updatedData };
          sessionStorage.setItem('current-user', JSON.stringify(this.currentUser));
        }
        return result;
      } else {
        throw new Error(result.message || '更新用户失败');
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '删除用户失败');
      }

      return result;
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats() {
    try {
      const response = await fetch(`${API_BASE}/users/stats`);
      const result = await response.json();

      if (result.success) {
        const stats = {
          total: 0,
          admin: 0,
          teacher: 0,
          student: 0,
          active_total: 0
        };

        result.data.forEach(row => {
          stats.total += row.count;
          stats.active_total += row.active_count;
          stats[row.role] = row.count;
        });

        return stats;
      } else {
        throw new Error(result.message || '获取用户统计失败');
      }
    } catch (error) {
      console.error('获取用户统计失败:', error);
      return {
        total: 0,
        admin: 0,
        teacher: 0,
        student: 0,
        active_total: 0
      };
    }
  }

  /**
   * 重置用户密码
   */
  async resetPassword(userId, newPassword) {
    try {
      // 验证密码强度
      if (newPassword.length < 6) {
        throw new Error('密码长度至少6位');
      }

      const response = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '重置密码失败');
      }

      return result;
    } catch (error) {
      console.error('重置密码失败:', error);
      throw error;
    }
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password) {
    if (password.length < 6) {
      return { isValid: false, message: '密码长度至少6位' };
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      return { isValid: false, message: '密码必须包含字母和数字' };
    }

    return { isValid: true, message: '密码强度合格' };
  }
}

// 创建全局实例
export const userAuth = new UserAuth();