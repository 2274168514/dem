let currentInput = '0';
let shouldResetDisplay = false;

function updateDisplay() {
    document.getElementById('result').textContent = currentInput;
}

function clearResult() {
    currentInput = '0';
    updateDisplay();
}

function backspace() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

function appendToDisplay(value) {
    if (shouldResetDisplay) {
        currentInput = '0';
        shouldResetDisplay = false;
    }

    if (currentInput === '0' && value !== '.') {
        currentInput = value;
    } else {
        currentInput += value;
    }
    updateDisplay();
}

function calculate() {
    try {
        // 替换显示符号为实际的JavaScript运算符
        let expression = currentInput.replace(/×/g, '*').replace(/÷/g, '/');

        // 验证表达式
        if (expression.includes('/0')) {
            currentInput = '错误';
            shouldResetDisplay = true;
        } else {
            let result = eval(expression);
            currentInput = result.toString();
            shouldResetDisplay = true;
        }
    } catch (error) {
        currentInput = '错误';
        shouldResetDisplay = true;
    }
    updateDisplay();
}

// 键盘支持
document.addEventListener('keydown', function(event) {
    const key = event.key;

    if (key >= '0' && key <= '9') {
        appendToDisplay(key);
    } else if (key === '.') {
        appendToDisplay('.');
    } else if (key === '+' || key === '-') {
        appendToDisplay(key);
    } else if (key === '*') {
        appendToDisplay('*');
    } else if (key === '/') {
        appendToDisplay('/');
    } else if (key === 'Enter' || key === '=') {
        calculate();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearResult();
    } else if (key === 'Backspace') {
        backspace();
    }
});

// 防止页面滚动
document.addEventListener('touchmove', function(event) {
    event.preventDefault();
}, { passive: false });