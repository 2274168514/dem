const FILE_TYPES = ['html', 'css', 'js'];
const MODES = {
  html: 'text/html',
  css: 'css',
  js: 'javascript',
  json: 'application/json',
  csv: 'text/plain',
  md: 'text/x-markdown',
  txt: 'text/plain'
};

export function initEditors({ initialFiles, onChange }) {
  if (!window.CodeMirror) {
    throw new Error('CodeMirror 未成功加载');
  }

  const panes = document.querySelectorAll('.code-pane[data-file]');
  const editors = {};

  FILE_TYPES.forEach((type) => {
    const textarea = document.getElementById(`${type}-code`);
    const cm = window.CodeMirror.fromTextArea(textarea, {
      mode: MODES[type],
      theme: 'material-darker',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentUnit: 2,
      autoCloseTags: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      scrollbarStyle: 'native'
    });
    const initialValue = initialFiles?.[type] ?? '';
    cm.setValue(initialValue);
    cm.on('change', (instance) => {
      onChange?.(type, instance.getValue());
    });
    editors[type] = cm;
  });

  let activeFile = 'html';

  function setActive(file) {
    if (!editors[file]) return;
    activeFile = file;

    // Tab状态现在由TabManager管理，这里只处理编辑器面板
    panes.forEach((pane) => {
      pane.classList.toggle('is-active', pane.dataset.file === file);
    });
    setTimeout(() => editors[file].refresh(), 0);
  }

  // Tab事件现在由TabManager处理

  setActive('html');

  return {
    getActiveFile: () => activeFile,
    getValue: (file) => editors[file]?.getValue() ?? '',
    getAllValues: () => FILE_TYPES.reduce((acc, type) => {
      acc[type] = editors[type].getValue();
      return acc;
    }, {}),
    setValue: (file, value) => editors[file]?.setValue(value ?? ''),
    refresh: () => setActive(activeFile),
    // 暴露CodeMirror实例的获取方法
    getCodemirrorInstance: (file) => editors[file]
  };
}
