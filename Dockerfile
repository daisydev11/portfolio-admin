FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . .
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
USER node
EXPOSE 3000
CMD ["npm","start"]
