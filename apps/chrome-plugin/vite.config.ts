import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Custom plugin to copy manifest and icons
const copyManifestAndIcons = () => {
  return {
    name: 'copy-manifest-and-icons',
    closeBundle() {
      const distPath = resolve(__dirname, 'dist');
      if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
      }
      const publicPath = resolve(__dirname, 'public');
      
      // Copy manifest.json
      fs.copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(distPath, 'manifest.json')
      );
      
      // Copy icons if they exist
      const iconsPath = resolve(publicPath, 'icons');
      if (fs.existsSync(iconsPath)) {
        const distIconsPath = resolve(distPath, 'icons');
        if (!fs.existsSync(distIconsPath)) {
          fs.mkdirSync(distIconsPath, { recursive: true });
        }
        const icons = fs.readdirSync(iconsPath);
        for (const icon of icons) {
          fs.copyFileSync(
            resolve(iconsPath, icon),
            resolve(distIconsPath, icon)
          );
        }
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), copyManifestAndIcons()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel/index.html'),
        popup: resolve(__dirname, 'popup/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
