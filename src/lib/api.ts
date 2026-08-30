export const api = (path: string, init?: RequestInit) => {
  // 환경변수가 안 먹힐 경우를 대비해 렌더 주소를 직접 입력합니다.
  const baseUrl = import.meta.env.VITE_API_URL || 'https://two026-sungduckartclass.onrender.com';
  
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  
  return fetch(`${cleanBase}/api/${cleanPath}`, init);
};