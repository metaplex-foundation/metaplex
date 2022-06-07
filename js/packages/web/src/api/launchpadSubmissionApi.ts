import axios from 'axios'

const api = `${process.env.NEXT_API_URL}/launchpad-submission`

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

export const getCollectionHeaderInfo = async (creatorId: any, collectionName: string) => {
  try {
    let modifiedCollectionName
    if (collectionName && /\s/g.test(collectionName)) {
      modifiedCollectionName = collectionName.replace(/\s/g, '%')
    } else {
      modifiedCollectionName = collectionName
    }
    const data = await axios.get(
      `${api}/collection/header/info/${creatorId}/${modifiedCollectionName}`
    )
    return data.data
  } catch (error: any) {
    console.log('Get collection header info API error: ', error.message)
    return null
  }
}

export const getSubmission = async (id: string, name: string) => {
  try {
    const data = await axios.get(`${api}/submission/${id}/${name}`)
    return data.data
  } catch (error: any) {
    console.log('Get submission API error: ', error.message)
    return null
  }
}

export const updateSubmission = async (id: string, submissionData: any) => {
  try {
    const data = await axios.put(`${api}/update/${id}`, submissionData)
    return data.data
  } catch (error: any) {
    console.log('Update submission API error: ', error.message)
    return error.message
  }
}
