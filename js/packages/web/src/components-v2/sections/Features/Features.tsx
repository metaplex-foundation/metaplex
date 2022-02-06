import React, { FC } from 'react';
import CN from 'classnames';
import { FeatureCard } from '../../molecules/FeatureCard';

export interface FeaturesProps {
  [x: string]: any;
}

export const Features: FC<FeaturesProps> = ({
  className,
  ...restProps
}: FeaturesProps) => {
  const FeaturesClasses = CN(`features`, className);

  return (
    <div className={FeaturesClasses} {...restProps}>
      <div className="container flex flex-col items-center gap-[60px]">
        <h2 className="text-h3 text-gray-800">What makes us different</h2>

        <div className="grid grid-cols-3 gap-[100px] w-full">
          <FeatureCard
            icon="/svg/icon-1.svg"
            heading="Donations Every Purchase"
            description="Our marketplace charges 1% royalties on every transaction and we donate a portion of every sell to charities from around the world, including charities that are important to you."
          />
          <FeatureCard
            icon="/svg/icon-2.svg"
            heading="Community Rewards"
            description="Our marketplace charges 1% royalties on every transaction, while donating a portion, we are also focusing on utilizing a percentage of proceeds in the form of community rewards."
          />
          <FeatureCard
            icon="/svg/icon-3.svg"
            heading="Curated Collections"
            description='We take pride in listing collections that are in alignment with <a href="#">our beliefs</a>, and are healthy to the ecosystem. We are not going to list NSFW or low-effort cash grabs on Karmaverse.'
          />
        </div>
      </div>
    </div>
  );
};

export default Features;
