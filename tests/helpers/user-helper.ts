export type TestUser = {
  username: string;
  email: string;
  password: string;
};

export const generateUser = (): TestUser => {
  const stamp = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return {
    username: `user_${stamp}_${rand}`,
    email: `test_${stamp}_${rand}@robotmart.local`,
    password: `Robot#${rand}123`,
  };
};
