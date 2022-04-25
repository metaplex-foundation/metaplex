import { AccountInfo, Keypair, PublicKey } from '@solana/web3.js';
import { AuctionHouse, AuctionHouseArgs } from 'src/generated';
import test from 'tape';
import spok from 'spok';

function quickKeypair(): [PublicKey, Uint8Array] {
  const kp = Keypair.generate();
  return [kp.publicKey, kp.secretKey];
}

test('account auction-house: round trip serilization', async (t) => {
  const [creator] = quickKeypair();
  const [auctionHouseTreasury] = quickKeypair();
  const [treasuryWithdrawalDestination] = quickKeypair();
  const [feeWithdrawalDestination] = quickKeypair();
  const [treasuryMint] = quickKeypair();

  const args: AuctionHouseArgs = {
    auctionHouseFeeAccount: creator,
    auctionHouseTreasury,
    treasuryWithdrawalDestination,
    feeWithdrawalDestination,
    treasuryMint,
    authority: creator,
    creator,
    bump: 0,
    treasuryBump: 1,
    feePayerBump: 2,
    sellerFeeBasisPoints: 3,
    requiresSignOff: false,
    canChangeSalePrice: true,
  };

  const expected = AuctionHouse.fromArgs(args);
  const [data] = expected.serialize();

  const info: AccountInfo<Buffer> = {
    executable: false,
    data,
    owner: creator,
    lamports: 1000,
  };

  const actual = AuctionHouse.fromAccountInfo(info)[0];
  spok(t, actual, expected);
});
