-- 通知表设计
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,                    -- 通知标题
    message TEXT NOT NULL,                           -- 通知内容
    type ENUM('user_registration', 'course_assignment', 'assignment_submission', 'grade_assigned', 'course_enrollment', 'system_announcement') NOT NULL, -- 通知类型
    sender_id INT NULL,                             -- 发送者ID（系统通知为空）
    recipient_id INT NOT NULL,                      -- 接收者ID
    related_id INT NULL,                            -- 相关实体ID（课程ID、作业ID等）
    related_type ENUM('course', 'assignment', 'submission', 'user', 'system') NULL, -- 相关实体类型
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal', -- 优先级
    is_read BOOLEAN DEFAULT FALSE,                  -- 是否已读
    read_at TIMESTAMP NULL,                         -- 阅读时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_recipient (recipient_id),
    INDEX idx_type (type),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at),
    INDEX idx_related (related_type, related_id)
);

-- 通知模板表（用于预定义通知内容）
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('user_registration', 'course_assignment', 'assignment_submission', 'grade_assigned', 'course_enrollment', 'system_announcement') NOT NULL,
    language_code VARCHAR(10) DEFAULT 'zh-CN',      -- 语言代码
    title_template VARCHAR(200) NOT NULL,           -- 标题模板（支持变量占位符）
    message_template TEXT NOT NULL,                 -- 消息模板（支持变量占位符）
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_template (type, language_code),
    INDEX idx_type (type)
);

-- 插入默认通知模板
INSERT IGNORE INTO notification_templates (type, language_code, title_template, message_template) VALUES
-- 中文模板
('user_registration', 'zh-CN', '新用户注册', '用户 {username}（{full_name}）已注册，账号为{role}。'),
('course_assignment', 'zh-CN', '课程分配通知', '您已被分配到课程：{course_name}，教师：{teacher_name}。'),
('assignment_submission', 'zh-CN', '作业提交通知', '学生 {student_name} 提交了作业：{assignment_title}。'),
('grade_assigned', 'zh-CN', '作业评分通知', '您的作业 "{assignment_title}" 已评分，得分：{grade}分。'),
('course_enrollment', 'zh-CN', '课程报名通知', '学生 {student_name} 报名了您的课程：{course_name}。'),
('system_announcement', 'zh-CN', '系统公告', '{message}'),

-- 英文模板
('user_registration', 'en-US', 'New User Registration', 'User {username} ({full_name}) has registered as {role}.'),
('course_assignment', 'en-US', 'Course Assignment', 'You have been assigned to course: {course_name}, Teacher: {teacher_name}.'),
('assignment_submission', 'en-US', 'Assignment Submission', 'Student {student_name} submitted assignment: {assignment_title}.'),
('grade_assigned', 'en-US', 'Grade Assigned', 'Your assignment "{assignment_title}" has been graded. Score: {grade}.'),
('course_enrollment', 'en-US', 'Course Enrollment', 'Student {student_name} enrolled in your course: {course_name}.'),
('system_announcement', 'en-US', 'System Announcement', '{message}');