import axios from 'axios'

const api = 'http://localhost:9000'

export const createSaleRecord = async (data: any) => {
  try {
    await axios.post(`${api}/create`, data)
  } catch (error: any) {
    console.log('Create sales API error: ', error.message)
    throw new Error(error.message)
  }
}

export const getSalesRecords = async (mintKey: string) => {
  try {
    const sales = await axios.get(`${api}/get/${mintKey}`)
    return sales
  } catch (error: any) {
    console.log('Get sales API error: ', error.message)
    throw new Error(error.message)
  }
}