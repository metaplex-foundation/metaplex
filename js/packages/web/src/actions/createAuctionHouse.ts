import { PublicKey, PublicKeyInitData, TransactionInstruction } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { Wallet } from '@metaplex/js';
import { AuctionHouseProgram } from '@holaplex/mpl-auction-house'

const { createCreateAuctionHouseInstruction } = AuctionHouseProgram.instructions;

interface CreateAuctionHouseParams {
  wallet: Wallet;
  sellerFeeBasisPoints: number;
  canChangeSalePrice?: boolean;
  requiresSignOff?: boolean;
  treasuryWithdrawalDestination?: PublicKeyInitData;
  feeWithdrawalDestination?: PublicKeyInitData;
  treasuryMint?: PublicKeyInitData;
}

export const createAuctionHouse = async (params: CreateAuctionHouseParams): Promise<TransactionInstruction> => {
  const {
    wallet,
    sellerFeeBasisPoints,
    canChangeSalePrice = false,
    requiresSignOff = false,
    treasuryWithdrawalDestination,
    feeWithdrawalDestination,
    treasuryMint,
  } = params;

  const twdKey = treasuryWithdrawalDestination
    ? new PublicKey(treasuryWithdrawalDestination)
    : wallet.publicKey;

  const fwdKey = feeWithdrawalDestination
    ? new PublicKey(feeWithdrawalDestination)
    : wallet.publicKey;

  const tMintKey = treasuryMint ? new PublicKey(treasuryMint) : NATIVE_MINT;

  const twdAta = tMintKey.equals(NATIVE_MINT)
    ? twdKey
    : (await AuctionHouseProgram.findAssociatedTokenAccountAddress(tMintKey, twdKey))[0];

  const [auctionHouse, bump] = await AuctionHouseProgram.findAuctionHouseAddress(
    wallet.publicKey,
    tMintKey,
  );

  const [feeAccount, feePayerBump] = await AuctionHouseProgram.findAuctionHouseFeeAddress(auctionHouse);

  const [treasuryAccount, treasuryBump] = await AuctionHouseProgram.findAuctionHouseTreasuryAddress(
    auctionHouse,
  );

  return createCreateAuctionHouseInstruction(
    {
        treasuryMint: tMintKey,
        payer: wallet.publicKey,
        authority: wallet.publicKey,
        feeWithdrawalDestination: fwdKey,
        treasuryWithdrawalDestination: twdAta,
        treasuryWithdrawalDestinationOwner: twdKey,
        auctionHouse,
        auctionHouseFeeAccount: feeAccount,
        auctionHouseTreasury: treasuryAccount,
      },
      {
        bump,
        feePayerBump,
        treasuryBump,
        sellerFeeBasisPoints,
        requiresSignOff,
        canChangeSalePrice,
      }
  );
};