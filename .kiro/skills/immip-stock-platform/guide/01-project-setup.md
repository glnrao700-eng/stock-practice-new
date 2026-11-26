# Step 1: Project setup (tooling, config, entry points)

Create an empty folder and add these files. The app is one Node project: `server.ts` (Express)
serves the API and, in development, mounts Vite as middleware, so a single `npm run dev` (`tsx server.ts`)
runs everything on port 3000.

- React 19 + Vite 8 + Tailwind CSS v4 (through `@tailwindcss/vite`; `src/index.css` only needs `@import "tailwindcss";`).
- `lightweight-charts` v5 for candles, `lucide-react` for icons.
- `@google/genai` and `motion` are declared but never imported. You may drop them.
- `.env`: `PORT`, `UPSTOX_ACCESS_TOKEN` (optional live data), `GEMINI_API_KEY` (unused).

After writing these files run `npm install`.

## Files

- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `metadata.json`
- `.env.example`
- `.gitignore`
- `src/main.tsx`
- `src/index.css`

### `package.json`

<!-- file: package.json -->
````json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "start": "tsx server.ts",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-react": "^6.1.1",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "lightweight-charts": "^5.2.1",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "tsx": "^4.21.0",
    "vite": "^8.3.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.3.3",
    "typescript": "^7.0.2",
    "@types/express": "^4.17.21"
  }
}
````

### `tsconfig.json`

<!-- file: tsconfig.json -->
````json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "types": ["vite/client"],
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
````

### `vite.config.ts`

<!-- file: vite.config.ts -->
````typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
````

### `index.html`

<!-- file: index.html -->
````html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Indian Market Multi-Agent Intelligence Platform (IMMIP)</title>
    <meta name="description" content="Multi-agent AI application for Indian equity (NSE) intraday analysis, deterministic target validation, virtual paper trading, and next-session opening forecasts." />
    <meta property="og:title" content="Indian Market Multi-Agent Intelligence Platform (IMMIP)" />
    <meta property="og:description" content="Multi-agent AI application for Indian equity (NSE) intraday analysis, deterministic target validation, virtual paper trading, and next-session opening forecasts." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

````

### `metadata.json`

<!-- file: metadata.json -->
````json
{
  "name": "Indian Market Multi-Agent Intelligence Platform (IMMIP)",
  "description": "Multi-agent AI application for Indian equity (NSE) intraday analysis, deterministic target validation, virtual paper trading, and next-session opening forecasts.",
  "requestFramePermissions": [],
  "majorCapabilities": ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"]
}
````

### `.env.example`

<!-- file: .env.example noeol -->
````dotenv
PORT=3000
UPSTOX_ACCESS_TOKEN=
GEMINI_API_KEY=
````

### `.gitignore`

<!-- file: .gitignore -->
````text
node_modules/
build/
dist/
coverage/
.DS_Store
*.log
.env*
!.env.example
````

### `src/main.tsx`

<!-- file: src/main.tsx -->
````tsx
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
````

### `src/index.css`

<!-- file: src/index.css -->
````css
@import "tailwindcss";

@layer utilities {
  /* Hide scrollbar for Chrome, Safari and Opera */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}

````
