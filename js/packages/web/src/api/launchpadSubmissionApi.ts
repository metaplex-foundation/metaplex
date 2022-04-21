import axios from 'axios'

const api = 'http://ec2-54-166-54-175.compute-1.amazonaws.com:9000/launchpad-submission'

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

export const findByCollectionName = async (name: string) => {
  try {
    const data = await axios.get(`${api}/find/name/${name}`)
    return data
  } catch (error: any) {
    console.log('Find submissions with collection name API error: ', error.message)
    return
  }
}

export const findByMintKey = async (mintKey: string) => {
  try {
    const data = await axios.get(`${api}/find/mint/${mintKey}`)
    return data
  } catch (error: any) {
    console.log('Find submissions with mint key API error: ', error.message)
    return
  }
}
