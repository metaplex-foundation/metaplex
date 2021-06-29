# Stage 1: Compile and Build the app

# Node veersion
FROM node:14.15.1 as build

# update 

RUN apt-get update
RUN apt-get -y install curl gnupg
RUN curl -sL https://deb.nodesource.com/setup_14.x  | bash -
RUN apt-get -y install nodejs

# Set the working directory
WORKDIR /usr/local/app

# Add the source code to app
COPY ./ /usr/local/app/

WORKDIR js
# Install all the dependencies
RUN yarn install
RUN yarn bootstrap

# HERE ADD YOUR STORE WALLET ADDRESS
ENV REACT_APP_STORE_OWNER_ADDRESS_ADDRESS=""

# Generate the build of the application
ENV GENERATE_SOURCEMAP=false
RUN yarn build

# Stage 2: Serve app with nginx server

# Use official nginx image as the base image
FROM nginx:latest

# Copy the build output to replace the default nginx contents.
COPY --from=build /usr/local/app/js/build/web /usr/share/nginx/html

# Expose port 80
EXPOSE 80