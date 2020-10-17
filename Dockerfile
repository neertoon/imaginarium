FROM node:12.18-alpine

# Install dependencies
WORKDIR /usr/src/service/

RUN npm install

# Expose the app port
EXPOSE 3000