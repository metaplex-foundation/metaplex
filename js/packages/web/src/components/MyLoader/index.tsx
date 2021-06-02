import React from "react"
import ContentLoader from "react-content-loader"

export const CardLoader = () => (
  <ContentLoader 
    speed={2}
    width={223}
    height={400}
    viewBox="0 0 250 400"
    backgroundColor="#0c0c0c"
    foregroundColor="#595959"
  >
    <rect x="9" y="0" rx="14" ry="14" width="232" height="240" /> 
    <circle cx="39" cy="296" r="15" /> 
    <rect x="24" y="251" rx="0" ry="6" width="123" height="21" /> 
    <rect x="24" y="322" rx="6" ry="6" width="44" height="25" /> 
    {/* <rect x="9" y="320" rx="5" ry="6" width="232" height="54" />  */}
  </ContentLoader>
)

export const ThreeDots = () => (
  <ContentLoader
    viewBox="0 0 212 200"
    height={200}
    width={212}
    backgroundColor="transparent"
    style={{
      width: "100%",
      margin: "auto",
    }}
  >
    <circle cx="86" cy="100" r="8" />
    <circle cx="106" cy="100" r="8" />
    <circle cx="126" cy="100" r="8" />
  </ContentLoader>
)
