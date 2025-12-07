/**
 * 简化的预览系统
 */

/**
 * 安全化脚本
 */
function sanitizeScript(code = '') {
  return code.replace(/<\/script/gi, '<\\/script');
}

/**
 * 创建控制台拦截脚本
 */
function createConsoleScript() {
  return `(() => {
  const send = (method, args) => {
    window.parent.postMessage({ source: 'preview-console', method, args }, '*');
  };
  ['log', 'info', 'warn', 'error'].forEach((level) => {
    const original = console[level];
    console[level] = function (...params) {
      const normalized = params.map((param) => {
        if (typeof param === 'object') {
          try {
            return JSON.stringify(param);
          } catch (err) {
            return '[object]';
          }
        }
        return String(param);
      });
      send(level, normalized);
      return original.apply(console, params);
    };
  });
  window.onerror = function (message, source, line, column) {
    send('error', [message + ' (' + (line || 0) + ':' + (column || 0) + ')']);
  };
})();`;
}

export function setupPreview({ frame, onConsoleMessage }) {
  if (!frame) throw new Error('缺少 iframe 元素');

  window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow) return;
    const payload = event.data || {};
    if (payload.source !== 'preview-console') return;
    onConsoleMessage?.(payload.method || 'log', payload.args || []);
  });

  function run(payload, currentFilePath = null) {
    const doc = frame.contentDocument || frame.contentWindow.document;

    console.log(`🔄 预览运行: 当前文件 = ${currentFilePath}`);
    console.log(`📦 Payload类型: ${typeof payload}`, payload);

    let finalContent;

    // 检查payload类型
    if (typeof payload === 'string' && payload.startsWith('<!DOCTYPE html')) {
      // 直接的HTML字符串（图片预览、数据预览等）
      console.log('🖼️ 直接HTML预览模式');
      finalContent = payload;
    } else if (payload && payload.html) {
      // 标准的{html, css, js}格式
      if (payload.html && payload.html.trim().toLowerCase().startsWith('<!doctype')) {
        // 完整HTML文档：解析文件引用
        console.log('📄 完整HTML文档模式');
        finalContent = processFullHTML(payload.html, payload.css, payload.js);
      } else {
        // 简单HTML内容：组合显示
        console.log('🔧 组合HTML模式');
        finalContent = createCombinedHTML(payload.html, payload.css, payload.js);
      }
    } else {
      // 默认情况
      console.log('⚠️ 使用默认HTML内容');
      finalContent = createCombinedHTML('', '', '');
    }

    // 写入预览
    doc.open();
    doc.write(finalContent);
    doc.close();
  }

  /**
   * 处理完整HTML文档
   */
  function processFullHTML(html, css, js) {
    // 检查是否包含文件引用
    const hasCSSLink = html.includes('<link') && html.includes('stylesheet');
    const hasJSSrc = html.includes('<script') && html.includes('src=');

    if (hasCSSLink || hasJSSrc) {
      // 包含文件引用，处理引用并注入内容
      return injectContentIntoHTML(html, css, js);
    } else {
      // 没有文件引用，直接注入内容
      return injectContentIntoHTML(html, css, js);
    }
  }

  /**
   * 将CSS和JS内容注入到HTML中
   */
  function injectContentIntoHTML(html, css, js) {
    let processedHtml = html;

    // 获取FileManager实例来解析文件引用
    const fileManager = window.fileManager;

    // 处理CSS文件引用
    processedHtml = processedHtml.replace(/<link[^>]*rel=['"]stylesheet['"][^>]*href=['"]([^'"]+)['"][^>]*>/gi, (match, href) => {
      console.log(`🔗 解析CSS引用: ${href}`);

      // 检查是否是外部CDN链接
      if (href.startsWith('http') || href.startsWith('//')) {
        console.log(`🌐 保留外部CDN链接: ${href}`);
        return match; // 保留原始CDN链接
      }

      // 本地文件引用
      const cssContent = fileManager?.files?.[href] || css || '';
      return cssContent ? `<style>\n/* 来自文件: ${href} */\n${cssContent}\n</style>` : '';
    });

    // 处理JS文件引用
    processedHtml = processedHtml.replace(/<script[^>]*src=['"]([^'"]+)['"][^>]*><\/script>/gi, (match, src) => {
      console.log(`🔗 解析JS引用: ${src}`);

      // 检查是否是外部CDN链接
      if (src.startsWith('http') || src.startsWith('//')) {
        console.log(`🌐 保留外部CDN链接: ${src}`);
        return match; // 保留原始CDN链接
      }

      // 本地文件引用
      const jsContent = fileManager?.files?.[src] || js || '';
      if (jsContent) {
        const safeJs = sanitizeScript(jsContent);
        return `<script>\n${createConsoleScript()}\n/* 来自文件: ${src} */\ntry {\n${safeJs}\n} catch (err) {\n  console.error(err);\n}\n</script>`;
      }
      return '';
    });

    // 如果没有找到引用，注入编辑器中的内容
    if (!processedHtml.includes('<style>') && css && css.trim()) {
      const cssContent = `<style>\n/* 编辑器CSS内容 */\n${css}\n</style>\n`;
      if (processedHtml.includes('</head>')) {
        processedHtml = processedHtml.replace('</head>', cssContent + '</head>');
      }
    }

    if (!processedHtml.includes('<script>') && js && js.trim()) {
      const safeJs = sanitizeScript(js);
      const jsContent = `<script>\n${createConsoleScript()}\n/* 编辑器JS内容 */\ntry {\n${safeJs}\n} catch (err) {\n  console.error(err);\n}\n</script>\n`;

      if (processedHtml.includes('</body>')) {
        processedHtml = processedHtml.replace('</body>', jsContent + '</body>');
      } else if (processedHtml.includes('</html>')) {
        processedHtml = processedHtml.replace('</html>', jsContent + '</html>');
      }
    }

    return processedHtml;
  }

  /**
   * 创建组合的HTML内容
   */
  function createCombinedHTML(html, css, js) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>实时预览</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background-color: #ffffff;
      min-height: 100vh;
    }
    ${css || ''}
  </style>
</head>
<body>
${html || ''}
<script>
${createConsoleScript()}
try {
${sanitizeScript(js || '')}
} catch (err) {
  console.error(err);
}
</script>
</body>
</html>`;
  }

  return { run };
}