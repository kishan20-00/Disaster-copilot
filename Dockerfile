# --- Build Stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code and build
COPY . .
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine

# Copy the built React app from the build stage to Nginx's HTML directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our custom nginx configuration to support React routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (standard for Cloud Run)
EXPOSE 8080

# When the container starts, dynamically replace the port in Nginx config with $PORT and run Nginx
CMD ["sh", "-c", "sed -i 's/listen 80;/listen '${PORT:-8080}';/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
