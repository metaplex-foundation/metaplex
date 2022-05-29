import axios from 'axios'

const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000/offers'

export const addOffer = async (offerInfo: any) => {
  try {
    const res = await axios.post(`${api}`, offerInfo)
    return res
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    throw new Error(error.message)
  }
}

export const getAllAuctionHouseNFTOffers = async (ah: any) => {
  try {
    const res = await axios.get(`${api}`)
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

export const getAuctionHouseNFByMint = async (mint: any) => {
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

export const getAuctionHouseNFBySeller = async (seller_pubkey: any) => {
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

export const getAuctionHouseNFByBuyer = async (buyer_pubkey: any) => {
  try {
    const res = await axios.get(`${api}?buyer=${buyer_pubkey}`)
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
