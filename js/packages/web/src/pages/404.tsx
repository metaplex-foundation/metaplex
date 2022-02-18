import { Space } from 'antd';
import React from 'react';

function NotFound() {
  return (
    <Space
      id="metaplex-not-found"
      className="metaplex-fullwidth"
      direction="vertical"
      align="center"
    >
      <h1>Storefront Not Found</h1>
      <p>
        Claim this storefront on <a href="https://holaplex.com">Holaplex</a>
      </p>
      <style jsx>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;800&display=swap');

          #metaplex-not-found {
            margin-top: 15vh;
            font-size: 20px;

            --ant-primary-color: #f03e92;
            --ant-primary-color-hover: lighten(#f03e92, 10);
            --ant-primary-color-active: darken(#f03e92, 10);
          }

          h1 {
            font-family: 'Nunito Sans', Verdana, Geneva, Tahoma, sans-serif;
            font-weight: 800;
          }
        `}
      </style>
    </Space>
  );
}

export default NotFound;
