/**
 * 课程管理系统
 * 处理课程的创建、编辑、删除等操作
 */

import { USER_ROLES } from './userAuth.js';

export class CourseManager {
  constructor() {
    this.courses = [];
    this.loadCourses();
  }

  loadCourses() {
    try {
      const stored = localStorage.getItem('oj-courses');
      if (stored) {
        this.courses = JSON.parse(stored);
      } else {
        this.courses = this.getDefaultCourses();
        this.saveCourses();
      }
    } catch (error) {
      console.error('加载课程数据失败:', error);
      this.courses = this.getDefaultCourses();
    }
  }

  saveCourses() {
    try {
      localStorage.setItem('oj-courses', JSON.stringify(this.courses));
    } catch (error) {
      console.error('保存课程数据失败:', error);
    }
  }

  getDefaultCourses() {
    return [
      {
        id: 'course_001',
        title: 'Web开发基础',
        description: '学习HTML、CSS、JavaScript等Web前端开发基础知识',
        code: 'WEB101',
        teacherId: 'teacher_001',
        teacherName: '李老师',
        status: 'active',
        maxStudents: 50,
        enrolledStudents: ['student_001', 'student_002', 'student_003'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'course_002',
        title: '数据结构与算法',
        description: '深入学习数据结构和算法知识',
        code: 'CS201',
        teacherId: 'teacher_002',
        teacherName: '王老师',
        status: 'active',
        maxStudents: 40,
        enrolledStudents: ['student_001', 'student_004'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  getAllCourses() {
    return this.courses;
  }

  getCourseStats() {
    const totalCourses = this.courses.length;
    const activeCourses = this.courses.filter(c => c.status === 'active').length;
    return {
      totalCourses,
      activeCourses,
      totalStudents: 0
    };
  }
}

export const courseManager = new CourseManager();
