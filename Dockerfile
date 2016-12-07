FROM node:argon

ARG NODE_ENV

RUN npm config set strict-ssl false --global
RUN npm install --global npm@3

WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

VOLUME /usr/src/app/documents

EXPOSE 3000

ONBUILD ARG APPLICATION
ONBUILD COPY . /usr/src/app/public/${APPLICATION:+${APPLICATION}/}

CMD [ "npm", "start" ]
