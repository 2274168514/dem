/**
 * 管理员课程管理操作脚本
 * 提供课程增删改查等操作功能
 */

import { userAuth, USER_ROLES } from './userAuth.js';
import { courseManager } from './courseManager.js';

export class AdminCoursesManager {
  constructor() {
    this.currentEditingCourse = null;
  }

  /**
   * 显示添加课程模态框
   */
  showAddCourseModal() {
    const modal = this.createCourseModal('add');
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  }

  /**
   * 显示编辑课程模态框
   */
  async showEditCourseModal(courseId) {
    try {
      const course = courseManager.getCourse(courseId);
      this.currentEditingCourse = course;
      const modal = this.createCourseModal('edit', course);
      document.body.appendChild(modal);
      modal.style.display = 'flex';
    } catch (error) {
      showNotification('获取课程信息失败: ' + error.message, 'error');
    }
  }

  /**
   * 创建课程模态框
   */
  createCourseModal(mode, course = null) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm';
    modal.id = 'course-modal';

    const isEdit = mode === 'edit';
    const title = isEdit ? '编辑课程' : '添加课程';
    const submitText = isEdit ? '更新' : '添加';

    // 获取教师列表
    const teachers = userAuth.getAllUsers().filter(u => u.role === USER_ROLES.TEACHER);
    const teacherOptions = teachers.map(teacher =>
      `<option value="${teacher.id}" ${course?.teacherId === teacher.id ? 'selected' : ''}>
        ${teacher.fullName} (${teacher.employeeId || teacher.username})
      </option>`
    ).join('');

    modal.innerHTML = `
      <div class="glass-effect rounded-2xl p-8 max-w-2xl w-full mx-4 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-light text-white">${title}</h2>
          <button onclick="closeCourseModal()" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form id="course-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">课程名称 *</label>
              <input type="text" id="course-title" required
                value="${course?.title || ''}"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">课程代码 *</label>
              <input type="text" id="course-code" required
                value="${course?.code || ''}"
                placeholder="例如: WEB101"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">课程描述 *</label>
            <textarea id="course-description" required rows="3"
              class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">${course?.description || ''}</textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">授课教师 *</label>
              <select id="course-teacher" required
                class="input-field w-full px-4 py-3 rounded-lg text-white">
                <option value="">请选择教师</option>
                ${teacherOptions}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">学期</label>
              <input type="text" id="course-semester"
                value="${course?.semester || '2024春季'}"
                placeholder="例如: 2024春季"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">学分</label>
              <input type="number" id="course-credits" min="1" max="10"
                value="${course?.credits || 3}"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">最大学生数</label>
              <input type="number" id="course-max-students" min="1" max="200"
                value="${course?.maxStudents || 50}"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">课程状态</label>
              <select id="course-status" class="input-field w-full px-4 py-3 rounded-lg text-white">
                <option value="active" ${course?.status === 'active' ? 'selected' : ''}>进行中</option>
                <option value="inactive" ${course?.status === 'inactive' ? 'selected' : ''}>未开始</option>
                <option value="completed" ${course?.status === 'completed' ? 'selected' : ''}>已结束</option>
              </select>
            </div>
          </div>

          <div class="border-t border-gray-600 pt-4">
            <h3 class="text-lg font-medium text-gray-300 mb-4">课程安排</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">开始时间</label>
                <input type="date" id="course-start-time"
                  value="${course?.schedule?.startTime?.split('T')[0] || ''}"
                  class="input-field w-full px-4 py-3 rounded-lg text-white">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">结束时间</label>
                <input type="date" id="course-end-time"
                  value="${course?.schedule?.endTime?.split('T')[0] || ''}"
                  class="input-field w-full px-4 py-3 rounded-lg text-white">
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-300 mb-2">上课时间</label>
              <input type="text" id="course-class-time"
                value="${course?.schedule?.classTime || ''}"
                placeholder="例如: 周一、周三 14:00-16:00"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
          </div>

          <div id="course-form-error" class="hidden error-message p-3 rounded-lg text-sm"></div>
          <div id="course-form-success" class="hidden success-message p-3 rounded-lg text-sm"></div>

          <div class="flex space-x-3 pt-4">
            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg text-white font-medium">
              ${submitText}
            </button>
            <button type="button" onclick="closeCourseModal()"
              class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              取消
            </button>
          </div>
        </form>
      </div>
    `;

    // 绑定表单提交事件
    modal.querySelector('#course-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (isEdit) {
        this.updateCourse();
      } else {
        this.createCourse();
      }
    });

    // 绑定点击背景关闭事件
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeCourseModal();
      }
    });

    return modal;
  }

  /**
   * 创建课程
   */
  async createCourse() {
    const courseData = this.getCourseFormData();
    if (!courseData) return;

    try {
      const newCourse = await courseManager.createCourse(courseData);
      this.showFormMessage('course-form-success', '课程创建成功！');

      setTimeout(() => {
        this.closeCourseModal();
        this.refreshCourseList();
      }, 1500);
    } catch (error) {
      this.showFormMessage('course-form-error', error.message);
    }
  }

  /**
   * 更新课程
   */
  async updateCourse() {
    if (!this.currentEditingCourse) return;

    const courseData = this.getCourseFormData();
    if (!courseData) return;

    try {
      const updatedCourse = await courseManager.updateCourse(this.currentEditingCourse.id, courseData);
      this.showFormMessage('course-form-success', '课程更新成功！');

      setTimeout(() => {
        this.closeCourseModal();
        this.refreshCourseList();
      }, 1500);
    } catch (error) {
      this.showFormMessage('course-form-error', error.message);
    }
  }

  /**
   * 获取表单数据
   */
  getCourseFormData() {
    const title = document.getElementById('course-title').value.trim();
    const code = document.getElementById('course-code').value.trim();
    const description = document.getElementById('course-description').value.trim();
    const teacherId = document.getElementById('course-teacher').value;
    const semester = document.getElementById('course-semester').value.trim();
    const credits = document.getElementById('course-credits').value;
    const maxStudents = document.getElementById('course-max-students').value;
    const status = document.getElementById('course-status').value;
    const startTime = document.getElementById('course-start-time').value;
    const endTime = document.getElementById('course-end-time').value;
    const classTime = document.getElementById('course-class-time').value.trim();

    // 验证必填字段
    if (!title || !code || !description || !teacherId) {
      this.showFormMessage('course-form-error', '请填写完整的课程信息');
      return null;
    }

    return {
      title,
      code,
      description,
      teacherId,
      semester,
      credits: parseInt(credits) || 3,
      maxStudents: parseInt(maxStudents) || 50,
      status,
      schedule: {
        startTime,
        endTime,
        classTime
      }
    };
  }

  /**
   * 删除课程
   */
  async deleteCourse(courseId) {
    try {
      const course = courseManager.getCourse(courseId);

      // 确认删除
      if (!confirm(`确定要删除课程 "${course.title}" 吗？此操作不可撤销。`)) {
        return;
      }

      await courseManager.deleteCourse(courseId);
      showNotification('课程删除成功', 'success');
      this.refreshCourseList();
    } catch (error) {
      showNotification('删除失败: ' + error.message, 'error');
    }
  }

  /**
   * 查看课程详情
   */
  async viewCourseDetails(courseId) {
    try {
      const course = courseManager.getCourse(courseId);
      const modal = this.createCourseDetailsModal(course);
      document.body.appendChild(modal);
      modal.style.display = 'flex';
    } catch (error) {
      showNotification('获取课程详情失败: ' + error.message, 'error');
    }
  }

  /**
   * 创建课程详情模态框
   */
  createCourseDetailsModal(course) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm';
    modal.id = 'course-details-modal';

    const enrolledStudents = course.enrolledStudents || [];
    const studentsList = enrolledStudents.length > 0
      ? enrolledStudents.map(student => `
          <div class="flex items-center justify-between p-2 bg-gray-700 rounded">
            <div>
              <span class="font-medium">${student.name}</span>
              <span class="text-sm text-gray-400 ml-2">(${student.username})</span>
              ${student.studentId ? `<span class="text-xs text-gray-500 ml-2">学号: ${student.studentId}</span>` : ''}
            </div>
            <span class="text-sm text-gray-400">${student.email}</span>
          </div>
        `).join('')
      : '<p class="text-gray-400 text-center">暂无学生报名</p>';

    modal.innerHTML = `
      <div class="glass-effect rounded-2xl p-8 max-w-4xl w-full mx-4 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-light text-white">课程详情</h2>
          <button onclick="closeCourseDetailsModal()" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 基本信息 -->
          <div class="space-y-4">
            <div class="bg-gray-800 p-4 rounded-lg">
              <h3 class="text-lg font-medium text-gray-300 mb-3">基本信息</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-400">课程名称:</span>
                  <span class="text-white">${course.title}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">课程代码:</span>
                  <span class="text-white">${course.code}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">授课教师:</span>
                  <span class="text-white">${course.teacherName}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">学期:</span>
                  <span class="text-white">${course.semester || '-'}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">学分:</span>
                  <span class="text-white">${course.credits}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">状态:</span>
                  <span class="px-2 py-1 text-xs rounded-full ${
                    course.status === 'active' ? 'bg-green-100 text-green-800' :
                    course.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }">
                    ${course.status === 'active' ? '进行中' : course.status === 'inactive' ? '未开始' : '已结束'}
                  </span>
                </div>
              </div>
            </div>

            <div class="bg-gray-800 p-4 rounded-lg">
              <h3 class="text-lg font-medium text-gray-300 mb-3">课程安排</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-400">开始时间:</span>
                  <span class="text-white">${course.schedule?.startTime ? new Date(course.schedule.startTime).toLocaleDateString() : '-'}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">结束时间:</span>
                  <span class="text-white">${course.schedule?.endTime ? new Date(course.schedule.endTime).toLocaleDateString() : '-'}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">上课时间:</span>
                  <span class="text-white">${course.schedule?.classTime || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 学生列表 -->
          <div class="bg-gray-800 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-lg font-medium text-gray-300">报名学生 (${enrolledStudents.length}/${course.maxStudents})</h3>
              <div class="text-sm text-gray-400">
                报名率: ${Math.round((enrolledStudents.length / course.maxStudents) * 100)}%
              </div>
            </div>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              ${studentsList}
            </div>
          </div>
        </div>

        <div class="mt-6 p-4 bg-gray-800 rounded-lg">
          <h3 class="text-lg font-medium text-gray-300 mb-2">课程描述</h3>
          <p class="text-gray-400">${course.description}</p>
        </div>

        <div class="mt-6 flex justify-end space-x-3">
          <button onclick="editCourse('${course.id}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            编辑课程
          </button>
          <button onclick="closeCourseDetailsModal()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            关闭
          </button>
        </div>
      </div>
    `;

    // 绑定点击背景关闭事件
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeCourseDetailsModal();
      }
    });

    return modal;
  }

  /**
   * 关闭课程模态框
   */
  closeCourseModal() {
    const modal = document.getElementById('course-modal');
    if (modal) {
      modal.remove();
    }
    this.currentEditingCourse = null;
  }

  /**
   * 关闭课程详情模态框
   */
  closeCourseDetailsModal() {
    const modal = document.getElementById('course-details-modal');
    if (modal) {
      modal.remove();
    }
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
   * 刷新课程列表
   */
  refreshCourseList() {
    // 通过路由实例刷新课程列表
    if (window.router) {
      window.router.loadCourseList();
    }
  }
}

// 创建全局实例
export const adminCoursesManager = new AdminCoursesManager();

// 暴露全局函数供HTML调用
window.showAddCourseModal = () => adminCoursesManager.showAddCourseModal();
window.editCourse = (courseId) => adminCoursesManager.showEditCourseModal(courseId);
window.deleteCourse = (courseId) => adminCoursesManager.deleteCourse(courseId);
window.viewCourseDetails = (courseId) => adminCoursesManager.viewCourseDetails(courseId);
window.closeCourseModal = () => adminCoursesManager.closeCourseModal();
window.closeCourseDetailsModal = () => adminCoursesManager.closeCourseDetailsModal();
window.refreshCourseList = () => adminCoursesManager.refreshCourseList();

// 通知函数
function showNotification(message, type = 'info') {
  if (window.app && window.app.showNotification) {
    window.app.showNotification(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}