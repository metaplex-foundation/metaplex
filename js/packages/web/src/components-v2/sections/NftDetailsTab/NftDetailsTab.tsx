import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Dropdown, DropDownBody, DropDownToggle, DropDownMenuItem } from '../../atoms/Dropdown'
import { AttributesCard } from '../../molecules/AttributesCard'

export interface NftDetailsTabProps {
  [x: string]: any
}

export const TabButton = ({ isActive, onClick, children }: any) => {
  return (
    <button
      className={CN('appearance-none py-[8px] px-[12px] font-500', {
        'text-B-400': isActive,
        'text-gray-800': !isActive,
      })}
      onClick={onClick}>
      {children}
    </button>
  )
}

export const NftDetailsTab: FC<NftDetailsTabProps> = ({
  className,
  description,
  attributes,
  ...restProps
}: NftDetailsTabProps) => {
  const NftDetailsTabClasses = CN(`nft-details-tab w-full flex flex-col`, className)
  const [activeTab, setActiveTab] = useState('attributes')

  return (
    <div className={NftDetailsTabClasses} {...restProps}>
      <div className='flex w-full items-center'>
        <div className='mx-[-12px] flex w-full items-center'>
          <TabButton
            isActive={activeTab === 'attributes'}
            onClick={() => setActiveTab('attributes')}>
            Attributes
          </TabButton>
          <TabButton isActive={activeTab === 'about'} onClick={() => setActiveTab('about')}>
            About
          </TabButton>
        </div>

        <div className='ml-auto flex'>
          <Dropdown>
            {({ isOpen, setIsOpen, setInnerValue, innerValue }: any) => {
              const onSelectOption = (value: string) => {
                setIsOpen(false)
                setInnerValue(value)

                switch (innerValue) {
                  case 'facebook':
                    console.log('Facebook')
                    break
                  case 'twitter':
                    console.log('Twitter')
                    break
                  case 'email':
                    console.log('Email')
                    break
                  default:
                    break
                }
              }

              const options = [
                { label: 'Facebook', value: 'facebook' },
                { label: 'Twitter', value: 'twitter' },
                { label: 'Email', value: 'email' },
              ]

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <button className='inline-flex appearance-none text-lg text-B-400'>
                      <i className='ri-share-fill' />
                    </button>
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody
                      align='right'
                      className='mt-[8px] w-[140px] border border-B-10 shadow-lg shadow-B-700/5'>
                      {options?.map((option: any, index: number) => {
                        const { label, value } = option

                        return (
                          <DropDownMenuItem
                            key={index}
                            onClick={() => onSelectOption(value)}
                            {...option}>
                            {label}
                          </DropDownMenuItem>
                        )
                      })}
                    </DropDownBody>
                  )}
                </>
              )
            }}
          </Dropdown>
        </div>
      </div>

      <div className='flex w-full pt-[4px]'>
        {activeTab === 'attributes' && <AttributesCard list={attributes} />}

        {activeTab === 'about' && (
          <div className='w-full rounded-[8px] border border-gray-100 bg-gray-50 p-[20px] text-md text-gray-900'>
            {description}
          </div>
        )}
      </div>
    </div>
  )
}

NftDetailsTab.defaultProps = {
  description:
    'Belugies is a generative NFT collection artistically illustrated by a 14 year old artist. Since its inception October 16th, 2021 Belugies. Belugies is a generative NFT collection artistically illustrated by a 14 year old artist.',
}

export default NftDetailsTab
