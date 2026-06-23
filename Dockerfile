FROM nginx:alpine

# Clean up default nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy sales page files to default public root (served at /)
COPY pagina-de-vendas/ /usr/share/nginx/html/

# Copy members area files to subfolder (served at /area-de-membros/)
COPY area-de-membros/ /usr/share/nginx/html/area-de-membros/
