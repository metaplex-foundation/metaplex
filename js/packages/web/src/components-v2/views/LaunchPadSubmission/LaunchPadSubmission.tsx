import React, { FC, useState } from 'react'
import CN from 'classnames'
import { TextField, TextArea, FileUpload, Button } from '@oyster/common'
import { Select, message, DatePicker } from 'antd'
import { Logo } from '../../atoms/Logo'
import axios from 'axios'

export interface LaunchPadSubmissionProps {
  [x: string]: any
}

export const LaunchPadSubmission: FC<LaunchPadSubmissionProps> = ({
  className,
  ...restProps
}: LaunchPadSubmissionProps) => {
  const LaunchPadSubmissionClasses = CN(`launchpad-submission`, className)
  const { Option } = Select
  const [projectName, setProjectName] = useState('') // Done
  const [creatorName, setCreatorName] = useState('') // Done
  const [currentStage, setCurrentStage] = useState('') // Done
  const [artWorkExample, setArtExample] = useState('')
  const [collectionBanner, setCollectionBanner] = useState('')
  const [isLegal, setIsLegal] = useState(false) // Done
  const [isDerivative, setIsDerivative] = useState(false) // Done
  const [discordId, setDiscordId] = useState() // Done
  const [email, setEmail] = useState() // Done
  const [projectDescription, setProjectDescription] = useState() // Done
  const [longTermGoals, setLongTermGoals] = useState() // Done
  const [teamDescription, setTeamDescription] = useState() // Done
  const [experience, setExperience] = useState(false) // Done
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
  const [creatorPublicKey, setCreatorPublicKey] = useState()

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
      console.log(value)
      setMarketingPackage(value)
    }
  }

  function handleDatePicker(_date: any, dateString: any) {
    setExpectedMintDate(dateString)
  }

  function handleFormSubmit(event: any) {
    event.preventDefault()

    const formData = new FormData()

    const userDetails = {
      project_name: projectName,
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
    }

    formData.append('collection_image', artWorkExample)
    formData.append('collection_banner', collectionBanner)
    formData.append('userDetails', JSON.stringify(userDetails))

    axios.post('http://localhost:9000/launchpad-submission/add', formData)
  }

  return (
    <div className={LaunchPadSubmissionClasses} {...restProps}>
      <div className='container py-[100px]'>
        <div className='mx-auto mb-[40px] flex w-full max-w-[600px] flex-col'>
          <Logo className='mb-[8px]' />
          <h1 className='text-h2 font-500'>Launchpad: Submission Form</h1>
        </div>

        <div className='mx-auto flex w-full max-w-[600px] flex-col gap-[40px]'>
          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Collection Name</label>
            <TextField
              className='w-full'
              placeholder='Enter Collection name'
              onChange={event => setProjectName(event.target.value)}
            />
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
            <TextField
              className='w-full'
              placeholder='Enter Collection name'
              onChange={event => setCreatorPublicKey(event.target.value)}
            />
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
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Please upload the collection banner
            </label>

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
            <TextArea
              className='w-full'
              placeholder='Description'
              onChange={event => setProjectDescription(event.target.value)}
            />
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
            <Button size='lg' onClick={event => handleFormSubmit(event)}>
              Submit Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaunchPadSubmission
