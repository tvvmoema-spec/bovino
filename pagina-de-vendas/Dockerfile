FROM nginx:alpine

# Copy the static page assets to Nginx public HTML directory
COPY index.html style.css script.js /usr/share/nginx/html/

# Expose port 80 (Easypanel will automatically route web traffic here)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
