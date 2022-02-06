import React, { FC } from 'react';
import CN from 'classnames';

export interface BlogCardProps {
  [x: string]: any;
}

export const BlogCard: FC<BlogCardProps> = ({
  className,
  title,
  image,
  ...restProps
}: BlogCardProps) => {
  const BlogCardClasses = CN(
    `blog-card flex flex-col bg-gray-50 rounded-[8px] overflow-hidden h-full cursor-pointer hover:bg-gray-100 transition-all`,
    className,
  );

  return (
    <div className={BlogCardClasses} {...restProps}>
      <div className="flex">
        <img
          src={image}
          alt={title}
          className="h-[240px] w-full object-cover object-center"
        />
      </div>

      <div className="flex px-[40px] py-[40px]">
        <h3 className="text-lg line-clamp-2">{title}</h3>
      </div>
    </div>
  );
};

export default BlogCard;
