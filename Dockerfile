FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# ✅ BẮT BUỘC phải copy .env
COPY .env .env

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
