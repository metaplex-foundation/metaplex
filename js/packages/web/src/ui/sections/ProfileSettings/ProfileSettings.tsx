import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { TextField, TextArea, FileUpload, Button } from '@oyster/common'
import { message, Space } from 'antd'
import { addProfileInfo, getProfile } from '../../../api'
import { useWallet } from '@solana/wallet-adapter-react'
import { useParams } from 'react-router-dom'

export interface ProfileSettingsProps {
  [x: string]: any
}

export const ProfileSettings: FC<ProfileSettingsProps> = ({
  className,
  ...restProps
}: ProfileSettingsProps) => {
  const ProfileSettingsClasses = CN(`profile-settings`, className)
  const { id } = useParams<{ id: string }>()
  const { publicKey } = useWallet()
  const [userName, setUserName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [twitterLink, setTwitterLink] = useState<string>('')
  const [discordLink, setDiscordLink] = useState<string>('')
  const [telegram, setTelegram] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [userPubKey, setPublicKey] = useState<string>('')
  const [isOtherAccount, setIsOtherAccount] = useState<boolean>(false)
  const [image, setImage] = useState()

  useEffect(() => {
    console.log('Called')
    if (id && publicKey && publicKey.toBase58() !== id) {
      setIsOtherAccount(true)
      getProfile(id)
        .then(res => {
          setUserName(res.data.user_name)
          setPublicKey(res.data.public_key)
          setEmail(res.data.email)
          setTwitterLink(res.data.twitter_link)
          setDiscordLink(res.data.discord_link)
          setTelegram(res.data.telegram)
          setBio(res.data.bio)
          setImage(res.data.image)
          restProps.profileImage(res.data.image)
        })
        .catch((error: any) => {
          console.log(error.message)
        })
    } else if (publicKey) {
      setIsOtherAccount(false)
      getProfile(publicKey.toBase58())
        .then(res => {
          setUserName(res.data.user_name)
          setPublicKey(res.data.public_key)
          setEmail(res.data.email)
          setTwitterLink(res.data.twitter_link)
          setDiscordLink(res.data.discord_link)
          setTelegram(res.data.telegram)
          setBio(res.data.bio)
          setImage(res.data.image)
          restProps.profileImage(res.data.image)
        })
        .catch((error: any) => {
          console.log(error.message)
        })
    }
  }, [id])

  const saveProfile = (event: any) => {
    event.preventDefault()
    const formData = new FormData()

    formData.append('public_key', userPubKey || publicKey?.toBase58() || '')
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
        {isOtherAccount ? (
          <>{userName ? <div>Username - {userName}</div> : null}</>
        ) : (
          <TextField
            label='Username'
            placeholder='Enter username'
            value={userName}
            onChange={event => setUserName(event.target.value)}
          />
        )}
        {isOtherAccount ? (
          <>{email ? <div>Email - {email}</div> : null}</>
        ) : (
          <TextField
            label='Email address'
            placeholder='Enter email'
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        )}
        {isOtherAccount ? (
          <>{twitterLink ? <div>Twitter - {twitterLink}</div> : null}</>
        ) : (
          <TextField
            label='Twitter link'
            placeholder='Enter Twitter profile link'
            value={twitterLink}
            onChange={event => setTwitterLink(event.target.value)}
          />
        )}
        {isOtherAccount ? (
          <>{telegram ? <span>Telegram - {telegram}</span> : null}</>
        ) : (
          <TextField
            label='Telegram link'
            placeholder='Enter Telegram link'
            value={telegram}
            onChange={event => setTelegram(event.target.value)}
          />
        )}
        {isOtherAccount ? (
          <>{discordLink ? <div>Discord - {discordLink}</div> : null}</>
        ) : (
          <TextField
            label='Discord server'
            placeholder='Enter Discord server name'
            value={discordLink}
            onChange={event => setDiscordLink(event.target.value)}
          />
        )}
        {isOtherAccount ? (
          <>{bio ? <div>Bio - {bio}</div> : null}</>
        ) : (
          <TextArea
            label='Bio'
            placeholder='Enter bio'
            value={bio}
            onChange={event => setBio(event.target.value)}
          />
        )}
        {!isOtherAccount ? (
          <>
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
          </>
        ) : null}
      </div>
    </div>
  )
}

ProfileSettings.defaultProps = {}

export default ProfileSettings
