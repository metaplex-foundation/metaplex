import React, { FC } from 'react';
import CN from 'classnames';
import { heroSlider } from '../../../../dummy-data/hero-slider';
import { CardPreview } from '../../molecules/CardPreview';

export interface HeroProps {
  [x: string]: any;
}

export const Hero: FC<HeroProps> = ({ className, ...restProps }: HeroProps) => {
  const HeroClasses = CN(
    `hero bg-[url("/img/hero-bg.png")] py-[148px] bg-cover bg-center mt-[85px]`,
    className,
  );

  return (
    <div className={HeroClasses} {...restProps}>
      <div className="container flex items-center justify-between">
        <div className="flex flex-col text-white">
          <h1 className="text-white text-h1 font-600 w-full max-w-[472px] mb-[24px]">
            Buy, sell, trade <br />
            eco-friendly NFTs
          </h1>

          <p className="text-lg w-full max-w-[472px] mb-[20px]">
            Karmaverse is an eco-friendly NFT exchange that rewards users for
            their activity and donates a portion of every trade to charitable
            causes.
          </p>

          <a href="#" className="text-G-100 hover:text-G-200 mb-[40px] gap-[4px] flex items-center">
            Learn more <i className="ri-arrow-right-s-line" />
          </a>

          <div className="flex items-center gap-[28px] w-full max-w-[472px]">
            <button className="h-[48px] bg-B-400 hover:bg-B-500 rounded-full px-[20px] w-full uppercase text-md font-500">
              Browse
            </button>

            <button className="h-[48px] bg-P-400 hover:bg-P-500 rounded-full px-[20px] w-full uppercase text-md font-500">
              Donate
            </button>
          </div>
        </div>

        <div className="flex">
          <CardPreview list={heroSlider} />
        </div>
      </div>
    </div>
  );
};

export default Hero;
