import { PublicKey, PublicKeyInitData, TransactionInstruction } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { Wallet } from '@metaplex/js'
import { AuctionHouseProgram } from '@holaplex/mpl-auction-house'
import { addAuctionHouse } from '../api/auctionHouseApi'

const { createCreateAuctionHouseInstruction } = AuctionHouseProgram.instructions

interface CreateAuctionHouseParams {
  wallet: Wallet
  sellerFeeBasisPoints: number
  canChangeSalePrice?: boolean
  requiresSignOff?: boolean
  treasuryWithdrawalDestination?: PublicKeyInitData
  feeWithdrawalDestination?: PublicKeyInitData
  treasuryMint?: PublicKeyInitData
}

export const createAuctionHouse = async (
  params: CreateAuctionHouseParams
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
    : (await AuctionHouseProgram.findAssociatedTokenAccountAddress(tMintKey, twdKey))[0]

  const [auctionHouse, bump] = await AuctionHouseProgram.findAuctionHouseAddress(
    wallet.publicKey,
    tMintKey
  )

  const [feeAccount, feePayerBump] = await AuctionHouseProgram.findAuctionHouseFeeAddress(
    auctionHouse
  )

  const [treasuryAccount, treasuryBump] = await AuctionHouseProgram.findAuctionHouseTreasuryAddress(
    auctionHouse
  )

  addAuctionHouse({
    auction_house_wallet: auctionHouse.toBase58(),
    fee_payer_wallet: feeAccount.toBase58(),
    treasury_wallet: treasuryAccount.toBase58(),
    creator_wallet: wallet.publicKey.toBase58(),
    mint: tMintKey.toBase58(),
  }).then((result: any) => {
    console.log(result)
  })

  // Setting the AH to localstorage so that no need to get this via API everytime
  localStorage.setItem('auctionHouse', auctionHouse.toBase58())

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
  )
}
