import fs from 'fs';
import os from 'os';
import path from 'path';
import { createApiContext } from '@api/http';
import { seedDb } from '@api/test-hooks.api';

const seedRunId = process.env.PW_RUN_ID ?? 'local';
const seedLockDir = path.join(os.tmpdir(), 'robot-store-playwright-seed');
const seedDoneFile = path.join(seedLockDir, `${seedRunId}.done`);
const seedLockFile = path.join(seedLockDir, `${seedRunId}.lock`);
const seedDataEnabled = String(process.env.SEED_DATA ?? 'true').toLowerCase() !== 'false';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const seedOncePerRun = async (runSeed: () => Promise<void>): Promise<void> => {
  fs.mkdirSync(seedLockDir, { recursive: true });
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (fs.existsSync(seedDoneFile)) return;

    try {
      const lockFd = fs.openSync(seedLockFile, 'wx');
      try {
        if (!fs.existsSync(seedDoneFile)) {
          await runSeed();
          fs.writeFileSync(seedDoneFile, String(Date.now()));
        }
      } finally {
        fs.closeSync(lockFd);
        if (fs.existsSync(seedLockFile)) {
          fs.unlinkSync(seedLockFile);
        }
      }
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw error;
      await delay(250);
    }
  }

  throw new Error(`[fixtures] Timed out waiting for seed lock: ${seedLockFile}`);
};

export type SeedWorkerFixtures = {
  seedData: boolean;
  _seed: void;
};

type SeedDataFixtureTuple = [boolean, { scope: 'worker'; option: true }];
type SeedAutoFixtureTuple = [
  ({ seedData }: { seedData: boolean }, use: () => Promise<void>) => Promise<void>,
  { scope: 'worker'; auto: true }
];

export const seedWorkerFixtures = {
  seedData: [false, { scope: 'worker', option: true }] as SeedDataFixtureTuple,
  _seed: [
    async (
      { seedData }: { seedData: boolean },
      use: () => Promise<void>
    ) => {
      if (seedData && seedDataEnabled) {
        await seedOncePerRun(async () => {
          const api = await createApiContext();
          try {
            const stockAll = process.env.SEED_STOCK ? Number(process.env.SEED_STOCK) : undefined;
            await seedDb(api, { stockAll });
          } finally {
            await api.dispose();
          }
        });
      } else if (seedData && !seedDataEnabled) {
        console.warn('[fixtures] seedData requested, but SEED_DATA=false so auto seed is skipped.');
      }
      await use();
    },
    { scope: 'worker', auto: true }
  ] as SeedAutoFixtureTuple
};
