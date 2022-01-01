import React from 'react';
import ContentLoader from 'react-content-loader';
import { Instagram } from 'react-content-loader'

const rows = 2
const columns = 5
const coverHeight = 85
const coverWidth = 65
const padding = 5
const speed = 1

const coverHeightWithPadding = coverHeight + padding
const coverWidthWithPadding = coverWidth + padding
const initial = 35
const covers = Array(columns * rows).fill(1)



export const ThreeDots = ({ style }: { style?: React.CSSProperties }) => (
  <ContentLoader
    viewBox="0 0 212 200"
    height={200}
    width={212}
    backgroundColor="transparent"
    style={{
      width: '100%',
      margin: 'auto',
      ...style,
    }}
  >
    <circle cx="86" cy="100" r="8" />
    <circle cx="106" cy="100" r="8" />
    <circle cx="126" cy="100" r="8" />
  </ContentLoader>
);



export const NetflixLoader = props => {
  // Get values from props
  // const { rows, columns, coverHeight, coverWidth, padding, speed } = props;

  // Hardcoded values
  const rows = 2
  const columns = 5
  const coverHeight = 85
  const coverWidth = 65
  const padding = 5
  const speed = 1

  const coverHeightWithPadding = coverHeight + padding
  const coverWidthWithPadding = coverWidth + padding
  const initial = 35
  const covers = Array(columns * rows).fill(1)

  return (
    <ContentLoader
      speed={speed}
      width={columns * coverWidthWithPadding}
      height={rows * coverHeightWithPadding}
      primaryColor="#242b34"
      secondaryColor="#343d4c"
      {...props}
    >
      <rect
        x="0"
        y="0"
        rx="0"
        ry="0"
        width={columns * coverWidthWithPadding - padding}
        height="20"
      />

      {covers.map((g, i) => {
        let vy = Math.floor(i / columns) * coverHeightWithPadding + initial
        let vx = (i * coverWidthWithPadding) % (columns * coverWidthWithPadding)
        return (
          <rect
            key={i}
            x={vx}
            y={vy}
            rx="0"
            ry="0"
            width={coverWidth}
            height={coverHeight}
          />
        )
      })}
    </ContentLoader>
  )
}

NetflixLoader.metadata = {
  name: 'Pratik Pathak',
  github: 'PathakPratik',
  description: 'Netflix Style Dynamic',
  filename: 'Netflix',
}



export const CardLoader = props => {
  
  return (
  <ContentLoader
  viewBox="0 0 400 160"
  height={160}
  width={400}
  backgroundColor="transparent"
  {...props}
>
  <circle cx="150" cy="86" r="8" />
  <circle cx="194" cy="86" r="8" />
  <circle cx="238" cy="86" r="8" />
</ContentLoader>
)
  }

  CardLoader.metadata = {
name: 'RioF',
github: 'clariokids',
description: 'Three Dots',
filename: 'ThreeDots',
}

