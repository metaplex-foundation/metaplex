import React, { FC } from 'react';
import CN from 'classnames';

export interface SubmitCollectionProps {
  [x: string]: any;
}

export const SubmitCollection: FC<SubmitCollectionProps> = ({
  className,
  ...restProps
}: SubmitCollectionProps) => {
  const SubmitCollectionClasses = CN(`submit-collection`, className);

  return (
    <div className={SubmitCollectionClasses} {...restProps}>
      <div className="container flex flex-col items-center gap-[28px] text-center">
        <h2 className="text-h3 text-gray-800">Submit collection</h2>
        <p className="w-full max-w-[580px] text-gray-700">
          Do you have a Solana based NFT collection? Submit your collection
          below to be added to our Marketplace and shown to thousands of users!{' '}
          <a className="inline-flex items-center cursor-pointer text-B-400">
            Learn More <i className="ri-arrow-right-s-line" />
          </a>
        </p>

        <div className="w-full pt-[12px]">
          <button className="appearance-none h-[60px] inline-flex items-center justify-center px-[40px] bg-[linear-gradient(89.57deg,_#448fff_0.79%,_#0066D6_124%)] hover:bg-[linear-gradient(89.57deg,_#308fc5_0.79%,_#1a44af_124%)] rounded-full text-lg text-white w-full lg:w-[440px] outline-none">
            Apply here
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitCollection;
