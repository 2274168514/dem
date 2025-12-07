const LEVELS = ['log', 'info', 'warn', 'error'];

export function initConsole() {
  const outputEl = document.getElementById('console-output');
  const clearButton = document.getElementById('clear-console');
  const filterButtons = document.querySelectorAll('.filter-chip');

  const filters = LEVELS.reduce((acc, level) => {
    acc[level] = true;
    return acc;
  }, {});

  clearButton.addEventListener('click', () => {
    clear();
    append('info', ['控制台已清空']);
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.level;
      filters[level] = !filters[level];
      btn.classList.toggle('is-active', filters[level]);
      applyFilters();
    });
  });

  function applyFilters() {
    const lines = outputEl.querySelectorAll('.console-line');
    lines.forEach((line) => {
      const level = line.dataset.level;
      line.classList.toggle('is-hidden', filters[level] === false);
    });
  }

  function append(level, args = []) {
    const line = document.createElement('div');
    line.className = 'console-line';
    line.dataset.level = level;
    line.textContent = `[${level}] ${args.join(' ')}`;
    if (filters[level] === false) {
      line.classList.add('is-hidden');
    }
    outputEl.appendChild(line);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function clear() {
    outputEl.innerHTML = '';
  }

  return {
    append,
    clear,
    applyFilters
  };
}
