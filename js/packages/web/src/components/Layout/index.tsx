import React from 'react'
import { Header } from '../../ui/sections/Header'
import { Footer } from '../../ui/sections/Footer'
import { SubFooter } from '../../ui/sections/SubFooter'

export const AppLayout = React.memo(function AppLayoutImpl(props: any) {
  const { children } = props
  return (
    <>
      <Header />
      <div className='wrapper'>{children}</div>
      <SubFooter />
      <Footer />
    </>
  )
})
