import React, { useState, useEffect } from 'react';
import { MarkdownRenderer, AIAssistant } from './MarkdownRenderer';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { ArrowLeft, Save, Link, Image, Video, MonitorPlay, Bot, ChevronDown, X } from 'lucide-react';
import { Button } from './Button';
import { ResizablePanel } from './ResizablePanel';
import { i18n, Language } from '../i18n';
import { uploadPPTToSupabase } from '../lib/supabase';

// API 端口配置
const API_PORT = 5024;
// 动态获取 API Base，支持局域网访问
const getApiBase = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:${API_PORT}`;
};
const API_BASE = getApiBase();

interface EditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onSaveOnly?: (content: string) => void;
  onSaveWithoutExport?: (content: string) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
}

export const Editor: React.FC<EditorProps> = ({ initialContent, onSave, onSaveOnly, onSaveWithoutExport, onCancel, isDarkMode = true, onThemeToggle }) => {
  const [content, setContent] = useState(initialContent);
  // 使用 ref 追踪最新的 content，解决异步回调中的闭包陈旧问题
  const contentRef = React.useRef(content);
  
  // 每次 content 更新时同步 ref
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // 用于在渲染后恢复光标位置
  const [pendingCursorPos, setPendingCursorPos] = useState<number | null>(null);

  // 监听 pendingCursorPos 变化，在渲染完成后设置光标
  useEffect(() => {
    if (pendingCursorPos !== null) {
      const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
      if (textarea) {
        // 使用 requestAnimationFrame 确保在浏览器重绘后执行，避免布局抖动
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(pendingCursorPos, pendingCursorPos);
          // 滚动到光标位置，确保可见
          textarea.blur();
          textarea.focus();
          textarea.setSelectionRange(pendingCursorPos, pendingCursorPos);
        });
      }
      setPendingCursorPos(null);
    }
  }, [pendingCursorPos, content]); // 依赖 content 确保在内容更新后执行

  const [currentLang, setCurrentLang] = React.useState<Language>(i18n.current);
  const [showAI, setShowAI] = useState(false);
  
  // 链接插入弹窗状态
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkSelectedText, setLinkSelectedText] = useState('');
  
  // 保存光标位置的ref
  const savedCursorPosition = React.useRef<number>(0);
  
  // 撤销/重做历史管理
  const historyRef = React.useRef<string[]>([initialContent]);
  const historyIndexRef = React.useRef<number>(0);
  const isUndoRedoRef = React.useRef<boolean>(false);
  
  // 更新内容并记录历史（用于程序化修改）
  const updateContentWithHistory = (newContent: string) => {
    // 如果是撤销/重做操作触发的，不记录历史
    if (isUndoRedoRef.current) {
      setContent(newContent);
      return;
    }
    
    // 截断当前位置之后的历史
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    // 添加新内容到历史
    historyRef.current.push(newContent);
    // 限制历史长度为100条
    if (historyRef.current.length > 100) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
    setContent(newContent);
  };
  
  // 撤销
  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      isUndoRedoRef.current = true;
      setContent(historyRef.current[historyIndexRef.current]);
      isUndoRedoRef.current = false;
    }
  };
  
  // 重做
  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      isUndoRedoRef.current = true;
      setContent(historyRef.current[historyIndexRef.current]);
      isUndoRedoRef.current = false;
    }
  };
  
  // 监听键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 确保焦点在编辑器内
      const textarea = document.getElementById('markdown-editor');
      if (!textarea || document.activeElement !== textarea) return;
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 监听语言变化
  useEffect(() => {
    const unsubscribe = i18n.onChange((lang) => {
      setCurrentLang(lang);
    });
    return unsubscribe;
  }, []);

  // 监听 PPT 上传成功事件，自动替换 blob URL 为公网 URL
  useEffect(() => {
    const handlePPTUploadSuccess = (e: any) => {
      const { originalUrl, publicUrl } = e.detail;
      console.log('Editor received upload success:', originalUrl, '->', publicUrl);
      
      setContent(prevContent => {
        if (prevContent.includes(originalUrl)) {
          const newContent = prevContent.replace(originalUrl, publicUrl);
          // 更新历史记录
          if (historyRef.current.length > 0) {
             historyRef.current[historyIndexRef.current] = newContent;
          }
          return newContent;
        }
        return prevContent;
      });
    };

    window.addEventListener('ppt-upload-success', handlePPTUploadSuccess);
    return () => window.removeEventListener('ppt-upload-success', handlePPTUploadSuccess);
  }, []);

  // 保存当前光标位置（在点击按钮前调用）
  const saveCursorPosition = () => {
    const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (textarea) {
      savedCursorPosition.current = textarea.selectionStart;
    }
  };

  // 在指定位置插入文本
  const insertTextAtPosition = (textToInsert: string, position: number) => {
    // 使用 contentRef 获取最新内容，避免闭包陈旧问题
    const text = contentRef.current;
    const before = text.substring(0, position);
    const after = text.substring(position);
    
    const newContent = before + textToInsert + after;
    updateContentWithHistory(newContent);
    
    // 使用 state 触发光标更新，确保在 React 渲染完成后执行
    setPendingCursorPos(position + textToInsert.length);
  };

  const insertText = (textToInsert: string) => {
    const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    // 使用 contentRef 获取最新内容
    const text = contentRef.current;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    const newContent = before + textToInsert + after;
    updateContentWithHistory(newContent);
    
    // 使用 state 触发光标更新
    setPendingCursorPos(start + textToInsert.length);
  };

  // 插入链接
  const handleInsertLink = () => {
    // 先保存光标位置
    saveCursorPosition();
    
    // 获取当前选中的文本作为链接文字
    const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    const selectedText = textarea ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd) : '';
    
    // 设置初始值并显示弹窗
    setLinkSelectedText(selectedText);
    setLinkText(selectedText || '');
    setLinkUrl('https://');
    setShowLinkModal(true);
  };

  // 确认插入链接
  const confirmInsertLink = () => {
    if (!linkUrl.trim()) return;
    
    const cursorPos = savedCursorPosition.current;
    // 如果没有填写链接文字，使用链接地址本身
    const displayText = linkText.trim() || linkUrl.trim();
    const markdown = `[${displayText}](${linkUrl})`;
    
    const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    
    // 如果有选中文本，替换它；否则在光标位置插入
    if (linkSelectedText) {
      const currentContent = contentRef.current;
      const newContent = currentContent.substring(0, textarea.selectionStart) + markdown + currentContent.substring(textarea.selectionEnd);
      updateContentWithHistory(newContent);
      // 使用 state 触发光标更新
      setPendingCursorPos(textarea.selectionStart + markdown.length);
    } else {
      insertTextAtPosition(markdown, cursorPos);
    }
    
    setShowLinkModal(false);
  };

  const handleInsertSampleViz = () => {
    const sampleCode = `\n\`\`\`javascript-viz
// Example D3 Visualization
const data = [10, 25, 40, 20, 50, 30];
const width = 400;
const height = 200;

const svg = d3.select(container)
  .append('svg')
  .attr('width', '100%')
  .attr('height', height)
  .attr('viewBox', \`0 0 \${width} \${height}\`);

svg.selectAll('rect')
  .data(data)
  .enter()
  .append('rect')
  .attr('x', (d, i) => i * 60 + 10)
  .attr('y', d => height - d * 3)
  .attr('width', 40)
  .attr('height', d => d * 3)
  .attr('fill', '#4f46e5')
  .attr('rx', 4);
\`\`\`\n`;
    insertText(sampleCode);
  }

  // 插入图片 - 上传到服务器
  const handleInsertImage = async () => {
    // 先保存光标位置（在点击按钮时焦点还在文本框上）
    saveCursorPosition();
    const cursorPos = savedCursorPosition.current;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', async function(e) {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // 显示上传中提示（在保存的光标位置插入）
        const uploadingText = `![正在上传: ${file.name}...]()`;
        insertTextAtPosition(uploadingText, cursorPos);

        try {
          // 创建FormData
          const formData = new FormData();
          formData.append('file', file);

          // 上传文件
          const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const result = await response.json();

            // 获取当前内容并替换上传提示为实际图片
            const currentTextarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
            const currentContent = currentTextarea.value;
            
            // 插入图片引用（替换上传提示）
            const markdown = `![${file.name}](/uploads/mdresource/${result.filename})`;
            const finalContent = currentContent.replace(uploadingText, markdown);
            updateContentWithHistory(finalContent);

            // 使用 state 触发光标更新
            setPendingCursorPos(cursorPos + markdown.length);

          } else {
            const errorData = await response.json().catch(() => ({ message: '未知错误' }));
            throw new Error(errorData.message || `上传失败 (${response.status})`);
          }
        } catch (error: any) {
          console.error('上传错误:', error);
          // 删除上传提示
          const currentTextarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
          const currentContent = currentTextarea.value;
          updateContentWithHistory(currentContent.replace(uploadingText, ''));
          alert('图片上传失败: ' + (error.message || '请重试'));
        }
      }
    });

    input.click();
  };

  // 插入视频 - 上传到服务器
  const handleInsertVideo = async () => {
    // 先保存光标位置（在点击按钮时焦点还在文本框上）
    saveCursorPosition();
    const cursorPos = savedCursorPosition.current;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';

    input.addEventListener('change', async function(e) {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // 显示上传中提示（在保存的光标位置插入）
        const uploadingText = `[正在上传视频: ${file.name}...]`;
        insertTextAtPosition(uploadingText, cursorPos);

        try {
          // 创建FormData
          const formData = new FormData();
          formData.append('file', file);

          // 上传文件
          const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const result = await response.json();

            // 获取当前内容并替换上传提示为实际视频
            const currentTextarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
            const currentContent = currentTextarea.value;
            
            // 插入视频标签（替换上传提示）- 使用HTML video标签
            const videoUrl = `/uploads/mdresource/${result.filename}`;
            const markdown = `<video controls width="100%" src="${videoUrl}"><a href="${videoUrl}">${file.name}</a></video>`;
            const finalContent = currentContent.replace(uploadingText, markdown);
            updateContentWithHistory(finalContent);

            // 使用 state 触发光标更新
            setPendingCursorPos(cursorPos + markdown.length);

          } else {
            const errorData = await response.json().catch(() => ({ message: '未知错误' }));
            throw new Error(errorData.message || `上传失败 (${response.status})`);
          }
        } catch (error: any) {
          console.error('上传错误:', error);
          // 删除上传提示
          const currentTextarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
          const currentContent = currentTextarea.value;
          updateContentWithHistory(currentContent.replace(uploadingText, ''));
          alert('视频上传失败: ' + (error.message || '请重试'));
        }
      }
    });

    input.click();
  };

  // 插入PPT - 上传到 Supabase
  const handleInsertPPT = async () => {
    // 先保存光标位置（在点击按钮时焦点还在文本框上）
    saveCursorPosition();
    const cursorPos = savedCursorPosition.current;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ppt,.pptx,.odp,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    input.style.display = 'none'; // 隐藏 input
    document.body.appendChild(input); // 添加到文档中以确保兼容性

    input.onchange = async function(e: Event) {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (file) {
        // 1. 创建 Blob URL 用于立即预览
        const blobUrl = URL.createObjectURL(file);
        
        // 2. 立即插入 Blob URL，让预览区显示 PPTXViewer 组件
        // PPTXViewer 组件会自动检测到 Blob URL 并显示"正在上传到云端"的进度条 UI
        // 上传完成后，PPTXViewer 会触发 'ppt-upload-success' 事件，Editor 会自动替换 URL
        const pptEmbedCode = `<div class="ppt-embed" data-src="${blobUrl}" data-name="${file.name}"></div>`;
        insertTextAtPosition(pptEmbedCode, cursorPos);
      }
      // 清理 input
      document.body.removeChild(input);
    };

    // 处理取消选择的情况
    input.oncancel = () => {
        document.body.removeChild(input);
    };

    input.click();
  };

  // 创建简单PPT
  const handleCreatePPT = () => {
    saveCursorPosition();
    const cursorPos = savedCursorPosition.current;

    const samplePPT = `
# ${i18n.t('ppt.sample.title') || '演示文稿'}

## ${i18n.t('ppt.sample.slide1') || '第一页'}

- ${i18n.t('ppt.sample.point1') || '要点一：项目介绍'}
- ${i18n.t('ppt.sample.point2') || '要点二：主要内容'}
- ${i18n.t('ppt.sample.point3') || '要点三：预期成果'}

---

## ${i18n.t('ppt.sample.slide2') || '第二页'}

### ${i18n.t('ppt.sample.subtitle') || '详细说明'}

${i18n.t('ppt.sample.description') || '这里是详细的内容说明，可以包含更多的细节和示例。'}

---

## ${i18n.t('ppt.sample.slide3') || '第三页'}

### ${i18n.t('ppt.sample.conclusion') || '总结'}

1. ${i18n.t('ppt.sample.summary1') || '回顾重点'}
2. ${i18n.t('ppt.sample.summary2') || '展望未来'}
3. ${i18n.t('ppt.sample.thanks') || '感谢聆听！'}
`;

    insertTextAtPosition(samplePPT, cursorPos);
  };

  return (
    <div className="flex flex-col h-screen transition-colors duration-300" style={{backgroundColor: 'var(--bg-primary)'}}>
      {/* Header Toolbar */}
      <div className="h-16 border-b px-6 flex items-center justify-between shrink-0 shadow-sm z-10 transition-colors duration-300"
           style={{backgroundColor: 'var(--panel)', borderColor: 'var(--border)'}}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold transition-colors duration-300" style={{color: 'var(--text-primary)'}}>
            {i18n.t('mode.editor')}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 语言切换按钮 */}
          <LanguageToggle isDark={isDarkMode} />

          {/* 主题切换按钮 */}
          {onThemeToggle && (
            <ThemeToggle
              isDark={isDarkMode}
              onToggle={onThemeToggle}
            />
          )}

          <span className="text-sm mr-2 pr-4 border-r hidden md:inline transition-colors duration-200"
                style={{color: 'var(--text-secondary)', borderColor: 'var(--border)'}}>
            {i18n.t('insert.label')}
          </span>
          <button
            onClick={handleInsertLink}
            className="p-2 rounded transition-colors duration-200"
            style={{color: 'var(--text-secondary)'}}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={i18n.t('insert.link')}>
            <Link size={18} />
          </button>
          <button
            onClick={handleInsertImage}
            className="p-2 rounded transition-colors duration-200"
            style={{color: 'var(--text-secondary)'}}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={i18n.t('insert.image')}>
            <Image size={18} />
          </button>
          <button
            onClick={handleInsertVideo}
            className="p-2 rounded transition-colors duration-200"
            style={{color: 'var(--text-secondary)'}}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={i18n.t('insert.video')}>
            <Video size={18} />
          </button>
          <button
            onClick={handleInsertPPT}
            className="p-2 rounded transition-colors duration-200"
            style={{color: 'var(--text-secondary)'}}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={i18n.t('insert.ppt')}>
            <MonitorPlay size={18} />
          </button>
          <button
            onClick={() => {
              saveCursorPosition();
              setShowAI(true);
            }}
            className="p-2 rounded transition-colors duration-200"
            style={{color: 'var(--text-secondary)'}}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="AI 代码生成">
            <Bot size={18} />
          </button>
          <Button variant="secondary" size="sm" onClick={handleInsertSampleViz} className="ml-2">
            {i18n.t('button.insert_viz')}
          </Button>
          <div className="h-6 w-px mx-2 transition-colors duration-300" style={{backgroundColor: 'var(--border)'}}></div>
          <Button
            variant="outline"
            onClick={() => onSaveOnly ? onSaveOnly(content) : onSave(content)}
            icon={<Save size={16} />}
          >
            {i18n.t('button.save')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // 保存当前编辑内容并返回预览模式，不导出文件
              if (onSaveWithoutExport) {
                onSaveWithoutExport(content);
              } else {
                onSave(content);
              }
            }}
            icon={<ArrowLeft size={16} />}
          >
            {i18n.t('button.return')}
          </Button>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanel defaultLeftWidth={50} minWidth={25} maxWidth={75}>
          {/* Left: Input */}
          <div className="border-r flex flex-col transition-colors duration-300 h-full"
               style={{borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)'}}>
            <textarea
              id="markdown-editor"
              value={content}
              onChange={(e) => {
                const newValue = e.target.value;
                setContent(newValue);
                // 防抖记录历史（用户停止输入500ms后记录）
                if ((window as any).__historyTimeout) {
                  clearTimeout((window as any).__historyTimeout);
                }
                (window as any).__historyTimeout = setTimeout(() => {
                  // 只有当内容确实变化时才记录
                  if (historyRef.current[historyIndexRef.current] !== newValue) {
                    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
                    historyRef.current.push(newValue);
                    if (historyRef.current.length > 100) {
                      historyRef.current.shift();
                    } else {
                      historyIndexRef.current++;
                    }
                  }
                }, 500);
              }}
              className="flex-1 w-full p-6 font-mono text-sm resize-none focus:outline-none transition-colors duration-200"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                placeholderColor: 'var(--text-muted)'
              }}
              placeholder={i18n.t('placeholder.start_writing')}
              spellCheck={false}
            />
          </div>

          {/* Right: Preview */}
          <div className="flex flex-col transition-colors duration-300 h-full"
               style={{backgroundColor: 'var(--panel)'}}>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div className="max-w-3xl mx-auto">
                  <MarkdownRenderer content={content} />
               </div>
            </div>
          </div>
        </ResizablePanel>
      </div>

      {/* AI助手弹窗 */}
      {showAI && (
        <AIAssistant
          onClose={() => setShowAI(false)}
          onInsert={(code) => {
            // AI已经返回了完整的代码块，直接插入
            insertTextAtPosition(code + '\n', savedCursorPosition.current);
          }}
        />
      )}

      {/* 链接插入弹窗 */}
      {showLinkModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLinkModal(false);
            }
          }}
        >
          <div 
            className="rounded-xl shadow-2xl w-full max-w-md p-6"
            style={{ 
              backgroundColor: 'var(--panel)', 
              border: '1px solid var(--border)',
              zIndex: 100000 
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {i18n.t('insert.link') || '插入链接'}
              </h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {i18n.t('link.text') || '链接文字'}
                  <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({i18n.t('link.optional') || '可选'})
                  </span>
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder={i18n.t('link.text_placeholder') || '不填则显示链接地址'}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {i18n.t('link.url') || '链接地址'}
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmInsertLink();
                    }
                  }}
                />
              </div>
              
              {/* 预览 */}
              {linkUrl && (
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i18n.t('link.preview') || '预览'}：</span>
                  <span className="ml-2 text-blue-500 underline">{linkText.trim() || linkUrl}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  color: 'var(--text-secondary)' 
                }}
              >
                {i18n.t('button.cancel') || '取消'}
              </button>
              <button
                onClick={confirmInsertLink}
                disabled={!linkUrl.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {i18n.t('link.insert') || '插入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
