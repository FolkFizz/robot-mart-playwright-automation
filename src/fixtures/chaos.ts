import { APIResponse } from '@playwright/test';
import { createApiContext } from '@api/http';
import { routes } from '@config/routes';

export type ChaosConfig = {
  dynamicIds?: boolean;
  flakyElements?: boolean;
  layoutShift?: boolean;
  zombieClicks?: boolean;
  textScramble?: boolean;
  latency?: boolean;
  randomErrors?: boolean;
  brokenAssets?: boolean;
  enabled?: boolean;
  disableAll?: boolean;
  reset?: boolean;
};

export const defaultChaosConfig: Required<Omit<ChaosConfig, 'enabled' | 'disableAll' | 'reset'>> = {
  dynamicIds: false,
  flakyElements: false,
  layoutShift: false,
  zombieClicks: false,
  textScramble: false,
  latency: false,
  randomErrors: false,
  brokenAssets: false
};

export const setChaosConfig = async (config: ChaosConfig = {}): Promise<APIResponse> => {
  const api = await createApiContext();
  try {
    const payload = { ...defaultChaosConfig, ...config };
    return await api.post(routes.api.chaosConfig, { data: payload });
  } finally {
    await api.dispose();
  }
};

// เปิด chaos ตาม config ที่ส่งเข้าไป
export const enableChaos = async (config: ChaosConfig = {}) => {
  return await setChaosConfig({ ...config, enabled: true });
};

// ปิด chaos ทั้งหมด
export const disableChaos = async () => {
  return await setChaosConfig({ disableAll: true, enabled: false, reset: true });
};

// รีเซ็ต chaos กลับสู่ค่าเริ่มต้น
export const resetChaos = async () => {
  return await setChaosConfig({ reset: true, disableAll: true, enabled: false });
};
