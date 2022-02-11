import React, { FC } from 'react';
import CN from 'classnames';
import { mostActiveProjects } from '../../../../dummy-data/most-active';
import { ProjectCard } from '../../molecules/ProjectCard';
import {
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
} from '../../atoms/Dropdown';

export interface MostActiveProps {
  [x: string]: any;
}

export const MostActive: FC<MostActiveProps> = ({
  className,
  ...restProps
}: MostActiveProps) => {
  const MostActiveClasses = CN(`most-active`, className);

  return (
    <div className={MostActiveClasses} {...restProps}>
      <div className="container flex flex-col gap-[40px]">
        <div className="flex items-center gap-[12px]">
          <h2 className="text-h3">Most active</h2>
          <Dropdown>
            {({ isOpen, setIsOpen, innerValue, setInnerValue }: any) => {
              const onSelectOption = (value: string) => {
                setInnerValue(value);
                setIsOpen(false);
              };

              const options = [
                { id: 0, label: 'Today', value: 'today' },
                { id: 1, label: 'This week', value: 'thisWeek' },
                { id: 2, label: 'This month', value: 'thisMonth' },
              ];

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <button className="flex items-center text-B-400 text-h3 gap-[4px]">
                      <span>{innerValue || 'Today'}</span>
                      <i className="relative top-[2px] ri-arrow-down-s-line" />
                    </button>
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody
                      align="left"
                      className="w-[158px] shadow-lg shadow-B-700/5 border border-B-10"
                    >
                      {options.map((option: any, index: number) => {
                        const { label } = option;

                        return (
                          <DropDownMenuItem
                            key={index}
                            onClick={() => onSelectOption(label)}
                            {...option}
                          >
                            {label}
                          </DropDownMenuItem>
                        );
                      })}
                    </DropDownBody>
                  )}
                </>
              );
            }}
          </Dropdown>
        </div>

        <div className="grid grid-cols-3 gap-x-[32px] gap-y-[20px]">
          {mostActiveProjects.map((project: any, index: number) => {
            return <ProjectCard {...project} key={index} />;
          })}
        </div>
      </div>
    </div>
  );
};

export default MostActive;
