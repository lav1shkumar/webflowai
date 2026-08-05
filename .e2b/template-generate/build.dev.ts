import { Template, defaultBuildLogger } from "e2b";
import { template } from "./template";

async function main() {
  await Template.build(template, "node-container", {
    cpuCount: 1,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);
