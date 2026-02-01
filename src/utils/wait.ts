// helper สำหรับการหน่วงเวลาและรอแบบ polling

// หน่วงเวลา (ms)
export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// รอจนเงื่อนไขเป็นจริง (ใช้ polling แบบง่าย)
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
) => {
  const { timeout = 5000, interval = 200 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const ok = await condition();
    if (ok) return;
    await sleep(interval);
  }

  throw new Error('waitFor timeout');
};
