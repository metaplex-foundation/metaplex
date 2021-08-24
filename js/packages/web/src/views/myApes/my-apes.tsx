import React from 'react';
import { Layout, Typography, Tooltip, Button, Popover, message } from 'antd';
import { ApeTag } from '../../components/ApeTag/ape-tag';
import { DollarCircleOutlined, InfoCircleOutlined, LinkOutlined, ShareAltOutlined } from '@ant-design/icons';
import { EmailIcon, EmailShareButton, FacebookIcon, FacebookShareButton, TelegramIcon, TelegramShareButton, TwitterIcon, TwitterShareButton, WhatsappIcon, WhatsappShareButton } from 'react-share';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { getRarityForApe, useApes, useMeta } from '../../contexts';
import { CachedImageContent } from '../../components/ArtContent';
import useWindowDimensions from '../../utils/layout';
import { useWallet, ConnectButton } from '@oyster/common';
import { Link } from 'react-router-dom';

const {Title} = Typography;

const shareButtons = ({ url }: { url: string }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '1rem'
  }}>
    <CopyToClipboard text={url} onCopy={() => {
      message.info('Copied to clipboard!', 1)
    }}>
      <div style={{
        borderRadius: '50%',
        cursor: 'pointer',
        width: '32px',
        height: '32px',
        backgroundColor: '#7f7f7f',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <LinkOutlined style={{ fontSize: 21, color: '#ffffff' }} />
      </div>
    </CopyToClipboard>
    <TelegramShareButton title="Check out these Apes!" url={url} >
      <TelegramIcon size={32} round={true}></TelegramIcon>
    </TelegramShareButton>
    <TwitterShareButton title="Check out these Apes!" url={url} >
      <TwitterIcon size={32} round={true}></TwitterIcon>
    </TwitterShareButton>
    <WhatsappShareButton title="Check out these Apes!" url={url} >
      <WhatsappIcon size={32} round={true}></WhatsappIcon>
    </WhatsappShareButton>
    <FacebookShareButton title="Check out these Apes!" url={url} >
      <FacebookIcon size={32} round={true}></FacebookIcon>
    </FacebookShareButton>
    <EmailShareButton subject="Check out these Apes!" url={url}>
      <EmailIcon size={32} round={true}></EmailIcon>
    </EmailShareButton>
  </div>
)


function apeGrid (width:  number, apes: any[],) {
  return <div style={{ display: 'grid', gridTemplateColumns: width >= 768 ? '1fr 2fr' : '1fr', gap: '1rem' }}>
  {apes.filter(a => !!a).map(ape => {
    return (
      <>
        <div style={{
          padding: '0.5rem',
          border: '1px solid #ccc',
          boxShadow: 'rgb(0 0 0 / 20%) 0px 5px 10px 1px',
          margin: '0.75rem',
          minHeight: 337, 
          borderRadius: '0.5rem' 
        }} key={ape?.image}>
          {/* <img style={{ maxWidth: '100%', borderRadius: '0.5rem' }} src={ape?.image}></img> */}
          <CachedImageContent uri={ape?.image} preview/>
          <span style={{ color: 'black', display: 'block', margin: '0 auto', textAlign: 'center', marginTop: '1rem', fontSize: '1.5rem' }}>{ape?.name}</span>
        </div>

        <div style={{ margin: '0.75rem', position: 'relative' }}>
          <Title level={3}>Attributes</Title>

          {ape?.attributes?.map(ApeTag)}

          <br />
          <br />
          <div style={{ display: 'flex', alignItems: 'center', color: 'black' }}>
            <Title style={{ marginBottom: 0, marginRight: '0.5em' }} level={3}>Total Rarity</Title> <Tooltip title="The higher the better. Rarity score is calculated from the rarity of your Apes attributes.">
              <InfoCircleOutlined size={12} />
            </Tooltip>
          </div>
          <span style={{ color: 'black', marginTop: '0.5em' }}>
            {getRarityForApe(ape)}
          </span>

          <Popover placement={width < 768 ? 'topRight' : 'top'} content={shareButtons({ url: `https://apeshit.social/#/ape/${ape?.metadata?.minted_token_pubkey}` })}>
            <Button shape="round" size="large" type="primary" style={{ 
              position: 'absolute', 
              left: width >= 768 ? '0' : 'unset', 
              right: width < 768 ? '0' : 'unset', 
              bottom: '1rem', 
              cursor: 'pointer' 
            }}>
              Share <ShareAltOutlined />
            </Button>
          </Popover>
          <Link to={'/auction/create/0?minted_token_pubkey=' + ape?.metadata?.minted_token_pubkey }>
            <Button shape="round" size="large" type="primary" style={{ 
              position: 'absolute', 
              left: width >= 768 ? 120 : 'unset', 
              right: width < 768 ? 120 : 'unset', 
              bottom: '1rem', 
              cursor: 'pointer' 
            }}>
              Sell <DollarCircleOutlined />
            </Button>
          </Link>
        </div>
        {width < 768 && <hr style={{width: '100%'}}/>}
      </>

    )
  })}
</div>
}

const { Content } = Layout;
export function MyApes() {
  const { myApes } = useApes();
  const { width } = useWindowDimensions();
  const { connected } = useWallet();
  const {isLoading} = useMeta();

  return (
    <Layout>
      <Content>
        <Title style={{textAlign: 'center'}}>My Apes</Title>
        <br />
        {!connected && <ConnectButton loading={isLoading} style={{ margin: '0.5rem auto', display: 'block' }} type="primary" shape="round">
          Connect to see apes
        </ConnectButton>}

        {!myApes.length && !isLoading && connected && (
          <>
            <Title level={2} style={{textAlign: 'center'}}>No aapes owned.</Title>
            <Title level={5} style={{textAlign: 'center'}}>Maybe you can find some here:</Title>
            <div style={{ textAlign: 'center' }}>
                <Link style={{ margin: '0 auto' }} to="/auctions">
                    <Button shape="round" size="large" type="primary" style={{
                        cursor: 'pointer'
                    }}>
                        Marketplace
                    </Button>
                </Link>
            </div>
          </>
        )}
        {apeGrid(width, myApes)}
      </Content>
    </Layout>
  )
}