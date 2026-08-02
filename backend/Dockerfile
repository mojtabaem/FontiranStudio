FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY . .
RUN npx prisma generate
EXPOSE 3000
ENV MOCK_FONTS_DIR=/app/mock/fonts
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]
