import fs from "fs";
import { execSync as exec } from "child_process";
import path from "path";

const keypairPath = require.resolve("../keypairs/test-creator-keypair.json");
const configPath = path.join(__dirname, "..", "config", "solana-validator.yml");
const addressLabelsPath = path.join(
  __dirname,
  "..",
  "config",
  "address-labels.yml"
);

const config = `---
json_rpc_url: "http://localhost:8899"
websocket_url: ""
keypair_path: ${keypairPath}
commitment: confirmed
`;

export function prepareConfig() {
  fs.writeFileSync(configPath, config, "utf8");
  exec(
    `solana config -C ${configPath} import-address-labels ${addressLabelsPath}`
  );
}
