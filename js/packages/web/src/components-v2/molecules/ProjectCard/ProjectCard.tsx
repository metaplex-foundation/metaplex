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
    `project-card flex items-center bg-N-50 hover:bg-N-100 rounded-[8px] overflow-hidden w-full cursor-pointer`,
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
          <span className="text-N-800 text-h6 line-clamp-1">{name}</span>
          <span className="flex items-center text-N-500 text-md gap-[4px]">
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
