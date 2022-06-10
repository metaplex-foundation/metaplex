import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { SectionHeading, LaunchCard } from '@oyster/common'
import { FeaturedLaunchCard } from '../../sections'
import { useHistory } from 'react-router-dom'
import moment from 'moment'
import { getFeaturedSubmission, getSubmissions } from '../../../api'

export interface LaunchpadProps {
  [x: string]: any
}

interface ILaunchpadCard {
  id: string;
  collection_name: string;
  collection_image_url: string;
  exp_mint_date: string;
  mint_price: string;
}

export const Launchpad: FC<LaunchpadProps> = ({ className, ...restProps }: LaunchpadProps) => {
  const { push } = useHistory()
  const LaunchpadClasses = CN(`launchpad container pt-[80px] pb-[100px]`, className)
  const [heading, setHeading] = useState('The Stoned Frogs')
  const [description, setDescription] = useState(
    'A collection of 8,400 Stoned Frogs coming to grow $SEEDS and take over the cannabis world.'
  )
  const [image, setImage] = useState('/img/frog.png')
  const [navigatePage, setNavigatePage] = useState('stoned-frogs')
  const [submissions, setSubmissions] = useState<ILaunchpadCard[]>([])

  useEffect(() => {
    getFeaturedSubmission().then(submission => {
      setHeading(submission.collection_name)
      setDescription(submission.project_description)
      setImage(submission.collection_image_url)
      setNavigatePage(submission.collection_name_query_string.replace('%', '-').toLowerCase())
    })

    getSubmissions().then(submissions => {
      setSubmissions((submissions?.data.data || []).filter(i => i?.actions?.status === "Approved"))
    })
  }, [])

  return (
    <div className={LaunchpadClasses} {...restProps}>
      <SectionHeading
        heading='Karmaplex Launchpad'
        align='center'
        headingClassName='text-display-md text-gray-900 font-400'
        description='Launching the most amazing projects by most <br/> amazing artists around the world.'
        descriptionClassName='text-gray-600 text-md'
      />

      <div className='pt-[80px]'>
        <FeaturedLaunchCard
          tagText='FEATURED LAUNCH'
          heading={heading}
          description={
            description && description.length >= 250
              ? `${description.slice(0, 250)}.....`
              : description
          }
          image={image}
          onClickButton={() => push(`/launchpad/${navigatePage}`)}
        />
      </div>

      {submissions.length > 0 && (
        <div className='pt-[80px]'>
          <SectionHeading overline='🤠 Promising' heading='Upcoming launches' />

          <div className='pt-[60px]'>
            <ul className='grid grid-cols-4 gap-[32px]'>
              {submissions.map((submission: ILaunchpadCard, index) => (
                <li key={submission.id || index}>
                  <LaunchCard
                    name={submission.collection_name}
                    image={submission.collection_image_url}
                    price={`Ⓞ ${parseFloat(submission.mint_price).toFixed(2)} SOL`}
                    dollarValue={'$102.97'}
                    onClickButton={() => push(`/launchpad/${submission.collection_name.replace('%', '-')}`)}
                    remainingTime={moment(submission.exp_mint_date).format('LL')}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default Launchpad
