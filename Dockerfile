ARG DE_STAGE
# Stage 1: Build the application
FROM node:current-alpine as build
WORKDIR /usr/src/app
ENV DE_STAGE=$DE_STAGE

# Copy package.json, package-lock.json and environnement files to the working directory
COPY package*.json ./
COPY .env* ./
COPY tsconfig.json ./
COPY prisma ./

# Install project dependencies
RUN npm install
RUN npm run prisma-gen
RUN npm install -g typescript

# Copy the rest of the application code to the working directory
COPY . .

# Build the Vite application
RUN tsc

# Stage 2: Create a production-ready image
FROM node:current-alpine as prod
WORKDIR /usr/src/app
ENV DE_STAGE=$DE_STAGE
ENV LOG_DIRECTORY=/app/logs

# Copy the build artifact from the previous stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/package-lock.json ./package-lock.json

# Install http server
RUN npm install -g http-server

RUN npm install -g typescript

# Install required dependencies
RUN if [ "$DE_STAGE" = "dev" ]; then npm install ; else npm install --production ; fi

# Exposing the port of the application
EXPOSE 4000

# Start the application
USER node
CMD [ "node", "dist/index.js" ]
