interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Define process.env to support the required API key usage pattern as per guidelines
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};
