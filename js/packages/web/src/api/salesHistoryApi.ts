import axios from 'axios'

const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000'

export const createSaleRecord = async (data: any) => {
  try {
    await axios.post(`${api}/create`, data)
  } catch (error: any) {
    console.log('Create sales API error: ', error.message)
    return
  }
}

export const getSalesRecords = async (mintKey: string) => {
  try {
    const sales = await axios.get(`${api}/get/${mintKey}`)
    return sales
  } catch (error: any) {
    console.log('Get sales API error: ', error.message)
    return
  }
}
