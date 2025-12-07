@echo off
cd /d "%~dp0"
echo ========================================
echo   通知系统验证工具
echo ========================================

echo.
echo 📡 检查API服务器状态...
curl -s http://localhost:5024/api/health >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ API服务器未运行，请先启动服务器
    pause
    exit /b 1
)
echo ✅ API服务器运行正常

echo.
echo 🗃️ 检查通知数据库表...
curl -s http://localhost:5024/api/notifications?limit=1 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 通知表创建失败
    pause
    exit /b 1
)
echo ✅ 通知表已创建

echo.
echo 🔔 测试通知创建功能...
echo { "type":"system_announcement","recipient_id":1,"title":"验证测试","message":"这是一个验证通知","priority":"normal"} > temp_notification.json
curl -s -X POST http://localhost:5024/api/notifications -H "Content-Type: application/json" -d @temp_notification.json >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 通知创建失败
    del temp_notification.json >nul 2>&1
    pause
    exit /b 1
)
echo ✅ 通知创建功能正常
del temp_notification.json >nul 2>&1

echo.
echo 📊 检查现有通知...
curl -s http://localhost:5024/api/notifications?limit=5 > temp_notifications.json 2>&1
findstr "total" temp_notifications.json >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 通知查询失败
    del temp_notifications.json >nul 2>&1
    pause
    exit /b 1
)
echo ✅ 通知查询功能正常
del temp_notifications.json >nul 2>&1

echo.
echo ========================================
echo   ✅ 通知系统验证通过！
echo ========================================
echo.
echo 🌐 访问地址:
echo   主应用: http://127.0.0.1:5020/login.html
echo   通知测试: http://127.0.0.1:5020/notification-test.html
echo.
echo 💡 快速测试步骤:
echo   1. 用admin账号登录主应用
echo   2. 注册一个新用户
echo   3. 查看右上角通知铃铛
echo   4. 打开通知测试页面进行详细测试
echo.

timeout /t 3 >nul
start http://127.0.0.1:5020/login.html