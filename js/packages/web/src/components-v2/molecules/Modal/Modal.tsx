import React, { FC, useEffect } from 'react'
import CN from 'classnames'
import CloseIcon from '../../icons/Close'

export interface ModalProps {
  [x: string]: any
  heading?: string | undefined
  onClose?: any
  isFixed?: boolean
  size?: 'default' | 'sm' | 'md' | 'lg'
}

export const Modal: FC<ModalProps> = ({
  children,
  className,
  heading,
  onClose,
  size,
  isFixed,
  ...restProps
}: ModalProps) => {
  const ModalClasses = CN(
    `modal fixed top-0 right-0 bottom-0 left-0 bg-blue-900/5 backdrop-blur-sm overflow-auto z-50 min-h-[100vh]`,
    className
  )

  useEffect(() => {
    if (document) {
      document.body.style.overflow = 'hidden'
    }
  }, [])

  const modalClose = (e: any) => {
    e.preventDefault()
    document.body.style.overflow = 'unset'
    onClose()
  }

  const paddingClass = CN({
    'px-[32px]': size === 'default' || size === 'lg',
    'px-[16px]': size === 'sm',
  })

  return (
    <div className={ModalClasses} {...restProps}>
      <span className='absolute top-0 bottom-0 left-0 right-0' onClick={modalClose} />

      <div
        className={CN(
          'relative bg-white modal__container left-[50%] translate-x-[-50%] rounded-[8px] shadow-lg shadow-blue-900/10 w-[calc(100%-16px)]',
          {
            'max-w-[616px]': size === 'default',
            'max-w-[292px]': size === 'sm',
            'max-w-[800px]': size === 'lg',
            'top-[50%] translate-y-[-50%]': isFixed,
            'mt-[85px] mb-[100px]': !isFixed,
          }
        )}
      >
        <div
          className={CN(
            'flex items-center justify-between modal__header bg-white flex-shrink-0 rounded-t-[8px]',
            paddingClass,
            {
              'h-[60px]': size === 'default' || size === 'lg',
              'border-b border-gray-200': heading,
            }
          )}
        >
          {heading && <h2 className='text-gray-800 text-h6'>{heading}</h2>}
          <button className='ml-auto appearance-none hover:text-B-400' onClick={e => modalClose(e)}>
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        <div
          className={CN('modal__body', paddingClass, {
            'pb-[40px] min-h-[auto]': size === 'default',
            'pb-[20px] min-h-[auto]': size === 'sm',
          })}
        >
          <div className={CN('flex w-full', {})}>
            {typeof children === 'function' ? children({ modalClose }) : children}
          </div>
        </div>
      </div>
    </div>
  )
}

Modal.defaultProps = {
  size: 'default',
  isFixed: true,
}

export default Modal
