import React, { FC } from 'react';
import CN from 'classnames';
import SolanaIcon from '../../icons/Solana';

export interface ProjectCardProps {
  [x: string]: any;
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
    className,
  );

  return (
    <div className={ProjectCardClasses} {...restProps}>
      <div className="flex flex-shrink-0 h-full">
        <img
          src={image}
          alt={name}
          className="w-[80px] h-full object-cover object-center"
        />
      </div>

      <div className="flex items-center px-[16px] py-[16px] justify-between w-full">
        <div className="flex flex-col w-full">
          <span className="text-gray-800 text-h6 line-clamp-1">{name}</span>
          <span className="flex items-center text-gray-600 text-md gap-[4px]">
            <SolanaIcon width={16} height={16} />
            <span>{tag}</span>
          </span>
        </div>

        <div className="flex flex-shrink-0 ml-auto text-md">
          <span className="text-G-400">{rate}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
