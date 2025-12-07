const mysql = require('mysql2/promise');
const http = require('http');

async function debug() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '123123',
        database: 'programming_platform'
    });

    console.log('=== 1. 当前数据库中的通知 ===');
    const [notifications] = await conn.execute(
        'SELECT id, type, recipient_id, title, created_at FROM notifications ORDER BY created_at DESC LIMIT 5'
    );
    if (notifications.length === 0) {
        console.log('数据库中没有通知记录');
    } else {
        notifications.forEach(n => {
            console.log(`ID:${n.id} | 类型:${n.type} | 接收者:${n.recipient_id} | 标题:${n.title}`);
        });
    }

    console.log('\n=== 2. 查找一个可以测试的学生和课程 ===');
    // 找一个学生
    const [students] = await conn.execute(
        "SELECT id, username FROM users WHERE role = 'student' LIMIT 1"
    );
    if (students.length === 0) {
        console.log('没有学生用户');
        await conn.end();
        return;
    }
    const student = students[0];
    console.log(`学生: ${student.username} (ID: ${student.id})`);

    // 找一个该学生没选的课程
    const [courses] = await conn.execute(`
        SELECT c.id, c.title, c.teacher_id FROM courses c 
        WHERE c.status = '已发布' 
        AND c.id NOT IN (SELECT course_id FROM course_enrollments WHERE student_id = ?)
        LIMIT 1
    `, [student.id]);

    if (courses.length === 0) {
        console.log('该学生已选完所有课程，清理一条记录...');
        await conn.execute('DELETE FROM course_enrollments WHERE student_id = ? LIMIT 1', [student.id]);
        
        const [newCourses] = await conn.execute(`
            SELECT c.id, c.title, c.teacher_id FROM courses c 
            WHERE c.status = '已发布' 
            AND c.id NOT IN (SELECT course_id FROM course_enrollments WHERE student_id = ?)
            LIMIT 1
        `, [student.id]);
        
        if (newCourses.length > 0) {
            courses.push(newCourses[0]);
        }
    }

    if (courses.length === 0) {
        console.log('没有可用课程进行测试');
        await conn.end();
        return;
    }

    const course = courses[0];
    console.log(`课程: ${course.title} (ID: ${course.id}, 教师ID: ${course.teacher_id})`);

    // 记录当前通知数量
    const [beforeCount] = await conn.execute('SELECT COUNT(*) as count FROM notifications');
    console.log(`\n当前通知总数: ${beforeCount[0].count}`);

    console.log('\n=== 3. 直接在数据库中插入选课记录和通知（绕过API）===');
    
    // 先检查是否已选
    const [existing] = await conn.execute(
        'SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?',
        [course.id, student.id]
    );
    
    if (existing.length > 0) {
        console.log('该学生已选此课程，跳过');
    } else {
        // 插入选课记录
        await conn.execute(`
            INSERT INTO course_enrollments (course_id, student_id, status)
            VALUES (?, ?, '已选课')
        `, [course.id, student.id]);
        console.log('✅ 选课记录已插入');

        // 直接插入通知给学生
        await conn.execute(`
            INSERT INTO notifications (title, message, type, sender_id, recipient_id, related_id, related_type, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            '选课成功',
            `您已成功加入课程《${course.title}》，请及时查看课程内容。`,
            'course_enrollment',
            course.teacher_id,
            student.id,
            course.id,
            'course',
            'normal'
        ]);
        console.log('✅ 学生通知已插入');

        // 直接插入通知给教师
        await conn.execute(`
            INSERT INTO notifications (title, message, type, sender_id, recipient_id, related_id, related_type, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            '新学生选课',
            `学生 ${student.username} 选择了您的课程《${course.title}》`,
            'course_enrollment',
            student.id,
            course.teacher_id,
            course.id,
            'course',
            'normal'
        ]);
        console.log('✅ 教师通知已插入');
    }

    // 检查通知是否插入成功
    const [afterCount] = await conn.execute('SELECT COUNT(*) as count FROM notifications');
    console.log(`\n通知总数: ${beforeCount[0].count} -> ${afterCount[0].count}`);

    console.log('\n=== 4. 验证新通知 ===');
    const [newNotifications] = await conn.execute(
        'SELECT id, type, recipient_id, title FROM notifications ORDER BY created_at DESC LIMIT 3'
    );
    newNotifications.forEach(n => {
        console.log(`ID:${n.id} | 类型:${n.type} | 接收者:${n.recipient_id} | 标题:${n.title}`);
    });

    await conn.end();
    console.log('\n✅ 测试完成！现在登录该学生账号检查是否能看到通知。');
}

debug().catch(err => console.error('错误:', err));
