export const TEST_USERS = {
  validUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  },
  adminUser: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
  },
  invalidUser: {
    username: 'invaliduser',
    password: 'wrongpassword',
  },
};

export const generateRandomUser = () => {
  const timestamp = Date.now();
  return {
    username: `user_${timestamp}`,
    email: `user_${timestamp}@test.com`,
    password: 'Test@1234',
  };
};
