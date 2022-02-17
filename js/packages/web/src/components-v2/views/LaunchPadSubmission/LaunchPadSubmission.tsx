import React, { FC, useState } from 'react'
import CN from 'classnames'
import { TextField, TextArea, FileUpload, Button } from '@oyster/common'
import { Select, message, DatePicker } from 'antd'
import { Logo } from '../../atoms/Logo'

export interface LaunchPadSubmissionProps {
  [x: string]: any
}

export const LaunchPadSubmission: FC<LaunchPadSubmissionProps> = ({
  className,
  ...restProps
}: LaunchPadSubmissionProps) => {
  const LaunchPadSubmissionClasses = CN(`launchpad-submission`, className)
  const { Option } = Select
  const [isReApplying, setIsReApplying] = useState(true)
  const [isLegal, setIsLegal] = useState(false)
  const [isDerivative, setIsDerivative] = useState(true)

  function handleChange(value: any, option?: any) {
    if (option === 'reapply' && value === 'yes') {
      setIsReApplying(true)
    } else {
      setIsReApplying(false)
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
  }

  function handleDatePicker(date: any, dateString: any) {
    console.log(date, dateString)
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
            <label className='text-h6 font-500 text-N-700'>Project Name</label>
            <TextField className='w-full' placeholder='Enter Collection name' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Creator Name (if different than Project Name)
            </label>
            <TextField className='w-full' placeholder='Enter Collection name' />
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
            <TextField className='w-full' placeholder='john' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Email address for main contact</label>
            <TextField className='w-full' placeholder='john@example.com' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Describe what makes your project unique
            </label>
            <TextArea className='w-full' placeholder='Description' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Please describe the long-term goals of your project
            </label>
            <TextArea className='w-full' placeholder='Description' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Please tell us about your team</label>
            <TextArea className='w-full' placeholder='Description' />
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
            <TextField className='w-full' placeholder='https://' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Discord Server (add link)</label>
            <TextField className='w-full' placeholder='https://' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Instagram (add link)</label>
            <TextField className='w-full' placeholder='https://' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>LinkedIn Profile (add link)</label>
            <TextField className='w-full' placeholder='https://' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Website (add link)</label>
            <TextField className='w-full' placeholder='https://' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Other links</label>
            <TextField className='w-full' placeholder='https://' />
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
            <TextField className='w-full' placeholder='No of items #' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Is your team dox'd or do you plan to dox?
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
            <TextField className='w-full' placeholder='# SOL' />
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
            <TextArea className='w-full' placeholder='Message' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <Button size='lg'>Submit Project</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaunchPadSubmission
