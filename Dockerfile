ARG version=16.15.1
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
COPY src ./src/
RUN yarn --frozen-lockfile
RUN yarn build

FROM node:${version}-alpine as production
RUN mkdir -p /build
WORKDIR /build
COPY package.json yarn.lock tsconfig*.json src ./
RUN yarn --frozen-lockfile --production

FROM node:${version}-alpine as main
ENV NODE_ENV production
RUN apk add git && \
    mkdir -p /usr/src/app &&\
    chown -R node:node /usr/src/app
USER node
WORKDIR /usr/src/app
COPY --from=build /build/dist /usr/src/app/
COPY --from=production /build/node_modules /usr/src/app/node_modules
CMD "node" "main.js"