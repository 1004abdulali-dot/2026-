export const api = (path: string, init?: RequestInit) => {
  // Vercel 환경변수(VITE_API_URL)가 있으면 그 주소를 쓰고, 없으면 로컬 주소를 씁니다.
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  // 주소 조합 시 슬래시가 겹치지 않도록 처리합니다.
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');

  return fetch(`${cleanBase}/api/${cleanPath}`, init);
};