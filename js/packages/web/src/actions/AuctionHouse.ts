import {
  AuctionHouse,
  Nft,
  NftOwnerWallet,
  Offer,
  initMarketplaceSDK,
} from '@chathuranga/marketplace-js-sdk'

import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import BN from 'bn.js'
import { getAuctionHouse } from '../api'
import {
  addListing,
  addSaleEvent,
  getAllListingsByCollection,
  getListingByMint,
} from '../api/ahListingApi'
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

  const onSell = async (amount: number, nftmetadata: any) => {
    const nft = getNFT(nftmetadata)
    const auctionHouse = await getAH()
    if (amount && nft) {
      // await sdk.listings(auctionHouse).post({ amount: amount, nft })
      const res: any = await sdk.listings(auctionHouse).post({ amount: amount, nft })
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
        receipt: '',
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
      const a = await sdk.offers(auctionHouse)
      // await sdk.offers(auctionHouse).make({ amount: lmpAmount, nft })
      const res: any = await sdk.offers(auctionHouse).make({ amount: lmpAmount, nft })
      debugger
      const offer = addOffer({
        mint: nft.mintAddress,
        auction_house_wallet: auctionHouse.address,
        seller_wallet: nft.owner.address,
        buyer_wallet: wallet.publicKey?.toBase58(),
        offer_price: amount,
        collection: nftmetadata.metadata.info.collection?.key,
        receipt: res,
      })
      alert('offer added')
      return offer
    }
  }

  const onAcceptOffer = async (nftmetadata: any, offer: any) => {
    const auctionHouse = await getAH()
    const nft = getNFTOffer(nftmetadata)
    const lampAmount = offer.offer_price * LAMPORTS_PER_SOL
    debugger
    const ahOffer: Offer = {
      address: offer.receipt,
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
    const updatedOffer = addSaleEvent(
      {
        offer_id: nftmetadata.id,
        tnx_sol_amount: offer.offer_price,
        // tnx_usd_amount: offer.tnx_usd_amount,
      },
      offer.id
    )
    alert('sale happened')
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

  return {
    onSell,
    onMakeOffer,
    getAllAuctionHouseNFTsByCollection,
    onAcceptOffer,
    getNFTbyMint,
  }
}
