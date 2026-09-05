#!/usr/bin/env node
/**
 * Catalog-only stdio MCP for directory introspection (Glama, etc.).
 * Does not import or run the hosted API. Production: https://api.novence.ai/mcp
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { catalogVersion, tools } from "./tools.mjs";

const server = new Server(
  { name: "novence", version: catalogVersion },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => ({
  content: [
    {
      type: "text",
      text: JSON.stringify({
        catalogOnly: true,
        message:
          "This container only answers tools/list for MCP directories. Connect to https://api.novence.ai/mcp to create, check, deploy, and host static sites.",
        tool: request.params.name,
      }),
    },
  ],
}));

const transport = new StdioServerTransport();
await server.connect(transport);
