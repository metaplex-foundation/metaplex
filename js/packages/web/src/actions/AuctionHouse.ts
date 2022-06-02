import {
  initMarketplaceSDK,
  AuctionHouse,
  Nft,
  NftOwnerWallet,
  Listing,
  Offer,
  MakeOfferParams,
  AcceptOfferParams,
  PostListingParams,
  CancelListingParams,
  BuyListingParams,
  CancelOfferParams,
} from '@holaplex/marketplace-js-sdk'
import { AuctionHouseProgram } from '@holaplex/mpl-auction-house'
import {
  createCancelBidReceiptInstruction,
  createCancelInstruction,
  createCancelListingReceiptInstruction,
  createDepositInstruction,
  createExecuteSaleInstruction,
  createPrintBidReceiptInstruction,
  createPrintListingReceiptInstruction,
  createPrintPurchaseReceiptInstruction,
  createPublicBuyInstruction,
  createSellInstruction,
  createWithdrawInstruction,
} from '@holaplex/mpl-auction-house/dist/src/generated/instructions'
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import { getAuctionHouse } from '../api'
import { addListing, getAllListingsByCollection, getListingByMint } from '../api/ahListingApi'
import { addOffer, updateOffer } from '../api/ahOffersApi'

export function listAuctionHouseNFT(connection: Connection, wallet: any): any {
  const sdk = initMarketplaceSDK(connection, wallet as any)

  const getAH = async () => {
    // let ah = await getAuctionHouse(process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS as string)
    //let ah = await getAuctionHouse('Da84ovDiz8rVAaLVw8b2JZ7qcP75cBXPTbtLq5ey4Po6')
    // ah = ah[0]
    // const auctionHouse: AuctionHouse = {
    //   address: ah.auction_house_wallet,
    //   treasuryMint: ah.mint,
    //   auctionHouseTreasury: ah.treasury_wallet,
    //   treasuryWithdrawalDestination: ah.creator_wallet,
    //   feeWithdrawalDestination: ah.creator_wallet,
    //   authority: ah.creator_wallet,
    //   creator: ah.creator_wallet,
    //   auctionHouseFeeAccount: ah.fee_payer_wallet,
    // }
    // For testing
    const auctionHouse: AuctionHouse = {
      address: '5RBV8e6zWkTekobvjnAWUQQKHk8PgyCV8tBt8p2Lb1Ak',
      treasuryMint: 'So11111111111111111111111111111111111111112',
      auctionHouseTreasury: '85FN2jMypCfcsNgJXZ1YoWoPvLa7idQ23Z3Ke5Ev2X5t',
      treasuryWithdrawalDestination: 'GoWy6NSsJuUhVg15ZQ11Ye4exnwYpGsQmiP9Eh5KWZUA',
      feeWithdrawalDestination: 'GoWy6NSsJuUhVg15ZQ11Ye4exnwYpGsQmiP9Eh5KWZUA',
      authority: 'Da84ovDiz8rVAaLVw8b2JZ7qcP75cBXPTbtLq5ey4Po6',
      creator: 'Da84ovDiz8rVAaLVw8b2JZ7qcP75cBXPTbtLq5ey4Po6',
      auctionHouseFeeAccount: 'r31oFdcGe7XSAoQb7uhfKu7Q3brVfRRxTykYZ81pA7J',
    }

    return auctionHouse
  }

  const getNFT = (nftmeta: any) => {
    debugger
    const seller: NftOwnerWallet = {
      address: wallet.publicKey?.toBase58() as string,
      associatedTokenAccountAddress: nftmeta.holding,
    }

    const nft: Nft = {
      name: nftmeta.metadata.info.data.name,
      address: nftmeta.metadata.pubkey,
      mintAddress: nftmeta.mintKey,
      creators: nftmeta.metadata.info.data.creators,
      owner: seller,
    }

    return nft
  }

  const getNFTOffer = (nftmeta: any) => {
    debugger
    const seller: NftOwnerWallet = {
      address: nftmeta.seller_wallet,
      associatedTokenAccountAddress: nftmeta.metadata.holding,
    }

    const nft: Nft = {
      name: nftmeta.metadata.info.data.name,
      address: nftmeta.metadata.pubkey,
      mintAddress: nftmeta.mint,
      creators: nftmeta.metadata.info.data.creators,
      owner: seller,
    }

    return nft
  }

  const onSell = async (amount: number, nftmetadata: any) => {
    const nft = getNFT(nftmetadata)
    const auctionHouse = await getAH()
    if (amount && nft) {
      await sdk.listings(auctionHouse).post({ amount: amount, nft })
    }
    debugger
    nftmetadata.metadata['holding'] = nftmetadata.holding
    const listing = await addListing({
      mint: nft.mintAddress,
      auction_house_wallet: auctionHouse.address,
      seller_wallet: nft.owner.address,
      sale_price: amount,
      collection: nftmetadata.metadata.info.collection?.key,
      nft_name: nftmetadata.metadata.info.data.name,
      metadata: nftmetadata.metadata,
      url: nftmetadata.metadata.info.data.uri,
    })
    return listing
  }

  const getAllAuctionHouseNFTsByCollection = async (collection: any) => {
    const nfts = await getAllListingsByCollection(collection)
    return nfts
  }

  const getNFTbyMint = async (mint: string) => {
    return await getListingByMint(mint)
  }

  const onMakeOffer = async (amount: number, nftmetadata: any) => {
    debugger
    const nft = getNFTOffer(nftmetadata)
    const auctionHouse = await getAH()
    const lmpAmount = amount
    if (amount && nft) {
      const a = await sdk.offers(auctionHouse)
      // await sdk.offers(auctionHouse).make({ amount: lmpAmount, nft })
      await make({ amount: lmpAmount, nft })
    }

    const offer = addOffer({
      mint: nft.mintAddress,
      auction_house_wallet: auctionHouse.address,
      seller_wallet: nft.owner.address,
      buyer_wallet: wallet.publicKey?.toBase58(),
      offer_price: amount,
      collection: nftmetadata.metadata.info.collection?.key,
    })

    return offer
  }

  const onAcceptOffer = async (nftmetadata: any, offer: any) => {
    const auctionHouse = await getAH()
    const nft = getNFTOffer(nftmetadata)
    const lampAmount = offer.offer_price * LAMPORTS_PER_SOL
    const ahOffer: Offer = {
      address: 'DAehDt9nZCnYGsoJsddsJbZfTiqBP7g6GF9VPy3bjgud',
      buyer: offer.buyer_wallet,
      price: new BN(lampAmount),
      createdAt: '',
      auctionHouse: auctionHouse.address,
      tradeState: '',
    }
    debugger
    await sdk.offers(auctionHouse).accept({
      nft: nft,
      offer: ahOffer,
    })
    debugger
    const updatedOffer = updateOffer(
      {
        offer_id: offer.id,
        tnx_sol_amount: offer.offer_price,
        // tnx_usd_amount: offer.tnx_usd_amount,
      },
      offer.id
    )
    debugger
    return updatedOffer
  }

  const onBuy = async (nftmetadata: any) => {
    const auctionHouse = await getAH()
    const nft = getNFT(nftmetadata)

    await sdk.listings(auctionHouse).buy({
      nft: nft,
      listing: {} as any,
    })
  }

  const con = connection

  // Make offer
  const make = async ({ amount, nft }: MakeOfferParams) => {
    const { publicKey, signTransaction } = wallet
    const connection = con
    const ah = await getAH()
    const buyerPrice = amount
    const auctionHouse = new PublicKey(ah.address)
    const authority = new PublicKey(ah.authority)
    const auctionHouseFeeAccount = new PublicKey(ah.auctionHouseFeeAccount)
    const treasuryMint = new PublicKey(ah.treasuryMint)
    const tokenMint = new PublicKey(nft.mintAddress)
    const tokenAccount = new PublicKey(nft.owner.associatedTokenAccountAddress)
    const metadata = new PublicKey(nft.address)

    const [escrowPaymentAccount, escrowPaymentBump] =
      await AuctionHouseProgram.findEscrowPaymentAccountAddress(auctionHouse, publicKey)

    const [buyerTradeState, tradeStateBump] =
      await AuctionHouseProgram.findPublicBidTradeStateAddress(
        publicKey,
        auctionHouse,
        treasuryMint,
        tokenMint,
        buyerPrice,
        1
      )

    const txt = new Transaction()

    const depositInstructionAccounts = {
      wallet: publicKey,
      paymentAccount: publicKey,
      transferAuthority: publicKey,
      treasuryMint,
      escrowPaymentAccount,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
    }
    const depositInstructionArgs = {
      escrowPaymentBump,
      amount: buyerPrice,
    }

    const depositInstruction = createDepositInstruction(
      depositInstructionAccounts,
      depositInstructionArgs
    )

    const publicBuyInstruction = createPublicBuyInstruction(
      {
        wallet: publicKey,
        paymentAccount: publicKey,
        transferAuthority: publicKey,
        treasuryMint,
        tokenAccount,
        metadata,
        escrowPaymentAccount,
        authority,
        auctionHouse,
        auctionHouseFeeAccount,
        buyerTradeState,
      },
      {
        escrowPaymentBump,
        tradeStateBump,
        tokenSize: 1,
        buyerPrice,
      }
    )

    const [receipt, receiptBump] = await AuctionHouseProgram.findBidReceiptAddress(buyerTradeState)

    const printBidReceiptInstruction = createPrintBidReceiptInstruction(
      {
        receipt,
        bookkeeper: publicKey,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      {
        receiptBump,
      }
    )

    txt.add(depositInstruction).add(publicBuyInstruction).add(printBidReceiptInstruction)

    txt.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    txt.feePayer = publicKey

    const signed = await signTransaction(txt)

    const signature = await connection.sendRawTransaction(signed.serialize())

    await connection.confirmTransaction(signature, 'confirmed')

    return {
      receipt,
      signature,
      buyerTradeState,
    }
  }

  //Accept Offer
  const accept = async ({ offer, nft, cancel }: AcceptOfferParams) => {
    const { publicKey, signTransaction } = wallet
    const connection = con
    const ah = await getAH()

    const auctionHouse = new PublicKey(ah.address)
    const authority = new PublicKey(ah.authority)
    const auctionHouseFeeAccount = new PublicKey(ah.auctionHouseFeeAccount)
    const tokenMint = new PublicKey(nft.mintAddress)
    const treasuryMint = new PublicKey(ah.treasuryMint)
    const auctionHouseTreasury = new PublicKey(ah.auctionHouseTreasury)
    const tokenAccount = new PublicKey(nft.owner.associatedTokenAccountAddress)
    const bidReceipt = new PublicKey(offer.address)
    const buyerPubkey = new PublicKey(offer.buyer)
    const metadata = new PublicKey(nft.address)

    const [sellerTradeState, sellerTradeStateBump] =
      await AuctionHouseProgram.findTradeStateAddress(
        publicKey,
        auctionHouse,
        tokenAccount,
        treasuryMint,
        tokenMint,
        offer.price.toNumber(),
        1
      )

    const [buyerTradeState] = await AuctionHouseProgram.findPublicBidTradeStateAddress(
      buyerPubkey,
      auctionHouse,
      treasuryMint,
      tokenMint,
      offer.price.toNumber(),
      1
    )

    const [purchaseReceipt, purchaseReceiptBump] =
      await AuctionHouseProgram.findPurchaseReceiptAddress(sellerTradeState, buyerTradeState)

    const [escrowPaymentAccount, escrowPaymentBump] =
      await AuctionHouseProgram.findEscrowPaymentAccountAddress(auctionHouse, buyerPubkey)

    const [programAsSigner, programAsSignerBump] =
      await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()

    const [freeTradeState, freeTradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      tokenAccount,
      treasuryMint,
      tokenMint,
      0,
      1
    )

    const [buyerReceiptTokenAccount] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      buyerPubkey
    )

    const [listingReceipt, listingReceiptBump] =
      await AuctionHouseProgram.findListingReceiptAddress(sellerTradeState)

    const sellInstructionAccounts = {
      wallet: publicKey,
      tokenAccount,
      metadata,
      authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      sellerTradeState: sellerTradeState,
      freeSellerTradeState: freeTradeState,
      programAsSigner: programAsSigner,
    }

    const sellInstructionArgs = {
      tradeStateBump: sellerTradeStateBump,
      freeTradeStateBump: freeTradeStateBump,
      programAsSignerBump: programAsSignerBump,
      buyerPrice: offer.price,
      tokenSize: 1,
    }

    const printListingReceiptInstructionAccounts = {
      receipt: listingReceipt,
      bookkeeper: publicKey,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const printListingReceiptInstructionArgs = {
      receiptBump: listingReceiptBump,
    }

    const executeSaleInstructionAccounts = {
      buyer: buyerPubkey,
      seller: publicKey,
      auctionHouse,
      tokenAccount,
      tokenMint,
      treasuryMint,
      metadata,
      authority,
      sellerTradeState,
      buyerTradeState,
      freeTradeState,
      sellerPaymentReceiptAccount: publicKey,
      escrowPaymentAccount,
      buyerReceiptTokenAccount,
      auctionHouseFeeAccount,
      auctionHouseTreasury,
      programAsSigner,
    }
    const executeSaleInstructionArgs = {
      escrowPaymentBump,
      freeTradeStateBump,
      programAsSignerBump,
      buyerPrice: offer.price,
      tokenSize: 1,
    }
    const executePrintPurchaseReceiptInstructionAccounts = {
      purchaseReceipt,
      listingReceipt,
      bidReceipt,
      bookkeeper: publicKey,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const executePrintPurchaseReceiptInstructionArgs = {
      purchaseReceiptBump: purchaseReceiptBump,
    }

    const createListingInstruction = createSellInstruction(
      sellInstructionAccounts,
      sellInstructionArgs
    )
    const createPrintListingInstruction = createPrintListingReceiptInstruction(
      printListingReceiptInstructionAccounts,
      printListingReceiptInstructionArgs
    )
    const executeSaleInstruction = createExecuteSaleInstruction(
      executeSaleInstructionAccounts,
      executeSaleInstructionArgs
    )
    const executePrintPurchaseReceiptInstruction = createPrintPurchaseReceiptInstruction(
      executePrintPurchaseReceiptInstructionAccounts,
      executePrintPurchaseReceiptInstructionArgs
    )

    const txt = new Transaction()

    txt
      .add(createListingInstruction)
      .add(createPrintListingInstruction)
      .add(
        new TransactionInstruction({
          programId: AuctionHouseProgram.PUBKEY,
          data: executeSaleInstruction.data,
          keys: executeSaleInstruction.keys.concat(
            nft.creators.map((creator: any) => ({
              pubkey: new PublicKey(creator.address),
              isSigner: false,
              isWritable: true,
            }))
          ),
        })
      )
      .add(executePrintPurchaseReceiptInstruction)

    if (cancel) {
      cancel.forEach(listing => {
        const cancelInstructionAccounts = {
          wallet: publicKey,
          tokenAccount,
          tokenMint,
          authority,
          auctionHouse,
          auctionHouseFeeAccount,
          tradeState: new PublicKey(listing.tradeState),
        }
        const cancelListingInstructionArgs = {
          buyerPrice: listing.price,
          tokenSize: 1,
        }

        const cancelListingReceiptAccounts = {
          receipt: new PublicKey(listing.address),
          instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
        }

        const cancelListingInstruction = createCancelInstruction(
          cancelInstructionAccounts,
          cancelListingInstructionArgs
        )

        const cancelListingReceiptInstruction = createCancelListingReceiptInstruction(
          cancelListingReceiptAccounts
        )

        txt.add(cancelListingInstruction).add(cancelListingReceiptInstruction)
      })
    }

    txt.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    txt.feePayer = publicKey

    const signed = await signTransaction(txt)

    const signature = await connection.sendRawTransaction(signed.serialize())

    await connection.confirmTransaction(signature, 'confirmed')
  }

  // Add a listing
  const post = async ({ amount, nft }: PostListingParams): Promise<any> => {
    const { publicKey, signTransaction } = wallet
    const connection = con
    const ah = await getAH()

    const buyerPrice = amount
    const auctionHouse = new PublicKey(ah.address)
    const authority = new PublicKey(ah.authority)
    const auctionHouseFeeAccount = new PublicKey(ah.auctionHouseFeeAccount)
    const treasuryMint = new PublicKey(ah.treasuryMint)
    const tokenMint = new PublicKey(nft.mintAddress)
    const metadata = new PublicKey(nft.address)

    const associatedTokenAccount = new PublicKey(nft.owner.associatedTokenAccountAddress)

    const [sellerTradeState, tradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      associatedTokenAccount,
      treasuryMint,
      tokenMint,
      buyerPrice,
      1
    )

    const [programAsSigner, programAsSignerBump] =
      await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()

    const [freeTradeState, freeTradeBump] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      associatedTokenAccount,
      treasuryMint,
      tokenMint,
      0,
      1
    )

    const txt = new Transaction()

    const sellInstructionArgs = {
      tradeStateBump,
      freeTradeStateBump: freeTradeBump,
      programAsSignerBump: programAsSignerBump,
      buyerPrice,
      tokenSize: 1,
    }

    const sellInstructionAccounts = {
      wallet: publicKey,
      tokenAccount: associatedTokenAccount,
      metadata: metadata,
      authority: authority,
      auctionHouse: auctionHouse,
      auctionHouseFeeAccount: auctionHouseFeeAccount,
      sellerTradeState: sellerTradeState,
      freeSellerTradeState: freeTradeState,
      programAsSigner: programAsSigner,
    }

    const sellInstruction = createSellInstruction(sellInstructionAccounts, sellInstructionArgs)

    const [receipt, receiptBump] = await AuctionHouseProgram.findListingReceiptAddress(
      sellerTradeState
    )

    const printListingReceiptInstruction = createPrintListingReceiptInstruction(
      {
        receipt,
        bookkeeper: publicKey,
        instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      {
        receiptBump,
      }
    )

    txt.add(sellInstruction).add(printListingReceiptInstruction)

    txt.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    txt.feePayer = publicKey

    const signed = await signTransaction(txt)

    const signature = await connection.sendRawTransaction(signed.serialize())

    await connection.confirmTransaction(signature, 'confirmed')
  }

  //Cancel list
  const cancel = async ({ listing, nft }: CancelListingParams) => {
    const { publicKey, signTransaction } = wallet
    const connection = con
    const ah = await getAH()

    const auctionHouse = new PublicKey(ah.address)
    const authority = new PublicKey(ah.authority)
    const auctionHouseFeeAccount = new PublicKey(ah.auctionHouseFeeAccount)
    const tokenMint = new PublicKey(nft.mintAddress)
    const treasuryMint = new PublicKey(ah.treasuryMint)
    const receipt = new PublicKey(listing.address)
    const tokenAccount = new PublicKey(nft.owner.associatedTokenAccountAddress)

    const buyerPrice = listing.price.toNumber()

    const [tradeState] = await AuctionHouseProgram.findTradeStateAddress(
      publicKey,
      auctionHouse,
      tokenAccount,
      treasuryMint,
      tokenMint,
      buyerPrice,
      1
    )

    const cancelInstructionAccounts = {
      wallet: publicKey,
      tokenAccount,
      tokenMint,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      tradeState,
    }
    const cancelInstructionArgs = {
      buyerPrice,
      tokenSize: 1,
    }

    const cancelListingReceiptAccounts = {
      receipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const cancelInstruction = createCancelInstruction(
      cancelInstructionAccounts,
      cancelInstructionArgs
    )
    const cancelListingReceiptInstruction = createCancelListingReceiptInstruction(
      cancelListingReceiptAccounts
    )

    const txt = new Transaction()

    txt.add(cancelInstruction).add(cancelListingReceiptInstruction)

    txt.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    txt.feePayer = publicKey
    const signed = await signTransaction(txt)

    const signature = await connection.sendRawTransaction(signed.serialize())

    await connection.confirmTransaction(signature, 'confirmed')
  }

  //Buy NFT
  const buy = async ({ listing, nft }: BuyListingParams) => {
    const { publicKey, signTransaction } = wallet
    const connection = con
    const ah = await getAH()

    const auctionHouse = new PublicKey(ah.address)
    const authority = new PublicKey(ah.authority)
    const auctionHouseFeeAccount = new PublicKey(ah.auctionHouseFeeAccount)
    const treasuryMint = new PublicKey(ah.treasuryMint)
    const seller = new PublicKey(listing.seller)
    const tokenMint = new PublicKey(nft.mintAddress)
    const auctionHouseTreasury = new PublicKey(ah.auctionHouseTreasury)
    const listingReceipt = new PublicKey(listing.address)
    const sellerPaymentReceiptAccount = new PublicKey(listing.seller)
    const sellerTradeState = new PublicKey(listing.tradeState)
    const buyerPrice = listing.price.toNumber()
    const tokenAccount = new PublicKey(nft.owner.associatedTokenAccountAddress)
    const metadata = new PublicKey(nft.address)

    const [escrowPaymentAccount, escrowPaymentBump] =
      await AuctionHouseProgram.findEscrowPaymentAccountAddress(auctionHouse, publicKey)

    const [buyerTradeState, tradeStateBump] =
      await AuctionHouseProgram.findPublicBidTradeStateAddress(
        publicKey,
        auctionHouse,
        treasuryMint,
        tokenMint,
        buyerPrice,
        1
      )
    const [freeTradeState, freeTradeStateBump] = await AuctionHouseProgram.findTradeStateAddress(
      seller,
      auctionHouse,
      tokenAccount,
      treasuryMint,
      tokenMint,
      0,
      1
    )
    const [programAsSigner, programAsSignerBump] =
      await AuctionHouseProgram.findAuctionHouseProgramAsSignerAddress()
    const [buyerReceiptTokenAccount] = await AuctionHouseProgram.findAssociatedTokenAccountAddress(
      tokenMint,
      publicKey
    )

    const [bidReceipt, bidReceiptBump] = await AuctionHouseProgram.findBidReceiptAddress(
      buyerTradeState
    )
    const [purchaseReceipt, purchaseReceiptBump] =
      await AuctionHouseProgram.findPurchaseReceiptAddress(sellerTradeState, buyerTradeState)

    const publicBuyInstructionAccounts = {
      wallet: publicKey,
      paymentAccount: publicKey,
      transferAuthority: publicKey,
      treasuryMint,
      tokenAccount,
      metadata,
      escrowPaymentAccount,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      buyerTradeState,
    }
    const publicBuyInstructionArgs = {
      tradeStateBump,
      escrowPaymentBump,
      buyerPrice,
      tokenSize: 1,
    }

    const executeSaleInstructionAccounts = {
      buyer: publicKey,
      seller,
      tokenAccount,
      tokenMint,
      metadata,
      treasuryMint,
      escrowPaymentAccount,
      sellerPaymentReceiptAccount,
      buyerReceiptTokenAccount,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      auctionHouseTreasury,
      buyerTradeState,
      sellerTradeState,
      freeTradeState,
      programAsSigner,
    }

    const executeSaleInstructionArgs = {
      escrowPaymentBump,
      freeTradeStateBump,
      programAsSignerBump,
      buyerPrice,
      tokenSize: 1,
    }

    const printBidReceiptAccounts = {
      bookkeeper: publicKey,
      receipt: bidReceipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }
    const printBidReceiptArgs = {
      receiptBump: bidReceiptBump,
    }

    const printPurchaseReceiptAccounts = {
      bookkeeper: publicKey,
      purchaseReceipt,
      bidReceipt,
      listingReceipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }
    const printPurchaseReceiptArgs = {
      purchaseReceiptBump,
    }

    const publicBuyInstruction = createPublicBuyInstruction(
      publicBuyInstructionAccounts,
      publicBuyInstructionArgs
    )
    const printBidReceiptInstruction = createPrintBidReceiptInstruction(
      printBidReceiptAccounts,
      printBidReceiptArgs
    )
    const executeSaleInstruction = createExecuteSaleInstruction(
      executeSaleInstructionAccounts,
      executeSaleInstructionArgs
    )
    const printPurchaseReceiptInstruction = createPrintPurchaseReceiptInstruction(
      printPurchaseReceiptAccounts,
      printPurchaseReceiptArgs
    )

    const txt = new Transaction()

    txt
      .add(publicBuyInstruction)
      .add(printBidReceiptInstruction)
      .add(
        new TransactionInstruction({
          programId: AuctionHouseProgram.PUBKEY,
          data: executeSaleInstruction.data,
          keys: executeSaleInstruction.keys.concat(
            nft.creators.map((creator: any) => ({
              pubkey: new PublicKey(creator.address),
              isSigner: false,
              isWritable: true,
            }))
          ),
        })
      )
      .add(printPurchaseReceiptInstruction)

    txt.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    txt.feePayer = publicKey

    const signed = await signTransaction(txt)

    const signature = await connection.sendRawTransaction(signed.serialize())

    await connection.confirmTransaction(signature, 'confirmed')
  }

  // Cancel offer

  const cancelOffer = async ({ nft, offer }: CancelOfferParams) => {
    const { publicKey, signTransaction } = wallet
    const connection = con
    const ah = await getAH()

    const auctionHouse = new PublicKey(ah.address)
    const authority = new PublicKey(ah.authority)
    const auctionHouseFeeAccount = new PublicKey(ah.auctionHouseFeeAccount)
    const tokenMint = new PublicKey(nft.mintAddress)
    const receipt = new PublicKey(offer.address)
    const buyerPrice = offer.price.toNumber()
    const tradeState = new PublicKey(offer.tradeState)
    const treasuryMint = new PublicKey(ah.treasuryMint)
    const tokenAccount = new PublicKey(nft.owner.associatedTokenAccountAddress)

    const [escrowPaymentAccount, escrowPaymentBump] =
      await AuctionHouseProgram.findEscrowPaymentAccountAddress(auctionHouse, publicKey)

    const txt = new Transaction()

    const cancelInstructionAccounts = {
      wallet: publicKey,
      tokenAccount,
      tokenMint,
      authority,
      auctionHouse,
      auctionHouseFeeAccount,
      tradeState,
    }

    const cancelInstructionArgs = {
      buyerPrice,
      tokenSize: 1,
    }

    const cancelBidReceiptInstructionAccounts = {
      receipt: receipt,
      instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
    }

    const cancelBidInstruction = createCancelInstruction(
      cancelInstructionAccounts,
      cancelInstructionArgs
    )

    const cancelBidReceiptInstruction = createCancelBidReceiptInstruction(
      cancelBidReceiptInstructionAccounts
    )

    const withdrawInstructionAccounts = {
      receiptAccount: publicKey,
      wallet: publicKey,
      escrowPaymentAccount,
      auctionHouse,
      authority,
      treasuryMint,
      auctionHouseFeeAccount,
    }

    const withdrawInstructionArgs = {
      escrowPaymentBump,
      amount: buyerPrice,
    }

    const withdrawInstruction = createWithdrawInstruction(
      withdrawInstructionAccounts,
      withdrawInstructionArgs
    )

    txt.add(cancelBidInstruction).add(cancelBidReceiptInstruction).add(withdrawInstruction)

    txt.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    txt.feePayer = publicKey

    const signed = await signTransaction(txt)

    const signature = await connection.sendRawTransaction(signed.serialize())

    await connection.confirmTransaction(signature, 'confirmed')
  }

  return {
    onSell,
    onMakeOffer,
    getAllAuctionHouseNFTsByCollection,
    onAcceptOffer,
    getNFTbyMint,
  }
}
