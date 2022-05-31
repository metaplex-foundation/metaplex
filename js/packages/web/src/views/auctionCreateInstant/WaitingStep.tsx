import React, { useEffect, useState } from 'react'
import { Progress } from 'antd'

const WaitingStep = (props: { createAuction: () => Promise<void>; confirm: () => void }) => {
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    const func = async () => {
      const inte = setInterval(() => setProgress(prog => Math.min(prog + 1, 99)), 600)
      await props.createAuction()
      clearInterval(inte)
      props.confirm()
    }
    func()
  }, [])

  return (
    <div
      style={{
        marginTop: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
      <Progress type='circle' percent={progress} />
      <div className='waiting-title'>Your creation is being listed with Metaplex...</div>
      <div className='waiting-subtitle'>This can take up to 30 seconds.</div>
    </div>
  )
}

export default WaitingStep
