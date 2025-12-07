/**
 * 作业管理系统
 * 处理作业的创建、编辑、提交、评分等操作
 * 
 * 说明：
 * - 使用 localStorage('oj-assignments') 作为统一的数据源
 * - main.html 初始化的默认作业、编辑器中的作业模式、作业界面 (assignmentInterface)
 *   都通过本模块读写同一份作业数据
 */

import { USER_ROLES } from './userAuth.js';
import { db } from './database.js';

export class AssignmentManager {
  constructor() {
    this.assignments = [];
    this.loadAssignments();
    // 自动尝试同步API数据
    this.init().catch(err => console.error('自动同步失败:', err));
  }

  /**
   * 初始化：从API同步数据
   */
  async init() {
    try {
      console.log('🔄 开始从API同步作业数据...');
      // 尝试从API获取作业列表
      const response = await fetch('http://127.0.0.1:5024/api/assignments');
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
           const apiAssignments = result.data;
           
           // 并行获取所有作业的提交记录
           await Promise.all(apiAssignments.map(async (assignment) => {
             try {
               const subRes = await fetch(`http://127.0.0.1:5024/api/assignments/${assignment.id}/submissions`);
               if (subRes.ok) {
                 const subResult = await subRes.json();
                 if (subResult.success && subResult.data && subResult.data.submissions) {
                   // 转换API数据格式为前端格式
                   assignment.submissions = subResult.data.submissions.map(s => ({
                     id: s.id,
                     assignmentId: s.assignment_id,
                     studentId: s.student_id,
                     studentName: s.student_full_name || s.student_name,
                     studentEmail: s.student_email,
                     submittedAt: s.submission_time,
                     status: s.submission_status === '已提交' ? 'submitted' : 
                             s.submission_status === '已评分' ? 'graded' : s.submission_status,
                     files: typeof s.submission_files === 'string' ? JSON.parse(s.submission_files || '[]') : s.submission_files,
                     score: s.score,
                     feedback: s.feedback,
                     grade: s.score // 兼容 router.js 使用的 grade 字段
                   }));
                 } else {
                   assignment.submissions = [];
                 }
               }
             } catch (e) {
               console.warn(`获取作业 ${assignment.id} 的提交失败`, e);
               assignment.submissions = [];
             }
             
             // 确保其他必要字段存在
             assignment.assignedStudents = []; // API暂未返回此字段，设为空
             assignment.teacherId = assignment.teacher_id;
             assignment.courseId = assignment.course_id;
           }));
           
           this.assignments = apiAssignments;
           this.saveAssignments();
           console.log(`✅ 已从API同步 ${this.assignments.length} 个作业及其提交数据`);
        }
      }
    } catch (error) {
      console.error('初始化同步失败:', error);
    }
  }

  /**
   * 获取所有作业 (兼容 router.js)
   */
  getAssignments() {
    return this.getAllAssignments();
  }

  /**
   * 获取所有提交 (兼容 router.js)
   */
  get submissions() {
    return this.assignments.flatMap(a => a.submissions || []);
  }

  /**
   * 获取学生的提交 (兼容 router.js)
   */
  getStudentSubmissions(studentId) {
    return this.submissions.filter(s => s.studentId == studentId);
  }

  /**
   * 从 localStorage 加载作业列表
   */
  loadAssignments() {
    try {
      const stored = localStorage.getItem('oj-assignments');
      if (stored) {
        this.assignments = JSON.parse(stored);
      } else {
        this.assignments = this.getDefaultAssignments();
        this.saveAssignments();
      }
    } catch (error) {
      console.error('加载作业数据失败:', error);
      this.assignments = this.getDefaultAssignments();
    }
  }

  /**
   * 保存作业列表到 localStorage
   */
  saveAssignments() {
    try {
      localStorage.setItem('oj-assignments', JSON.stringify(this.assignments));
    } catch (error) {
      console.error('保存作业数据失败:', error);
    }
  }

  /**
   * 默认演示作业
   * 与 main.html 中 initDefaultData 的结构保持一致
   */
  getDefaultAssignments() {
    return [
      {
        id: 'assignment_001',
        title: 'JavaScript基础练习',
        description: '完成JavaScript基础语法练习题',
        courseId: 'course_001',
        courseName: 'Web开发基础',
        teacherId: 'teacher_001',
        teacherName: '李老师',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        assignedStudents: ['student_001', 'student_002'],
        submissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'assignment_002',
        title: 'CSS样式设计',
        description: '设计响应式网页布局',
        courseId: 'course_001',
        courseName: 'Web开发基础',
        teacherId: 'teacher_001',
        teacherName: '李老师',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        assignedStudents: ['student_001'],
        submissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  /**
   * 获取全部作业
   */
  getAllAssignments() {
    return this.assignments;
  }

  /**
   * 根据 ID 获取单个作业
   */
  getAssignment(assignmentId) {
    const assignment = this.assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      throw new Error('作业不存在');
    }
    return assignment;
  }

  /**
   * 创建作业（供教师端/管理端使用）
   * assignmentData 由表单或其他模块提供
   */
  async createAssignment(assignmentData) {
    const id = `assignment_${Date.now()}`;
    const now = new Date().toISOString();

    const assignment = {
      id,
      title: assignmentData.title,
      description: assignmentData.description,
      courseId: assignmentData.courseId,
      courseName: assignmentData.courseName || '',
      teacherId: assignmentData.teacherId || '',
      teacherName: assignmentData.teacherName || '',
      deadline: assignmentData.schedule?.deadline || assignmentData.deadline || now,
      status: assignmentData.status || 'active',
      assignedStudents: assignmentData.assignedStudents || [],
      requirements: assignmentData.requirements || [],
      tags: assignmentData.tags || [],
      points: assignmentData.points || 100,
      type: assignmentData.type || 'homework',
      estimatedTime: assignmentData.estimatedTime || '',
      submissions: [],
      createdAt: now,
      updatedAt: now
    };

    this.assignments.push(assignment);
    this.saveAssignments();

    return assignment;
  }

  /**
   * 更新作业
   */
  async updateAssignment(assignmentId, updateData) {
    const index = this.assignments.findIndex(a => a.id === assignmentId);
    if (index === -1) {
      throw new Error('作业不存在');
    }

    const prev = this.assignments[index];
    const updated = {
      ...prev,
      ...updateData,
      schedule: updateData.schedule || prev.schedule,
      updatedAt: new Date().toISOString()
    };

    this.assignments[index] = updated;
    this.saveAssignments();

    return updated;
  }

  /**
   * 获取作业统计
   */
  getAssignmentStats() {
    const totalAssignments = this.assignments.length;
    const pendingSubmissions = this.assignments.filter(a => a.status === 'active').length;
    return {
      totalAssignments,
      pendingSubmissions
    };
  }

  /**
   * 按教师获取作业列表
   */
  getAssignmentsByTeacher(teacherId) {
    return this.assignments.filter(assignment => assignment.teacherId === teacherId);
  }

  /**
   * 获取指定学生被分配的作业
   */
  getAssignedAssignments(studentId) {
    return this.assignments.filter(assignment =>
      Array.isArray(assignment.assignedStudents) &&
      assignment.assignedStudents.includes(studentId)
    );
  }

  /**
   * 是否可以提交作业
   */
  canSubmitAssignment(assignmentId, studentId) {
    const assignment = this.assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      return false;
    }

    const now = new Date();
    const deadline = assignment.deadline ? new Date(assignment.deadline) : null;

    if (assignment.status === 'draft') {
      return false;
    }

    if (deadline && now > deadline) {
      return false;
    }

    // 如果指定了分配学生列表，则需要在列表中
    if (Array.isArray(assignment.assignedStudents) && assignment.assignedStudents.length > 0) {
      return assignment.assignedStudents.includes(studentId);
    }

    return true;
  }

  /**
   * 提交作业（由编辑器调用）
   * submissionData: { content, files }
   */
  async submitAssignment(assignmentId, submissionData) {
    const index = this.assignments.findIndex(a => a.id === assignmentId);
    if (index === -1) {
      throw new Error('作业不存在');
    }

    // 获取当前登录用户
    let currentUser = null;
    try {
      const userStr = localStorage.getItem('oj-current-user');
      currentUser = userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('获取当前用户失败:', error);
    }

    if (!currentUser || currentUser.role !== USER_ROLES.STUDENT) {
      throw new Error('只有学生可以提交作业');
    }

    // 准备提交到后端API的数据
    const apiSubmissionData = {
      assignmentId: assignmentId,
      studentId: currentUser.id || currentUser.username,
      studentName: currentUser.fullName || currentUser.username,
      studentEmail: currentUser.email || '',
      content: submissionData.content || '',
      files: submissionData.files || []
    };

    // 调用后端API
    let apiResult;
    try {
      apiResult = await db.submitAssignment(apiSubmissionData);
    } catch (error) {
      console.error('API提交失败:', error);
      // 如果API失败，继续使用本地存储作为备用
    }

    const assignment = this.assignments[index];
    const now = new Date().toISOString();
    const submission = {
      id: `sub_${assignmentId}_${currentUser.id || currentUser.username || Date.now()}`,
      assignmentId,
      studentId: currentUser.id || currentUser.username,
      studentName: currentUser.fullName || currentUser.username,
      studentEmail: currentUser.email || '',
      content: submissionData.content || '',
      files: submissionData.files || [],
      status: SUBMISSION_STATUS.SUBMITTED,
      submittedAt: now,
      gradedAt: null,
      score: null,
      feedback: ''
    };

    // 如果已提交过，则覆盖
    if (!Array.isArray(assignment.submissions)) {
      assignment.submissions = [];
    }

    const existingIndex = assignment.submissions.findIndex(
      s => s.studentId === submission.studentId
    );

    if (existingIndex !== -1) {
      assignment.submissions[existingIndex] = submission;
    } else {
      assignment.submissions.push(submission);
    }

    assignment.updatedAt = now;
    this.assignments[index] = assignment;
    this.saveAssignments();

    return submission;
  }
}

export const assignmentManager = new AssignmentManager();

export const ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
  EXPIRED: 'expired',
  ACTIVE: 'active'
};

export const SUBMISSION_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  GRADED: 'graded',
  RETURNED: 'returned'
};
