import React, { FC } from 'react'
import CN from 'classnames'
import { useViewport, SectionHeading, Quote } from '@oyster/common'
import { Breadcrumb, Collage } from '../../sections'

export interface AboutProps {
  [x: string]: any
}

const collageList = [
  {
    id: 0,
    image:
      'https://images.unsplash.com/photo-1612254437672-6202048cfa52?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80',
  },
  {
    id: 1,
    image:
      'https://images.unsplash.com/photo-1641391503184-a2131018701b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1180&q=80',
  },
  {
    id: 2,
    image:
      'https://images.unsplash.com/photo-1639628735078-ed2f038a193e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1674&q=80',
  },
  {
    id: 3,
    image:
      'https://images.unsplash.com/photo-1635492491273-455af7728453?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1560&q=80',
  },
  {
    id: 4,
    image:
      'https://images.unsplash.com/photo-1640747594869-6aaab78d24d6?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80',
  },
  {
    id: 5,
    image:
      'https://images.unsplash.com/photo-1637666505754-7416ebd70cbf?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1035&q=80',
  },
]

export const About: FC<AboutProps> = ({ className, ...restProps }: AboutProps) => {
  const AboutClasses = CN(`article w-full`, className)
  const { isDesktop, isMobile } = useViewport()

  return (
    <div className={AboutClasses} {...restProps}>
      <div className='layout pb-[60px] lg:pb-[140px]'>
        <div className='pb-[24px] pt-[20px] md:pb-[32px] lg:pb-[40px]'>
          <Breadcrumb
            links={[
              {
                id: 0,
                linkText: 'Home',
                link: '/',
                isActive: false,
              },
              {
                id: 1,
                linkText: 'About',
                link: '/about',
                isActive: true,
              },
            ]}
          />
        </div>

        <div className='container flex flex-col'>
          <div className='container__wrapper mx-auto max-w-[1048px]'>
            {/* Banner */}
            <div className='mb-[40px] flex h-[300px] w-full'>
              <img
                src='https://images.unsplash.com/photo-1625014618427-fbc980b974f5?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1364&q=80'
                className='h-full w-full rounded-[12px] object-cover object-center'
              />
            </div>

            {/* Header */}
            <div className='mb-[24px] flex w-full md:mb-[32px] lg:mb-[56px]'>
              <SectionHeading
                heading='About Karmaplex'
                headingElement='!text-display-lg'
                headingClassName='text-display-md md:text-display-lg'
                description="Everything's Simbelmynë roaming thinking waged ah hero plunder? Don't you leave him, Samwise Gamgee. Cross mirrors ancient tongue bled maggoty permitted Saruman's bur month nab birdsong."
                descriptionClassName='!text-slate-800 !max-w-full pt-[24px]'
                isReversed={false}
                containerClassName='!w-full'
              />
            </div>

            {/* About */}
            <article className='flex-full prose flex !max-w-full flex-col'>
              <h2>Defeat idea veil truly allies how voice Grma.</h2>
              <p>
                These terms and conditions apply to the use of this website and the ordering,
                purchase, fulfilment and delivery of products from www.labfriend.com.au (operated
                under licence within by the John Morris Scientific Pty Ltd).
                <span className='font-600'>
                  Wargs princeling level they're skewered advantage learned verge.
                </span>
                These Terms and Conditions contain important information about the ordering,
                processing, fulfilment and delivery of goods, including limitations of liability.
              </p>

              <h3>Prices and specifications</h3>

              <ul>
                <li>Dwarf-city bearing feared tingle ash stupid</li>
                <li>
                  Shakes appointed riddled dabbling recover Gundabad yammer smith steel
                  extraordinary?
                </li>
                <li>Prophecy actually birthright walks Braga?</li>
                <li>Beacons filthy Concerning Hobbits mindless legacy keeps?</li>
              </ul>

              <Collage
                list={[
                  collageList[0],
                  collageList[1],
                  collageList[2],
                  collageList[3],
                  collageList[4],
                  collageList[5],
                ]}
                className='not-prose my-[40px]'
                rowHeight={!isDesktop ? 200 : 340}
                colCount={isMobile ? 1 : 3}
              />

              <h3>Parting shirt tweens Hobbitses third surrounded mission guess</h3>

              <p>
                Star Esgaroth sealed riven deceived um? Helped facing pile shape set back Númenor.
                Enchanting liar cater father's shan't following gracious Orthanc. What about second
                breakfast?
              </p>

              <ol>
                <li>Dwarf-city bearing feared tingle ash stupid</li>
                <li>
                  Shakes appointed riddled dabbling recover Gundabad yammer smith steel
                  extraordinary?
                </li>
                <li>Westfold swiftly crawled bury folly</li>
                <li>Prophecy actually birthright walks Braga?</li>
              </ol>

              <h4>Prices and specifications</h4>

              <p>
                Licensed cloaked Barad-dûr famousest ish intact flying pathway breached retrieve.
                Elderly chap. Big grey beard, pointy hat. Lórien spirits hook legions washed safest
                homeless wielder fields capable tender
              </p>

              <Quote
                quote='“Explore this next greater frontier where the boundaries between work and higher purpose are merging into one, where doing good really is good for business.”'
                author='Richard Branson'
                className='not-prose my-[16px] md:my-[32px] lg:my-[48px]'
              />

              <h4>Crunchable asked slinker Greenway?</h4>
              <h5>Wargs princeling level they're skewered advantage learned verge</h5>

              <img
                src='https://images.unsplash.com/photo-1647514422086-18cde746fa26?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2232&q=80'
                className='h-[200px] w-full rounded-[12px] object-cover object-center md:h-[400px] lg:h-[600px]'
              />

              <p className='text-sm'>
                oid Proudfoots endure. Crunchable asked slinker Greenway? Talk sweet-taking pretend
                aged Frodo Baggins? 200 Crebain children's knowledge before. Bite motive champion
                thick finds quick Tauriel brink chiefest remuneration. All right, then. Keep your
                secrets. Doomed jealous guard riddled Sauron sires five-stringed blazing!.
              </p>

              <h3>Sed ut perspiciatis unde omnis</h3>

              <p>
                accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo
                inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
                ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
                consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About
