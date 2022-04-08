import React, { FC, useState } from 'react'
import CN from 'classnames'
import { TextField, TextArea, FileUpload, Button } from '@oyster/common'
import { Select, message, DatePicker } from 'antd'
import { Logo } from '../../atoms/Logo'

export interface SubmitCollectionProps {
  [x: string]: any
}

export const SubmitCollection: FC<SubmitCollectionProps> = ({
  className,
  ...restProps
}: SubmitCollectionProps) => {
  const SubmitCollectionClasses = CN(`submit-collection`, className)
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
    <div className={SubmitCollectionClasses} {...restProps}>
      <div className='container py-[100px]'>
        <div className='mx-auto mb-[40px] flex w-full max-w-[600px] flex-col'>
          <Logo className='mb-[8px]' />
          <h1 className='text-h2 font-500'>Submit a collection</h1>
        </div>

        <div className='mx-auto flex w-full max-w-[600px] flex-col gap-[40px]'>
          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Collection Name</label>
            <p className='text-gray-600'>
              This will serve as your collection name and your URL on the marketplace once you are
              listed.
            </p>
            <p className='text-gray-600'>
              Please note the URL will not allow symbols or uppercase letters. Symbols will be
              removed, and uppercase letters will be made lowercase. Any spaces will be replaced
              with underscores.
            </p>
            <TextField className='w-full' placeholder='Enter Collection name' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Have you or someone else applied for this collection to be listed on Karmaplex in the
              past?
            </label>
            <div className='flex w-full'>
              <Select
                defaultValue='yes'
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                dropdownClassName=''
                onChange={value => handleChange(value, 'reapply')}
              >
                <Option value='yes'>Yes</Option>
                <Option value='no'>No</Option>
              </Select>
            </div>
          </div>

          {isReApplying && (
            <div className='flex w-full flex-col gap-[16px]'>
              <label className='text-h6 font-500 text-N-700'>
                Can you please let us know why you're re-applying and would like to be reconsidered?
              </label>
              <p className='text-gray-600'>
                Please let us know if you were previously rejected for incorrectly submitted
                materials.
              </p>
              <TextArea className='w-full' placeholder='Reason' />
            </div>
          )}

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Email address for main contact:</label>
            <p className='text-gray-600'>
              This is where we'll send your acceptance or rejection, so please fill this out
              properly and check your spam over the next 4 days!
            </p>
            <TextField className='w-full' placeholder='john@example.com' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Discord ID (Nickname) for main contact:
            </label>
            <p className='text-gray-600'>
              If you don't have a discord ID, please leave this field blank. Do not enter a username
              from another app/website. We will email you using the address you provided above
              within 72 hours.
            </p>
            <TextField className='w-full' placeholder='john' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Is the artwork in your collection, profile picture, and banner either your original
              artwork or artwork you have legal permission to use, distribute, and sell?
            </label>
            <div className='flex w-full'>
              <Select
                defaultValue='no'
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                dropdownClassName=''
                onChange={value => handleChange(value, 'legal')}
              >
                <Option value='yes'>Yes</Option>
                <Option value='no'>No</Option>
              </Select>
            </div>
          </div>

          {!isLegal && (
            <div className='flex w-full flex-col gap-[16px]'>
              <label className='text-h6 font-500 text-N-700'>If no, please explain:</label>
              <TextArea className='w-full' placeholder='Reason' />
            </div>
          )}

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
                onChange={value => handleChange(value, 'is-derivative')}
              >
                <Option value='yes'>Yes</Option>
                <Option value='no'>No</Option>
              </Select>
            </div>
          </div>

          {isDerivative && (
            <div className='flex w-full flex-col gap-[16px]'>
              <label className='text-h6 font-500 text-N-700'>
                Enter the link to the original work:
              </label>
              <TextField className='w-full' placeholder='https://' />
            </div>
          )}

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              On what date did you sellout or close the mint?
            </label>
            <p className='text-gray-600'>
              If you haven't finished your minting, please enter an estimated date, and then update
              us through customer-support@Karmaplex.io when you are ready to list.
            </p>
            <div className='flex w-full'>
              <DatePicker
                className='h-[46px] w-full rounded-[4px] !border-N-200 text-gray-900 shadow-none duration-[50ms] ease-in-out focus-within:!border-B-400 focus-within:!shadow-[0px_0px_0px_1px_#2492F6]'
                onChange={handleDatePicker}
              />
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Are you ready for this collection to be listed for secondary sales immediately?
            </label>
            <div className='flex w-full'>
              <Select
                defaultValue='yes'
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                dropdownClassName=''
                onChange={value => handleChange(value, 'is-minting')}
              >
                <Option value='yes'>Yes / Sold Out or Mint Closed</Option>
                <Option value='no'>No / Still Minting</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Collection Twitter Link (full URL - include https://)
            </label>
            <p className='text-gray-600'>
              This will be a link on your marketplace page. Please make sure that the link includes
              https:// at the beginning, or else the link will not work on your collection's page.
            </p>
            <TextField className='w-full' placeholder='https://' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Discord Server Invite Link (full URL - include https://)
            </label>
            <p className='text-gray-600'>
              This will be a link on your marketplace page. Please make sure that the link is open
              INDEFINITELY , and NOT just for the default 7 days. Please make sure that the link
              includes https:// at the beginning, or else the link will not work on your
              collection's page.
            </p>
            <TextField className='w-full' placeholder='https://' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Any other links (full URL - include https://):
            </label>
            <p className='text-gray-600'>
              This will be a link on your marketplace page. Please make sure that the link includes
              https:// at the beginning, or else the link will not work on your collection's page.
            </p>
            <TextField className='w-full' placeholder='https://' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Short description of the project (this will go on your marketplace page)
            </label>
            <p className='text-gray-600'>
              We recommend avoiding collection numbers or dates in your description unless you are
              100% sure that they are final.
            </p>
            <p className='text-gray-600'>
              Please note that this field will not update as you update the metadata for your
              collection, so any changes must be submitted to the team via our update collection
              form.
            </p>
            <p className='text-gray-600'>MAX 160 Characters</p>
            <TextArea className='w-full' placeholder='Description' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Select the primary category that you would like for this collection to be listed
              under.
            </label>
            <p className='text-gray-600'>
              You will only be able to select up to 2 categories maximum per collection.
            </p>
            <div className='flex w-full'>
              <Select
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                mode='multiple'
                onChange={value => handleChange(value)}
              >
                <Option value='art'>Art</Option>
                <Option value='games'>Games</Option>
                <Option value='music'>Music</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Optionally, please select the second category that you would like for this collection
              to be listed under.
            </label>
            <p className='text-gray-600'>
              You will only be able to select up to 2 categories maximum per collection.
            </p>
            <div className='flex w-full'>
              <Select
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                mode='multiple'
                onChange={value => handleChange(value)}
              >
                <Option value='art'>Art</Option>
                <Option value='games'>Games</Option>
                <Option value='music'>Music</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Did or will you mint your collection using CandyMachine?
            </label>
            <div className='flex w-full'>
              <Select
                defaultValue='yes'
                className='w-full rounded-[4px] border-N-500 text-gray-900 placeholder:text-N-300'
                placeholder='Select'
                dropdownClassName=''
                onChange={value => handleChange(value, 'is-candy-machine')}
              >
                <Option value='yes'>Yes</Option>
                <Option value='no'>No</Option>
              </Select>
            </div>
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>
              Mint hashes (ONE .json file*) DO NOT ATTACH ANY IMAGES HERE
            </label>
            <p className='text-gray-600'>
              If you have not used Candy Machine, please upload a cleaned up JSON file that meets
              the .json file format below:
            </p>
            <div className='flex w-full'>
              <pre>
                <code>
                  {`[
  “MINT HASH”,
  “MINT HASH”,
  "MINT HASH"
]`}
                </code>
              </pre>
            </div>
            <p>
              If you've used Candy Machine version 1 or version 2 to mint your project, this list
              can be generated using the Magic Eden tool located here:{' '}
            </p>

            <a href='#' className='text-B-400'>
              https://magiceden.io/mintlist-tool
            </a>

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
              Collection pfp 500x500 (Upload 1 Only - Max filesize: 5MB)
            </label>
            <p className='text-gray-600'>
              This is the image that will show on your collection profile page
            </p>

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
            <label className='text-h6 font-500 text-N-700'>Banner Image (1440x1050)</label>
            <p className='text-gray-600'>
              This is the image that will show on your collection profile page
            </p>

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
              Number of TOTAL items in the collection (existing or expected):
            </label>
            <TextField className='w-full' placeholder='No of items #' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <label className='text-h6 font-500 text-N-700'>Anything else we should know?</label>
            <TextArea className='w-full' placeholder='Message' />
          </div>

          <div className='flex w-full flex-col gap-[16px]'>
            <Button size='lg'>Submit Collection</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubmitCollection
