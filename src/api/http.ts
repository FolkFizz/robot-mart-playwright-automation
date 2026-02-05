import { APIRequestContext, request } from "@playwright/test";
import { env } from '@config/constants';

// สร้าง request context กลางไว้ใช้ซ้ำ (สามารถเก็บ Cookies/Session ไว้ได้อัตโนมัติ)
export const createApiContext = async(): Promise<APIRequestContext> => {
    return await request.newContext({
        // baseUrl ของ backend
        baseURL: env.baseUrl
    });
};

// helper อ่าน body แบบ JSON (ป้องกันกรณีไม่ใช่ JSON)
export const readJson = async <T=any>(res: {json: () => Promise<T>}) => {
    return await res.json();
}
