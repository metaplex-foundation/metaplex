import React, { FC } from 'react'
import CN from 'classnames'
import { TextField, TextArea } from '@oyster/common'

export interface ProfileSettingsProps {
  [x: string]: any
}

export const ProfileSettings: FC<ProfileSettingsProps> = ({
  className,
  ...restProps
}: ProfileSettingsProps) => {
  const ProfileSettingsClasses = CN(`profile-settings`, className)

  return (
    <div className={ProfileSettingsClasses} {...restProps}>
      <div className='flex max-w-[418px] flex-col gap-[20px]'>
        <TextField label='Username' placeholder='Enter username' />
        <TextField label='Email address' placeholder='Enter email' />
        <TextArea label='Bio' placeholder='Enter bio' />
      </div>
    </div>
  )
}

ProfileSettings.defaultProps = {}

export default ProfileSettings
