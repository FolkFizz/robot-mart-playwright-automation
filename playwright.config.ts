import {defineConfig, devices} from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// โหลดค่า env จากไฟล์ .env เพื่อให้ config เห็นค่าเดียวกันกับตอนรันเทส
