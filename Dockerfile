FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /work

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CI=true

CMD ["npm", "run", "test:smoke"]
