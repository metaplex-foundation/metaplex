import React, { FC } from 'react'
import CN from 'classnames'
import { Logo, FieldGroup, LinkList } from '@oyster/common'

export interface FooterProps {
  [x: string]: any
}

export const Footer: FC<FooterProps> = ({ className, ...restProps }: FooterProps) => {
  const FooterClasses = CN(`footer w-full`, className)

  const copyrightDate = new Date().getFullYear()

  const footerBottomLinks = [
    {
      id: '0',
      label: 'Press',
      url: '/return-policy',
    },
    {
      id: '1',
      label: 'Terms',
      url: '/terms-of-condition',
    },
    {
      id: '2',
      label: 'Cookies',
      url: '/cookies',
    },
    {
      id: '3',
      label: 'Privacy',
      url: '/privacy-policy',
    },
  ]

  return (
    <div className={FooterClasses} {...restProps}>
      <div className='container border-t border-slate-100'>
        <div className='footer__top flex flex-col justify-between pt-[60px] pb-[40px] lg:grid lg:grid-cols-[1fr_2fr]'>
          <div className='footer__about flex max-w-[360px] flex-col gap-[24px]'>
            <div className='flex flex-col gap-[12px]'>
              <Logo />
              <span className='footer__bottom__copyrights text-sm font-400 text-slate-700'>
                Copyright © {copyrightDate} · Karmaplex
              </span>
            </div>

            <div className='flex flex-col gap-[16px]'>
              <h5 className='text-h5 font-600 leading-normal text-slate-900'>
                Get the latest updates
              </h5>

              <FieldGroup
                bgClassName='!bg-slate-50 !border-slate-100 focus-within:!border-slate-700'
                className='w-full lg:w-[unset]'
                btnProps={{
                  children: 'Subscribe',
                  onClick: (e: any) => {
                    console.log('Clicked', e)
                  },
                  appearance: 'neutral',
                }}
                inputProps={{
                  placeholder: 'Your email address',
                  onChange: (e: any) => {
                    console.log(e.target.value)
                  },
                }}
              />
            </div>

            <div className='flex flex-col justify-between gap-[16px]'>
              <ul className='flex gap-[24px]'>
                {(footerBottomLinks || []).map(
                  ({ id, link, label, ...restProps }: any, index: number) => (
                    <li key={id || index}>
                      <a href={link} {...restProps} className='text-sm font-500  hover:text-B-400'>
                        {label}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className='flex justify-between'>
            <div className='footer__link-list flex flex-col items-center border-l-[1px] px-[60px]'>
              <div className='flex flex-col gap-[24px]'>
                <h5 className='text-h5 font-600 text-slate-900'>Marketplace</h5>

                <LinkList
                  direction='vertical'
                  labelClassName='text-md font-500 text-slate-800'
                  list={[
                    { id: 0, label: 'Explore collections', url: '/discover' },
                    { id: 1, label: 'Submit collections', url: '/launchpad-submission' },
                    { id: 2, label: 'Help center (FAQ)', url: '#' },
                    { id: 3, label: 'Activity stats', url: '#' },
                  ]}
                />
              </div>
            </div>

            <div className='footer__link-list flex flex-col items-center border-l-[1px] px-[60px]'>
              <div className='flex flex-col gap-[24px]'>
                <h5 className='text-h5 font-600 text-slate-900'>Community</h5>

                <LinkList
                  direction='vertical'
                  labelClassName='text-md font-500 text-slate-800'
                  list={[
                    { id: 0, label: 'Communities', url: '/communities' },
                    { id: 1, label: 'Blog', url: '/blog' },
                    { id: 2, label: 'Resources', url: '/resources' },
                  ]}
                />
              </div>
            </div>

            <div className='footer__link-list flex flex-col items-center border-l-[1px] px-[60px]'>
              <div className='flex flex-col gap-[24px]'>
                <h5 className='text-h5 font-600 text-slate-900'>Karmaplex</h5>

                <LinkList
                  direction='vertical'
                  labelClassName='text-md font-500 text-slate-800'
                  list={[
                    { id: 0, label: 'Donate', url: '/donations' },
                    { id: 1, label: 'About', url: '/about' },
                    { id: 2, label: 'Mission', url: '/mission' },
                    { id: 3, label: 'Team', url: '/team' },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

Footer.defaultProps = {}

export default Footer
