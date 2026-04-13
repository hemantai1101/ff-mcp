FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Set the working directory
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN npm install

# Install the browser required by @playwright/mcp@latest (chrome-for-testing)
RUN npx @playwright/mcp@latest install-browser chrome-for-testing

# The MCP server will listen on the port provided by the $PORT environment variable
# as specified in the start script.
CMD ["npm", "start"]
