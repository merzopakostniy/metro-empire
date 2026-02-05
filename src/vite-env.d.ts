/// <reference types="vite/client" />

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  ready: () => void;
  expand: () => void;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
  __bootOk?: boolean;
}
