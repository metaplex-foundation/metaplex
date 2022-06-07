import axios from 'axios'

// const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000'
const api = `${process.env.NEXT_API_URL}`


export const createSaleRecord = async (data: any) => {
  try {
    await axios.post(`${api}/create`, data)
  } catch (error: any) {
    console.log('Create sales API error: ', error.message)
    return
  }
}

export const getListingRecords = async (mintKey: string) =>
  axios.get(`${api}/nft/listing/${mintKey}`)

export const getOffersRecords = async (mintKey: string) => axios.get(`${api}/offers/${mintKey}`)

export const getSalesRecords = async (mintKey: string) => axios.get(`${api}/nft/sales/${mintKey}`)
