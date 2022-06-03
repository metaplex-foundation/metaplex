import axios from 'axios'

const api = 'http://localhost:9000/:9000/profile'

export const addProfileInfo = async (profileInfo: any) => {
  try {
    const res = await axios.post(`${api}/`, profileInfo)
    return res
  } catch (error: any) {
    console.log('Add profile API error: ', error.message)
    throw new Error(error.message)
  }
}

export const getProfile = async (publicKey: string) => {
  try {
    const res = await axios.get(`${api}/${publicKey}`)
    return res.data
  } catch (error: any) {
    console.log('Get profile API error: ', error.response.data.message)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message)
    } else {
      throw new Error(error.message)
    }
  }
}
