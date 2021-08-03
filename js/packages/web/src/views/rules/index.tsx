import React from 'react';
import { Col, Layout } from 'antd';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { ArtistCard } from '../../components/ArtistCard';
import { useMeta } from '../../contexts';
import './index.less';



export const RulesView = () => (
    <div className="rules">
        <h2>Rule 1: All artwork must be original, created by the named artist.</h2>
        <h2>Rule 2: Each individual artwork must only have one master edition.</h2>
        <h2>Rule 3: Your DM decides what items are playable in your game... Owning a digital Magic Item doesn't flat out entitle you to use that item in a game, so tread lightly and be nice.</h2>
    </div>
)

export const FAQView = () => (
    <div className="paragraph">
        <h2>What is a Magic Item NFT, and what does it do?</h2>
        <h2>Truth is, we don't exactly know what makes unique digital object special. You don't need a special internet object use magic items while roll playing. It can be cool to have a digital rendition of a thing, but you don't need it to play DnD, dude. </h2>
    </div>
)
;



const { Content } = Layout;

