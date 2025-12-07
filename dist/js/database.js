/**
 * 数据库API管理
 * 提供与后端API的交互功能
 */

// 默认端口配置
const DEFAULT_API_PORT = 5024;
const DEFAULT_FRONTEND_PORT = 5020;

export class DatabaseManager {
    constructor() {
        // 自动检测API服务器地址
        const currentPort = window.location.port;
        const hostname = window.location.hostname;
        
        // 前端开发端口列表
        const frontendPorts = [String(DEFAULT_FRONTEND_PORT), '5021', '3000', '8080', '8000', ''];
        
        if (frontendPorts.includes(currentPort) && (hostname === 'localhost' || hostname === '127.0.0.1')) {
            // 前端端口或直接打开文件，API服务器在默认端口
            this.apiBase = `http://localhost:${DEFAULT_API_PORT}/api`;
        } else if (currentPort === String(DEFAULT_API_PORT)) {
            // 直接从API服务器访问
            this.apiBase = '/api';
        } else {
            // 其他情况尝试使用绝对路径
            this.apiBase = `http://localhost:${DEFAULT_API_PORT}/api`;
        }
        
        // 保存端口配置供其他模块使用
        this.apiPort = DEFAULT_API_PORT;
        this.frontendPort = DEFAULT_FRONTEND_PORT;
        
        console.log(`[DatabaseManager] API Base: ${this.apiBase}`);
    }

    /**
     * 获取API基础URL
     */
    getApiBase() {
        return this.apiBase;
    }

    /**
     * 获取文档查看URL
     */
    getDocumentViewUrl(docId) {
        return `http://localhost:${this.apiPort}/api/documents/${docId}/view`;
    }

    /**
     * 执行API请求
     */
    async apiRequest(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                config.body = JSON.stringify(data);
            }

            const url = `${this.apiBase}${endpoint}`;
            console.log(`[DatabaseManager] 请求: ${method} ${url}`);
            
            const response = await fetch(url, config);
            
            // 检查响应的Content-Type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error(`[DatabaseManager] 非JSON响应:`, text.substring(0, 200));
                throw new Error(`服务器返回非JSON响应，请确保API服务器(端口${this.apiPort})正在运行`);
            }
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || '请求失败');
            }

            return result;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    /**
     * 用户相关操作
     */
    async createUser(userData) {
        try {
            const result = await this.apiRequest('/users/register', 'POST', userData);
            return result;
        } catch (error) {
            console.error('创建用户失败:', error);
            throw error;
        }
    }

    async getUserByUsernameOrEmail(usernameOrEmail) {
        // 这个方法在login.html中通过专门的login API处理
        // 这里保持接口兼容性
        throw new Error('此方法已弃用，请使用用户登录API');
    }

    async getUserById(userId) {
        try {
            const result = await this.apiRequest('/users/query', 'POST', {
                sql: 'SELECT id, username, email, full_name, role, student_id, employee_id, is_active, last_login, created_at FROM users WHERE id = ?',
                params: [userId]
            });
            return result.data.length > 0 ? result.data[0] : null;
        } catch (error) {
            console.error('查询用户失败:', error);
            return null;
        }
    }

    async updateUserLastLogin(userId) {
        // 这个方法在登录API中自动处理
        return true;
    }

    async getAllUsers(role = null, limit = 50, offset = 0) {
        try {
            let sql = `
                SELECT id, username, email, full_name, role,
                       student_id, employee_id, is_active, last_login,
                       created_at
                FROM users
            `;
            let params = [];

            if (role) {
                sql += ' WHERE role = ?';
                params.push(role);
            }

            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const result = await this.apiRequest('/users/query', 'POST', { sql, params });
            return result.data;
        } catch (error) {
            console.error('获取用户列表失败:', error);
            return [];
        }
    }

    /**
     * 课程相关操作
     */
    async createCourse(courseData) {
        try {
            const result = await this.apiRequest('/courses/create', 'POST', courseData);
            return result;
        } catch (error) {
            console.error('创建课程失败:', error);
            throw error;
        }
    }

    async getCoursesByTeacher(teacherId) {
        try {
            const result = await this.apiRequest(`/courses?teacherId=${teacherId}`);
            return result.data;
        } catch (error) {
            console.error('获取教师课程失败:', error);
            return [];
        }
    }

    async getStudentCourses(studentId) {
        try {
            const result = await this.apiRequest(`/courses?studentId=${studentId}`);
            return result.data;
        } catch (error) {
            console.error('获取学生课程失败:', error);
            return [];
        }
    }

    async enrollStudent(courseId, studentId) {
        try {
            const result = await this.apiRequest('/courses/enroll', 'POST', {
                courseId,
                studentId
            });
            return result;
        } catch (error) {
            console.error('课程报名失败:', error);
            return {
                success: false,
                message: '报名失败，请重试'
            };
        }
    }

    /**
     * 作业相关操作
     */
    async createAssignment(assignmentData) {
        try {
            const result = await this.apiRequest('/assignments/create', 'POST', assignmentData);
            return result;
        } catch (error) {
            console.error('创建作业失败:', error);
            throw error;
        }
    }

    async getAssignmentsByCourse(courseId) {
        try {
            const result = await this.apiRequest(`/assignments?courseId=${courseId}`);
            return result.data;
        } catch (error) {
            console.error('获取课程作业失败:', error);
            return [];
        }
    }

    async getStudentAssignments(studentId) {
        try {
            const result = await this.apiRequest(`/assignments?studentId=${studentId}`);
            return result.data;
        } catch (error) {
            console.error('获取学生作业失败:', error);
            return [];
        }
    }

    async submitAssignment(submissionData) {
        try {
            const result = await this.apiRequest('/assignments/submit', 'POST', submissionData);
            return result;
        } catch (error) {
            console.error('作业提交失败:', error);
            return {
                success: false,
                message: '作业提交失败，请重试'
            };
        }
    }

    async getAssignmentSubmissions(assignmentId) {
        try {
            const result = await this.apiRequest(`/assignments/${assignmentId}/submissions`);
            return result;
        } catch (error) {
            console.error('获取作业提交记录失败:', error);
            return {
                success: false,
                data: []
            };
        }
    }

    /**
     * 代码库相关操作
     */
    async addCodeToRepository(codeData) {
        try {
            const result = await this.apiRequest('/code-repository', 'POST', codeData);
            return result;
        } catch (error) {
            console.error('添加代码失败:', error);
            throw error;
        }
    }

    async getTeacherCodeRepository(teacherId, category = null, language = null) {
        try {
            let url = `/code-repository?teacherId=${teacherId}`;
            if (category) url += `&category=${category}`;
            if (language) url += `&language=${language}`;

            const result = await this.apiRequest(url);
            return result.data;
        } catch (error) {
            console.error('获取教师代码库失败:', error);
            return [];
        }
    }

    async getPublicCodeRepository(category = null, language = null, limit = 50) {
        try {
            let url = `/code-repository?isPublic=true`;
            if (category) url += `&category=${category}`;
            if (language) url += `&language=${language}`;

            const result = await this.apiRequest(url);
            return result.data;
        } catch (error) {
            console.error('获取公共代码库失败:', error);
            return [];
        }
    }

    /**
     * 案例展示相关操作
     */
    async createCodeExample(exampleData) {
        try {
            const result = await this.apiRequest('/code-examples', 'POST', exampleData);
            return result;
        } catch (error) {
            console.error('创建代码示例失败:', error);
            throw error;
        }
    }

    async getCourseExamples(courseId, onlyVisible = true) {
        try {
            let url = `/code-examples?courseId=${courseId}`;
            if (onlyVisible) url += '&visible=true';

            const result = await this.apiRequest(url);
            return result.data;
        } catch (error) {
            console.error('获取课程示例失败:', error);
            return [];
        }
    }

    /**
     * 统计数据
     */
    async getUserStats() {
        try {
            const result = await this.apiRequest('/stats');
            const userStats = result.data.users;

            const stats = {
                total: 0,
                admin: 0,
                teacher: 0,
                student: 0,
                active_total: 0
            };

            userStats.forEach(row => {
                stats.total += row.count;
                stats.active_total += row.active_count;
                stats[row.role] = row.count;
            });

            return stats;
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

    async getCourseStats() {
        try {
            const result = await this.apiRequest('/stats');
            return result.data.courses;
        } catch (error) {
            console.error('获取课程统计失败:', error);
            return {
                total_courses: 0,
                active_courses: 0,
                draft_courses: 0,
                total_enrollments: 0
            };
        }
    }

    async getAssignmentStats() {
        try {
            const result = await this.apiRequest('/stats');
            return result.data.assignments;
        } catch (error) {
            console.error('获取作业统计失败:', error);
            return {
                total_assignments: 0,
                published_assignments: 0,
                total_submissions: 0,
                graded_submissions: 0
            };
        }
    }

    /**
     * 通用查询方法（兼容原有接口）
     */
    async query(sql, params = []) {
        try {
            const result = await this.apiRequest('/database/query', 'POST', { sql, params });
            return result.data;
        } catch (error) {
            console.error('数据库查询失败:', error);
            throw error;
        }
    }

    /**
     * 文档管理相关操作
     */
    async createDocument(docData) {
        try {
            const savedUser = sessionStorage.getItem('current-user');
            if (!savedUser) throw new Error('用户未登录');

            const currentUser = JSON.parse(savedUser);
            const document = {
                ...docData,
                user_id: currentUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const result = await this.apiRequest('/documents', 'POST', document);
            return result;
        } catch (error) {
            console.error('创建文档失败:', error);
            throw error;
        }
    }

    async updateDocument(docId, docData) {
        try {
            const savedUser = sessionStorage.getItem('current-user');
            if (!savedUser) throw new Error('用户未登录');

            const currentUser = JSON.parse(savedUser);
            const document = {
                ...docData,
                user_id: currentUser.id,
                updated_at: new Date().toISOString()
            };

            const result = await this.apiRequest(`/documents/${docId}`, 'PUT', document);
            return result;
        } catch (error) {
            console.error('更新文档失败:', error);
            throw error;
        }
    }

    async deleteDocument(docId) {
        try {
            const savedUser = sessionStorage.getItem('current-user');
            if (!savedUser) throw new Error('用户未登录');

            const result = await this.apiRequest(`/documents/${docId}`, 'DELETE');
            return result;
        } catch (error) {
            console.error('删除文档失败:', error);
            throw error;
        }
    }

    async getDocument(docId) {
        try {
            const result = await this.apiRequest(`/documents/${docId}`, 'GET');
            return result.data;
        } catch (error) {
            console.error('获取文档失败:', error);
            return null;
        }
    }

    async getUserDocuments(type = null, limit = 50) {
        try {
            const savedUser = sessionStorage.getItem('current-user');
            if (!savedUser) return [];

            const currentUser = JSON.parse(savedUser);
            let sql = `
                SELECT id, title, description, content, type, file_path, file_size, mime_type,
                       created_at, updated_at
                FROM documents
                WHERE user_id = ?
            `;
            let params = [currentUser.id];

            if (type) {
                sql += ' AND type = ?';
                params.push(type);
            }

            sql += ` ORDER BY updated_at DESC LIMIT ${parseInt(limit)}`;

            const result = await this.apiRequest('/database/query', 'POST', { sql, params });
            return result.data || [];
        } catch (error) {
            console.error('获取用户文档失败:', error);
            return [];
        }
    }

    async uploadDocument(file, type) {
        try {
            const savedUser = sessionStorage.getItem('current-user');
            if (!savedUser) throw new Error('用户未登录');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            formData.append('user_id', JSON.parse(savedUser).id);

            const config = {
                method: 'POST',
                body: formData
            };

            const response = await fetch(`${this.apiBase}/documents/upload`, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || '上传失败');
            }

            return result;
        } catch (error) {
            console.error('上传文档失败:', error);
            throw error;
        }
    }
}

// 创建全局数据库管理器实例
export const db = new DatabaseManager();