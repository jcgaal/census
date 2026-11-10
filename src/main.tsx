import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LangProvider } from './i18n/lang';
import { StoreProvider } from './tracking/store';
// Fonts are bundled from @fontsource and served from this same site,
// so the page never contacts a font CDN and no third party learns
// that a visitor opened it, even before consent is given at all.
import '@fontsource/inter/200.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/300.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/terminal.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </LangProvider>
  </StrictMode>,
);
