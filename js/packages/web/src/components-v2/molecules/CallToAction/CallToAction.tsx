import React, { FC } from 'react';
import CN from 'classnames';

export interface CallToActionProps {
  [x: string]: any;
}

export const CallToAction: FC<CallToActionProps> = ({
  className,
  ...restProps
}: CallToActionProps) => {
  const CallToActionClasses = CN(`call-to-action`, className);

  return (
    <div className={CallToActionClasses} {...restProps}>
      <div className="container">
        <div className="flex flex-col rounded-[28px] bg-[linear-gradient(94.38deg,_#448FFF_1.06%,_#444BFF_107.04%)] pt-[72px] pb-[32px] items-center justify-center text-center gap-[20px] relative">
          <span className='absolute top-0 bottom-0 left-0 right-0 bg-[url("/img/branding-bg-1.png")] bg-contain' />
          <h2 className="relative z-10 text-white text-h2">
            Launch Your Project
            <br />
            Using Our Launchpad
          </h2>
          <p className="relative z-10 text-white/80">Click to apply</p>
        </div>
      </div>
    </div>
  );
};

export default CallToAction;
