import * as fs from 'fs';
import { program } from 'commander';

program
  .option('-c, --config-number <string>')
  .option('-wl, --whitelist-mint <string>')
  .option('-sm, --spl-mint <string>')
  .option('-sa, --spl-account <string>')
  .option('-n, --number <number>')
  .option('-w, --wallet-address <string>');

program.parse();

const {
  configNumber,
  whitelistMint,
  splMint,
  splAccount,
  number,
  walletAddress,
}: {
  configNumber: string;
  whitelistMint: string;
  splMint: string;
  splAccount: string;
  number: string;
  walletAddress: string;
} = program.opts();

const configArray = configNumber.split('');
const nums = configArray.map(s => parseInt(s));

const config = {
  price: 0.2,
  number: parseInt(number),
  gatekeeper: nums[0]
    ? {
        gatekeeperNetwork: 'ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6',
        expireOnUse: !!nums[1],
      }
    : null,
  whitelistMintSettings: nums[2]
    ? {
        mode: nums[3] ? { burnEveryTime: true } : { neverBurn: true },
        mint: whitelistMint,
        presale: true,
        discountPrice: 0.1,
      }
    : null,
  solTreasuryAccount: nums[4] ? null : walletAddress,
  splTokenAccount: nums[4] ? splAccount : null,
  splToken: nums[4] ? splMint : null,
  goLiveDate: '08 Mar 2022 18:04:19 EST',
  endSettings: null,
  hiddenSettings: null,
  storage: 'arweave-sol',
  arweaveJwk: 'null',
  ipfsInfuraProjectId: 'null',
  ipfsInfuraSecret: 'null',
  awsS3Bucket: 'null',
  noRetainAuthority: false,
  noMutable: false,
};

fs.writeFileSync('./new-config.json', JSON.stringify(config, null, 2));
