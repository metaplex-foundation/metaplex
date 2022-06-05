import axios from 'axios'

const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000/nft/listing'
// const api = 'http://localhost:9000/nft/listing'

export const getAllListingsByCollection = async (collection: any) => {
  try {
    const res = await axios.get(`${api}/collections/${collection}`)
    return res.data
  } catch (error: any) {
    console.log('Get API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}

export const addListing = async (listingInfo: any) => {
  try {
    const res = await axios.post(`${api}`, listingInfo)
    return res
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    throw new Error(error.message)
  }
}

export const getListingByMint = async (mint: any) => {
  try {
    const res = await axios.get(`${api}/${mint}`)
    return res.data
  } catch (error: any) {
    console.log('Get API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}

export const addSaleEvent = async (updateOfferInfo: any, saleKey: string) => {
  try {
    const res = await axios.patch(`${api}/${saleKey}`, updateOfferInfo)
    return res
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    throw new Error(error.message)
  }
}

export const getNFTGroupedByCollection = async () => {
  try {
    const res = await axios.get(`${api}/collections`)
    return res.data
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    throw new Error(error.message)
  }
}

export const getListingsBySeller = async (seller_pubkey: any) => {
  try {
    const res = await axios.get(`${api}?seller=${seller_pubkey}`)
    return res.data
  } catch (error: any) {
    console.log('Get API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}

export const cancelListing = async (listing_id: string) => {
  try {
    const res = await axios.delete(`${api}/${listing_id}`)
    return res.data
  } catch (error: any) {
    console.log('Delete API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}
