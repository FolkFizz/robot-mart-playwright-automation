// Types for environment configuration.

export type Credential = {
  username: string;
  password: string;
};

export type EnvConfig = {
  baseUrl: string;
  testApiKey: string;
  resetKey: string;
  chaosEnabled: boolean;
  user: Credential;
  admin: Credential;
};
