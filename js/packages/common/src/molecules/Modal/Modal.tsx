import React, { FC } from 'react'
import CN from 'classnames'

export interface ModalProps {
  [x: string]: any
  onClose?: any
  onClickOverlay?: any
  size?: 'sm' | 'md' | 'lg'
  heading?: any
}

export const Modal: FC<ModalProps> = ({
  className,
  children,
  onClose,
  size,
  heading,
  onClickOverlay,
  ...restProps
}: ModalProps) => {
  const ModalClasses = CN(`modal fixed top-0 bottom-0 left-0 right-0 z-[1000]`, className)

  return (
    <div className={ModalClasses} {...restProps}>
      <span
        onClick={onClickOverlay}
        className='fixed top-0 bottom-0 left-0 right-0 bg-[#1E293B]/70'
      />
      <div
        className={CN(
          'modal__body absolute left-[50%] top-[20vh] w-full translate-x-[-50%] rounded bg-white',
          {
            'max-w-[860px]': size === 'lg',
            'max-w-[340px]': size === 'sm',
          }
        )}>
        <div
          className={CN('modal__header flex w-full items-center justify-between', {
            'px-[40px] pt-[24px]': size === 'lg',
            'px-[20px] pt-[16px]': size === 'sm',
            'pb-[24px]': heading && size === 'lg',
            'pb-none': heading && size === 'sm',
          })}>
          <h2 dangerouslySetInnerHTML={{ __html: heading || '' }} />
          {onClose && (
            <button onClick={onClose} className='ml-auto'>
              <i className='ri-close-line text-[24px]' />
            </button>
          )}
        </div>

        <div
          className={CN('modal__content', {
            'px-[40px] pb-[40px]': size === 'lg',
            'px-[20px] pb-[20px]': size === 'sm',
          })}>
          {children}
        </div>
      </div>
    </div>
  )
}

Modal.defaultProps = {
  size: 'lg',
}

export default Modal
