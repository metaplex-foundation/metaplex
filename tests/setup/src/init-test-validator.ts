import { execSync as exec, spawn } from "child_process";
import { strict as assert } from "assert";
import { prepareConfig } from "./prepare-config";
import { logError, logInfo, logDebug, logTrace, ledgerDir } from "./utils";
import path from "path";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const rustDir = path.join(projectRoot, "rust");
const localDeployDir = path.join(rustDir, "target", "deploy");
const solanaConfigPath = path.join(
  __dirname,
  "..",
  "config",
  "solana-validator.yml"
);

const TEST_CREATOR = "2noq8fVotDZm55ZRb7upVgKSXC5E4RH2hEHcRtNpPjGM";
const STORE_OWNER = "A15Y2eoMNGeX4516TYTaaMErwabCrf9AB9mrzFohdQJz";
const CREATOR_ALICE = "GaVtHDjxYeAThQjgrLPJ88sKCm9P9KC9ixJppzCVzZJ";
const CREATOR_BOB = "4xa5SRzvEBr5z1rd9WNNXjRx1oDfkNob1coy1hUk4kyy";

function localDeployPath(programName: string) {
  return path.join(localDeployDir, `${programName}.so`);
}

const programs: Record<string, string> = {
  metadata: localDeployPath("metaplex_token_metadata"),
  vault: localDeployPath("metaplex_token_vault"),
  auction: localDeployPath("metaplex_auction"),
  metaplex: localDeployPath("metaplex"),
};

const programIds = {
  metadata: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  vault: "vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn",
  auction: "auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8",
  metaplex: "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98",
};

async function main() {
  logInfo("Preparing config");
  prepareConfig();

  try {
    exec("pkill solana-test-validator");
    logInfo("Killed currently running solana-test-validator");
    await sleep(1000);
  } catch (err) {}

  const args = ["-C", solanaConfigPath, "-r", "--ledger", ledgerDir];
  Object.entries(programIds).forEach(([label, id]) => {
    const programFile = programs[label];
    args.push("--bpf-program");
    args.push(id);
    args.push(programFile);
  });

  const cmd = `solana-test-validator ${args.join(" \\\n  ")}`;
  logTrace(cmd);
  const child = spawn("solana-test-validator", args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  logInfo(
    "+++ Spawned new solana-test-validator with programs predeployed and ledger at %s",
    ledgerDir
  );

  await sleep(2000);

  // -----------------
  // Test Creator
  // -----------------

  const key = exec(`solana-keygen -C ${solanaConfigPath} pubkey`)
    .toString()
    .trim();
  logInfo(`Account Pubkey is ${key}`);
  assert.equal(key, TEST_CREATOR, "configured key should be test creator");

  const keypair = exec(
    `solana -C ${solanaConfigPath} config get keypair`
  ).toString();
  logInfo(`Test Creator ${keypair}`);

  const testCreator = exec(`solana -C ${solanaConfigPath} account ${key}`);
  logDebug(`Test Creator Account Info ${testCreator}`);

  // -----------------
  // Store Owner
  // -----------------
  logInfo("Funding the Store Owner");
  exec(
    `solana transfer -C ${solanaConfigPath} --allow-unfunded-recipient ${STORE_OWNER} 2000`
  );
  const storeOwner = exec(
    `solana -C ${solanaConfigPath} account ${STORE_OWNER}`
  );
  logDebug(`Store Owner Account Info ${storeOwner}`);

  logInfo("Funding the Creator Alice");
  exec(
    `solana transfer -C ${solanaConfigPath} --allow-unfunded-recipient ${CREATOR_ALICE} 20`
  );
  const creatorAlice = exec(
    `solana -C ${solanaConfigPath} account ${CREATOR_ALICE}`
  );
  logDebug(`Creator Alice Account Info ${creatorAlice}`);

  logInfo("Funding the Creator Bob");
  exec(
    `solana transfer -C ${solanaConfigPath} --allow-unfunded-recipient ${CREATOR_BOB} 20`
  );
  const creatorBob = exec(
    `solana -C ${solanaConfigPath} account ${CREATOR_BOB}`
  );
  logDebug(`Creator Bob Account Info ${creatorBob}`);

  logInfo("Done");
  logDebug(
    "\nAdd Store Owner wallet by adding private key to Phantom Browser Extension"
  );
  logDebug(
    `Obtain private key via: cat ${path.relative(
      process.cwd(),
      require.resolve("../keypairs/store-owner-keypair.json")
    )}`
  );

  logInfo("You can now run the cypress tests.");
  logDebug(
    'Alternatively you can manually test with the main store owner by running "yarn start" and then opening:'
  );
  logDebug(`http://localhost:3000/?network=localhost&store=${STORE_OWNER}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logError(err);
    if (err.stderr != null) {
      logError(err.stderr.toString());
    }
    process.exit(1);
  });
