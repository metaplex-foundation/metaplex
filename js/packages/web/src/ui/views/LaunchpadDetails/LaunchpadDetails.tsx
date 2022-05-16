import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { LaunchpadTopBar, LaunchpadDetailCard, LaunchpadTabs } from '../../sections'
import { getFeaturedSubmission } from '../../../api'
import moment from 'moment'

export interface LaunchpadDetailsProps {
  [x: string]: any
}

export const LaunchpadDetails: FC<LaunchpadDetailsProps> = ({
  className,
  ...restProps
}: LaunchpadDetailsProps) => {
  const LaunchpadDetailsClasses = CN(`launchpad-details w-full`, className)
  const [heading, setHeading] = useState('The Stoned Frogs')
  const [description, setDescription] = useState(
    'A collection of 8,400 Stoned Frogs coming to grow $SEEDS and take over the cannabis world.'
  )
  const [longTermGoals, setLongTermGoals] = useState<string>('')
  const [teamDescription, setTeamDescription] = useState<string>('')
  const [image, setImage] = useState('/img/frog.png')
  const [launchTime, setLaunchTime] = useState<any>()
  const [primaryCategory, setPrimaryCategory] = useState()
  const [secondaryCategory, setSecondaryCategory] = useState()

  useEffect(() => {
    getFeaturedSubmission().then(submission => {
      setHeading(submission.collection_name)
      setDescription(submission.project_description)
      setImage(submission.collection_image_url)
      setLaunchTime(moment(submission.exp_mint_date).format('LL'))
      setLongTermGoals(submission.long_trm_goals)
      setTeamDescription(submission.team_description)
      if (submission.categories) {
        if (submission.categories.primaryCategory) {
          setPrimaryCategory(submission.categories.primaryCategory)
        }

        if (submission.categories.secondaryCategory) {
          setSecondaryCategory(submission.categories.secondaryCategory)
        }
      }
    })
  }, [])

  return (
    <div className={LaunchpadDetailsClasses} {...restProps}>
      <LaunchpadTopBar className='pt-[20px] pb-[40px]' />

      <div className='w-full pb-[60px]'>
        <div className='container flex flex-col gap-[40px] rounded border border-slate-200 bg-white p-[40px] shadow-card-light'>
          <div className='flex justify-between'>
            <div className='flex max-w-[564px] flex-col gap-[16px]'>
              <div className='flex flex-col gap-[16px]'>
                <h2 className='text-h2 font-500 text-slate-800'>{heading}</h2>
                <p className='text-base font-400 text-gray-800'>{description}</p>
              </div>

              <LaunchpadDetailCard
                price='Ⓞ 2.36 SOL'
                priceInDollars='$4.19'
                launchTime={launchTime}
              />

              <div className='flex gap-[16px]'>
                {primaryCategory && (
                  <div className='rounded-[4px] bg-red-100 px-[8px] py-[4px]'>
                    <p className='text-sm font-500 text-red-700'>{primaryCategory}</p>
                  </div>
                )}
                {secondaryCategory && (
                  <div className='rounded-[4px] bg-red-100 px-[8px] py-[4px]'>
                    <p className='text-sm font-500 text-red-700'>{secondaryCategory}</p>
                  </div>
                )}
              </div>
            </div>

            <div className='flex flex-shrink-0'>
              <img
                src={image}
                className='h-[332px] w-[500px] rounded-[12px] object-cover object-center'
              />
            </div>
          </div>

          <div className='flex w-full flex-col pt-[40px] pb-[40px]'>
            <LaunchpadTabs description={description} teamDescription={teamDescription} longTermGoals={longTermGoals} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaunchpadDetails
