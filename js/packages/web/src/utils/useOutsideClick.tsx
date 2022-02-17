import { useEffect } from 'react'

/**
 * Hook to handle outside click of dropdown
 */
export const useOutsideClick = (ref: any, callBack?: any, ignoreRef?: any) => {
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref?.current && !ref.current.contains(event.target) && !ignoreRef) {
        callBack()
      }

      if (
        ref?.current &&
        !ref?.current?.contains(event.target) &&
        ignoreRef?.current &&
        !ignoreRef.current.contains(event.target)
      ) {
        callBack()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ref])
}
