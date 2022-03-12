import React from 'react'

export const Discord = ({ size = 28, color = 'currentColor', ...restProps }: any) => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 32 32'
      width={size}
      height={size}
      {...restProps}>
      <path fill='none' d='M0 0h24v24H0z' />
      <path
        d='M13.4347 14.6667C14.2347 14.6667 14.8827 15.2667 14.868 16.0001C14.868 16.7334 14.236 17.3334 13.4347 17.3334C12.648 17.3334 12 16.7334 12 16.0001C12 15.2667 12.6333 14.6667 13.4347 14.6667ZM18.5653 14.6667C19.3667 14.6667 20 15.2667 20 16.0001C20 16.7334 19.3667 17.3334 18.5653 17.3334C17.7787 17.3334 17.132 16.7334 17.132 16.0001C17.132 15.2667 17.764 14.6667 18.5653 14.6667ZM25.188 2.66675C26.7387 2.66675 28 3.95475 28 5.55075V30.6667L25.052 28.0067L23.392 26.4387L21.636 24.7721L22.364 27.3627H6.812C5.26133 27.3627 4 26.0747 4 24.4787V5.55075C4 3.95475 5.26133 2.66675 6.812 2.66675H25.1867H25.188ZM19.8947 20.9507C22.9253 20.8534 24.092 18.8227 24.092 18.8227C24.092 14.3147 22.116 10.6601 22.116 10.6601C20.1427 9.14941 18.2627 9.19075 18.2627 9.19075L18.0707 9.41475C20.4027 10.1427 21.4853 11.1934 21.4853 11.1934C20.2121 10.4761 18.8089 10.0192 17.3573 9.84941C16.4366 9.74542 15.5066 9.75438 14.588 9.87608C14.5053 9.87608 14.436 9.89075 14.3547 9.90408C13.8747 9.94675 12.708 10.1281 11.2413 10.7867C10.7347 11.0241 10.432 11.1934 10.432 11.1934C10.432 11.1934 11.5707 10.0867 14.0387 9.35875L13.9013 9.19075C13.9013 9.19075 12.0227 9.14941 10.048 10.6614C10.048 10.6614 8.07333 14.3147 8.07333 18.8227C8.07333 18.8227 9.22533 20.8521 12.256 20.9507C12.256 20.9507 12.7627 20.3214 13.176 19.7894C11.4333 19.2561 10.776 18.1361 10.776 18.1361C10.776 18.1361 10.912 18.2347 11.1587 18.3747C11.172 18.3881 11.1853 18.4027 11.2133 18.4161C11.2547 18.4454 11.296 18.4587 11.3373 18.4867C11.68 18.6827 12.0227 18.8361 12.3373 18.9627C12.9 19.1867 13.572 19.4107 14.3547 19.5654C15.5271 19.7952 16.7325 19.7998 17.9067 19.5787C18.5906 19.4567 19.2578 19.2549 19.8947 18.9774C20.3747 18.7947 20.9093 18.5281 21.472 18.1507C21.472 18.1507 20.7867 19.2987 18.9893 19.8174C19.4013 20.3494 19.896 20.9507 19.896 20.9507H19.8947Z'
        fill={color}
      />
    </svg>
  )
}

export default Discord
