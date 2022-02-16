/* eslint-disable no-param-reassign */
// https://github.com/tannerlinsley/react-table/discussions/1989
import React, { forwardRef, MutableRefObject, useEffect, useRef } from 'react'
import CN from 'classnames'

export interface CheckboxProps {
  [x: string]: any
  children?: any
  className?: string | undefined
  id?: string | undefined
  indeterminate?: boolean
  labelClassName?: string | undefined
  onChange?: any
  type?: 'checkbox' | undefined
}

const useCombinedRefs = (...refs: any[]): MutableRefObject<any> => {
  const targetRef = useRef()

  useEffect(() => {
    refs.forEach(ref => {
      if (!ref) return

      if (typeof ref === 'function') {
        ref(targetRef.current)
      } else {
        ref.current = targetRef.current
      }
    })
  }, [refs])

  return targetRef
}

export const CheckBox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      children,
      className,
      id,
      indeterminate,
      labelClassName,
      onChange,
      type,
      ...restProps
    }: CheckboxProps,
    ref: React.Ref<HTMLInputElement>
  ) => {
    const CheckboxClasses = CN(
      'checkbox flex items-start relative pl-[16px] min-h-[24px] cursor-pointer',
      className,
      {
        'checkbox--is-indeterminate': indeterminate,
      }
    )

    const defaultRef = React.useRef(null)
    const combinedRef = useCombinedRefs(ref, defaultRef)

    useEffect(() => {
      if (combinedRef?.current) {
        combinedRef.current.indeterminate = indeterminate || false
      }
    }, [combinedRef, indeterminate])

    return (
      <label className={CheckboxClasses} htmlFor={id}>
        <input
          id={id}
          type={type}
          ref={combinedRef}
          onChange={onChange}
          className='absolute w-0 h-0 opacity-0'
          {...restProps}
        />

        <span className='checkbox__checkmark w-[18px] h-[18px] bg-white border border-N-400 rounded-[4px] left-0 top-[12px] absolute' />

        {children && (
          <span
            className={CN(
              'checkbox__label text-md pl-[8px] select-none text-N-800',
              labelClassName
            )}>
            {children}
          </span>
        )}
      </label>
    )
  }
)

export default CheckBox

CheckBox.defaultProps = {
  children: null,
  className: undefined,
  id: undefined,
  indeterminate: false,
  onChange: undefined,
  type: 'checkbox',
}
