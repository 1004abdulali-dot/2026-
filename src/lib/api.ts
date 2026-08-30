export const api = (path: string, init?: RequestInit) => {
  // Vercel 환경변수(VITE_API_URL)에서 렌더 백엔드 주소를 가져옵니다.
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  
  return fetch(`${cleanBase}/api/${cleanPath}`, init);
};