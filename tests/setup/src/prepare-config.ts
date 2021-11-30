import fs from "fs";
import path from "path";
import { PUBKEY_TO_LABEL } from "../../common/public-keys";

const keypairPath = require.resolve("../keypairs/test-creator-keypair.json");
const configPath = path.join(__dirname, "..", "config", "solana-validator.yml");
const labels = Object.entries(PUBKEY_TO_LABEL)
  .map(([pubkey, label]: [pubkey: string, label: string]) => {
    return `${pubkey}: ${label}`;
  })
  .join("\n  ");

const config = `---
json_rpc_url: "http://localhost:8899"
websocket_url: ""
keypair_path: ${keypairPath}
address_labels:
  ${labels}
commitment: confirmed
`;

export function prepareConfig() {
  fs.writeFileSync(configPath, config, "utf8");
}

prepareConfig();
