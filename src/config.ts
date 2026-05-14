// Capacitor iOS also runs on localhost; only Vite uses port 5173.

export const CONFIG = {
  // Gọi thẳng tới server chính để App hoạt động độc lập khi tắt máy tính
  API_BASE_URL: import.meta.env.DEV ? '/api' : 'https://vteen.shop/api',
  SITE_BASE_URL: 'https://vteen.shop',
  GITHUB_REPO: 'quyenhan13/apkvteen', // Repository để check OTA
  APP_NAME: 'VTeen',
  VERSION: '0.0.9' // Phải khớp với version trong App Store để so sánh
};
