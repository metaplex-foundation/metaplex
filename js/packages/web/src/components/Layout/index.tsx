import React, { FC } from 'react'
import { Header } from '../../ui/sections/Header'
import { Footer } from '../../ui/sections/Footer'
import { SubFooter } from '../../ui/sections/SubFooter'

export const AppLayout: FC = React.memo(function AppLayoutImpl({ children }) {
  return (
    <>
      <Header />
      <div className='wrapper'>{children}</div>
      <SubFooter />
      <Footer />
    </>
  )
})
