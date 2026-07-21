# Étape 1 : construire l'application Angular
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Étape 2 : servir Angular avec Nginx
FROM nginx:alpine

COPY --from=build /app/dist/gdr-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
