import {
  AuctionHouse,
  Nft,
  NftOwnerWallet,
  Offer,
  initMarketplaceSDK,
  Listing,
} from '@chathuranga/marketplace-js-sdk'

import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import BN from 'bn.js'
import { getAuctionHouse } from '../api'
import {
  addListing,
  addSaleEvent,
  cancelListing,
  getAllListingsByCollection,
  getListingByMint,
} from '../api/ahListingApi'
import { addOffer, cancelOffer, updateOffer } from '../api/ahOffersApi'

export function listAuctionHouseNFT(connection: Connection, wallet: any): any {
  const sdk = initMarketplaceSDK(connection, wallet as any)

  const getAH = async () => {
    let ah = await getAuctionHouse(process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS as string)

    ah = ah[0]
    const auctionHouse: AuctionHouse = {
      address: ah.auction_house_wallet,
      treasuryMint: ah.mint,
      auctionHouseTreasury: ah.treasury_wallet,
      treasuryWithdrawalDestination: ah.creator_wallet,
      feeWithdrawalDestination: ah.creator_wallet,
      authority: ah.creator_wallet,
      creator: ah.creator_wallet,
      auctionHouseFeeAccount: ah.fee_payer_wallet,
    }
    // // For testing
    // const auctionHouse: AuctionHouse = {
    //   address: '5RBV8e6zWkTekobvjnAWUQQKHk8PgyCV8tBt8p2Lb1Ak',
    //   treasuryMint: 'So11111111111111111111111111111111111111112',
    //   auctionHouseTreasury: '85FN2jMypCfcsNgJXZ1YoWoPvLa7idQ23Z3Ke5Ev2X5t',
    //   treasuryWithdrawalDestination: 'GoWy6NSsJuUhVg15ZQ11Ye4exnwYpGsQmiP9Eh5KWZUA',
    //   feeWithdrawalDestination: 'GoWy6NSsJuUhVg15ZQ11Ye4exnwYpGsQmiP9Eh5KWZUA',
    //   authority: 'Da84ovDiz8rVAaLVw8b2JZ7qcP75cBXPTbtLq5ey4Po6',
    //   creator: 'Da84ovDiz8rVAaLVw8b2JZ7qcP75cBXPTbtLq5ey4Po6',
    //   auctionHouseFeeAccount: 'r31oFdcGe7XSAoQb7uhfKu7Q3brVfRRxTykYZ81pA7J',
    // }

    return auctionHouse
  }

  const getNFT = (nftmeta: any) => {
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
    console.log('nftmeta.metadata.holding', nftmeta.metadata.holding)
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

  const onSell = async (amount: number, nftmetadata: any, extendedData?: any) => {
    const nft = getNFT(nftmetadata)
    const auctionHouse = await getAH()
    if (amount && nft) {
      // await sdk.listings(auctionHouse).post({ amount: amount, nft })
      const res: any = await sdk.listings(auctionHouse).post({ amount: amount, nft })
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
        receipt: res.receipt,
        sellerTradeState: res.sellerTradeState,
        extendedData: extendedData,
      })
      return listing
    }
  }

  const getAllAuctionHouseNFTsByCollection = async (collection: any) => {
    const nfts = await getAllListingsByCollection(collection)
    return nfts
  }

  const getNFTbyMint = async (mint: string) => {
    return await getListingByMint(mint)
  }

  const onMakeOffer = async (amount: number, nftmetadata: any) => {
    const nft = getNFTOffer(nftmetadata)
    const auctionHouse = await getAH()
    const lmpAmount = amount
    if (amount && nft) {
      const res: any = await sdk.offers(auctionHouse).make({ amount: lmpAmount, nft })

      const offer = await addOffer({
        mint: nft.mintAddress,
        auction_house_wallet: auctionHouse.address,
        seller_wallet: nft.owner.address,
        buyer_wallet: wallet.publicKey?.toBase58(),
        offer_price: amount,
        collection: nftmetadata.metadata.info.collection?.key,
        receipt: res.receipt,
        buyerTradeState: res.buyerTradeState,
      })
      return offer
    }
  }

  const onAcceptOffer = async (nftmetadata: any, offer: any) => {
    const auctionHouse = await getAH()
    const nft = getNFTOffer(nftmetadata)
    const lampAmount = offer.offer_price * LAMPORTS_PER_SOL

    const ahOffer: Offer = {
      address: offer.receipt,
      buyer: offer.buyer_wallet,
      price: new BN(lampAmount),
      createdAt: '',
      auctionHouse: auctionHouse.address,
      tradeState: '',
    }

    await sdk.offers(auctionHouse).accept({
      nft: nft,
      offer: ahOffer,
    })

    const updatedOffer = await addSaleEvent(
      {
        offer_id: offer.id,
        tnx_sol_amount: offer.offer_price,
        active: false,
        tnx_usd_amount: offer.tnx_usd_amount,
      },
      nftmetadata.id
    )
    return updatedOffer
  }

  const onBuy = async (nftmetadata: any, listing_: any) => {
    const auctionHouse = await getAH()
    const nft = getNFTOffer(nftmetadata)
    const amount = listing_.sale_price * LAMPORTS_PER_SOL
    const saleList = {
      address: listing_.receipt,
      auctionHouse: auctionHouse.address,
      bookkepper: '',
      seller: listing_.seller_wallet,
      metadata: '',
      purchaseReceipt: '',
      price: new BN(amount),
      tokenSize: 1,
      bump: 0,
      tradeState: listing_.sellerTradeState,
      tradeStateBump: 0,
      createdAt: '',
      canceledAt: '',
    } as Listing
    await sdk.listings(auctionHouse).buy({
      nft: nft,
      listing: saleList,
    })
    const offer: any = await addOffer({
      mint: nft.mintAddress,
      auction_house_wallet: auctionHouse.address,
      seller_wallet: nft.owner.address,
      buyer_wallet: wallet.publicKey?.toBase58(),
      offer_price: nftmetadata.sale_price,
      collection: nftmetadata.metadata.info.collection?.key,
      receipt: '',
    })
    const updatedOffer = await addSaleEvent(
      {
        offer_id: offer.id,
        tnx_sol_amount: offer.offer_price,
        active: false,
        // tnx_usd_amount: offer.tnx_usd_amount,
      },
      nftmetadata.id
    )

    return updatedOffer
  }

  const onCancelListing = async (nftmetadata: any) => {
    const auctionHouse = await getAH()
    const nft = getNFTOffer(nftmetadata)

    const amount = nftmetadata.sale_price * LAMPORTS_PER_SOL
    const saleList = {
      address: nftmetadata.receipt,
      auctionHouse: auctionHouse.address,
      bookkepper: '',
      seller: nftmetadata.seller_wallet,
      metadata: '',
      purchaseReceipt: '',
      price: new BN(amount),
      tokenSize: 1,
      bump: 0,
      tradeState: nftmetadata.sellerTradeState,
      tradeStateBump: 0,
      createdAt: '',
      canceledAt: '',
    } as Listing

    await sdk.listings(auctionHouse).cancel({
      listing: saleList,
      nft: nft,
    })

    const listing = await cancelListing(nftmetadata.id)
    return listing
  }

  const onCancelOffer = async (nftmetadata: any, offer: any) => {
    const auctionHouse = await getAH()
    const nft = getNFTOffer(nftmetadata)

    const lampAmount = offer.offer_price * LAMPORTS_PER_SOL
    const ahOffer: Offer = {
      address: offer.receipt,
      buyer: offer.buyer_wallet,
      price: new BN(lampAmount),
      createdAt: '',
      auctionHouse: auctionHouse.address,
      tradeState: offer.buyerTradeState,
    }

    await sdk.offers(auctionHouse).cancel({
      nft: nft,
      offer: ahOffer,
      amount: offer.offer_price,
    })

    const offer_ = await cancelOffer(offer.id)
    return offer_
  }

  const onWithdrawFromTreasury = async (amount: number = 0) => {
    const auctionHouse = await getAH()
    console.log(auctionHouse)
    await sdk.listings(auctionHouse).withdrawFromTreasury(new BN(amount))
    return true
  }

  return {
    onSell,
    onMakeOffer,
    getAllAuctionHouseNFTsByCollection,
    onAcceptOffer,
    getNFTbyMint,
    onBuy,
    onCancelOffer,
    onCancelListing,
    onWithdrawFromTreasury,
    getAH,
  }
}
