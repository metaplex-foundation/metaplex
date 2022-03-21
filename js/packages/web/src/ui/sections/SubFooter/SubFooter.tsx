import React, { FC, ReactNode } from 'react'
import CN from 'classnames'
import { Discord, Instagram, Reddit, Telegram, Twitter } from '@oyster/common'

export interface SubFooterProps {
  [x: string]: any
  heading?: string
  list?: any[]
  icon?: string | ReactNode
}

const list = [
  { id: 0, url: '#', icon: <Twitter size={32} /> },
  { id: 1, url: '#', icon: <Discord size={32} /> },
  { id: 2, url: '#', icon: <Reddit size={32} /> },
  { id: 3, url: '#', icon: <Telegram size={32} /> },
  { id: 4, url: '#', icon: <Instagram size={32} /> },
]

export const SubFooter: FC<SubFooterProps> = ({
  className,
  heading,
  ...restProps
}: SubFooterProps) => {
  const SubFooterClasses = CN(`sub-footer w-full`, className)

  return (
    <div className={SubFooterClasses} {...restProps}>
      <div className='container flex flex-col items-center justify-center gap-[40px] border-t border-slate-100 py-[60px]'>
        <h3 className='text-display-sm font-400 leading-[normal] text-slate-900'>
          {heading || 'Join our communities'}
        </h3>

        <ul className='flex gap-[28px]'>
          {(list || []).map(({ id, url, icon }, index) => (
            <li key={id || index}>
              <a target='_blank' href={url} className='text-slate-900 hover:text-B-base' rel="noreferrer">
                {icon}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

SubFooter.defaultProps = {}

export default SubFooter
