import React from 'react';

const SmallLoader = () => {
  return (
    <div className="small-loader">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0V2.63719C11.9547 2.63655 11.9093 2.63623 11.8638 2.63623C6.61706 2.63623 2.36377 6.88952 2.36377 12.1362C2.36377 17.3829 6.61706 21.6362 11.8638 21.6362C17.1105 21.6362 21.3638 17.3829 21.3638 12.1362C21.3638 12.0907 21.3634 12.0453 21.3628 12H24Z" fill="url(#paint0_angular_379_3911)"/>
        <defs>
          <radialGradient id="paint0_angular_379_3911" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(-90) scale(12)">
            <stop offset="0.237284" stopColor="white" stopOpacity="0"/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1" stopColor="white"/>
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}

export default SmallLoader;
