class ClockApp {
    constructor() {
        this.currentTimezone = 'local';
        this.is24Hour = false;
        this.currentTheme = 'light';
        this.soundEnabled = true;
        this.alarmTime = null;
        this.alarmTimeout = null;
        this.stopwatchStartTime = null;
        this.stopwatchElapsedTime = 0;
        this.stopwatchRunning = false;
        this.stopwatchInterval = null;
        this.lapCount = 0;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateClock();
        this.setupStopwatch();

        // 每秒更新时钟
        setInterval(() => {
            this.updateClock();
        }, 1000);
    }

    bindEvents() {
        // 时区选择
        const timezoneSelect = document.getElementById('timezone-select');
        if (timezoneSelect) {
            timezoneSelect.addEventListener('change', (e) => {
                this.currentTimezone = e.target.value;
                this.updateClock();
            });
        }

        // 时间格式选择
        const formatRadios = document.querySelectorAll('input[name="format"]');
        formatRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.is24Hour = e.target.value === '24';
                this.updateClock();
            });
        });

        // 主题选择
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }

        // 闹钟设置
        const setAlarmBtn = document.getElementById('set-alarm');
        const cancelAlarmBtn = document.getElementById('cancel-alarm');
        const alarmTimeInput = document.getElementById('alarm-time');

        if (setAlarmBtn) {
            setAlarmBtn.addEventListener('click', () => {
                if (alarmTimeInput && alarmTimeInput.value) {
                    this.setAlarm(alarmTimeInput.value);
                }
            });
        }

        if (cancelAlarmBtn) {
            cancelAlarmBtn.addEventListener('click', () => {
                this.cancelAlarm();
            });
        }

        // 声音开关
        const soundBtn = document.getElementById('toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.soundEnabled = !this.soundEnabled;
                soundBtn.textContent = `🔊 声音: ${this.soundEnabled ? '开启' : '关闭'}`;
            });
        }

        // 全屏按钮
        const fullscreenBtn = document.getElementById('fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // 秒表控制
        const startBtn = document.getElementById('stopwatch-start');
        const pauseBtn = document.getElementById('stopwatch-pause');
        const resetBtn = document.getElementById('stopwatch-reset');
        const lapBtn = document.getElementById('stopwatch-lap');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startStopwatch());
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseStopwatch());
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetStopwatch());
        }
        if (lapBtn) {
            lapBtn.addEventListener('click', () => this.lapStopwatch());
        }
    }

    updateClock() {
        const now = new Date();
        let displayTime = now;

        // 处理时区
        if (this.currentTimezone !== 'local') {
            const options = {
                timeZone: this.currentTimezone,
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            const timeString = now.toLocaleTimeString('en-US', options);
            const [hours, minutes, seconds] = timeString.split(':');
            displayTime = new Date();
            displayTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
        }

        // 更新模拟时钟
        this.updateAnalogClock(displayTime);

        // 更新数字时钟
        this.updateDigitalClock(displayTime);

        // 更新日期
        this.updateDate(displayTime);

        // 检查闹钟
        this.checkAlarm(displayTime);
    }

    updateAnalogClock(time) {
        const hours = time.getHours();
        const minutes = time.getMinutes();
        const seconds = time.getSeconds();

        const hourDeg = (hours % 12) * 30 + minutes * 0.5;
        const minuteDeg = minutes * 6 + seconds * 0.1;
        const secondDeg = seconds * 6;

        const hourHand = document.querySelector('.hour-hand');
        const minuteHand = document.querySelector('.minute-hand');
        const secondHand = document.querySelector('.second-hand');

        if (hourHand) {
            hourHand.style.transform = `rotate(${hourDeg}deg)`;
        }
        if (minuteHand) {
            minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
        }
        if (secondHand) {
            secondHand.style.transform = `rotate(${secondDeg}deg)`;
        }
    }

    updateDigitalClock(time) {
        let hours = time.getHours();
        const minutes = time.getMinutes();
        const seconds = time.getSeconds();

        const hoursElement = document.getElementById('hours');
        const minutesElement = document.getElementById('minutes');
        const secondsElement = document.getElementById('seconds');

        if (hoursElement && minutesElement && secondsElement) {
            let displayHours = hours;

            if (!this.is24Hour) {
                displayHours = hours % 12 || 12;
            }

            hoursElement.textContent = String(displayHours).padStart(2, '0');
            minutesElement.textContent = String(minutes).padStart(2, '0');
            secondsElement.textContent = String(seconds).padStart(2, '0');
        }
    }

    updateDate(time) {
        const dateElement = document.getElementById('date');
        const dayElement = document.getElementById('day');

        if (dateElement && dayElement) {
            const year = time.getFullYear();
            const month = time.getMonth() + 1;
            const date = time.getDate();
            const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const dayName = dayNames[time.getDay()];

            dateElement.textContent = `${year}年${month}月${date}日`;
            dayElement.textContent = dayName;
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        const body = document.body;

        // 移除所有主题类
        body.classList.remove('dark-theme', 'neon-theme', 'minimal-theme');

        // 添加新主题类
        if (theme !== 'light') {
            body.classList.add(`${theme}-theme`);
        }
    }

    setAlarm(time) {
        this.alarmTime = time;
        const alarmStatus = document.getElementById('alarm-status');
        const setAlarmBtn = document.getElementById('set-alarm');
        const cancelAlarmBtn = document.getElementById('cancel-alarm');

        if (alarmStatus) {
            alarmStatus.innerHTML = `<span>闹钟: 已设置 ${time}</span>`;
        }
        if (setAlarmBtn) setAlarmBtn.disabled = true;
        if (cancelAlarmBtn) cancelAlarmBtn.disabled = false;

        console.log(`闹钟已设置: ${time}`);
    }

    cancelAlarm() {
        this.alarmTime = null;

        if (this.alarmTimeout) {
            clearTimeout(this.alarmTimeout);
            this.alarmTimeout = null;
        }

        const alarmStatus = document.getElementById('alarm-status');
        const setAlarmBtn = document.getElementById('set-alarm');
        const cancelAlarmBtn = document.getElementById('cancel-alarm');

        if (alarmStatus) {
            alarmStatus.innerHTML = '<span>闹钟: 未设置</span>';
        }
        if (setAlarmBtn) setAlarmBtn.disabled = false;
        if (cancelAlarmBtn) cancelAlarmBtn.disabled = true;

        console.log('闹钟已取消');
    }

    checkAlarm(time) {
        if (!this.alarmTime) return;

        const currentTime = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

        if (currentTime === this.alarmTime && time.getSeconds() === 0) {
            this.triggerAlarm();
        }
    }

    triggerAlarm() {
        console.log('⏰ 闹钟响了！');

        // 显示提醒
        const alarmStatus = document.getElementById('alarm-status');
        if (alarmStatus) {
            alarmStatus.innerHTML = '<span style="color: red; font-weight: bold;">⏰ 闹钟响了！</span>';
        }

        // 播放声音（如果开启）
        if (this.soundEnabled) {
            this.playAlarmSound();
        }

        // 震动效果（如果支持）
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // 闪烁效果
        document.body.style.animation = 'blink 0.5s 3';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 1500);

        // 自动取消闹钟
        setTimeout(() => {
            this.cancelAlarm();
        }, 5000);
    }

    playAlarmSound() {
        // 创建简单的蜂鸣声
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // 800Hz
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // 重复播放3次
        setTimeout(() => this.playAlarmSound(), 600);
        setTimeout(() => this.playAlarmSound(), 1200);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    setupStopwatch() {
        this.updateStopwatchDisplay();
    }

    startStopwatch() {
        if (!this.stopwatchRunning) {
            this.stopwatchStartTime = Date.now() - this.stopwatchElapsedTime;
            this.stopwatchRunning = true;

            this.stopwatchInterval = setInterval(() => {
                this.stopwatchElapsedTime = Date.now() - this.stopwatchStartTime;
                this.updateStopwatchDisplay();
            }, 10);

            const startBtn = document.getElementById('stopwatch-start');
            const pauseBtn = document.getElementById('stopwatch-pause');
            const lapBtn = document.getElementById('stopwatch-lap');

            if (startBtn) startBtn.disabled = true;
            if (pauseBtn) pauseBtn.disabled = false;
            if (lapBtn) lapBtn.disabled = false;
        }
    }

    pauseStopwatch() {
        if (this.stopwatchRunning) {
            this.stopwatchRunning = false;

            if (this.stopwatchInterval) {
                clearInterval(this.stopwatchInterval);
                this.stopwatchInterval = null;
            }

            const startBtn = document.getElementById('stopwatch-start');
            const pauseBtn = document.getElementById('stopwatch-pause');
            const lapBtn = document.getElementById('stopwatch-lap');

            if (startBtn) startBtn.disabled = false;
            if (pauseBtn) pauseBtn.disabled = true;
            if (lapBtn) lapBtn.disabled = true;
        }
    }

    resetStopwatch() {
        this.pauseStopwatch();
        this.stopwatchElapsedTime = 0;
        this.lapCount = 0;
        this.updateStopwatchDisplay();

        const lapTimes = document.getElementById('lap-times');
        if (lapTimes) {
            lapTimes.innerHTML = '';
        }
    }

    lapStopwatch() {
        if (this.stopwatchRunning) {
            this.lapCount++;
            const lapTime = this.formatStopwatchTime(this.stopwatchElapsedTime);
            const lapTimes = document.getElementById('lap-times');

            if (lapTimes) {
                const lapElement = document.createElement('div');
                lapElement.className = 'lap-time';
                lapElement.textContent = `计次 ${this.lapCount}: ${lapTime}`;
                lapTimes.insertBefore(lapElement, lapTimes.firstChild);
            }
        }
    }

    updateStopwatchDisplay() {
        const minutesElement = document.getElementById('stopwatch-minutes');
        const secondsElement = document.getElementById('stopwatch-seconds');
        const millisecondsElement = document.getElementById('stopwatch-milliseconds');

        if (minutesElement && secondsElement && millisecondsElement) {
            const timeString = this.formatStopwatchTime(this.stopwatchElapsedTime);
            const [minutes, seconds, milliseconds] = timeString.split(':');

            minutesElement.textContent = minutes;
            secondsElement.textContent = seconds;
            millisecondsElement.textContent = milliseconds;
        }
    }

    formatStopwatchTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor((milliseconds % 1000) / 10);

        return [
            String(minutes).padStart(2, '0'),
            String(seconds).padStart(2, '0'),
            String(ms).padStart(2, '0')
        ].join(':');
    }
}

// 页面加载完成后初始化时钟应用
document.addEventListener('DOMContentLoaded', () => {
    new ClockApp();
    console.log('时钟应用已加载');
});