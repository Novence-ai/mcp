# Catalog-only image for MCP directories (Glama). Not the production server.
# Production MCP: https://api.novence.ai/mcp
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY catalog ./catalog
COPY glama.json LICENSE ./
USER node
CMD ["node", "catalog/stdio.mjs"]
