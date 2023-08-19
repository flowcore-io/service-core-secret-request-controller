ARG version=18.12.1
FROM node:${version}-alpine as build
ARG FONTAWESOME_NPM_AUTH_TOKEN
ENV FONTAWESOME_NPM_AUTH_TOKEN ${FONTAWESOME_NPM_AUTH_TOKEN}
ARG CODEARTIFACT_AUTH_TOKEN
ENV CODEARTIFACT_AUTH_TOKEN ${CODEARTIFACT_AUTH_TOKEN}
ARG CI=false
ENV CI ${CI}
RUN mkdir -p /build
WORKDIR /build
COPY package.json yarn.lock nest-cli.json tsconfig*.json ./
RUN yarn --frozen-lockfile

COPY src ./src

RUN yarn build


FROM node:${version}-alpine as production
RUN mkdir -p /build
WORKDIR /build
COPY package.json yarn.lock tsconfig*.json ./
RUN yarn --frozen-lockfile --production
COPY src ./src


FROM node:${version}-alpine as main
ENV NODE_ENV production
RUN apk add git && \
    mkdir -p /usr/src/app &&\
    chown -R node:node /usr/src/app

USER node
WORKDIR /usr/src/app
COPY --from=build /build/dist /usr/src/app/

COPY --from=production /build/node_modules /usr/src/app/node_modules

CMD ["node","main.js"]
