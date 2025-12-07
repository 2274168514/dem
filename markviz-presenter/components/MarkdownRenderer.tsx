import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { detectMediaType } from '../utils';
import { MediaItem } from '../types';
import { JsVisualizer } from './JsVisualizer';
import { PptViewer } from './PptViewer';
import { PptCanvasRenderer } from './PptCanvasRenderer';
import { ReactFileViewer } from './ReactFileViewer';
import { PPTXViewer } from './PPTXViewer';
import { FileText, Image as ImageIcon, Video, MonitorPlay, ExternalLink, Eye, Copy, RefreshCw, Bot, X, Send, Maximize2, Minimize2 } from 'lucide-react';

// API 端口配置
const API_PORT = 5024;
const API_BASE = `http://localhost:${API_PORT}`;

// 处理图片/媒体URL，将相对路径转换为完整URL
const resolveMediaUrl = (src: string): string => {
  if (!src) return src;
  // 如果是相对路径（以/uploads开头），转换为API服务器URL
  if (src.startsWith('/uploads')) {
    return `${API_BASE}${src}`;
  }
  // 如果已经是完整URL或data URL，直接返回
  return src;
};

interface MarkdownRendererProps {
  content: string;
  onMediaClick?: (media: MediaItem) => void;
  className?: string;
}

// 简单的语法高亮函数
const highlightSyntax = (code: string, language: string): string => {
  if (!language) return escapeHtml(code);

  const escapedCode = escapeHtml(code);

  // 基本的关键字高亮
  const keywords = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super'],
    python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'import', 'from', 'as', 'return', 'yield', 'lambda', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False'],
    css: ['color', 'background', 'border', 'margin', 'padding', 'width', 'height', 'display', 'position', 'font-size', 'font-weight', 'text-align'],
    html: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'script', 'style', 'link', 'meta', 'head', 'body'],
    json: ['true', 'false', 'null'],
    bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'cd', 'ls', 'pwd', 'grep', 'sed', 'awk']
  };

  const langKeywords = keywords[language as keyof typeof keywords] || [];

  let highlightedCode = escapedCode;

  // 高亮关键字
  langKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    highlightedCode = highlightedCode.replace(regex, `<span style="color: var(--accent); font-weight: 600;">${keyword}</span>`);
  });

  // 高亮字符串
  highlightedCode = highlightedCode.replace(/(['"`])([^'"`]*?)\1/g, '<span style="color: var(--success);">$1$2$1</span>');

  // 高亮注释
  if (['javascript', 'python', 'css', 'bash', 'json'].includes(language)) {
    const commentPattern = language === 'css' ? /(\/\*[\s\S]*?\*\/|\/\/[^\n\r]*)/g : /(\/\/[^\n\r]*|\/\*[\s\S]*?\*\/|#.*)/g;
    highlightedCode = highlightedCode.replace(commentPattern, '<span style="color: var(--text-muted); font-style: italic;">$1</span>');
  }

  // 高亮数字
  highlightedCode = highlightedCode.replace(/\b(\d+)\b/g, '<span style="color: var(--warning);">$1</span>');

  return highlightedCode;
};

// HTML转义函数
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// 实时预览组件
export const CodePreview: React.FC<{ code: string; language: string; isSidePanel?: boolean }> = ({ code, language, isSidePanel = false }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uniqueId] = useState(() => `code-preview-${Math.random().toString(36).substr(2, 9)}`);

  // 处理全屏状态变化和ESC键退出
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const shouldShowPreview = () => {
    const supportedLanguages = ['javascript', 'js', 'javascript-viz', 'html', 'css', 'svg', 'json'];
    return supportedLanguages.includes(language.toLowerCase());
  };

  const isVisualizationCode = () => {
    // 检查是否包含 D3 或 Recharts 相关代码
    return code.includes('d3.select') || code.includes('Recharts') || code.includes('Chart');
  };

  const generatePreview = () => {
    try {
      // 如果是JavaScript且包含可视化代码，使用 JsVisualizer
      if (['javascript', 'js'].includes(language.toLowerCase()) && isVisualizationCode()) {
        return <JsVisualizer code={code} />;
      }

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          return <JavaScriptPreview code={code} isSidePanel={isSidePanel} />;
        case 'javascript-viz':
          return <JsVisualizer code={code} />;
        case 'html':
          return <HTMLPreview code={code} isFullscreen={isFullscreen} isSidePanel={isSidePanel} />;
        case 'css':
          return <CSSPreview code={code} isSidePanel={isSidePanel} />;
        case 'svg':
          return <SVGPreview code={code} isSidePanel={isSidePanel} />;
        case 'json':
          return <JSONPreview code={code} />;
        default:
          return <div className="text-red-500 p-4">不支持该语言的预览</div>;
      }
    } catch (error) {
      return <div className="text-red-500 p-4">预览错误: {error instanceof Error ? error.message : '未知错误'}</div>;
    }
  };

  const toggleFullscreen = async (event?: React.MouseEvent) => {
    if (!isFullscreen) {
      // 进入真正的浏览器全屏
      let previewContainer;

      // 优先使用当前组件的唯一ID
      previewContainer = document.getElementById(uniqueId);

      if (!previewContainer && event) {
        // 从点击事件中找到最近的代码预览容器
        const target = event.currentTarget as HTMLElement;
        previewContainer = target.closest('.code-preview-section');
      }

      if (!previewContainer) {
        // 回退到原来的选择逻辑
        if (isSidePanel) {
          previewContainer = document.querySelector('.code-preview-sidepanel-container') ||
                            document.querySelector('.media-viewer-container') ||
                            document.querySelector('.code-preview-section') ||
                            document.querySelector('.flex-1.overflow-auto') ||
                            document.querySelector('.h-full.flex.flex-col') ||
                            document.body;
        } else {
          previewContainer = document.querySelector('.code-preview-section');
        }
      }

      if (previewContainer) {
        try {
          await previewContainer.requestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error('无法进入全屏模式:', err);
        }
      }
    } else {
      // 退出全屏
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('无法退出全屏模式:', err);
      }
    }
  };

  if (!shouldShowPreview()) {
    return null;
  }

  return (
    <div className={`code-preview-section relative`} id={uniqueId}>
      {isFullscreen && (
        <div className="fixed top-4 right-4 z-[99999]" style={{position: 'fixed'}}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
            title="退出全屏 (ESC)"
            style={{pointerEvents: 'auto', cursor: 'pointer'}}
          >
            <Minimize2 size={20} />
          </button>
        </div>
      )}
      <div
        className={`p-4 bg-white dark:bg-gray-900 ${isFullscreen ? 'w-full h-screen overflow-hidden' : 'overflow-auto'} border-t ${isFullscreen ? '' : 'border-gray-200 dark:border-gray-700'}`}
        style={isFullscreen ? {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        } : isSidePanel ? {
          minHeight: '600px'
        } : {
          minHeight: '200px',
          maxHeight: '400px'
        }}
      >
        {!isFullscreen && (
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={(e) => toggleFullscreen(e)}
              className="p-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title="全屏预览"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        )}
        <div className={isFullscreen ? 'w-full h-full' : ''} style={isFullscreen ? {pointerEvents: 'auto'} : {}}>
          {generatePreview()}
        </div>
      </div>
    </div>
  );
};

// JavaScript预览组件
const JavaScriptPreview: React.FC<{ code: string; isSidePanel?: boolean }> = ({ code, isSidePanel = false }) => {
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const executeCode = () => {
    setOutput([]);
    setError('');

    const customConsole = {
      log: (...args: any[]) => {
        const message = args.map(arg => {
          if (typeof arg === 'object') {
            return JSON.stringify(arg, null, 2);
          }
          return String(arg);
        }).join(' ');
        setOutput(prev => [...prev, message]);
      },
      error: (...args: any[]) => {
        const message = args.join(' ');
        setError(message);
      },
      warn: (...args: any[]) => {
        const message = args.join(' ');
        setOutput(prev => [...prev, `⚠️ ${message}`]);
      }
    };

    try {
      const func = new Function('console', code);
      func(customConsole);
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行错误');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={executeCode}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
        >
          执行代码
        </button>
        <button
          onClick={() => { setOutput([]); setError(''); }}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
        >
          清空输出
        </button>
      </div>

      {(output.length > 0 || error) && (
        <div className={`bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm ${isSidePanel ? 'max-h-96' : 'max-h-60'} overflow-y-auto`}>
          {output.map((line, i) => (
            <div key={i} className="text-green-400">{line}</div>
          ))}
          {error && <div className="text-red-400">{error}</div>}
        </div>
      )}
    </div>
  );
};

// HTML预览组件
const HTMLPreview: React.FC<{ code: string; isFullscreen?: boolean; isSidePanel?: boolean }> = ({ code, isFullscreen = false, isSidePanel = false }) => {
  return (
    <iframe
      srcDoc={code}
      className={`w-full ${isFullscreen ? 'h-full min-h-screen' : 'border border-gray-300 rounded'}`}
      sandbox="allow-scripts"
      title="HTML Preview"
      style={
        isFullscreen
          ? { height: 'calc(100vh - 60px)' }
          : isSidePanel
            ? { minHeight: '550px', height: '100%' }
            : { minHeight: '320px', height: '320px' }
      }
    />
  );
};

// CSS预览组件
const CSSPreview: React.FC<{ code: string; isSidePanel?: boolean }> = ({ code, isSidePanel = false }) => {
  return (
    <div className={isSidePanel ? 'h-full' : ''}>
      <style>{code}</style>
      <div className={`p-4 bg-gray-50 rounded ${isSidePanel ? 'h-full overflow-auto' : ''}`}>
        <h3 className="text-lg font-bold mb-2">CSS样式演示</h3>
        <p className="mb-4">这是一个演示段落，将应用您定义的CSS样式。</p>
        <button className="demo-button px-4 py-2 bg-blue-500 text-white rounded mr-2">示例按钮</button>
        <div className="demo-box w-20 h-20 bg-gray-300 border-2 border-dashed border-gray-400 mt-2 flex items-center justify-center">
          示例盒子
        </div>
      </div>
    </div>
  );
};

// SVG预览组件
const SVGPreview: React.FC<{ code: string; isSidePanel?: boolean }> = ({ code, isSidePanel = false }) => {
  return (
    <div className={`flex justify-center items-center p-4 ${isSidePanel ? 'h-full' : ''}`}>
      <div dangerouslySetInnerHTML={{ __html: code }} />
    </div>
  );
};

// JSON预览组件
const JSONPreview: React.FC<{ code: string }> = ({ code }) => {
  try {
    const parsed = JSON.parse(code);
    return (
      <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch (e) {
    return <div className="text-red-500">无效的JSON格式</div>;
  }
};

// AI助手组件
const AIAssistant: React.FC<{ onClose: () => void; onInsert: (code: string, language: string) => void }> = ({ onClose, onInsert }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');

  const generateCode = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setResponse('');

    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 2cc28d1191594edcb718f4bb53c7f0f1.bt9k6pqPtOinYRUj'
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            {
              role: 'system',
              content: '你是一个代码生成助手，专门生成用于演示的简单代码。根据用户的要求，生成简洁的JavaScript、HTML、CSS、JSON或SVG代码。代码要简单易懂，适合演示使用。返回时，请确保代码以```开始，以```结束，并在第一行注明语言类型。例如：\n```html\n<code here>\n```\n\n不要添加任何解释文字，只需要返回代码块。'
            },
            {
              role: 'user',
              content: input
            }
          ]
        })
      });

      const data = await res.json();
      if (data.choices && data.choices[0]) {
        let code = data.choices[0].message.content;
        setResponse(code);
      }
    } catch (error) {
      console.error('AI生成失败:', error);
      setResponse('// 生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const detectLanguage = (code: string): string => {
    if (code.includes('<!DOCTYPE') || code.includes('<html')) return 'html';
    if (code.includes('d3.select') || code.includes('const ') && code.includes('function')) return 'javascript';
    if (code.includes('{') && code.includes(':') && code.includes('"')) return 'json';
    if (code.includes('<svg')) return 'svg';
    if (code.includes('.') || code.includes('{') || code.includes('hover')) return 'css';
    return 'javascript';
  };

  const handleInsert = () => {
    if (response) {
      // AI已经返回了完整的代码块，直接插入
      onInsert(response, '');
      onClose();
    }
  };

  return (
    <>
      {/* 遮罩层 - 确保在最底层 */}
      <div className="fixed inset-0 bg-black bg-opacity-50" style={{zIndex: 9998}}></div>
      {/* 弹窗内容 */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4" style={{zIndex: 9999}}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
            <Bot size={20} />
            AI 代码生成
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="描述你想要生成的代码，例如：生成一个简单的柱状图、创建一个渐变按钮、写一个SVG图标等..."
            className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
            rows={3}
          />

          <button
            onClick={generateCode}
            disabled={isLoading || !input.trim()}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {isLoading ? '生成中...' : '生成代码'}
          </button>
        </div>

        {response && (
          <div className="border-t dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">生成的代码：</span>
              <button
                onClick={handleInsert}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
              >
                插入代码
              </button>
            </div>
            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto text-sm">
              <code>{response}</code>
            </pre>
          </div>
        )}
      </div>
    </>
  );
};

// 导出AIAssistant组件
export { AIAssistant };

// 导出组件供其他文件使用
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onMediaClick,
  className = ""
}) => {
  const [showAI, setShowAI] = useState(false);

  const components = {
    // Custom Code Block Renderer for JS Visualization
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      // 处理特殊的javascript-viz可视化代码块
      if (!inline && language === 'javascript-viz') {
        return <JsVisualizer code={String(children).replace(/\n$/, '')} />;
      }

      // 内联代码样式 - 简洁的行内代码
      if (inline) {
        return (
          <code
            className={`px-1.5 py-0.5 rounded text-sm font-mono transition-colors duration-200 ${className || ''}`}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--accent)',
              border: '1px solid var(--border-light)',
              fontSize: '0.875em'
            }}
            {...props}
          >
            {children}
          </code>
        );
      }

      // 多行代码块样式 - 只在非内联且有换行符时使用
      const codeContent = String(children).replace(/\n$/, '');

      // 如果没有换行符且不是明确指定的语言，当作内联代码处理
      if (!codeContent.includes('\n') && !language) {
        return (
          <code
            className={`px-1.5 py-0.5 rounded text-sm font-mono transition-colors duration-200 ${className || ''}`}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--accent)',
              border: '1px solid var(--border-light)',
              fontSize: '0.875em'
            }}
            {...props}
          >
            {children}
          </code>
        );
      }

      // 真正的代码块样式
      return (
        <div
          className="code-block-container rounded-lg overflow-hidden my-4 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)'
          }}
          data-code-block-id={Math.random().toString(36).substr(2, 9)} // 添加唯一标识
          data-preview-code={codeContent}
          data-preview-lang={language}
        >
          {/* 语言标签和操作按钮 */}
          {language && (
            <div
              className="px-4 py-2 text-xs font-mono font-medium border-b transition-colors duration-200 flex items-center justify-between"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border)'
              }}
            >
              <span>{language}</span>
              <div className="flex gap-2">
                {(['javascript', 'js', 'javascript-viz', 'html', 'css', 'svg', 'json'].includes(language.toLowerCase())) && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();

                      // 在预览模式下，触发代码预览的媒体点击事件
                      if (onMediaClick) {
                        // 创建一个虚拟的媒体项
                        const mediaData = {
                          type: 'code-preview',
                          url: codeContent,
                          title: `${language.toUpperCase()} 代码预览`
                        };
                        onMediaClick(mediaData);
                      } else {
                        // 编辑模式：在底部切换显示
                        const previewEl = e.currentTarget.closest('.code-block-container')?.querySelector('.code-preview-section');
                        if (previewEl) {
                          previewEl.style.display = previewEl.style.display === 'none' ? 'block' : 'none';
                        }
                      }
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="实时预览"
                  >
                    <Eye size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(codeContent);
                    if (e && e.currentTarget) {
                      const originalHTML = e.currentTarget.innerHTML;
                      e.currentTarget.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
                      setTimeout(() => {
                        if (e.currentTarget) {
                          e.currentTarget.innerHTML = originalHTML;
                        }
                      }, 2000);
                    }
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="复制代码"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}

          {/* 代码内容 */}
          <pre
            className="p-4 overflow-x-auto text-sm font-mono leading-relaxed"
            style={{
              color: 'var(--text-primary)',
              backgroundColor: 'var(--bg-secondary)',
              margin: 0,
              padding: '1rem'
            }}
          >
            <code
              className="language-highlight"
              dangerouslySetInnerHTML={{
                __html: highlightSyntax(codeContent, language)
              }}
              style={{ fontSize: '0.875em' }}
              {...props}
            />
          </pre>

          {/* 底部预览区域（编辑模式保持原样） */}
          {(['javascript', 'js', 'javascript-viz', 'html', 'css', 'svg', 'json'].includes(language.toLowerCase())) && (
            <div
              className="code-preview-section"
              style={{ display: 'none' }}
            >
              <CodePreview code={codeContent} language={language} />
            </div>
          )}
        </div>
      );
    },
    // Custom Link Renderer for "Pretty Buttons"
    a({ node, href, children, ...props }: any) {
      if (!href) return <a {...props}>{children}</a>;

      // 处理媒体URL
      const resolvedHref = resolveMediaUrl(href);
      const mediaType = detectMediaType(href);
      const isExternal = mediaType === 'external';

      // If no handler is provided (e.g. editor mode), just act as a normal link
      if (!onMediaClick || isExternal) {
        return (
          <a
            href={resolvedHref}
            className="text-indigo-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        );
      }

      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onMediaClick({ type: mediaType, url: resolvedHref, title: String(children) });
      };

      // Styling based on media type for "Pretty Button" look
      let icon = <ExternalLink size={14} />;
      let colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200";

      if (mediaType === 'image') {
        icon = <ImageIcon size={14} />;
        colorClass = "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200";
      } else if (mediaType === 'video') {
        icon = <Video size={14} />;
        colorClass = "bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200";
      } else if (mediaType === 'pdf') {
        icon = <FileText size={14} />;
        colorClass = "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200";
      } else if (mediaType === 'ppt') {
        icon = <MonitorPlay size={14} />;
        colorClass = "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200";
      }

      return (
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors my-1 mx-1 shadow-sm ${colorClass}`}
          title={`Open ${mediaType}`}
        >
          {icon}
          <span>{children}</span>
        </button>
      );
    },
    // Custom styling for standard elements
    h1: ({ node, ...props }: any) => (
      <h1
        className="text-4xl font-bold mt-8 mb-4 pb-3 transition-colors duration-200"
        style={{
          color: 'var(--text-primary)',
          borderBottom: '2px solid var(--accent)'
        }}
        {...props}
      />
    ),
    h2: ({ node, ...props }: any) => (
      <h2
        className="text-3xl font-bold mt-7 mb-4 pb-2 transition-colors duration-200"
        style={{
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border)'
        }}
        {...props}
      />
    ),
    h3: ({ node, ...props }: any) => (
      <h3
        className="text-2xl font-semibold mt-6 mb-3 transition-colors duration-200"
        style={{
          color: 'var(--text-primary)'
        }}
        {...props}
      />
    ),
    h4: ({ node, ...props }: any) => (
      <h4
        className="text-xl font-semibold mt-5 mb-2 transition-colors duration-200"
        style={{
          color: 'var(--text-primary)'
        }}
        {...props}
      />
    ),
    h5: ({ node, ...props }: any) => (
      <h5
        className="text-lg font-semibold mt-4 mb-2 transition-colors duration-200"
        style={{
          color: 'var(--text-primary)'
        }}
        {...props}
      />
    ),
    h6: ({ node, ...props }: any) => (
      <h6
        className="text-base font-semibold mt-3 mb-2 transition-colors duration-200"
        style={{
          color: 'var(--text-secondary)'
        }}
        {...props}
      />
    ),
    p: ({ node, ...props }: any) => (
      <p
        className="mb-4 leading-relaxed transition-colors duration-200"
        style={{
          color: 'var(--text-primary)',
          fontSize: '16px',
          lineHeight: '1.7'
        }}
        {...props}
      />
    ),
    // 分割线样式
    hr: ({ node, ...props }: any) => (
      <hr
        className="my-8 border-0 transition-colors duration-200"
        style={{
          height: '2px',
          background: 'linear-gradient(to right, transparent, var(--accent), transparent)'
        }}
        {...props}
      />
    ),
    ul: ({ node, ...props }: any) => (
      <ul
        className="mb-4 space-y-1 transition-colors duration-200"
        style={{
          color: 'var(--text-primary)',
          paddingLeft: '1.5rem',
          listStyleType: 'disc'
        }}
        {...props}
      />
    ),
    ol: ({ node, ...props }: any) => (
      <ol
        className="mb-4 space-y-1 transition-colors duration-200"
        style={{
          color: 'var(--text-primary)',
          paddingLeft: '1.5rem',
          listStyleType: 'decimal'
        }}
        {...props}
      />
    ),
    li: ({ node, ...props }: any) => (
      <li
        className="leading-relaxed transition-colors duration-200"
        style={{
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
          paddingLeft: '0.5rem'
        }}
        {...props}
      />
    ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote
        className="border-l-4 pl-4 italic my-4 py-2 rounded-r transition-colors duration-200"
        style={{
          borderColor: 'var(--accent)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-secondary)'
        }}
        {...props}
      />
    ),
    img: ({ node, src, alt, ...props }: any) => (
      <img
        className="rounded-lg shadow-lg max-w-full h-auto my-6 mx-auto transition-all duration-200 hover:shadow-xl"
        style={{
          maxHeight: '400px',
          objectFit: 'contain'
        }}
        src={resolveMediaUrl(src)}
        alt={alt}
        {...props}
      />
    ),
    // 表格样式
    table: ({ node, ...props }: any) => (
      <div className="my-6 overflow-x-auto">
        <table
          className="min-w-full border-collapse rounded-lg overflow-hidden transition-colors duration-200"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--panel)'
          }}
          {...props}
        />
      </div>
    ),
    thead: ({ node, ...props }: any) => (
      <thead
        style={{
          backgroundColor: 'var(--bg-secondary)'
        }}
        {...props}
      />
    ),
    th: ({ node, ...props }: any) => (
      <th
        className="px-4 py-3 text-left font-semibold text-sm border-b transition-colors duration-200"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-primary)'
        }}
        {...props}
      />
    ),
    td: ({ node, ...props }: any) => (
      <td
        className="px-4 py-3 text-sm border-b transition-colors duration-200"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)'
        }}
        {...props}
      />
    ),
  };

  // 添加 video 和 ppt-embed 组件到 components 中
  const extendedComponents = {
    ...components,
    video: ({ node, src, ...props }: any) => {
      const resolvedSrc = resolveMediaUrl(src || '');
      return (
        <video
          controls
          width="100%"
          src={resolvedSrc}
          className="rounded-lg my-4 max-w-full"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            maxHeight: '500px'
          }}
          {...props}
        />
      );
    },
    // 自定义 div 渲染器，用于处理 PPT 内嵌
    div: ({ node, className, ...props }: any) => {
      // 检查是否是 PPT 内嵌组件
      if (className === 'ppt-embed') {
        const dataSrc = props['data-src'] || '';
        const dataName = props['data-name'] || 'PPT 文件';
        const resolvedSrc = resolveMediaUrl(dataSrc);

        // 使用 PPTXViewer 组件通过 Microsoft Office Online 预览
        return <PPTXViewer src={resolvedSrc} name={dataName} />;
      }
      
      // 默认 div 渲染
      return <div className={className} {...props} />;
    }
  };

  return (
    <div className={`max-w-none transition-colors duration-300 ${className}`} style={{ color: 'var(--text-primary)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={extendedComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
