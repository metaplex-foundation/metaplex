import React from 'react';
import { Space, Typography } from 'antd';
const { Text } = Typography;

export const Banner = ({
  src,
  headingText,
  subHeadingText,
  actionComponent,
  children,
}: {
  src?: string;
  headingText: string;
  subHeadingText: string;
  actionComponent?: JSX.Element;
  children?: React.ReactNode;
}) => {
  // mock storefront, should receive as prop or provider instead
  const storefront = {
    meta: {
      social: {
        discord: 'hello',
        twitter: '',
        web: 'https://kristianeboe.me',
      },
    },
  };
  const social = storefront.meta.social;
  const hasSocial = Object.values(social).some(link => link);
  return (
    <div id="metaplex-banner">
      {src && <img id="metaplex-banner-backdrop" src={src} />}

      <div id="metaplex-banner-hero">
        <h1>{headingText}</h1>
        <Text>{subHeadingText}</Text>
        {hasSocial && (
          <Space
            align="center"
            direction="horizontal"
            id="metaplex-banner-hero-social"
          >
            <a href={social.discord}>
              <DiscordIcon />
            </a>
            {social.twitter && (
              <a href={social.twitter}>
                <TwitterIcon />
              </a>
            )}
            {social.web && (
              <a href={social.web}>
                <WebIcon />
              </a>
            )}
          </Space>
        )}
        {actionComponent}
      </div>
      {children}
    </div>
  );
};

const DiscordIcon = () => (
  <svg
    width="24"
    height="20"
    viewBox="0 0 24 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_7_280)">
      <path
        d="M20.317 2.35992C18.7873 1.65804 17.147 1.14092 15.4319 0.844748C15.4007 0.839032 15.3695 0.853317 15.3534 0.881887C15.1424 1.2571 14.9087 1.7466 14.7451 2.13134C12.9004 1.85518 11.0652 1.85518 9.25832 2.13134C9.09465 1.73805 8.85248 1.2571 8.64057 0.881887C8.62449 0.85427 8.59328 0.839985 8.56205 0.844748C6.84791 1.13998 5.20756 1.65709 3.67693 2.35992C3.66368 2.36563 3.65233 2.37516 3.64479 2.38754C0.533392 7.0359 -0.31895 11.57 0.0991801 16.0479C0.101072 16.0698 0.11337 16.0908 0.130398 16.1041C2.18321 17.6116 4.17171 18.5268 6.12328 19.1335C6.15451 19.143 6.18761 19.1316 6.20748 19.1058C6.66913 18.4754 7.08064 17.8107 7.43348 17.1116C7.4543 17.0707 7.43442 17.0221 7.39186 17.0059C6.73913 16.7583 6.1176 16.4564 5.51973 16.1136C5.47244 16.086 5.46865 16.0184 5.51216 15.986C5.63797 15.8917 5.76382 15.7936 5.88396 15.6946C5.90569 15.6765 5.93598 15.6727 5.96153 15.6841C9.88928 17.4774 14.1415 17.4774 18.023 15.6841C18.0485 15.6717 18.0788 15.6755 18.1015 15.6936C18.2216 15.7927 18.3475 15.8917 18.4742 15.986C18.5177 16.0184 18.5149 16.086 18.4676 16.1136C17.8697 16.4631 17.2482 16.7583 16.5945 17.005C16.552 17.0212 16.533 17.0707 16.5538 17.1116C16.9143 17.8097 17.3258 18.4744 17.7789 19.1049C17.7978 19.1316 17.8319 19.143 17.8631 19.1335C19.8241 18.5268 21.8126 17.6116 23.8654 16.1041C23.8834 16.0908 23.8948 16.0707 23.8967 16.0488C24.3971 10.8719 23.0585 6.37498 20.3482 2.38848C20.3416 2.37516 20.3303 2.36563 20.317 2.35992ZM8.02002 13.3213C6.8375 13.3213 5.86313 12.2357 5.86313 10.9024C5.86313 9.56911 6.8186 8.48347 8.02002 8.48347C9.23087 8.48347 10.1958 9.57865 10.1769 10.9024C10.1769 12.2357 9.22141 13.3213 8.02002 13.3213ZM15.9947 13.3213C14.8123 13.3213 13.8379 12.2357 13.8379 10.9024C13.8379 9.56911 14.7933 8.48347 15.9947 8.48347C17.2056 8.48347 18.1705 9.57865 18.1516 10.9024C18.1516 12.2357 17.2056 13.3213 15.9947 13.3213Z"
        fill="#23272A"
      />
    </g>
    <defs>
      <clipPath id="clip0_7_280">
        <rect
          width="24"
          height="18.5915"
          fill="white"
          transform="translate(0 0.704346)"
        />
      </clipPath>
    </defs>
  </svg>
);

const TwitterIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M23 3.00005C22.0424 3.67552 20.9821 4.19216 19.86 4.53005C19.2577 3.83756 18.4573 3.34674 17.567 3.12397C16.6767 2.90121 15.7395 2.95724 14.8821 3.2845C14.0247 3.61176 13.2884 4.19445 12.773 4.95376C12.2575 5.71308 11.9877 6.61238 12 7.53005V8.53005C10.2426 8.57561 8.50127 8.18586 6.93101 7.39549C5.36074 6.60513 4.01032 5.43868 3 4.00005C3 4.00005 -1 13 8 17C5.94053 18.398 3.48716 19.099 1 19C10 24 21 19 21 7.50005C20.9991 7.2215 20.9723 6.94364 20.92 6.67005C21.9406 5.66354 22.6608 4.39276 23 3.00005Z"
      fill="black"
    />
  </svg>
);

const WebIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="black"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 12H22"
      stroke="black"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2V2Z"
      stroke="black"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
