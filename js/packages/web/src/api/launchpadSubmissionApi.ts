import axios from 'axios'

const api = 'http://localhost:9000/launchpad-submission'

export const getSubmissions = async () => {
  try {
    const submissions = await axios.get(`${api}/get`)
    return submissions
  } catch (error: any) {
    console.log('Get submissions API error: ', error.message)
    return
  }
}

export const statusToApprove = async (id: string) => {
  try {
    await axios.put(`${api}/`, { creatorPublicKey: id })
  } catch (error: any) {
    console.log('Update submissions API error: ', error.message)
    return
  }
}
