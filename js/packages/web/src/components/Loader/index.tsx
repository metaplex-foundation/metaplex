import { useMeta, Loader } from '@oyster/common'
import React, { FC } from 'react'

export const LoaderProvider: FC = ({ children }) => {
  const { isLoading } = useMeta()

  return (
    <>
      {isLoading && (
        <div
          className={`loader-container fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-white`}>
          <div className='loader-block flex flex-col justify-center gap-[20px]'>
            <Loader />
            <h3>Processing your experience</h3>
          </div>
        </div>
      )}

      {children}
    </>
  )
}
