FROM node:17-alpine3.12 as base

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_ENV=production\
    HOST_PORT=3001\
    MONGO_DB_CONNECTION_STRING="mongodb+srv://hovhannessh:Solicy\$55@ninja-marketplace.paeaj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"

ENTRYPOINT [ "npm", "run", "prod" ]
