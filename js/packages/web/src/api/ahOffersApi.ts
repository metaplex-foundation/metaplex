import axios from 'axios'

// const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000/offers'
const api = `${process.env.NEXT_API_URL}/offers`
// const api = 'http://localhost:9000/offers'

export const addOffer = async (offerInfo: any) => {
  try {
    const res = await axios.post(
      `${api}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`,
      offerInfo
    )
    return res
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    console.log(error.message)
  }
}

export const updateOffer = async (updateOfferInfo: any, offerKey: string) => {
  try {
    const res = await axios.put(
      `${api}/${offerKey}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`,
      updateOfferInfo
    )
    return res
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    console.log(error.message)
  }
}

export const getAllAuctionHouseNFTOffers = async (ah: any) => {
  try {
    const res = await axios.get(`${api}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`)
    return res.data
  } catch (error: any) {
    console.log('Get API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      console.log(error.response.data.message)
    } else {
      console.log(error.message)
    }
  }
}

export const getAuctionHouseNFByMint = async (mint: any) => {
  try {
    const res = await axios.get(
      `${api}/${mint}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
    )
    return res.data
  } catch (error: any) {
    console.log('Get API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      console.log(error.response.data.message)
    } else {
      console.log(error.message)
    }
  }
}

export const getAuctionHouseNFBySeller = async (seller_pubkey: any) => {
  try {
    const res = await axios.get(
      `${api}?seller=${seller_pubkey}&store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
    )
    return res.data
  } catch (error: any) {
    console.log('Get API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      console.log(error.response.data.message)
    } else {
      console.log(error.message)
    }
  }
}

export const cancelOffer = async (offer_id: string) => {
  try {
    const res = await axios.delete(
      `${api}/${offer_id}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
    )
    return res.data
  } catch (error: any) {
    console.log('Delete API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      console.log(error.response.data.message)
    } else {
      console.log(error.message)
    }
  }
}

export const getAuctionHouseNFByBuyer = async (buyer_pubkey: any) => {
  try {
    const res = await axios.get(
      `${api}?buyer=${buyer_pubkey}&store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
    )
    return res.data
  } catch (error: any) {
    console.log('Get API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      console.log(error.response.data.message)
    } else {
      console.log(error.message)
    }
  }
}
