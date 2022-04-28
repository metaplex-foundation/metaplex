import axios from 'axios'

const api = 'http://ec2-54-166-54-175.compute-1.amazonaws.com:9000/launchpad-submission'

export const addSubmission = async (data: any) => {
  try {
    const res = await axios.post(`${api}/add`, data)
    return res
  } catch (error: any) {
    console.log('Add submissions API error: ', error.message)
    throw new Error(error.message)
  }
}

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

export const findByMintKey = async (mintKey: string, collectionName: string) => {
  try {
    const data = await axios.get(`${api}/find/mint/${collectionName}/${mintKey}`)
    return data
  } catch (error: any) {
    console.log('Find submissions with mint key API error: ', error.message)
    return
  }
}

export const markAsFeatured = async (id: string) => {
  try {
    const data = await axios.put(`${api}/mark-featured/${id}`)
    return data
  } catch (error: any) {
    console.log('Mark submission as featured API error: ', error.message)
    return
  }
}

export const getFeaturedSubmission = async () => {
  try {
    const data = await axios.get(`${api}/featured`)
    return data.data
  } catch (error: any) {
    console.log('Mark submission as featured API error: ', error.message)
    return null
  }
}
