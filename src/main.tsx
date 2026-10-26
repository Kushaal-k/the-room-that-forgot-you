import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import './style.css';
registerSW({ immediate: true });
const root = ReactDOM.createRoot(document.getElementById('root')!);
if(location.pathname === '/evaluate') {
  void import('./Evaluation').then(({default:Evaluation})=>root.render(<Evaluation/>));
} else root.render(<React.StrictMode><App /></React.StrictMode>);
