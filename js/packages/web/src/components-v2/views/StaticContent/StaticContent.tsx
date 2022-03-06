import React, { FC } from 'react'
import CN from 'classnames'
import { SampleKitchenSink } from '../../molecules/SampleKitchenSink'
import { Accordion } from '../../molecules/Accordion'

import { FAQ } from '../../../../dummy-data/faq'

export interface StaticContentProps {
  [x: string]: any
}

export const StaticContent: FC<StaticContentProps> = ({
  className,
  ...restProps
}: StaticContentProps) => {
  const StaticContentClasses = CN(`static-content`, className)

  const renderFaq = () => {
    return FAQ.map((faq: any, index: number) => {
      return (
        <Accordion
          key={index}
          id={index}
          heading={faq.heading}
          defaultOpen={faq.defaultOpen}
          headingClassName={CN('border-b text-lg text-gray-800 hover:text-B-400')}
          headingLabelClassName='text-lg py-[16px]'
          iconAlign='left'
        >
          {({ isOpen }) => {
            return (
              <div
                className={CN('w-full', {
                  'bg-gray-50 p-[28px] rounded-[8px]': isOpen,
                })}
              >
                {faq.body}
              </div>
            )
          }}
        </Accordion>
      )
    })
  }

  return (
    <div className={StaticContentClasses} {...restProps}>
      <div className='container py-[100px]'>
        <article className='prose max-w-[900px] mx-auto'>
          <h1>Help Guide</h1>

          <h3 className='mb-[20px]'>
            Learn about NFTs, how to setup an account, and explore FAQs.
          </h3>

          <div className='flex w-full mb-[20px]'>
            <div className='block'>
              <p>Stay safe!</p>

              <ul>
                <li>
                  The Coachella Collectibles NFT mint and auction are ONLY available on the official
                  marketplace & FTX.US.
                </li>
                <li>
                  NEVER share your FTX account information, seed phrase, or private key with
                  anybody.
                </li>
                <li>
                  Coachella and FTX will NEVER reach out to you directly to offer support, ask for
                  your FTX account information, ask you to connect your wallet, or ask you to send
                  funds to any wallets.
                </li>
                <li>
                  We will post official NFT information ONLY on our website, official social media
                  accounts, or official Discord server. We will NEVER do a surprise drop or a
                  limited sale. You will know in advance when it happens, and it will exclusively
                  come from an official account.
                </li>
              </ul>
            </div>

            <div className='flex flex-shrink-0 w-[300px] justify-center'>
              <img
                src='https://www.arweave.net/JTiKxsrAMYLrvnNaR2ha0PDslCKsvEyO9IRqXpOewDs?ext=png'
                alt='Static'
                className='object-cover object-center w-[200px] h-[200px] max-w-full rounded-[8px]'
              />
            </div>
          </div>

          <div className='flex flex-col mb-[40px]'>{renderFaq()}</div>

          <SampleKitchenSink />
        </article>
      </div>
    </div>
  )
}

export default StaticContent
