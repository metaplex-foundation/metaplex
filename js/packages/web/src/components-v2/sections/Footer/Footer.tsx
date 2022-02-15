import React, { FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'
import { TextField } from '../../atoms/TextField'
import TwitterIcon from '../../icons/Twitter'
import InstagramIcon from '../../icons/Instagram'
import DiscordIcon from '../../icons/Discord'
import { Logo } from '../../atoms/Logo'

export interface FooterProps {
  [x: string]: any
}

export const Footer: FC<FooterProps> = ({ className, ...restProps }: FooterProps) => {
  const FooterClasses = CN(`footer bg-gray-500 py-[40px] md:py-[80px] lg:py-[80px]`, className)

  return (
    <div className={FooterClasses} {...restProps}>
      <div className='container flex flex-col gap-[20px] lg:flex-row lg:gap-[64px]'>
        <div className='flex w-full flex-shrink-0 flex-col gap-[32px] lg:w-[443px]'>
          <div className='flex flex-col gap-[16px] text-center text-white md:text-left lg:text-left'>
            <h3 className='text-h4 text-white'>Stay up-to date</h3>
            <p>Subscribe to our newsletter to be on top of updates, announcements and more!</p>

            <div className='flex gap-[12px] pt-[8px]'>
              <TextField placeholder='Your email address' />
              <button className='h-[48px] w-[152px] rounded-[8px] bg-B-400 px-[20px] text-md font-500 uppercase text-white hover:bg-B-500'>
                Submit
              </button>
            </div>
          </div>

          <div className='flex flex-col gap-[20px] text-white'>
            <h3 className='text-center text-h5 text-white md:text-left lg:text-left'>
              Join the community
            </h3>

            <div className='flex items-center justify-center gap-[20px] md:justify-start lg:justify-start'>
              <TwitterIcon className='cursor-pointer' width={48} height={48} />
              <InstagramIcon className='cursor-pointer' width={48} height={48} />
              <DiscordIcon className='cursor-pointer' width={48} height={48} />
            </div>
          </div>

          <div className='flex justify-center pt-[8px] md:justify-start lg:justify-start'>
            <Logo className='cursor-pointer' isInverted />
          </div>
        </div>

        <div className='grid w-full grid-cols-1 gap-[40px] pt-[20px] text-center text-white md:grid-cols-4 md:text-left lg:flex lg:justify-between lg:pt-[120px] lg:text-left'>
          <div className='flex flex-col gap-[8px] md:gap-[20px] lg:gap-[20px]'>
            <h3 className='text-h5 text-white'>Marketplace</h3>

            <div className='flex flex-col gap-[8px]'>
              <Link to='/static-content'>
                <a href='#' className='text-base text-white hover:text-white/70'>
                  Explore
                </a>
              </Link>

              <a href='#' className='text-base text-white hover:text-white/70'>
                Donate
              </a>
            </div>
          </div>

          <div className='flex flex-col gap-[8px] md:gap-[20px] lg:gap-[20px]'>
            <h3 className='text-h5 text-white'>Resources</h3>

            <div className='flex flex-col gap-[8px]'>
              <a href='#' className='text-base text-white hover:text-white/70'>
                Learn
              </a>

              <a href='#' className='text-base text-white hover:text-white/70'>
                FAQ
              </a>

              <a href='#' className='text-base text-white hover:text-white/70'>
                Blog
              </a>
            </div>
          </div>

          <div className='flex flex-col gap-[8px] md:gap-[20px] lg:gap-[20px]'>
            <h3 className='text-h5 text-white'>Stats</h3>

            <div className='flex flex-col gap-[8px]'>
              <a href='#' className='text-base text-white hover:text-white/70'>
                Activity
              </a>
            </div>
          </div>

          <div className='flex flex-col gap-[8px] md:gap-[20px] lg:gap-[20px]'>
            <h3 className='text-h5 text-white'>Company</h3>

            <div className='flex flex-col gap-[8px]'>
              <a href='#' className='text-base text-white hover:text-white/70'>
                About
              </a>

              <a href='#' className='text-base text-white hover:text-white/70'>
                Mission
              </a>

              <a href='#' className='text-base text-white hover:text-white/70'>
                Team
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Footer
