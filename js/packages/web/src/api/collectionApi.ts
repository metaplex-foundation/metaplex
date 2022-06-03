import axios from 'axios'

const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000/:9000'
// const api = 'http://localhost:9000'

export const getCollectionStatistics = async (collection: string) => {
  try {
    const res = await axios.get(`${api}/nft/statistics/${collection}`)
    return res.data
  } catch (error: any) {
    console.log('Get collection statistics API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}

export const getCollectionVolumn = async (collection: string) => {
  try {
    const res = await axios.get(`${api}/nft/total-volumn/${collection}`)
    return res.data
  } catch (error: any) {
    console.log('Get collection statistics API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}
