FROM node:slim AS build

WORKDIR /app

COPY package*.json ./ 
COPY src/* ./src/
COPY yarn.lock ./
COPY tsconfig.json ./

RUN npm install \
    && yarn \
    && ls
RUN npm run build

FROM node:slim AS production

WORKDIR /app

COPY --from=build /app/out/ /app/out/

RUN ls && npm install --production

CMD ["npm", "run", "start"]