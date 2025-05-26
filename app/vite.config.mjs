import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
// import tailwindcss from "@tailwindcss/vite"; // Removed

export default defineConfig({
  plugins: [preact()], // Removed tailwindcss()
  server: {
    proxy: {
      '/api': 'http://localhost:5000' // Proxy API requests to the Flask backend
    }
  }
}); 