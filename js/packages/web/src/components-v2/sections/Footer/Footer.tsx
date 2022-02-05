import React, { FC } from 'react';
import CN from 'classnames';
import { TextField } from '../../atoms/TextField';
import TwitterIcon from '../../icons/Twitter';
import InstagramIcon from '../../icons/Instagram';
import DiscordIcon from '../../icons/Discord';
import { Logo } from '../../atoms/Logo';

export interface FooterProps {
  [x: string]: any;
}

export const Footer: FC<FooterProps> = ({
  className,
  ...restProps
}: FooterProps) => {
  const FooterClasses = CN(`footer bg-N-500 py-[80px]`, className);

  return (
    <div className={FooterClasses} {...restProps}>
      <div className="container flex gap-[64px]">
        <div className="flex flex-col gap-[32px] w-full lg:w-[443px] flex-shrink-0">
          <div className="flex flex-col text-white gap-[16px]">
            <h3 className="text-h4">Stay up-to date</h3>
            <p>
              Subscribe to our newsletter to be on top of updates, announcements
              and more!
            </p>

            <div className="flex gap-[12px] pt-[8px]">
              <TextField placeholder="Your email address" />
              <button className="h-[48px] bg-B-400 hover:bg-B-500 rounded-[8px] px-[20px] w-[152px] uppercase text-md font-500 text-white">
                Submit
              </button>
            </div>
          </div>

          <div className="flex flex-col text-white gap-[20px]">
            <h3 className="text-h5">Join the community</h3>

            <div className="flex items-center gap-[20px]">
              <TwitterIcon className="cursor-pointer" width={48} height={48} />
              <InstagramIcon
                className="cursor-pointer"
                width={48}
                height={48}
              />
              <DiscordIcon className="cursor-pointer" width={48} height={48} />
            </div>
          </div>

          <div className="flex pt-[8px]">
            <Logo className="cursor-pointer" isInverted />
          </div>
        </div>

        <div className="flex text-white gap-[40px] justify-between w-full pt-[120px]">
          <div className="flex flex-col gap-[20px]">
            <h3 className="text-h5">Marketplace</h3>

            <div className="flex flex-col gap-[8px]">
              <a href="#" className="text-base text-white hover:text-white/70">
                Explore
              </a>

              <a href="#" className="text-base text-white hover:text-white/70">
                Donate
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-[20px]">
            <h3 className="text-h5">Resources</h3>

            <div className="flex flex-col gap-[8px]">
              <a href="#" className="text-base text-white hover:text-white/70">
                Learn
              </a>

              <a href="#" className="text-base text-white hover:text-white/70">
                FAQ
              </a>

              <a href="#" className="text-base text-white hover:text-white/70">
                Blog
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-[20px]">
            <h3 className="text-h5">Stats</h3>

            <div className="flex flex-col gap-[8px]">
              <a href="#" className="text-base text-white hover:text-white/70">
                Activity
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-[20px]">
            <h3 className="text-h5">Company</h3>

            <div className="flex flex-col gap-[8px]">
              <a href="#" className="text-base text-white hover:text-white/70">
                About
              </a>

              <a href="#" className="text-base text-white hover:text-white/70">
                Mission
              </a>

              <a href="#" className="text-base text-white hover:text-white/70">
                Team
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
