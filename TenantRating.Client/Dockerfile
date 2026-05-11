# Build stage
FROM node:20 AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build -- --configuration production

# Runtime stage (Nginx)
FROM nginx:alpine
# Copy the build output (Angular 17+ uses 'browser' subfolder)
COPY --from=build /app/dist/tenant-rating-client/browser /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
