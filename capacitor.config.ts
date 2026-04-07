import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spiritual.app',
  appName: '橄榄山',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
