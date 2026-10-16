FROM node:22.19.0-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --offline

COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173

EXPOSE 4173

CMD ["npm", "start"]
