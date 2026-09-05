#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { tools } from "./tools.mjs";

const names = tools.map((t) => t.name);
if (new Set(names).size !== names.length) {
  throw new Error("duplicate tool names in catalog/tools.mjs");
}
if (names.length < 40) {
  throw new Error(`expected 40+ catalog tools, got ${names.length}`);
}

for (const tool of tools) {
  if (!tool.description || tool.description.length < 40) {
    throw new Error(`${tool.name}: description too short for TDQS`);
  }
  const properties = tool.inputSchema?.properties ?? {};
  for (const [key, schema] of Object.entries(properties)) {
    if (!schema.description) {
      throw new Error(`${tool.name}.${key}: missing parameter description`);
    }
  }
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL("./stdio.mjs", import.meta.url))],
});
const client = new Client({ name: "catalog-smoke", version: "0.0.0" });
await client.connect(transport);
const listed = await client.listTools();
const listedNames = new Set(listed.tools.map((t) => t.name));
for (const name of names) {
  if (!listedNames.has(name)) throw new Error(`stdio tools/list missing ${name}`);
}
const call = await client.callTool({ name: "list_projects", arguments: {} });
const text = call.content?.find((c) => c.type === "text")?.text ?? "";
if (!text.includes("catalogOnly")) {
  throw new Error("expected catalog-only stub on tools/call");
}
await client.close();
console.log(`ok: ${names.length} catalog tools via stdio`);
