import React from 'react';
import { GithubOutlined, TwitterOutlined } from '@ant-design/icons';
import { Button } from 'antd';

export const Footer = () => {
  return (
    // <div className={'footer'}>
    //   <Button
    //     shape={'circle'}
    //     target={'_blank'}
    //     href={'https://github.com/metaplex-foundation/metaplex'}
    //     icon={<GithubOutlined />}
    //     style={{ marginRight: '20px' }}
    //   ></Button>
    //   <Button
    //     shape={'circle'}
    //     target={'_blank'}
    //     href={'https://twitter.com/solana'}
    //     icon={<TwitterOutlined />}
    //   ></Button>
    // </div>
    <section id="footer">
      <div className="container-fluid" style={{ margin: '0% 5%' }}>
        <div className="row">
          <div className="col-12 col-md-6">
            <p className="m-0">© Ninja Protocol All Right Reserved. 2021</p>
          </div>
          <div className="col-12 col-md-5">
            <ul className="d-flex justify-content-end">
              <li className="mr-1">
                <a href="#">
                  <img
                    src="/socialLinkIcons/twtr.svg"
                    alt="twitter"
                    className="img-fluid"
                  />
                </a>
              </li>
              <li className="mr-1">
                <a href="#">
                  <img
                    src="/socialLinkIcons/twitch.svg"
                    alt="twitch"
                    className="img-fluid"
                  />
                </a>
              </li>
              <li className="mr-1">
                <a href="#">
                  <img
                    src="/socialLinkIcons/discord.svg"
                    alt="discord"
                    className="img-fluid"
                  />
                </a>
              </li>
              <li className="mr-1">
                <a href="#">
                  <img
                    src="/socialLinkIcons/insta.svg"
                    alt="insta"
                    className="img-fluid"
                  />
                </a>
              </li>
              <li className="mr-1">
                <a href="#">
                  <img
                    src="/socialLinkIcons/youtube.svg"
                    alt="youtube"
                    className="img-fluid"
                  />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
