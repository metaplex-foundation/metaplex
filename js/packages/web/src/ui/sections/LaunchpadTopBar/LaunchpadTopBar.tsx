import React, { FC } from 'react'
import CN from 'classnames'
import { Dropdown, DropDownBody, DropDownToggle, DropDownMenuItem, Button } from '@oyster/common'
import { Link } from 'react-router-dom'

export interface LaunchpadTopBarProps {
  [x: string]: any
}

export const LaunchpadTopBar: FC<LaunchpadTopBarProps> = ({
  className,
  ...restProps
}: LaunchpadTopBarProps) => {
  const LaunchpadTopBarClasses = CN(`launchpad-top-bar`, className)

  return (
    <div className={LaunchpadTopBarClasses} {...restProps}>
      <div className='container flex justify-between'>
        <div className='flex'>
          <Link to='/launchpad'>
            <Button
              appearance='ghost'
              view='outline'
              isRounded={false}
              iconBefore={<i className='ri-arrow-left-s-line text-[20px] font-400' />}>
              Back to Launchpad
            </Button>
          </Link>
        </div>

        <div className='flex gap-[8px]'>
          <Button
            appearance='ghost'
            view='outline'
            isRounded={false}
            iconAfter={<i className='ri-arrow-right-up-line text-[16px] font-400' />}>
            Whitepaper
          </Button>
          <Button
            appearance='ghost'
            view='outline'
            isRounded={false}
            iconAfter={<i className='ri-arrow-right-up-line text-[16px] font-400' />}>
            Website
          </Button>
          <Button
            appearance='ghost'
            view='outline'
            isRounded={false}
            iconAfter={<i className='ri-arrow-right-up-line text-[16px] font-400' />}>
            Discord
          </Button>
          <Button
            appearance='ghost'
            view='outline'
            isRounded={false}
            iconAfter={<i className='ri-arrow-right-up-line text-[16px] font-400' />}>
            Twitter
          </Button>

          <Dropdown>
            {({ isOpen, setIsOpen, innerValue, setInnerValue }: any) => {
              const onSelectOption = (value: string) => {
                setInnerValue(value)
                setIsOpen(false)
              }

              const options = [
                { label: 'Telegram', value: 'Telegram' },
                { label: 'Email', value: 'Email' },
                { label: 'Copy link', value: 'Copy link' },
              ]

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <Button
                      appearance='ghost'
                      view='outline'
                      isRounded={false}
                      iconAfter={<i className='ri-share-forward-fill text-[20px] font-400' />}
                    />
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody align='right' className='w-[200px]'>
                      {options.map((option: any, index: number) => {
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
    </div>
  )
}

LaunchpadTopBar.defaultProps = {}

export default LaunchpadTopBar
