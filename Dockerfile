FROM node:22 AS build
WORKDIR /app/src
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM nginx:alpine
# Copy the built Angular app to nginx html directory
COPY --from=build /app/src/dist/nostria-management-portal/browser/ /usr/share/nginx/html/
# Copy nginx configuration for Angular SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]