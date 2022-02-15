import React, { FC } from 'react'
import CN from 'classnames'
import SolanaIcon from '../../icons/Solana'

export interface ProjectCardProps {
  [x: string]: any
}

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
