FROM node:slim AS build

WORKDIR /app

COPY package*.json ./ 
COPY src/* ./
COPY yarn.lock ./
COPY tsconfig.json ./

RUN npm install \
    && yarn 
RUN npm run build

FROM node:slim AS production

COPY --from=build /app/ /app

RUN npm install --production


CMD ["npm", "run", "start"]