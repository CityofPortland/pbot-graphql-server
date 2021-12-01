FROM node:16

WORKDIR /home/node

ADD . .

RUN npm install

RUN npm run build

FROM node:16-slim

ENV NODE_ENV=production

RUN set -ex \
    && buildDeps='' \
    && runDeps='\
    git \
    ' \
    && apt-get update -yqq \
    && apt-get upgrade -yqq \
    && apt-get install -yqq --no-install-recommends \
    $buildDeps \
    $runDeps \
    && apt-get purge --auto-remove -yqq $buildDeps \
    && apt-get autoremove -yqq --purge \
    && apt-get clean \
    && rm -rf \
    /var/lib/apt/lists/* \
    /tmp/* \
    /var/tmp/* \
    /usr/share/man \
    /usr/share/doc \
    /usr/share/doc-base

WORKDIR /home/node

# Build production node_modules folder
COPY package*.json ./
RUN npm install

COPY --from=0 --chown=node:node /home/node/dist dist/

USER node

CMD ["node", "dist/index.js"]