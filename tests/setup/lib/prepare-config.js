#!/usr/bin/env node

// @ts-check
"use strict";

const fs = require("fs");
const { execSync: exec } = require("child_process");
const path = require("path");
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

function prepareConfig() {
  fs.writeFileSync(configPath, config, "utf8");
  exec(
    `solana config -C ${configPath} import-address-labels ${addressLabelsPath}`
  );
}

module.exports = { prepareConfig };
