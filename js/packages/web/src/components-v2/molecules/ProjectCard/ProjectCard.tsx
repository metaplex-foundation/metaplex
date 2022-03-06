import React, { FC } from 'react'
import CN from 'classnames'
import SolanaIcon from '../../icons/Solana'

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

export interface ProjectCardProps {
  [x: string]: any
}

// export interface ArtCardProps extends CardProps {
//   pubkey?: StringPublicKey

//   image?: string
//   animationURL?: string

//   category?: MetadataCategory

//   name?: string
//   symbol?: string
//   description?: string
//   creators?: Artist[]
//   preview?: boolean
//   small?: boolean
//   onClose?: () => void

//   height?: number
//   artView?: boolean
//   width?: number

//   count?: string
//   uri?: string
// }

// export const ProjectCard2: FC<ArtCardProps> = ({
//   //className,
//   small,
//   category,
//   // image,
//   animationURL,
//   preview,
//   onClose,
//   pubkey,
//   height,
//   artView,
//   width,
//   count,
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   name: _name,
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   creators: _creators,
//   className,
//   name,
//   image,
//   uri,
//   ...restProps
// }: ArtCardProps) => {
//   const ProjectCardClasses = CN(
//     `project-card flex items-center bg-gray-50 hover:bg-gray-100 rounded-[8px] overflow-hidden w-full cursor-pointer transition-all`,
//     className
//   )

//   // const art = useArt(pubkey)
//   // const tag: string = 'Tezos'
//   // const rate = '+123%'
//   // const [uriState, setUriState] = useState<string | undefined>()
//   // const [animationURLState, setAnimationURLState] = useState<string | undefined>()
//   // const [filesState, setFilesState] = useState<(MetadataFile | string)[] | undefined>()
//   // const [categoryState, setCategoryState] = useState<MetadataCategory | undefined>()

//   // const id = pubkeyToString(pubkey)

//   // const { ref, data } = useExtendedArt(id)

//   // useEffect(() => {
//   //   setUriState(uri)
//   // }, [uri])

//   // useEffect(() => {
//   //   setAnimationURLState(animationURL)
//   // }, [animationURL])

//   // // useEffect(() => {
//   // //   setFilesState(files)
//   // // }, [files])

//   // useEffect(() => {
//   //   setCategoryState(category)
//   // }, [category])

//   // useEffect(() => {
//   //   if (pubkey && data) {
//   //     setUriState(data.image)
//   //     setAnimationURLState(data.animation_url)
//   //   }

//   //   if (pubkey && data?.properties) {
//   //     setFilesState(data.properties.files)
//   //     setCategoryState(data.properties.category)
//   //   }
//   // }, [pubkey, data])

//   // console.log('pubkey', pubkey)
//   // console.log('Extended Art', data)
//   // console.log('Extended Art ref', ref)

//   return (
//     <div className={ProjectCardClasses} {...restProps}>
//       <div className='flex h-full flex-shrink-0'>
//         <img src={image} alt={name} className='h-full w-[80px] object-cover object-center' />
//       </div>

//       <div className='flex w-full items-center justify-between px-[16px] py-[16px]'>
//         <div className='flex w-full flex-col'>
//           <span className='text-base text-gray-800 line-clamp-1 lg:text-h6'>{name}</span>
//           <span className='flex items-center gap-[4px] text-md text-gray-600'>
//             <SolanaIcon width={16} height={16} />

//             <span>{tag}</span>
//           </span>
//         </div>

//         <div className='ml-auto flex flex-shrink-0 text-md'>
//           <span className='text-G-400'>{rate}</span>
//         </div>
//       </div>
//     </div>
//   )
// }

export const ProjectCard: FC<ProjectCardProps> = ({
  className,
  name,
  tag,
  rate,
  image,
  ...restProps
}: ProjectCardProps) => {
  const ProjectCardClasses = CN(
    `project-card flex items-center bg-gray-50 hover:bg-gray-100 rounded-[8px] overflow-hidden w-full cursor-pointer transition-all`,
    className
  )

  return (
    <div className={ProjectCardClasses} {...restProps}>
      <div className='flex h-full flex-shrink-0'>
        <img src={image} alt={name} className='h-full w-[80px] object-cover object-center' />
      </div>

      <div className='flex w-full items-center justify-between px-[16px] py-[16px]'>
        <div className='flex w-full flex-col'>
          <span className='text-base text-gray-800 line-clamp-1 lg:text-h6'>{name}</span>
          <span className='flex items-center gap-[4px] text-md text-gray-600'>
            <SolanaIcon width={16} height={16} />
            <span>{tag}</span>
          </span>
        </div>

        <div className='ml-auto flex flex-shrink-0 text-md'>
          <span className='text-G-400'>{rate}</span>
        </div>
      </div>
    </div>
  )
}

export default ProjectCard
