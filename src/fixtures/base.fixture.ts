import { test as base, expect } from '@playwright/test';
import {
  apiTestFixtures,
  loginAndSyncSession,
  seedCart,
  type ApiTestFixtures
} from './api.fixture';
import { seedWorkerFixtures, type SeedWorkerFixtures } from './seed.fixture';
import { uiTestFixtures, type UiTestFixtures } from './ui.fixture';

type TestFixtures = ApiTestFixtures & UiTestFixtures;
type WorkerFixtures = SeedWorkerFixtures;

const fixtures: Parameters<typeof base.extend<TestFixtures, WorkerFixtures>>[0] = {
  ...seedWorkerFixtures,
  ...apiTestFixtures,
  ...uiTestFixtures
};

export const test = base.extend<TestFixtures, WorkerFixtures>(fixtures);

export { expect, loginAndSyncSession, seedCart };
