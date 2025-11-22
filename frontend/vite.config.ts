import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
      // Babel optimizations
      babel: {
        plugins: [
          // Remove PropTypes in production
          process.env.NODE_ENV === 'production' && 'transform-react-remove-prop-types',
          // Remove console in production
          process.env.NODE_ENV === 'production' && 'transform-remove-console',
        ].filter(Boolean),
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Code splitting and optimization
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
          // State management
          'state-vendor': ['zustand'],
          // Data fetching & websocket
          'network-vendor': ['axios', 'socket.io-client'],
          // Charts & visualization
          'charts-vendor': ['recharts'],
          // Utilities
          'utils-vendor': ['date-fns', 'react-hot-toast'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Asset inlining threshold (10kb)
    assetsInlineLimit: 10240,
    // Report compressed bundle size
    reportCompressedSize: true,
    // Target modern browsers
    target: 'es2015',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'zustand',
      'socket.io-client',
      'lucide-react',
      'recharts',
      'date-fns',
      'react-hot-toast',
    ],
    exclude: [],
  },
  // Enable CSS preprocessing
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false,
      },
    },
  },
});
