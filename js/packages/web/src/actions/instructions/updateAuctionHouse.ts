import {
  PublicKey,
  PublicKeyInitData,
  TransactionInstruction,
} from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { Wallet } from '@metaplex/js'
import { AuctionHouseProgram } from '@metaplex-foundation/mpl-auction-house'

const { createUpdateAuctionHouseInstruction } = AuctionHouseProgram.instructions

interface UpdateAuctionHouseParams {
  wallet: Wallet
  sellerFeeBasisPoints: number
  canChangeSalePrice?: boolean
  requiresSignOff?: boolean
  treasuryWithdrawalDestination?: PublicKeyInitData
  feeWithdrawalDestination?: PublicKeyInitData
  treasuryMint?: PublicKeyInitData
}

export const updateAuctionHouse = async (
  params: UpdateAuctionHouseParams
): Promise<TransactionInstruction> => {
  const {
    wallet,
    sellerFeeBasisPoints,
    canChangeSalePrice = false,
    requiresSignOff = false,
    treasuryWithdrawalDestination,
    feeWithdrawalDestination,
    treasuryMint,
  } = params

  const twdKey = treasuryWithdrawalDestination
    ? new PublicKey(treasuryWithdrawalDestination)
    : wallet.publicKey

  const fwdKey = feeWithdrawalDestination
    ? new PublicKey(feeWithdrawalDestination)
    : wallet.publicKey

  const tMintKey = treasuryMint ? new PublicKey(treasuryMint) : NATIVE_MINT

  const twdAta = tMintKey.equals(NATIVE_MINT)
    ? twdKey
    : (
        await AuctionHouseProgram.findAssociatedTokenAccountAddress(
          tMintKey,
          twdKey
        )
      )[0]

  const [auctionHouse] = await AuctionHouseProgram.findAuctionHouseAddress(
    wallet.publicKey,
    tMintKey
  )

  return createUpdateAuctionHouseInstruction(
    {
      treasuryMint: tMintKey,
      payer: wallet.publicKey,
      authority: wallet.publicKey,
      newAuthority: wallet.publicKey,
      feeWithdrawalDestination: fwdKey,
      treasuryWithdrawalDestination: twdAta,
      treasuryWithdrawalDestinationOwner: twdKey,
      auctionHouse,
    },
    {
      sellerFeeBasisPoints,
      requiresSignOff,
      canChangeSalePrice,
    }
  )
}
