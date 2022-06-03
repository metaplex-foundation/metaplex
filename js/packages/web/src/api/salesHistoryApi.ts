import axios from 'axios'

const api = 'http://localhost:9000/:9000'

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
