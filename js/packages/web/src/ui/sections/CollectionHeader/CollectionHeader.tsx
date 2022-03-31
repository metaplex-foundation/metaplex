import React, { FC } from 'react'
import CN from 'classnames'
import { Avatar, StatsCard } from '@oyster/common'

export interface CollectionHeaderProps {
  [x: string]: any
  cover?: string
  avatar?: string
  title?: string
}

export const CollectionHeader: FC<CollectionHeaderProps> = ({
  className,
  cover,
  avatar,
  title,
  description,
  isVerified,
  ...restProps
}: CollectionHeaderProps) => {
  const CollectionHeaderClasses = CN(
    `collection-header w-full relative bg-cover bg-center bg-no-repeat overflow-hidden min-h-[487px]`,
    className
  )

  return (
    <>
      <div
        className={CollectionHeaderClasses}
        {...restProps}
        style={{
          backgroundImage: `url("${cover || '/img/dummy-collection-cover.png'}")`,
        }}>
        <span className='overflow absolute left-0 right-0 top-0 bottom-0 z-10 bg-[url("/img/collection-cover-overlay.png")] bg-cover bg-center bg-no-repeat blur-[150px]' />
        <span className='overflow absolute left-0 right-0 top-0 bottom-0 z-20  bg-collection-cover backdrop-blur-[4px]' />

        <div className='container relative z-30 flex items-center pt-[90px]'>
          <div className='flex w-full flex-col items-center gap-[24px] pb-[40px]'>
            <Avatar
              size='xl'
              className='rounded-full border-[4px] border-white bg-slate-900'
              image={avatar}
            />

            <div className='flex flex-col items-center gap-[20px]'>
              <div className='flex items-center gap-[8px]'>
                <h1 className='text-display-sm text-white'>{title}</h1>
                {isVerified && (
                  <i className='ri-checkbox-circle-fill pt-[7px] text-[24px] text-emerald-400' />
                )}
              </div>

              {description && (
                <p
                  className='max-w-[700px] text-center text-base text-white'
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <StatsCard className='relative z-30 mx-auto mt-[-50px] max-w-[728px]' />
    </>
  )
}

CollectionHeader.defaultProps = {}

export default CollectionHeader
