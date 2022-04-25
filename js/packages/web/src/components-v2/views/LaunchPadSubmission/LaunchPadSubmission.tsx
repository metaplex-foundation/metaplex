import React, { FC, useState } from 'react'
import CN from 'classnames'
import { TextField, TextArea, FileUpload, Button } from '@oyster/common'
import { Select, message, DatePicker, Typography } from 'antd'
import { addSubmission } from '../../../api'

export interface LaunchPadSubmissionProps {
  [x: string]: any
}

const { Text } = Typography
let formDataValidate: any = {}

interface ICategoryProps {
  primaryCategory: string
  secondaryCategory: string
}

export const LaunchPadSubmission: FC<LaunchPadSubmissionProps> = ({
  className,
  ...restProps
}: LaunchPadSubmissionProps) => {
  const LaunchPadSubmissionClasses = CN(`launchpad-submission`, className)
  const { Option } = Select
  const [collectionName, setCollectionName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [currentStage, setCurrentStage] = useState('')
  const [artWorkExample, setArtExample] = useState()
  const [collectionBanner, setCollectionBanner] = useState()
  const [isLegal, setIsLegal] = useState(false)
  const [isDerivative, setIsDerivative] = useState(false)
  const [discordId, setDiscordId] = useState()
  const [email, setEmail] = useState()
  const [projectDescription, setProjectDescription] = useState('')
  const [longTermGoals, setLongTermGoals] = useState()
  const [teamDescription, setTeamDescription] = useState()
  const [experience, setExperience] = useState(false)
  const [twitterLink, setTwitterLink] = useState()
  const [discordServer, setDiscordServer] = useState()
  const [instagramLink, setInstagramLink] = useState()
  const [linkedInProfile, setLinkedInProfile] = useState()
  const [websiteLink, setWebsiteLink] = useState()
  const [otherLink, setOtherLink] = useState()
  const [expectedMintDate, setExpectedMintDate] = useState()
  const [numberOfItemsExpected, setNumberOfItemsExpected] = useState()
  const [isTeamDox, setIsTeamDox] = useState(false)
  const [mintPrice, setMintPrice] = useState()
  const [marketingPackage, setMarketingPackage] = useState()
  const [anything, setAnything] = useState()
  const [creatorPublicKey, setCreatorPublicKey] = useState('')
  const [isFormNotValid, setIsFormNotValid] = useState(false)
  const [categories, setCategories] = useState<ICategoryProps>({
    primaryCategory: '',
    secondaryCategory: '',
  })

  function handleChange(value: any, option?: any) {
    if (option === 'stage' && value === 'completed') {
      setCurrentStage('completed')
    } else {
      setCurrentStage('partially-completed')
    }

    if (option === 'legal' && value === 'yes') {
      setIsLegal(true)
    } else {
      setIsLegal(false)
    }

    if (option === 'is-derivative' && value === 'yes') {
      setIsDerivative(true)
    } else {
      setIsDerivative(false)
    }

    if (option === 'experience' && value === 'yes') {
      setExperience(true)
    } else {
      setExperience(false)
    }

    if (option === 'is-doxed' && value === 'yes') {
      setIsTeamDox(true)
    } else {
      setIsTeamDox(false)
    }

    if (option === 'package') {
      setMarketingPackage(value)
    }

    if (option === 'primary_category') {
      setCategories({
        primaryCategory: value,
        secondaryCategory: categories.secondaryCategory,
      })
    }

    if (option === 'secondary_category') {
      setCategories({
        secondaryCategory: value,
        primaryCategory: categories.primaryCategory,
      })
    }
  }

  function handleDatePicker(_date: any, dateString: any) {
    setExpectedMintDate(dateString)
  }

  function validateForm() {
    const data = {
      collection_name: collectionName && collectionName.trim().length > 0 ? collectionName : null,
      creator_public_key:
        creatorPublicKey && creatorPublicKey.trim().length > 0 ? creatorPublicKey : null,
      art_work: artWorkExample !== undefined ? artWorkExample : null,
      collection_banner: collectionBanner !== undefined ? collectionBanner : null,
      description:
        projectDescription && projectDescription.trim().length > 0 ? projectDescription : null,
    }
    formDataValidate = Object.assign({}, data)
    return true
  }

  function handleFormSubmit(event: any) {
    event.preventDefault()

    const isFormValid = validateForm()

    if (isFormValid) {
      const data = Object.values(formDataValidate).map(key => {
        return key !== null
      })

      if (!data.includes(false) && artWorkExample !== undefined && collectionBanner !== undefined) {
        setIsFormNotValid(false)
        const formData = new FormData()

        const userDetails = {
          collection_name: collectionName,
          creator_name: creatorName,
          creator_public_key: creatorPublicKey,
          current_stage: currentStage,
          is_legal: isLegal,
          is_derivative: isDerivative,
          discord_id: discordId,
          email: email,
          project_description: projectDescription,
          long_trm_goals: longTermGoals,
          team_description: teamDescription,
          experience: experience,
          twitter_link: twitterLink,
          discord_server: discordServer,
          instagram_link: instagramLink,
          linked_in_profile: linkedInProfile,
          website_link: websiteLink,
          other_link: otherLink,
          exp_mint_date: expectedMintDate,
          exp_item_count: numberOfItemsExpected,
          is_team_dox: isTeamDox,
          mint_price: mintPrice,
          marketing_package: marketingPackage,
          other: anything,
          categories: categories,
        }

        formData.append('collection_image', artWorkExample)
        formData.append('collection_banner', collectionBanner)
        formData.append('userDetails', JSON.stringify(userDetails))

        addSubmission(formData)
          .then(() => {
            alert(
              'Your launchpad submission successfully submitted. Click Okay to navigate to the Home screen'
            )
            window.location.href = '/#/'
          })
          .catch((err: any) => {
            alert(err.response.data.message)
          })
      } else {
        setIsFormNotValid(true)
        message.warning('Please check the input fields')
      }
    }
  }

  return (
    <div className={LaunchPadSubmissionClasses} {...restProps}>
      <div className='container pt-[80px] pb-[100px]'>
        <div className='mx-auto mb-[40px] flex w-full max-w-[600px] flex-col'>
          <h1 className='text-display-md font-500'>
            Launchpad: <br />
            Submission Form
          </h1>
        </div>

        <div className='mx-auto flex w-full max-w-[600px] flex-col gap-[40px]'>
          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Collection Name</label>
            <div className='flex-row'>
              <TextField
                className='w-full'
                placeholder='Enter Collection name'
                onChange={event => setCollectionName(event.target.value)}
              />
              {isFormNotValid && collectionName.trim().length <= 0 ? (
                <Text type='danger' style={{ fontSize: 13 }}>
                  Collection name is required
                </Text>
              ) : null}
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Creator Name (if different than Collection Name)
            </label>
            <TextField
              className='w-full'
              placeholder='Enter Collection name'
              onChange={event => setCreatorName(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Creator&apos;s public keys</label>
            <div className='flex-row'>
              <TextField
                className='w-full'
                placeholder='Enter Collection name'
                onChange={event => setCreatorPublicKey(event.target.value)}
              />
              {isFormNotValid && creatorPublicKey.trim().length <= 0 ? (
                <Text type='danger' style={{ fontSize: 13 }}>
                  Creator&apos;s public keys is required
                </Text>
              ) : null}
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              How would you best describe the current stage of your project artwork?
            </label>
            <div className='flex w-full'>
              <Select
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select an option'
                dropdownClassName=''
                onChange={value => handleChange(value, 'stage')}>
                <Option value='completed'>Completed</Option>
                <Option value='partially-completed'>Partially Completed</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Please upload an example of your artwork
            </label>
            <div className='flex-row'>
              <FileUpload
                onChange={info => {
                  if (info.file.status !== 'uploading') {
                    console.log(info.file, info.fileList)
                  }
                  if (info.file.status === 'done') {
                    setArtExample(info.file.originFileObj)
                    message.success(`${info.file.name} file uploaded successfully`)
                  } else if (info.file.status === 'error') {
                    message.error(`${info.file.name} file upload failed.`)
                  }
                }}
              />
              {isFormNotValid && artWorkExample === undefined ? (
                <Text type='danger' style={{ fontSize: 13 }}>
                  Artwork is required
                </Text>
              ) : null}
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Please upload the collection banner
            </label>
            <div className='flex-row'>
              <FileUpload
                onChange={info => {
                  if (info.file.status !== 'uploading') {
                    console.log(info.file, info.fileList)
                  }
                  if (info.file.status === 'done') {
                    setCollectionBanner(info.file.originFileObj)
                    message.success(`${info.file.name} file uploaded successfully`)
                  } else if (info.file.status === 'error') {
                    message.error(`${info.file.name} file upload failed.`)
                  }
                }}
              />
              {isFormNotValid && collectionBanner === undefined ? (
                <Text type='danger' style={{ fontSize: 13 }}>
                  Collection banner is required
                </Text>
              ) : null}
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Primary category</label>
            <div className='flex w-full'>
              <Select
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select an answer'
                dropdownClassName=''
                onChange={value => handleChange(value, 'primary_category')}>
                <Option value='Collectibles'>Collectibles</Option>
                <Option value='Charity Focused'>Charity Focused</Option>
                <Option value='Gaming'>Gaming</Option>
                <Option value='Utility'>Utility</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Secondary category</label>
            <div className='flex w-full'>
              <Select
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select an answer'
                dropdownClassName=''
                onChange={value => handleChange(value, 'secondary_category')}>
                <Option value='Collectibles'>Collectibles</Option>
                <Option value='Charity Focused'>Charity Focused</Option>
                <Option value='Gaming'>Gaming</Option>
                <Option value='Utility'>Utility</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Is the artwork used in your collection either your original artwork or artwork you
              have written permission to use?
            </label>
            <div className='flex w-full'>
              <Select
                defaultValue='no'
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                dropdownClassName=''
                onChange={value => handleChange(value, 'legal')}>
                <Option value='yes'>Yes</Option>
                <Option value='no'>No</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Is your artwork a derivative of other artwork on ANY blockchain?
            </label>
            <div className='flex w-full'>
              <Select
                defaultValue='yes'
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                dropdownClassName=''
                onChange={value => handleChange(value, 'is-derivative')}>
                <Option value='yes'>Yes</Option>
                <Option value='no'>No</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Discord ID (Nickname) for main contact
            </label>
            <TextField
              className='w-full'
              placeholder='john'
              onChange={event => setDiscordId(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Email address for main contact</label>
            <TextField
              className='w-full'
              placeholder='john@example.com'
              onChange={event => setEmail(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Describe what makes your project unique
            </label>
            <div className='flex-row'>
              <TextArea
                className='w-full'
                placeholder='Description'
                onChange={event => setProjectDescription(event.target.value)}
              />
              {isFormNotValid && projectDescription.trim().length <= 0 ? (
                <Text type='danger' style={{ fontSize: 13 }}>
                  Description is required
                </Text>
              ) : null}
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Please describe the long-term goals of your project
            </label>
            <TextArea
              className='w-full'
              placeholder='Description'
              onChange={event => setLongTermGoals(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Please tell us about your team</label>
            <TextArea
              className='w-full'
              placeholder='Description'
              onChange={event => setTeamDescription(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Have you worked with or are you a team member of other Solana NFT projects?
            </label>
            <div className='flex w-full'>
              <Select
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select an answer'
                dropdownClassName=''
                onChange={value => handleChange(value, 'experience')}>
                <Option value='yes'>Yes</Option>
                <Option value='no'>No</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Twitter link</label>
            <TextField
              className='w-full'
              placeholder='https://'
              onChange={event => setTwitterLink(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Discord Server (add link)</label>
            <TextField
              className='w-full'
              placeholder='https://'
              onChange={event => setDiscordServer(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Instagram (add link)</label>
            <TextField
              className='w-full'
              placeholder='https://'
              onChange={event => setInstagramLink(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>LinkedIn Profile (add link)</label>
            <TextField
              className='w-full'
              placeholder='https://'
              onChange={event => setLinkedInProfile(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Website (add link)</label>
            <TextField
              className='w-full'
              placeholder='https://'
              onChange={event => setWebsiteLink(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Other links</label>
            <TextField
              className='w-full'
              placeholder='https://'
              onChange={event => setOtherLink(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Expected mint date (date you would like your drop to be)
            </label>
            <div className='flex w-full'>
              <DatePicker
                className='h-[46px] w-full rounded-[4px] !border-N-200 text-gray-900 shadow-none duration-[50ms] ease-in-out focus-within:!border-B-400 focus-within:!shadow-[0px_0px_0px_1px_#2492F6]'
                onChange={handleDatePicker}
              />
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Number of items expected in collection for next mint
            </label>
            <TextField
              className='w-full'
              placeholder='No of items #'
              onChange={event => setNumberOfItemsExpected(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Is your team dox&apos;d or do you plan to dox?
            </label>
            <p className='text-gray-600'>(either publicly or via a dox service)</p>
            <div className='flex w-full'>
              <Select
                defaultValue='yes'
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                dropdownClassName=''
                onChange={value => handleChange(value, 'is-doxed')}>
                <Option value='yes'>Yes</Option>
                <Option value='no'>No</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Mint price (in SOL)</label>
            <TextField
              className='w-full'
              placeholder='# SOL'
              onChange={event => setMintPrice(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Marketing Package</label>
            <div className='flex w-full'>
              <Select
                defaultValue='gold'
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select an option'
                dropdownClassName=''
                onChange={value => handleChange(value, 'package')}>
                <Option value='gold'>Gold</Option>
                <Option value='silver'>Silver</Option>
                <Option value='basic'>Basic</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Anything else we should know?</label>
            <TextArea
              className='w-full'
              placeholder='Message'
              onChange={event => setAnything(event.target.value)}
            />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <Button size='lg' onClick={handleFormSubmit}>
              Submit Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaunchPadSubmission
