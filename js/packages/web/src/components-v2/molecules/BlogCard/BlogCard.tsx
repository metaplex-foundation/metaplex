import React, { FC } from 'react'
import CN from 'classnames'

export interface BlogCardProps {
  [x: string]: any
}

export const BlogCard: FC<BlogCardProps> = ({
  className,
  title,
  image,
  ...restProps
}: BlogCardProps) => {
  const BlogCardClasses = CN(
    `blog-card flex flex-col bg-gray-50 rounded-[8px] overflow-hidden h-full cursor-pointer hover:bg-gray-100 transition-all`,
    className
  )

  return (
    <div className={BlogCardClasses} {...restProps}>
      <div className='flex'>
        <img
          src={image}
          alt={title}
          className='h-[200px] w-full object-cover object-center lg:h-[240px]'
        />
      </div>

      <div className='flex py-[20px] px-[20px] lg:py-[40px] lg:px-[40px]'>
        <h3 className='line-clamp-2 lg:text-lg'>{title}</h3>
      </div>
    </div>
  )
}

export default BlogCard
