import axios from 'axios'

const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000'

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
