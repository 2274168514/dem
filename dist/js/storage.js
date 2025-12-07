import { STORAGE_KEY, SETTINGS_KEY, DEFAULT_FILES, DEFAULT_SETTINGS } from './config.js';

function readFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch (err) {
    console.warn('读取本地缓存失败，使用默认值', err);
    return { ...fallback };
  }
}

function writeToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('写入本地缓存失败', err);
  }
}

let fileCache = null;
let settingsCache = null;

export function getFiles() {
  if (!fileCache) {
    fileCache = readFromStorage(STORAGE_KEY, DEFAULT_FILES);
  }
  return { ...fileCache };
}

export function updateFile(type, content) {
  if (!fileCache) getFiles();
  fileCache = { ...fileCache, [type]: content };
  writeToStorage(STORAGE_KEY, fileCache);
}

/**
 * 获取所有文件数据（包括新创建的文件）
 */
export function getAllFiles() {
  const fileData = localStorage.getItem('web-compiler-all-files');
  return fileData ? JSON.parse(fileData) : {};
}

/**
 * 保存文件数据
 */
export function saveFileData(filePath, content) {
  const allFiles = getAllFiles();
  allFiles[filePath] = content;
  localStorage.setItem('web-compiler-all-files', JSON.stringify(allFiles));
}

/**
 * 删除文件数据
 */
export function deleteFileData(filePath) {
  const allFiles = getAllFiles();
  delete allFiles[filePath];
  localStorage.setItem('web-compiler-all-files', JSON.stringify(allFiles));
}

export function getSettings() {
  if (!settingsCache) {
    settingsCache = readFromStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
  }
  return { ...settingsCache };
}

export function updateSettings(partial) {
  if (!settingsCache) getSettings();
  settingsCache = { ...settingsCache, ...partial };
  writeToStorage(SETTINGS_KEY, settingsCache);
}
