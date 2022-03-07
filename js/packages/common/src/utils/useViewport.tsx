import { useEffect, useState } from 'react'
import { useMediaQuery } from './useMediaQuery'

export const useViewport = () => {
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)

  const isMobile = useMediaQuery('(min-width: 1px) and (max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1097px)')
  const isDesktop = useMediaQuery('(min-width: 1098px)')

  useEffect(() => {
    setWidth(window.innerWidth)
    setHeight(window.innerHeight)

    const handleWindowResize = () => {
      setWidth(window.innerWidth)
      setHeight(window.innerHeight)
    }

    window.addEventListener('resize', handleWindowResize)

    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  return { width, height, isMobile, isTablet, isDesktop }
}

export default useViewport
