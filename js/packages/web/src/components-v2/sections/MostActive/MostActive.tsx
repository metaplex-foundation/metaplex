import React, { FC } from 'react'
import CN from 'classnames'
import { mostActiveProjects } from '../../../../dummy-data/most-active'
import { ProjectCard } from '../../molecules/ProjectCard'
import { Dropdown, DropDownBody, DropDownToggle, DropDownMenuItem } from '../../atoms/Dropdown'

import { useViewport } from '../../../utils/useViewport'
import { Label } from 'recharts'
import { useMeta } from '../../../contexts'

//import { ArtContent } from '../../ArtContent'
//import { MetaAvatar } from '../../MetaAvatar'
import { Card, CardProps, Button, Badge } from 'antd'
import { MetadataCategory, StringPublicKey } from '@oyster/common'
//import { ArtContent } from '../../ArtContent'
import { useArt } from '../../../hooks'
import { Artist, ArtType } from '../../../types'
//import { MetaAvatar } from '../../MetaAvatar'
import { useCachedImage, useExtendedArt } from '../../../hooks'
import { Ref, useCallback, useEffect, useState } from 'react'
import { MetadataFile, pubkeyToString } from '@oyster/common'
import { useCreator, useCreatorArts } from '../../../hooks'

export interface MostActiveProps {
  [x: string]: any
}

export const MostActive: FC<MostActiveProps> = ({ className, ...restProps }: MostActiveProps) => {
  const { isMobile } = useViewport()
  const MostActiveClasses = CN(`most-active`, className)

  const { whitelistedCreatorsByCreator } = useMeta()
  const items = Object.values(whitelistedCreatorsByCreator)
  //const { id } = useParams<{ id: string }>()
  const id = 'AM5uwFuKMiYQxvijGEseDXaCSQA6thNnHKbbBWR2LjtA'
  const creator = useCreator(id)
  const artwork = useCreatorArts(id)

  return (
    <div className={MostActiveClasses} {...restProps}>
      <div className='container flex flex-col gap-[40px]'>
        <div className='lg:flex-ro flex flex-col items-center justify-center gap-[0] md:flex-row md:gap-[12px] lg:justify-start lg:justify-start'>
          <h2 className='text-h4 md:text-h3'>Most active</h2>
          <Dropdown>
            {({ isOpen, setIsOpen, innerValue, setInnerValue }: any) => {
              const onSelectOption = (value: string) => {
                console.log('label ', value)
                setInnerValue(value)
                setIsOpen(false)
              }

              const options = [
                { id: 0, label: 'Today', value: 'today' },
                { id: 1, label: 'This week', value: 'thisWeek' },
                { id: 2, label: 'This month', value: 'thisMonth' },
              ]

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <button className='flex items-center gap-[4px] text-h4 text-B-400 md:text-h3'>
                      <span>{innerValue || 'Today'}</span>
                      <i className='ri-arrow-down-s-line relative top-[2px]' />
                    </button>
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody
                      align={isMobile ? 'center' : 'right'}
                      className='w-[158px] border border-B-10 shadow-lg shadow-B-700/5'>
                      {options.map((option: any, index: number) => {
                        const { label } = option

                        return (
                          <DropDownMenuItem
                            key={index}
                            onClick={() => onSelectOption(label)}
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

        <div className='grid grid-cols-1 gap-x-[32px] gap-y-[20px] md:grid-cols-2 lg:grid-cols-3'>
          {mostActiveProjects.map((project: any, index: number) => {
            return <ProjectCard {...project} key={index} />
          })}
        </div>

        <div className='grid grid-cols-1 gap-x-[32px] gap-y-[20px] md:grid-cols-2 lg:grid-cols-3'>
          {artwork.map((m, idx) => {
            console.log('artwork ', m)
            const id = m.pubkey

            //const art = useArt(m.pubkey)
            //console.log('useArt: ', art)

            const { ref, data } = useExtendedArt(id)

            return (
              <ProjectCard {...m} key={id} />
              // <Link to={`/art/${id}`} key={idx}>
              //   <ArtCard key={id} pubkey={m.pubkey} preview={false} artView={true} />
              // </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MostActive
