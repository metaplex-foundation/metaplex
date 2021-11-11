import { Col, Divider, Row } from 'antd';
import BN from 'bn.js';
import React, { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../../contexts';
import { AuctionViewState, useAuctions } from '../../hooks';
import { AuctionRenderCard } from '../AuctionRenderCard';
import { MetaplexMasonry } from '../MetaplexMasonry';
import { CardLoader } from '../MyLoader';

interface Connect {
  label: string;
  url: string;
}

interface Author {
  name: string;
  avatar?: string;
  details?: string;
  stats?: string[];
  connectWith?: Connect[];
}

interface HeadContent {
  title: string;
  subtitle: string;
  bannerImage: string;
  author?: Author;
}

interface ImageCaption {
  text: string;
  linkText?: string;
  linkUrl?: string;
}

interface ArticleSection {
  title?: string;
  paragraphs: string[];
  image?: string;
  caption?: ImageCaption;
}

interface MidContent {
  sections: ArticleSection[];
}

interface LeftContent {
  author: Author;
}

//https://stackoverflow.com/questions/1480133/how-can-i-get-an-objects-absolute-position-on-the-page-in-javascript
const cumulativeOffset = (element: HTMLElement) => {
  let top = 0,
    left = 0;
  let cumulativeElement: Element | null = element;
  do {
    // @ts-ignore
    top += cumulativeElement.offsetTop || 0;
    // @ts-ignore
    left += cumulativeElement.offsetLeft || 0;
    // @ts-ignore
    cumulativeElement = cumulativeElement.offsetParent;
  } while (cumulativeElement);

  return {
    top: top,
    left: left,
  };
};
export const StaticPage = (props: {
  headContent: HeadContent;
  leftContent?: LeftContent;
  midContent: MidContent;
  bottomContent: boolean;
}) => {
  const [dimensions, setDimensions] = useState({
    height: window.innerHeight,
    width: window.innerWidth,
  });
  useEffect(() => {
    function handleResize() {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
  const auctions = useAuctions(AuctionViewState.Live);
  const { isLoading } = useMeta();

  const liveAuctions = auctions.sort(
    (a, b) =>
      a.auction.info.endedAt
        ?.sub(b.auction.info.endedAt || new BN(0))
        .toNumber() || 0,
  );

  const liveAuctionsView = (
    <MetaplexMasonry>
      {!isLoading
        ? liveAuctions.map((m, idx) => {
            const id = m.auction.pubkey;
            return (
              <Link to={`/auction/${id}`} key={idx}>
                <AuctionRenderCard key={id} auctionView={m} />
              </Link>
            );
          })
        : [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
    </MetaplexMasonry>
  );

  // TODO: remove use of .style
  const addGradients = () => {
    const headerGradient = document.getElementById('static-header-gradient');
    const endGradient = document.getElementById('static-end-gradient');
    const upper = document.getElementById('header-container');
    const lower = document.getElementById('bottom-container');
    if (headerGradient) headerGradient.style.display = 'inline-block';
    if (endGradient) endGradient.style.display = 'inline-block';

    if (upper && headerGradient) {
      const container = cumulativeOffset(upper);
      headerGradient.style.top = `${
        container.top + upper.offsetHeight - headerGradient.offsetHeight
      }px`;
    }
    if (lower && endGradient) {
      const container = cumulativeOffset(lower);
      endGradient.style.top = `${container.top}px`;
    }
  };

  useEffect(() => {
    addGradients();
    return () => {
      const headerGradient = document.getElementById('static-header-gradient');
      const endGradient = document.getElementById('static-end-gradient');
      if (headerGradient) headerGradient.style.display = 'none';
      if (endGradient) endGradient.style.display = 'none';
    };
  }, [dimensions]);

  useEffect(() => {
    setTimeout(() => addGradients(), 500);
  }, []);

  const headerSection = (
    <section>
      <Row>
        <Col span={24} xl={8}>
          <p>{props.headContent.subtitle}</p>
          <Divider />
          <p>{props.headContent.title}</p>

          {props.headContent.author && (
            <div>
              <img
                src={props.headContent.author.avatar}
                width="32px"
                height="32px"
                alt="author image"
              />
              <p>{props.headContent.author.name}</p>
            </div>
          )}
        </Col>

        <Col xl={16} span={24}>
          <img
            src={props.headContent.bannerImage}
            width="880px"
            height="620px"
            alt={`${props.headContent.title} image`}
          />
        </Col>
      </Row>
    </section>
  );
  const leftSection = props.leftContent && (
    <section>
      <img src={props.leftContent?.author.avatar} alt="author image" />
      <p>{props.leftContent?.author.name}</p>
      <div>
        <p>Details</p>
        <p>{props.leftContent?.author.details}</p>
      </div>
      <div>
        <p>Stats</p>
        {props.leftContent?.author.stats?.map((e, i) => (
          <p key={i}>{e}</p>
        ))}
      </div>
      <div>
        <p>Connect with the artist</p>
        {props.leftContent?.author.connectWith?.map((e, i) => (
          <p key={i}>
            <a href={e.url}>{e.label}</a>
          </p>
        ))}
      </div>
    </section>
  );
  const middleSection = (
    <section>
      {props.midContent.sections.map((section, i) => (
        <div key={i}>
          {section.title && <span>{section.title}</span>}
          {section.paragraphs?.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}

          {section.image && (
            <img
              src={section.image}
              width="720px"
              height="450px"
              alt={`${section.title} image`}
            />
          )}

          {section.caption && (
            <p>
              {section.caption.text}
              <a
                href={section.caption.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {section.caption.linkText}
              </a>
            </p>
          )}
        </div>
      ))}
    </section>
  );
  const rightSection = <section></section>;
  const finalSection = (
    <section>
      <p>Shop the Collection</p>
      {liveAuctionsView}
    </section>
  );

  return (
    <Fragment>
      {headerSection}
      <Row>
        <Col xs={24} md={4}>
          {leftSection}
        </Col>
        <Col xs={24} md={16}>
          {middleSection}
        </Col>
        <Col xs={24} md={4}>
          {rightSection}
        </Col>
      </Row>
      {props.bottomContent && finalSection}
    </Fragment>
  );
};
