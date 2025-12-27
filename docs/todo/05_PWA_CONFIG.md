# 📱 PWA 設定

> **文件**: 05_PWA_CONFIG.md  
> **更新日期**: 2025-12-27

---

## PWA 功能清單

| 功能 | 狀態 | 說明 |
|------|------|------|
| **安裝到主畫面** | ✅ 必要 | 使用者可將 App 安裝到桌面 |
| **全螢幕體驗** | ✅ 必要 | `display: standalone` |
| **離線 Shell** | ✅ 必要 | 基本頁面結構可離線載入 |
| **API 快取** | ❌ 不快取 | 確保資料即時性 |

---

## manifest.json

```json
{
  "name": "Uber Ride-Dispatch",
  "short_name": "Uber",
  "description": "叫車派遣系統",
  "start_url": "/rider/home",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#000000",
  "background_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Uber Ride-Dispatch',
        short_name: 'Uber',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/rider/home',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
```

---

## 安裝提示元件

```typescript
// src/components/common/InstallPrompt.tsx
import { useState, useEffect } from 'react';
import { Snackbar, Button, Alert } from '@mui/material';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <Snackbar open={showPrompt} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={handleInstall}>
            安裝
          </Button>
        }
      >
        將 Uber 加入主畫面！
      </Alert>
    </Snackbar>
  );
}
```

---

**下一步**: 閱讀 [06_API_CLIENT.md](./06_API_CLIENT.md)
