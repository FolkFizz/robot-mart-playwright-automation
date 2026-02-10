// Type shim when allure-playwright is not installed.
declare module 'allure-playwright' {
  export const allure: {
    attachment: (name: string, content: string | Buffer, type?: string) => void;
  };
}
