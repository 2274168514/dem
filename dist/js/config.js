export const STORAGE_KEY = 'web-compiler-files';
export const SETTINGS_KEY = 'web-compiler-settings';

// 不使用DEFAULT_FILES，改为由FileManager管理默认内容
export const DEFAULT_FILES = {
  html: '',
  css: '',
  js: ''
};

export const RUN_DEBOUNCE_MS = 400;
export const DEFAULT_SETTINGS = {
  autoRun: true
};

// ========== 端口配置 ==========
// API 服务器端口
export const API_PORT = 5024;
// 前端服务器端口
export const FRONTEND_PORT = 5020;

// API 基础URL (自动检测)
export function getApiBase() {
  const currentPort = window.location.port;
  const hostname = window.location.hostname;

  // 检测Vercel环境
  if (hostname.includes('vercel.app') || hostname === 'vercel.app') {
    return '/api';  // Vercel环境使用相对路径
  }

  // 检测生产环境
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !currentPort) {
    return '/api';  // 生产环境使用相对路径
  }

  // 前端开发端口列表
  const frontendPorts = ['5020', '5021', '3000', '8080', '8000', ''];

  if (frontendPorts.includes(currentPort) && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return `http://localhost:${API_PORT}/api`;
  } else if (currentPort === String(API_PORT)) {
    return '/api';
  } else {
    return `http://localhost:${API_PORT}/api`;
  }
}

// 获取前端基础URL
export function getFrontendBase() {
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:${FRONTEND_PORT}`;
}
