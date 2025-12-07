/**
 * 管理员用户管理操作脚本
 * 提供用户增删改查等操作功能
 */

import { userAuth, USER_ROLES } from './userAuth.js';

// 默认端口配置
const API_PORT = 5024;
const API_BASE = `http://localhost:${API_PORT}/api`;

export class AdminUsersManager {
  constructor() {
    this.currentEditingUser = null;
  }

  /**
   * 显示添加用户模态框
   */
  showAddUserModal() {
    const modal = this.createUserModal('add');
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  }

  /**
   * 显示编辑用户模态框
   */
  async showEditUserModal(userId) {
    try {
      // 从API获取用户信息
      const response = await fetch(`${API_BASE}/users/${userId}`);
      const result = await response.json();

      if (!result.success && result.data) {
        showNotification('用户不存在', 'error');
        return;
      }

      const user = result.data || result;
      if (!user) {
        showNotification('用户不存在', 'error');
        return;
      }

      this.currentEditingUser = user;
      const modal = this.createUserModal('edit', user);
      document.body.appendChild(modal);
      modal.style.display = 'flex';
    } catch (error) {
      console.error('获取用户信息失败:', error);
      showNotification('获取用户信息失败', 'error');
    }
  }

  /**
   * 创建用户模态框
   */
  createUserModal(mode, user = null) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm';
    modal.id = 'user-modal';

    const isEdit = mode === 'edit';
    const title = isEdit ? '编辑用户' : '添加用户';
    const submitText = isEdit ? '更新' : '添加';

    modal.innerHTML = `
      <div class="glass-effect rounded-2xl p-8 max-w-md w-full mx-4 animate-slide-in">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-light text-white">${title}</h2>
          <button onclick="closeUserModal()" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form id="user-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">姓名</label>
              <input type="text" id="user-fullname" required
                value="${user?.fullName || ''}"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">角色</label>
              <select id="user-role" required
                ${isEdit && user?.role === USER_ROLES.ADMIN ? 'disabled' : ''}
                class="input-field w-full px-4 py-3 rounded-lg text-white">
                <option value="student" ${user?.role === 'student' ? 'selected' : ''}>学生</option>
                <option value="teacher" ${user?.role === 'teacher' ? 'selected' : ''}>教师</option>
                <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>管理员</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              <span id="modal-id-label">${user?.role === 'teacher' ? '工号' : '学号'}</span>
            </label>
            <input type="text" id="user-id"
              value="${user?.studentId || user?.employeeId || ''}"
              class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">用户名</label>
            <input type="text" id="user-username" required
              value="${user?.username || ''}"
              ${isEdit ? 'disabled' : ''}
              class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">邮箱</label>
            <input type="email" id="user-email" required
              value="${user?.email || ''}"
              class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
          </div>

          ${!isEdit ? `
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">密码</label>
              <input type="password" id="user-password" required
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
          ` : ''}

          <div>
            <label class="flex items-center">
              <input type="checkbox" id="user-isactive" ${user?.isActive !== false ? 'checked' : ''}
                class="mr-2 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500">
              <span class="text-sm text-gray-300">启用用户</span>
            </label>
          </div>

          <div id="form-error" class="hidden error-message p-3 rounded-lg text-sm"></div>
          <div id="form-success" class="hidden success-message p-3 rounded-lg text-sm"></div>

          <div class="flex space-x-3 pt-4">
            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg text-white font-medium">
              ${submitText}
            </button>
            <button type="button" onclick="closeUserModal()"
              class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              取消
            </button>
          </div>
        </form>
      </div>
    `;

    // 绑定表单提交事件
    modal.querySelector('#user-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (isEdit) {
        this.updateUser();
      } else {
        this.createUser();
      }
    });

    // 绑定角色变化事件
    modal.querySelector('#user-role')?.addEventListener('change', (e) => {
      const idLabel = document.getElementById('modal-id-label');
      const idInput = document.getElementById('user-id');
      if (e.target.value === 'teacher') {
        idLabel.textContent = '工号';
        idInput.placeholder = '请输入工号';
      } else {
        idLabel.textContent = '学号';
        idInput.placeholder = '请输入学号';
      }
    });

    // 绑定点击背景关闭事件
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeUserModal();
      }
    });

    return modal;
  }

  /**
   * 创建用户
   */
  async createUser() {
    console.log('🔍 [adminUsers] createUser() 方法被调用');

    const formData = this.getUserFormData();
    console.log('🔍 [adminUsers] getUserFormData() 返回:', formData);

    if (!formData) {
      console.error('❌ [adminUsers] formData 为空，返回');
      return;
    }

    console.log('✅ [adminUsers] 准备调用 userAuth.register()');
    console.log('🔍 [adminUsers] userAuth 对象:', window.userAuth);
    console.log('🔍 [adminUsers] 当前用户:', window.userAuth ? window.userAuth.currentUser : 'userAuth 未定义');

    try {
      console.log('📡 [adminUsers] 正在调用 userAuth.register()，参数:', formData);
      const result = await userAuth.register(formData);
      console.log('📨 [adminUsers] userAuth.register() 返回结果:', result);

      if (result.success) {
        console.log('✅ [adminUsers] 用户创建成功');
        this.showFormMessage('form-success', '用户创建成功！');

        setTimeout(() => {
          this.closeUserModal();
          this.refreshUserList();
        }, 1500);
      } else {
        console.error('❌ [adminUsers] 用户创建失败:', result.message);
        this.showFormMessage('form-error', result.message || '创建用户失败');
      }
    } catch (error) {
      console.error('❌ [adminUsers] createUser() 发生异常:', error);
      this.showFormMessage('form-error', error.message);
    }
  }

  /**
   * 更新用户
   */
  async updateUser() {
    if (!this.currentEditingUser) return;

    const formData = this.getUserFormData();
    if (!formData) return;

    try {
      const result = await userAuth.updateUser(this.currentEditingUser.id, {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        studentId: formData.studentId,
        employeeId: formData.employeeId
      });

      if (result.success) {
        this.showFormMessage('form-success', '用户更新成功！');

        setTimeout(() => {
          this.closeUserModal();
          this.refreshUserList();
        }, 1500);
      } else {
        this.showFormMessage('form-error', result.message || '更新用户失败');
      }
    } catch (error) {
      this.showFormMessage('form-error', error.message);
    }
  }

  /**
   * 获取表单数据
   */
  getUserFormData() {
    const fullname = document.getElementById('user-fullname').value.trim();
    const role = document.getElementById('user-role').value;
    const idNumber = document.getElementById('user-id').value.trim();
    const username = document.getElementById('user-username').value.trim();
    const email = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password')?.value;
    const isActive = document.getElementById('user-isactive').checked;

    // 验证必填字段
    if (!fullname || !username || !email || (!this.currentEditingUser && !password)) {
      this.showFormMessage('form-error', '请填写完整信息');
      return null;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showFormMessage('form-error', '请输入有效的邮箱地址');
      return null;
    }

    // 验证密码强度
    if (password && password.length < 6) {
      this.showFormMessage('form-error', '密码长度至少6位');
      return null;
    }

    const userData = {
      fullName: fullname,
      username,
      email,
      role,
      isActive
    };

    // 根据角色添加特定字段
    if (role === USER_ROLES.STUDENT && idNumber) {
      userData.studentId = idNumber;
    } else if (role === USER_ROLES.TEACHER && idNumber) {
      userData.employeeId = idNumber;
    }

    if (password) {
      userData.password = password;
    }

    return userData;
  }

  /**
   * 切换用户状态
   */
  async toggleUserStatus(userId) {
    try {
      // 先获取当前用户状态
      const response = await fetch(`${API_BASE}/users/${userId}`);
      const result = await response.json();

      if (!result.success && !result.data) {
        showNotification('用户不存在', 'error');
        return;
      }

      const user = result.data || result;
      const newStatus = !user.isActive;

      const updateResult = await userAuth.updateUser(userId, {
        isActive: newStatus
      });

      if (updateResult.success) {
        showNotification(
          `用户已${newStatus ? '启用' : '禁用'}`,
          'success'
        );
        this.refreshUserList();
      } else {
        showNotification('操作失败: ' + (updateResult.message || '未知错误'), 'error');
      }
    } catch (error) {
      showNotification('操作失败: ' + error.message, 'error');
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId) {
    // 确认删除
    if (!confirm(`确定要删除该用户吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const result = await userAuth.deleteUser(userId);

      if (result.success) {
        showNotification('用户删除成功', 'success');
        this.refreshUserList();
      } else {
        showNotification('删除失败: ' + (result.message || '未知错误'), 'error');
      }
    } catch (error) {
      showNotification('删除失败: ' + error.message, 'error');
    }
  }

  /**
   * 关闭用户模态框
   */
  closeUserModal() {
    const modal = document.getElementById('user-modal');
    if (modal) {
      modal.remove();
    }
    this.currentEditingUser = null;
  }

  /**
   * 显示表单消息
   */
  showFormMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.classList.remove('hidden');

      setTimeout(() => {
        element.classList.add('hidden');
      }, 3000);
    }
  }

  /**
   * 刷新用户列表
   */
  refreshUserList() {
    // 通过路由实例刷新用户列表
    if (window.router) {
      window.router.loadUserList();
    }
  }
}

// 创建全局实例
export const adminUsersManager = new AdminUsersManager();

// 暴露全局函数供HTML调用
window.showAddUserModal = () => adminUsersManager.showAddUserModal();
window.editUser = (userId) => adminUsersManager.showEditUserModal(userId);
window.deleteUser = (userId) => adminUsersManager.deleteUser(userId);
window.toggleUserStatus = (userId) => adminUsersManager.toggleUserStatus(userId);
window.closeUserModal = () => adminUsersManager.closeUserModal();
window.refreshUserList = () => adminUsersManager.refreshUserList();

// 通知函数（如果其他地方没有定义）
function showNotification(message, type = 'info') {
  if (window.app && window.app.showNotification) {
    window.app.showNotification(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}