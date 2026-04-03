import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spiritual.app',
  appName: '属灵加油站',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
