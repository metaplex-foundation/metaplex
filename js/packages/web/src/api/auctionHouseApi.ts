import axios from 'axios'

const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000/ah'

export const addAuctionHouse = async (auctionHouseInfo: any) => {
  try {
    const res = await axios.post(`${api}/create`, auctionHouseInfo)
    return res
  } catch (error: any) {
    console.log('Add profile API error: ', error.message)
    throw new Error(error.message)
  }
}

export const getAuctionHouse = async (publicKey: string) => {
  try {
    const res = await axios.get(`${api}/get/${publicKey}`)
    return res.data
  } catch (error: any) {
    console.log('Get auctionHouseInfo API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}
