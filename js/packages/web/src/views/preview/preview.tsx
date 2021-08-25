import React, { useState } from 'react';
import useWindowDimensions from '../../utils/layout';
import {
  Layout,
  Col,
  Button,
  Menu, 
  Typography
} from 'antd';
import { useEffect } from 'react';
import { generateApe, clanList, clothesList, backgroundList, bodyList, eyesList, mouthList, headList, accessList } from './generate-ape';
import {TwitterShareButton, TelegramShareButton, WhatsappShareButton, FacebookShareButton, EmailShareButton, TelegramIcon, TwitterIcon, WhatsappIcon, FacebookIcon, EmailIcon}  from 'react-share';


const { Content } = Layout;
const { Title } = Typography;


export function Preview() {
  const { width } = useWindowDimensions();
  const [apeImg, setApeImg] = useState('/img/outline.jpg');
  const [loading, setLoading] = useState(true);

  const generate = async () => {
    const ape = await generateApe({});
    setApeImg(ape);
    setLoading(false);
  };

  useEffect(() => {
    generate();
  }, []);

  const loadImg = async () => {
    setLoading(true);
    await generate();
  };

  return (
    <Layout>
      <Content className="preview">
        <Col style={{ width: '100%' }}>
           <Title level={1}>Preview</Title>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              padding: width > 480 ? '2rem' : '1rem',
            }}
          >
            <div
              style={{
                width: width > 480 ? 420 : 320,
                boxShadow: '0px 5px 15px 1px rgba(0,0,0,0.16)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: 'column',
                backgroundColor: 'white',
                padding: '1rem',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  height: width > 480 ? 356 : 256,
                  width: width > 480 ? 356 : 256,
                  margin: '1rem auto',
                  border: '1px solid #ccc',
                }}
              >
                {apeImg && (
                  <img style={{ height: '100%', width: '100%' }} src={apeImg} />
                )}
              </div>

              <div
                style={{
                  height: '100%',
                  width: 'calc(100% - 2rem)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column',
                  color: 'black',
                }}
              >
                <Button
                  shape="round"
                  size="large"
                  style={{
                    margin: '0.5rem 0',
                    width: '100%',
                    padding: '0 1rem',
                  }}
                  type="primary"
                  loading={loading}
                  onClick={() => loadImg()}
                >
                  {!loading ? 'Preview random Ape' : 'Loading'}
                </Button>
                (watermarked)
              </div>
            </div>
            <div style={{
                width: width > 480 ? 420 : 320,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                margin: '1rem auto'
            }}>
              <TelegramShareButton title="Check out these Apes!" url="https://apeshit.social" >
                <TelegramIcon round={true}></TelegramIcon>
              </TelegramShareButton>
              <TwitterShareButton title="Check out these Apes!" url="https://apeshit.social" >
                <TwitterIcon round={true}></TwitterIcon>
              </TwitterShareButton>
              <WhatsappShareButton title="Check out these Apes!" url="https://apeshit.social" >
                <WhatsappIcon round={true}></WhatsappIcon>
              </WhatsappShareButton>
              <FacebookShareButton title="Check out these Apes!" url="https://apeshit.social" >
                <FacebookIcon round={true}></FacebookIcon>
              </FacebookShareButton>
              <EmailShareButton subject="Check out these Apes!" url="https://apeshit.social">
                <EmailIcon round={true}></EmailIcon>
              </EmailShareButton>
            </div>
          </div>

        </Col>
      </Content>
    </Layout>
  );
}
