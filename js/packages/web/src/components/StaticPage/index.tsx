import React, { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Col, Divider, Row } from 'antd';
import BN from 'bn.js';

import Masonry from 'react-masonry-css';
import { CardLoader } from '../MyLoader';
import { useMeta } from '../../contexts';
import { AuctionRenderCard } from '../AuctionRenderCard';
import { AuctionViewState, useAuctions } from '../../hooks';
import './index.less';

interface Author {
  name: string;
  avatar?: string;
}

interface HeadContent {
  title: string;
  subtitle: string;
  bannerImage: string;
  author?: Author;
}

interface ImageCaption {
  text: string;
  linkText: string;
  linkUrl: string;
}

interface ArticleSection {
  title: string;
  paragraphs: string[];
  image?: string;
  caption?: ImageCaption;
}

interface MidContent {
  sections: ArticleSection[];
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
  midContent: MidContent;
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
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const liveAuctions = auctions.sort(
    (a, b) =>
      a.auction.info.endedAt
        ?.sub(b.auction.info.endedAt || new BN(0))
        .toNumber() || 0,
  );

  const liveAuctionsView = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? liveAuctions.map((m, idx) => {
            const id = m.auction.pubkey.toBase58();
            return (
              <Link to={`/auction/${id}`} key={idx}>
                <AuctionRenderCard key={id} auctionView={m} />
              </Link>
            );
          })
        : [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
    </Masonry>
  );

  useEffect(() => {
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

    return () => {
      const headerGradient = document.getElementById('static-header-gradient');
      const endGradient = document.getElementById('static-end-gradient');
      if (headerGradient) headerGradient.style.display = 'none';
      if (endGradient) endGradient.style.display = 'none';
    };
  }, [dimensions]);

  const headerSection = (
    <section id="header-container">
      {/*<span id="header-gradient"></span>*/}
      <Row>
        <Col span={24} xl={8} className="header-left">
          <p className="header-subtitle">{props.headContent.subtitle}</p>
          <Divider />
          <p className="header-title">{props.headContent.title}</p>

          {props.headContent.author && (
            <div className="author-container">
              <img
                src={props.headContent.author.avatar}
                className="author-avatar"
                width="32px"
                height="32px"
                alt="author image"
              />
              <p className="author-name">{props.headContent.author.name}</p>
            </div>
          )}
        </Col>

        <Col xl={16} span={24} className="header-right">
          <img
            src={props.headContent.bannerImage}
            className="header-image"
            width="880px"
            height="620px"
            alt={`${props.headContent.title} image`}
          />
        </Col>
      </Row>
    </section>
  );

  const middleSection = (
    <section id="middle-container">
      {props.midContent.sections.map(section => (
        <div className="mid-section-item">
          <p className="title">{section.title}</p>

          {section.paragraphs?.map(paragraph => (
            <p className="paragraph-text">{paragraph}</p>
          ))}

          {section.image && (
            <img
              src={section.image}
              className="image"
              width="720px"
              height="450px"
              alt={`${section.title} image`}
            />
          )}

          {section.caption && (
            <p className="image-caption">
              {section.caption.text}
              <a href={section.caption.linkUrl} target="_blank">
                {section.caption.linkText}
              </a>
            </p>
          )}
        </div>
      ))}
    </section>
  );

  const finalSection = (
    <section id="bottom-container">
      <p className="title">Shop the Collection</p>
      {liveAuctionsView}
    </section>
  );

  return (
    <Fragment>
      {headerSection}
      {middleSection}
      {finalSection}
      {/*{liveAuctions.length ? finalSection : null}*/}
    </Fragment>
  );
};
