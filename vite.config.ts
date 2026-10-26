import { defineConfig } from 'vite';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function localDemoExport():Plugin {
  const configure=(server:ViteDevServer|PreviewServer)=>{
    server.middlewares.use('/__export/walkthrough',(req,res)=>{
      const allowed=['http://127.0.0.1:4173','http://127.0.0.1:5173','http://localhost:4173','http://localhost:5173'];
      if(req.method!=='POST'||!allowed.includes(req.headers.origin||'')||req.headers['x-greyhaven-export']!=='walkthrough'){res.statusCode=403;res.end('Local export only.');return;}
      const chunks:Buffer[]=[];let bytes=0;
      req.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>50*1024*1024){res.statusCode=413;res.end('Recording too large.');req.destroy();return;}chunks.push(chunk);});
      req.on('end',()=>{void writeFile(resolve(process.cwd(),'public/walkthrough.webm'),Buffer.concat(chunks)).then(()=>{res.setHeader('Content-Type','text/plain');res.end('Walkthrough saved locally.');}).catch(()=>{res.statusCode=500;res.end('Unable to save recording.');});});
    });
  };
  return {name:'local-demo-export',configureServer:configure,configurePreviewServer:configure};
}
// Transformers configures its version-pinned WASM factory on jsDelivr. Do not
// package ORT's unused fallback copy (over the static host's per-file limit).
function externalOrtFallback():Plugin {return {name:'external-ort-fallback',generateBundle(_options,bundle){for(const name of Object.keys(bundle))if(/ort-wasm-.*\.wasm$/.test(name))delete bundle[name];}};}
export default defineConfig({
  plugins: [react(), localDemoExport(), externalOrtFallback(), VitePWA({
    registerType: 'prompt',
    manifest: { name: 'The Room That Forgot You', short_name: 'The Forgotten Room', description: 'A museum after hours. A mystery of remembrance.', theme_color: '#172321', background_color: '#101817', display: 'standalone', icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] },
    workbox: { maximumFileSizeToCacheInBytes: 32 * 1024 * 1024, globPatterns: ['**/*.{js,mjs,wasm,css,html,svg,woff2,mp3,webm}'], runtimeCaching: [{ urlPattern: /^https:\/\/raw\.githubusercontent\.com\/mlc-ai\/binary-mlc-llm-libs\//, handler: 'CacheFirst', options: { cacheName: 'archivist-runtime', cacheableResponse: { statuses: [0, 200] } } },{urlPattern:/^https:\/\/cdn\.jsdelivr\.net\/npm\/onnxruntime-web@/,handler:'CacheFirst',options:{cacheName:'semantic-runtime',cacheableResponse:{statuses:[0,200]}}}] },
  })],
  build: { chunkSizeWarningLimit: 1800 },
});
