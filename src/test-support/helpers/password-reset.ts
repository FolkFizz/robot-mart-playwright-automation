import { Client } from 'pg';
import { expect } from '@playwright/test';
import { inboxSubjects } from '@data';
import { routes } from '@config';
import type { ResetTokenRow } from '@test-helpers/types/integration-contracts';

export const resetTokenPattern = /^[a-f0-9]{64}$/i;

const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim().length === 0) {
    throw new Error('Missing DATABASE_URL for reset-token integration checks.');
  }
  return databaseUrl;
};

const resolveSsl = (databaseUrl: string) => {
  try {
    const url = new URL(databaseUrl);
    const isLocal =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
    const sslMode = url.searchParams.get('sslmode');
    if (!isLocal || sslMode === 'require') {
      return { rejectUnauthorized: false };
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const withDb = async <T>(run: (client: Client) => Promise<T>): Promise<T> => {
  const databaseUrl = getDatabaseUrl();
  const client = new Client({
    connectionString: databaseUrl,
    ssl: resolveSsl(databaseUrl)
  });

  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
};

export const readResetTokenByEmail = async (email: string): Promise<string> => {
  return await withDb(async (client) => {
    const res = await client.query<ResetTokenRow>(
      `SELECT reset_password_token, reset_password_expires
       FROM users
       WHERE email = $1`,
      [email]
    );

    expect(res.rowCount).toBe(1);
    const token = res.rows[0]?.reset_password_token ?? null;
    expect(token).toBeTruthy();
    expect(token ?? '').toMatch(resetTokenPattern);
    return token as string;
  });
};

export const expireResetTokenByEmail = async (email: string): Promise<void> => {
  await withDb(async (client) => {
    const res = await client.query(
      `UPDATE users
       SET reset_password_expires = NOW() - INTERVAL '1 minute'
       WHERE email = $1`,
      [email]
    );
    expect(res.rowCount).toBe(1);
  });
};

export const extractTokenFromLink = (link: string): string => {
  const parsed = new URL(link, 'http://localhost');
  expect(parsed.pathname).toContain(`${routes.resetPasswordBase}/`);

  const token = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
  expect(token).toMatch(resetTokenPattern);
  return token;
};

export const requestResetAndOpenInboxEmail = async (
  forgotPasswordPage: {
    goto: () => Promise<void>;
    requestReset: (email: string) => Promise<void>;
  },
  inboxPage: {
    gotoDemo: () => Promise<void>;
    openEmailBySubject: (subject: string) => Promise<void>;
  },
  email: string
) => {
  await forgotPasswordPage.goto();
  await forgotPasswordPage.requestReset(email);
  await inboxPage.gotoDemo();
  await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);
};
