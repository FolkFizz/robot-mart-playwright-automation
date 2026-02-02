// type shim สำหรับกรณียังไม่ได้ติดตั้ง allure-playwright จริง
declare module 'allure-playwright' {
  export const allure: {
    attachment: (name: string, content: string | Buffer, type?: string) => void;
  };
}
