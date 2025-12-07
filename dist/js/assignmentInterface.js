/**
 * 作业界面管理脚本
 * 提供教师和学生的作业管理界面
 */

import { userAuth, USER_ROLES } from './userAuth.js';
import { courseManager } from './courseManager.js';
import { assignmentManager, ASSIGNMENT_STATUS, SUBMISSION_STATUS } from './assignmentManager.js';

export class AssignmentInterface {
  constructor() {
    this.currentAssignment = null;
    this.currentSubmission = null;
  }

  /**
   * 显示创建作业模态框（教师用）
   */
  showCreateAssignmentModal() {
    const modal = this.createAssignmentModal('create');
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  }

  /**
   * 显示编辑作业模态框（教师用）
   */
  async showEditAssignmentModal(assignmentId) {
    try {
      const assignment = assignmentManager.getAssignment(assignmentId);
      this.currentAssignment = assignment;
      const modal = this.createAssignmentModal('edit', assignment);
      document.body.appendChild(modal);
      modal.style.display = 'flex';
    } catch (error) {
      showNotification('获取作业信息失败: ' + error.message, 'error');
    }
  }

  /**
   * 显示提交作业模态框（学生用）
   */
  async showSubmitAssignmentModal(assignmentId) {
    try {
      const assignment = assignmentManager.getAssignment(assignmentId);
      const currentUser = userAuth.getCurrentUser();

      // 检查是否可以提交
      if (!assignmentManager.canSubmitAssignment(assignmentId, currentUser.id)) {
        showNotification('当前无法提交该作业', 'error');
        return;
      }

      const modal = this.createSubmissionModal(assignment);
      document.body.appendChild(modal);
      modal.style.display = 'flex';
    } catch (error) {
      showNotification('获取作业信息失败: ' + error.message, 'error');
    }
  }

  /**
   * 在代码编辑器中完成作业
   */
  openAssignmentInEditor(assignmentId) {
    try {
      const assignment = assignmentManager.getAssignment(assignmentId);
      const currentUser = userAuth.getCurrentUser();

      // 检查权限
      if (currentUser.role !== USER_ROLES.STUDENT) {
        showNotification('只有学生可以完成作业', 'error');
        return;
      }

      // 检查是否可以提交
      if (!assignmentManager.canSubmitAssignment(assignmentId, currentUser.id)) {
        showNotification('当前无法完成该作业', 'error');
        return;
      }

      // 保存作业上下文到localStorage
      const assignmentContext = {
        assignmentId: assignment.id,
        title: assignment.title,
        description: assignment.description,
        requirements: assignment.requirements,
        templates: assignment.templates,
        deadline: assignment.schedule.deadline,
        courseId: assignment.courseId
      };

      localStorage.setItem('current-assignment-context', JSON.stringify(assignmentContext));

      // 打开代码编辑器
      window.open('index.html?assignment=' + assignmentId, '_blank');

    } catch (error) {
      showNotification('打开编辑器失败: ' + error.message, 'error');
    }
  }

  /**
   * 创建作业模态框
   */
  createAssignmentModal(mode, assignment = null) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm';
    modal.id = 'assignment-modal';

    const isEdit = mode === 'edit';
    const title = isEdit ? '编辑作业' : '创建作业';
    const submitText = isEdit ? '更新' : '创建';

    // 获取教师的课程列表
    const currentUser = userAuth.getCurrentUser();
    let teacherCourses = [];

    if (currentUser.role === USER_ROLES.ADMIN) {
      teacherCourses = courseManager.getCourses();
    } else if (currentUser.role === USER_ROLES.TEACHER) {
      teacherCourses = courseManager.getTeacherCourses(currentUser.id);
    }

    const courseOptions = teacherCourses.map(course =>
      `<option value="${course.id}" ${assignment?.courseId === course.id ? 'selected' : ''}>
        ${course.title} (${course.code})
      </option>`
    ).join('');

    modal.innerHTML = `
      <div class="glass-effect rounded-2xl p-8 max-w-3xl w-full mx-4 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-light text-white">${title}</h2>
          <button onclick="closeAssignmentModal()" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form id="assignment-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">作业标题 *</label>
              <input type="text" id="assignment-title" required
                value="${assignment?.title || ''}"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">所属课程 *</label>
              <select id="assignment-course" required
                class="input-field w-full px-4 py-3 rounded-lg text-white">
                <option value="">请选择课程</option>
                ${courseOptions}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">作业描述 *</label>
            <textarea id="assignment-description" required rows="4"
              class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">${assignment?.description || ''}</textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">作业类型</label>
              <select id="assignment-type" class="input-field w-full px-4 py-3 rounded-lg text-white">
                <option value="project" ${assignment?.type === 'project' ? 'selected' : ''}>项目</option>
                <option value="exercise" ${assignment?.type === 'exercise' ? 'selected' : ''}>练习</option>
                <option value="quiz" ${assignment?.type === 'quiz' ? 'selected' : ''}>测验</option>
                <option value="homework" ${assignment?.type === 'homework' ? 'selected' : ''}>作业</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">难度</label>
              <select id="assignment-difficulty" class="input-field w-full px-4 py-3 rounded-lg text-white">
                <option value="easy" ${assignment?.difficulty === 'easy' ? 'selected' : ''}>简单</option>
                <option value="medium" ${assignment?.difficulty === 'medium' ? 'selected' : ''}>中等</option>
                <option value="hard" ${assignment?.difficulty === 'hard' ? 'selected' : ''}>困难</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">满分</label>
              <input type="number" id="assignment-points" min="1" max="1000"
                value="${assignment?.points || 100}"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">发布时间</label>
              <input type="datetime-local" id="assignment-publish-time"
                value="${assignment?.schedule?.publishTime?.slice(0, 16) || ''}"
                class="input-field w-full px-4 py-3 rounded-lg text-white">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">截止时间*</label>
              <input type="datetime-local" id="assignment-deadline" required
                value="${assignment?.schedule?.deadline?.slice(0, 16) || ''}"
                class="input-field w-full px-4 py-3 rounded-lg text-white">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">作业要求（每行一个）</label>
            <textarea id="assignment-requirements" rows="3"
              placeholder="例如：&#10;使用HTML5语义化标签&#10;实现响应式布局&#10;代码注释完整"
              class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">${assignment?.requirements?.join('\n') || ''}</textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">标签（用逗号分隔）</label>
            <input type="text" id="assignment-tags"
              value="${assignment?.tags?.join(', ') || ''}"
              placeholder="例如：HTML, CSS, JavaScript"
              class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">预计完成时间</label>
              <input type="text" id="assignment-estimated-time"
                value="${assignment?.estimatedTime || '2-4小时'}"
                placeholder="例如：2-4小时"
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">状态</label>
              <select id="assignment-status" class="input-field w-full px-4 py-3 rounded-lg text-white">
                <option value="draft" ${assignment?.status === 'draft' ? 'selected' : ''}>草稿</option>
                <option value="published" ${assignment?.status === 'published' ? 'selected' : ''}>已发布</option>
              </select>
            </div>
          </div>

          <div id="assignment-form-error" class="hidden error-message p-3 rounded-lg text-sm"></div>
          <div id="assignment-form-success" class="hidden success-message p-3 rounded-lg text-sm"></div>

          <div class="flex space-x-3 pt-4">
            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg text-white font-medium">
              ${submitText}
            </button>
            <button type="button" onclick="closeAssignmentModal()"
              class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              取消
            </button>
          </div>
        </form>
      </div>
    `;

    // 绑定表单提交事件
    modal.querySelector('#assignment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (isEdit) {
        this.updateAssignment();
      } else {
        this.createAssignment();
      }
    });

    // 绑定点击背景关闭事件
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeAssignmentModal();
      }
    });

    return modal;
  }

  /**
   * 创建提交作业模态框
   */
  createSubmissionModal(assignment) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm';
    modal.id = 'submission-modal';

    modal.innerHTML = `
      <div class="glass-effect rounded-2xl p-8 max-w-2xl w-full mx-4 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-light text-white">提交作业</h2>
          <button onclick="closeSubmissionModal()" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 class="text-lg font-medium text-gray-300 mb-2">${assignment.title}</h3>
          <p class="text-sm text-gray-400 mb-2">${assignment.courseName} - ${assignment.courseCode}</p>
          <div class="text-sm text-gray-400">
            截止时间: ${new Date(assignment.schedule.deadline).toLocaleString()}
            ${assignment.timeRemaining && !assignment.timeRemaining.expired ?
              ` (${assignment.timeRemaining.text})` :
              assignment.timeRemaining?.expired ? ' (已截止)' : ''}
          </div>
        </div>

        <div class="mb-6">
          <h4 class="text-md font-medium text-gray-300 mb-2">作业要求:</h4>
          <ul class="text-sm text-gray-400 list-disc list-inside">
            ${assignment.requirements?.map(req => `<li>${req}</li>`).join('') || '<li>无特殊要求</li>'}
          </ul>
        </div>

        <form id="submission-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">选择提交方式:</label>
            <div class="flex space-x-4">
              <label class="flex items-center">
                <input type="radio" name="submission-type" value="editor" checked class="mr-2">
                <span class="text-gray-300">使用代码编辑器</span>
              </label>
              <label class="flex items-center">
                <input type="radio" name="submission-type" value="text" class="mr-2">
                <span class="text-gray-300">直接输入代码</span>
              </label>
            </div>
          </div>

          <div id="editor-option" class="space-y-4">
            <div class="p-4 bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg">
              <p class="text-sm text-blue-300 mb-2">💡 推荐使用代码编辑器完成作业</p>
              <p class="text-sm text-gray-400">代码编辑器提供语法高亮、实时预览、自动保存等功能，让您的编程体验更佳。</p>
            </div>
            <button type="button" onclick="openAssignmentEditor('${assignment.id}')"
              class="w-full btn-primary py-3 rounded-lg text-white font-medium">
              打开代码编辑器
            </button>
          </div>

          <div id="text-option" class="hidden space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">代码内容:</label>
              <textarea id="submission-content" rows="10" required
                placeholder="请在此处输入您的代码..."
                class="input-field w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 font-mono text-sm"></textarea>
            </div>
            <button type="submit" class="w-full btn-primary py-3 rounded-lg text-white font-medium">
              提交作业
            </button>
          </div>

          <div id="submission-form-error" class="hidden error-message p-3 rounded-lg text-sm"></div>
          <div id="submission-form-success" class="hidden success-message p-3 rounded-lg text-sm"></div>
        </form>
      </div>
    `;

    // 绑定提交方式切换事件
    modal.querySelectorAll('input[name="submission-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const editorOption = document.getElementById('editor-option');
        const textOption = document.getElementById('text-option');

        if (e.target.value === 'editor') {
          editorOption.classList.remove('hidden');
          textOption.classList.add('hidden');
        } else {
          editorOption.classList.add('hidden');
          textOption.classList.remove('hidden');
        }
      });
    });

    // 绑定表单提交事件
    modal.querySelector('#submission-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitAssignment(assignment.id);
    });

    // 绑定点击背景关闭事件
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeSubmissionModal();
      }
    });

    return modal;
  }

  /**
   * 创建作业
   */
  async createAssignment() {
    const assignmentData = this.getAssignmentFormData();
    if (!assignmentData) return;

    try {
      const newAssignment = await assignmentManager.createAssignment(assignmentData);
      this.showFormMessage('assignment-form-success', '作业创建成功！');

      setTimeout(() => {
        this.closeAssignmentModal();
        this.refreshAssignmentList();
      }, 1500);
    } catch (error) {
      this.showFormMessage('assignment-form-error', error.message);
    }
  }

  /**
   * 更新作业
   */
  async updateAssignment() {
    if (!this.currentAssignment) return;

    const assignmentData = this.getAssignmentFormData();
    if (!assignmentData) return;

    try {
      const updatedAssignment = await assignmentManager.updateAssignment(this.currentAssignment.id, assignmentData);
      this.showFormMessage('assignment-form-success', '作业更新成功！');

      setTimeout(() => {
        this.closeAssignmentModal();
        this.refreshAssignmentList();
      }, 1500);
    } catch (error) {
      this.showFormMessage('assignment-form-error', error.message);
    }
  }

  /**
   * 提交作业
   */
  async submitAssignment(assignmentId) {
    const content = document.getElementById('submission-content')?.value.trim();
    if (!content) {
      this.showFormMessage('submission-form-error', '请输入代码内容');
      return;
    }

    try {
      const submission = await assignmentManager.submitAssignment(assignmentId, {
        content,
        files: []
      });

      this.showFormMessage('submission-form-success', '作业提交成功！');

      setTimeout(() => {
        this.closeSubmissionModal();
        this.refreshAssignmentList();
      }, 1500);
    } catch (error) {
      this.showFormMessage('submission-form-error', error.message);
    }
  }

  /**
   * 获取作业表单数据
   */
  getAssignmentFormData() {
    const title = document.getElementById('assignment-title').value.trim();
    const courseId = document.getElementById('assignment-course').value;
    const description = document.getElementById('assignment-description').value.trim();
    const type = document.getElementById('assignment-type').value;
    const difficulty = document.getElementById('assignment-difficulty').value;
    const points = document.getElementById('assignment-points').value;
    const publishTime = document.getElementById('assignment-publish-time').value;
    const deadline = document.getElementById('assignment-deadline').value;
    const requirementsText = document.getElementById('assignment-requirements').value.trim();
    const tagsText = document.getElementById('assignment-tags').value.trim();
    const estimatedTime = document.getElementById('assignment-estimated-time').value.trim();
    const status = document.getElementById('assignment-status').value;

    // 验证必填字段
    if (!title || !courseId || !description || !deadline) {
      this.showFormMessage('assignment-form-error', '请填写完整的作业信息');
      return null;
    }

    return {
      title,
      courseId,
      description,
      type,
      difficulty,
      points: parseInt(points) || 100,
      requirements: requirementsText ? requirementsText.split('\n').filter(r => r.trim()) : [],
      tags: tagsText ? tagsText.split(',').map(t => t.trim()).filter(t => t) : [],
      estimatedTime,
      status,
      schedule: {
        publishTime: publishTime ? new Date(publishTime).toISOString() : new Date().toISOString(),
        deadline: new Date(deadline).toISOString()
      }
    };
  }

  /**
   * 关闭作业模态框
   */
  closeAssignmentModal() {
    const modal = document.getElementById('assignment-modal');
    if (modal) {
      modal.remove();
    }
    this.currentAssignment = null;
  }

  /**
   * 关闭提交模态框
   */
  closeSubmissionModal() {
    const modal = document.getElementById('submission-modal');
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
   * 刷新作业列表
   */
  refreshAssignmentList() {
    // 通过路由实例刷新作业列表
    if (window.router) {
      window.router.loadAssignmentList && window.router.loadAssignmentList();
    }
  }
}

// 创建全局实例
export const assignmentInterface = new AssignmentInterface();

// 暴露全局函数供HTML调用
window.showCreateAssignmentModal = () => assignmentInterface.showCreateAssignmentModal();
window.editAssignment = (assignmentId) => assignmentInterface.showEditAssignmentModal(assignmentId);
window.submitAssignment = (assignmentId) => assignmentInterface.showSubmitAssignmentModal(assignmentId);
window.openAssignmentEditor = (assignmentId) => assignmentInterface.openAssignmentInEditor(assignmentId);
window.closeAssignmentModal = () => assignmentInterface.closeAssignmentModal();
window.closeSubmissionModal = () => assignmentInterface.closeSubmissionModal();
window.refreshAssignmentList = () => assignmentInterface.refreshAssignmentList();

// 通知函数
function showNotification(message, type = 'info') {
  if (window.app && window.app.showNotification) {
    window.app.showNotification(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}