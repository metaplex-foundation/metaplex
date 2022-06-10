import axios from 'axios'

const api = `${process.env.NEXT_API_URL}/help-center`

export const inquire = async (inquire: any) => {
  try {
    const res = await axios.post(`${api}/inquire`, inquire)
    return res
  } catch (error: any) {
    console.log('Add API error: ', error.message)
    console.log(error.message)
  }
}