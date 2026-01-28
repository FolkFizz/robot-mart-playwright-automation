import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../../utils/api.helper';

test.describe.skip('API: ', () => {
  let apiHelper: ApiHelper;

  test.beforeAll(() => {
    apiHelper = new ApiHelper();
  });

  test('placeholder API test', async () => {
    // TODO: Implement API test
    expect(true).toBe(true);
  });
});
