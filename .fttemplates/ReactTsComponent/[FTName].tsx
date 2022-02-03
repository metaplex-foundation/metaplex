import React, { FC } from 'react'
import CN from 'classnames'

export interface <FTName>Props {
  [x: string]: any
}

export const <FTName>: FC<<FTName>Props> = ({
  className,
  ...restProps
}: <FTName>Props) => {
  const <FTName>Classes = CN(`<FTName | kebabcase>`, className)

  return (
    <div className={<FTName>Classes} {...restProps}>
      <FTName | kebabcase> is working...
    </div>
  )
}

export default <FTName>
