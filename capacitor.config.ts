import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.shop.vteen.app',
  appName: 'VTeen',
  webDir: 'dist',
  server: {
    cleartext: false,
    allowNavigation: [
      'vteen.shop',
      '*.vteen.shop',
      'clbphimxua.com',
      '*.clbphimxua.com',
      'abysscdn.com',
      '*.abysscdn.com',
      'vip.opstream17.com',
      '*.opstream17.com',
      'cdn.plyr.io',
      'cdn.jsdelivr.net',
      'youtube.com',
      '*.youtube.com',
      'youtube-nocookie.com',
      '*.youtube-nocookie.com',
      'youtu.be',
      '*.googlevideo.com',
      '*.ytimg.com'
    ]
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#050510',
    allowsInlineMediaPlayback: true
  },
  android: {
    backgroundColor: '#050510',
    allowMixedContent: true,
    captureInput: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
