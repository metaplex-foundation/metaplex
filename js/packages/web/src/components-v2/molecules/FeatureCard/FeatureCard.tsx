import React, { FC } from 'react';
import CN from 'classnames';

export interface FeatureCardProps {
  [x: string]: any;
}

export const FeatureCard: FC<FeatureCardProps> = ({
  className,
  icon,
  heading,
  description,
  ...restProps
}: FeatureCardProps) => {
  const FeatureCardClasses = CN(
    `feature-card flex flex-col items-center gap-[20px] text-center`,
    className,
  );

  return (
    <div className={FeatureCardClasses} {...restProps}>
      {icon && (
        <img
          src={icon}
          className="h-[76px] w-[140px] object-contain mb-[8px]"
        />
      )}
      <h3 className="text-h5 text-N-800">{heading}</h3>
      <p
        className="text-N-600"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );
};

export default FeatureCard;
