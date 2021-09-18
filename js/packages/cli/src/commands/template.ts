import fs from "fs";
import { createConfig, loadAnchorProgram, loadWalletKey } from "../helpers/accounts";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { loadCache, saveCache } from "../helpers/cache";
import log from "loglevel";
import readline from "readline";

export async function initializeTemplatedMetadataConfiguration(templatePath:string, uriTemplate:string, cacheName: string, env: string, keypair: string): Promise<boolean> {
  if (uriTemplate == null) {
    console.warn('Error: the URI template (--uri) is mandatory when generating templated metadatas')
    process.exit(1)
  }
  const savedContent = loadCache(cacheName, env);
  if (savedContent != null) {
    const input = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    await new Promise((resolve) => {
      input.question(`An existing cache (${savedContent.program.uuid}) has been found, confirm overwrite? (y/[n])\n`, function(answer) {
        if (answer == 'y') {
          resolve(null);
        } else {
          process.exit(0)
        }
      })
    });
    input.close()
  }
  
  if (!fs.existsSync(templatePath)) {
    console.warn(`Error: template not found: ${templatePath}`)
    return false
  }
  const templateContent = fs
    .readFileSync(templatePath)
    .toString()
  const manifest = JSON.parse(templateContent);

  if (manifest.name.indexOf('{i}') == -1) {
    console.warn('Warning: your manifest name does not contain an {i} placehoder')
  }
  if (uriTemplate.indexOf('{i}') == -1) {
    console.warn('Warning: your URI template does not contain an {i} placehoder')
  }

  // initialize config
  log.info('initializing new config')
  let cacheContent
  try {
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    const res = await createConfig(anchorProgram, walletKeyPair, true, {
      maxNumberOfLines: new BN(1), // only the template is stored on chain
      symbol: manifest.symbol,
      sellerFeeBasisPoints: manifest.seller_fee_basis_points,
      isMutable: true,
      maxSupply: new BN(0),
      retainAuthority: true,
      isTemplatedMetadata: true,
      creators: manifest.properties.creators.map(creator => {
        return {
          address: new PublicKey(creator.address),
          verified: true,
          share: creator.share,
        };
      })
    });
    cacheContent = {
      program: {
        uuid: res.uuid,
        config: res.config.toBase58()
      },
      isTemplated: true
    };
    log.info(`initialized config for a candy machine with publickey: ${res.config.toBase58()}`)

    await anchorProgram.rpc.addConfigLines(
      0,
      [{
        name: manifest.name,
        uri: uriTemplate
      }],
      {
        accounts: {
          config: res.config,
          authority: walletKeyPair.publicKey,
        },
        signers: [walletKeyPair],
      },
    )

    saveCache(cacheName, env, cacheContent);
  } catch (exx) {
    log.error('Error deploying config to Solana network.', exx);
    throw exx;
  } finally {
    saveCache(cacheName, env, cacheContent);
  }
  console.log(`Done.`);
  return true;
}
