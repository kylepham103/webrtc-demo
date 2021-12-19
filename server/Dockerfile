FROM node:17-alpine

COPY package*.json ./

RUN npm i

COPY . .

CMD ["npm", "start"]
