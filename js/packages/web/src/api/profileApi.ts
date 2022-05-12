import axios from 'axios'

const api = 'http://ec2-18-208-135-190.compute-1.amazonaws.com:9000/profile'

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
    console.log('Get profile API error: ', error.message)
    throw new Error(error.message)
  }
}
