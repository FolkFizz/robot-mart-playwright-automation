// helper สำหรับแนบข้อมูลเข้า Allure (ถ้ามีการติดตั้ง allure-playwright)

type AllureApi = {
  attachment: (name: string, content: string | Buffer, type?: string) => void;
};

const getAllure = async (): Promise<AllureApi | null> => {
  try {
    // dynamic import เพื่อไม่ให้พังถ้ายังไม่ได้ติดตั้ง
    const mod = await import('allure-playwright');
    return mod.allure as AllureApi;
  } catch {
    return null;
  }
};

export const attachText = async (name: string, content: string) => {
  const allure = await getAllure();
  if (!allure) return;
  allure.attachment(name, content, 'text/plain');
};

export const attachJson = async (name: string, data: unknown) => {
  const allure = await getAllure();
  if (!allure) return;
  const body = JSON.stringify(data, null, 2);
  allure.attachment(name, body, 'application/json');
};

export const attachScreenshot = async (name: string, buffer: Buffer) => {
  const allure = await getAllure();
  if (!allure) return;
  allure.attachment(name, buffer, 'image/png');
};
