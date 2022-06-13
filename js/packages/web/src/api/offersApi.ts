import axios from 'axios'

// const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000/offers'
const api = `${process.env.NEXT_API_URL}/offers`

export const getOffers = async (type: string, publicKey: string) => {
  try {
    const res = await axios.get(
      `${api}?${type}=${publicKey}&store=${process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}`
    )
    return res.data
  } catch (error: any) {
    console.log('Get offer API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}
