
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Augment the NodeJS namespace to add API_KEY to ProcessEnv.
// This ensures compatibility with @types/node and avoids redeclaration errors
// while allowing 'process.env.API_KEY' to be typed correctly in the client.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}

// AdSense Global Object
interface Window {
  adsbygoogle: any[];
}
