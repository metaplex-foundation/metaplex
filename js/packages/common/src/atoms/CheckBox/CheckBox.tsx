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
          className='absolute h-0 w-0 opacity-0'
          {...restProps}
        />

        <span className='checkbox__checkmark absolute left-0 top-[12px] h-[18px] w-[18px] rounded-[4px] border border-N-400 bg-white' />

        {children && (
          <span
            className={CN(
              'checkbox__label select-none pl-[8px] text-md text-N-800',
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
