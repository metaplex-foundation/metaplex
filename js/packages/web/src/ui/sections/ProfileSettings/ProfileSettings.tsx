import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { TextField, TextArea, FileUpload, Button } from '@oyster/common'
import { message, Space } from 'antd'
import { addProfileInfo } from '../../../api'

export interface ProfileSettingsProps {
  [x: string]: any
}

export const ProfileSettings: FC<ProfileSettingsProps> = ({
  className,
  ...restProps
}: ProfileSettingsProps) => {
  const ProfileSettingsClasses = CN(`profile-settings`, className)
  const [userName, setUserName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [twitterLink, setTwitterLink] = useState<string>('')
  const [discordLink, setDiscordLink] = useState<string>('')
  const [telegram, setTelegram] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [publicKey, setPublicKey] = useState<string>('')
  const [image, setImage] = useState()

  useEffect(() => {
    if (restProps.profile) {
      setUserName(restProps.profile.userName)
      setEmail(restProps.profile.email)
      setTwitterLink(restProps.profile.twitterLink)
      setDiscordLink(restProps.profile.discordLink)
      setTelegram(restProps.profile.telegram)
      setBio(restProps.profile.bio)
      setPublicKey(restProps.profile.publicKey)
    }
  }, [])

  const saveProfile = (event: any) => {
    event.preventDefault()
    const formData = new FormData()

    formData.append('public_key', publicKey)
    formData.append('user_name', userName)
    formData.append('email', email)
    formData.append('twitter_link', twitterLink)
    formData.append('discord_link', discordLink)
    formData.append('telegram', telegram)
    formData.append('bio', bio)
    if (image !== undefined) {
      formData.append('image', image)
    }

    addProfileInfo(formData)
      .then(() => {
        message.success('Profile saved successfully')
        restProps.profileupdate(true)
      })
      .catch(() => {
        message.error('Failed to save profile')
      })
  }

  return (
    <div className={ProfileSettingsClasses} {...restProps}>
      <div className='flex max-w-[418px] flex-col gap-[20px]'>
        <TextField
          label='Username'
          placeholder='Enter username'
          value={userName}
          onChange={event => setUserName(event.target.value)}
        />
        <TextField
          label='Email address'
          placeholder='Enter email'
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        <TextField
          label='Twitter link'
          placeholder='Enter Twitter profile link'
          value={twitterLink}
          onChange={event => setTwitterLink(event.target.value)}
        />
        <TextField
          label='Telegram link'
          placeholder='Enter Telegram link'
          value={telegram}
          onChange={event => setTelegram(event.target.value)}
        />
        <TextField
          label='Discord server'
          placeholder='Enter Discord server name'
          value={discordLink}
          onChange={event => setDiscordLink(event.target.value)}
        />
        <TextArea
          label='Bio'
          placeholder='Enter bio'
          value={bio}
          onChange={event => setBio(event.target.value)}
        />
        <Space direction='vertical' align='start'>
          <label style={{ fontSize: '12px' }}>Upload profile image</label>
          <FileUpload
            onChange={info => {
              if (info.file.status !== 'uploading') {
                console.log(info.file, info.fileList)
              }
              if (info.file.status === 'done') {
                setImage(info.file.originFileObj)
                message.success(`${info.file.name} file uploaded successfully`)
              } else if (info.file.status === 'error') {
                message.error(`${info.file.name} file upload failed.`)
              }
            }}
          />
        </Space>
        <Button size='md' onClick={saveProfile}>
          Update Profile
        </Button>
      </div>
    </div>
  )
}

ProfileSettings.defaultProps = {}

export default ProfileSettings
