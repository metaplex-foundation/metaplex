import axios from 'axios'

// const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000/nft'
const api = `${process.env.NEXT_API_URL}/nft`
// const api = 'http://localhost:9000/nft'

export const getAllListingsByCollection = async (collection: any) => {
  try {
    const res = await axios.get(
      `${api}/collections/${collection}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
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

export const addListing = async (listingInfo: any) => {
  try {
    const res = await axios.post(
      `${api}/listing?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`,
      listingInfo
    )
    return res
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    console.log(error.message)
  }
}

export const getListingByMint = async (mint: any) => {
  try {
    const res = await axios.get(
      `${api}/listing/${mint}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
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

export const addSaleEvent = async (updateOfferInfo: any, saleKey: string) => {
  try {
    const res = await axios.patch(
      `${api}/listing/${saleKey}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`,
      updateOfferInfo
    )
    return res
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    console.log(error.message)
  }
}

export const getNFTGroupedByCollection = async () => {
  try {
    const res = await axios.get(
      `${api}/collections?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
    )
    return res.data
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    console.log(error.message)
  }
}

export const getAllActivitiesForNFT = async (mint: any) => {
  try {
    const res = await axios.get(
      `${api}/sales/${mint}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
    )
    return res.data
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    console.log(error.message)
  }
}

export const getListingsBySeller = async (seller_pubkey: any) => {
  try {
    const res = await axios.get(
      `${api}/listing?seller=${seller_pubkey}&store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
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

export const cancelListing = async (listing_id: string) => {
  try {
    const res = await axios.delete(
      `${api}/listing/${listing_id}?store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
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
