const mysql = require('mysql2/promise');
const http = require('http');

async function fullTest() {
    console.log('========================================');
    console.log('   完整通知系统测试');
    console.log('========================================\n');

    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '123123',
        database: 'programming_platform'
    });

    // Step 1: 查找测试用户
    console.log('【步骤1】查找测试用户...');
    const [students] = await conn.execute(
        "SELECT id, username FROM users WHERE role = 'student' LIMIT 1"
    );
    if (students.length === 0) {
        console.log('❌ 没有学生用户，请先创建一个学生账号');
        await conn.end();
        return;
    }
    const student = students[0];
    console.log(`✅ 找到学生: ${student.username} (ID: ${student.id})\n`);

    // Step 2: 直接在数据库创建一条测试通知
    console.log('【步骤2】在数据库中创建测试通知...');
    const testTitle = '测试通知 - ' + new Date().toLocaleTimeString();
    const testMessage = '这是一条测试通知，用于验证通知系统是否正常工作。';
    
    await conn.execute(`
        INSERT INTO notifications (title, message, type, recipient_id, priority, is_read, created_at)
        VALUES (?, ?, 'system_announcement', ?, 'normal', false, NOW())
    `, [testTitle, testMessage, student.id]);
    console.log(`✅ 已为用户 ${student.username} 创建通知: "${testTitle}"\n`);

    // Step 3: 验证通知已存入数据库
    console.log('【步骤3】验证数据库中的通知...');
    const [dbNotifications] = await conn.execute(
        'SELECT id, title, message, is_read, created_at FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 3',
        [student.id]
    );
    if (dbNotifications.length === 0) {
        console.log('❌ 数据库中没有该用户的通知！');
    } else {
        console.log(`✅ 该用户有 ${dbNotifications.length} 条通知:`);
        dbNotifications.forEach((n, i) => {
            console.log(`   ${i+1}. [${n.is_read ? '已读' : '未读'}] ${n.title}`);
        });
    }

    // Step 4: 测试 API 获取通知
    console.log('\n【步骤4】测试 API 获取通知...');
    await new Promise((resolve) => {
        const options = {
            hostname: '127.0.0.1',
            port: 5024,
            path: `/api/notifications?recipientId=${student.id}`,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const result = JSON.parse(data);
                        if (result.success && result.data) {
                            console.log(`✅ API 返回 ${result.data.length} 条通知:`);
                            result.data.slice(0, 3).forEach((n, i) => {
                                console.log(`   ${i+1}. [${n.is_read ? '已读' : '未读'}] ${n.title}`);
                            });
                        } else {
                            console.log('❌ API 返回失败:', result.message);
                        }
                    } catch (e) {
                        console.log('❌ API 返回格式错误:', data.substring(0, 100));
                    }
                } else {
                    console.log(`❌ API 请求失败，状态码: ${res.statusCode}`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log('❌ API 服务器连接失败:', e.message);
            console.log('   请确保 API 服务器正在运行 (node api_server.js)');
            resolve();
        });

        req.end();
    });

    await conn.end();

    console.log('\n========================================');
    console.log('   测试完成！');
    console.log('========================================');
    console.log(`\n请用以下账号登录测试:`);
    console.log(`   用户名: ${student.username}`);
    console.log(`   然后点击铃铛按钮查看通知`);
    console.log(`\n如果看不到通知，请检查浏览器控制台(F12)是否有错误`);
}

fullTest().catch(err => console.error('测试出错:', err));
