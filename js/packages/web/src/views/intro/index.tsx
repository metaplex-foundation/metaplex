import React from 'react';
import { Col, Layout } from 'antd';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { ArtistCard } from '../../components/ArtistCard';
import { useMeta } from '../../contexts';

export const IntroView = () => (
    <div className="has-dropcap">
        <h2>Ages past in the land of Terra, there lived a vibrant community of adventurers, jesters, historians, and artisans; bands of companions who gathered weekly to regale each other with tales of magic and mystery. Amidst this ritual they wielded quill, ink, and parchment to produce elaborate depictions of detailed maps, hideous monsters, adventurers’ likenesses and the magic items they carried on their quests. Much favor was heaped upon those most talented of artisans, and all was right and good.</h2>

        <h2>One dark spring, a great and noxious plague descended onto Terra, driving our heroes deep into hiding - to huts and caves and dungeons, wherever they could find isolation. Companions turned to enchanted means of telepathy to carry on their revelry, but those same enchantments distorted their quill and ink traditions into crude scrawls and scribbles, bastardizing the artistry of olde. </h2>

        <h2>Lo, then the most talented mages and healers of Terra developed elixirs to protect the people from this noxious plague, and some companions reconvened face to face. However, many had grown so used to communication through enchantment that they resolved to never again set foot outside their caves. They mourned the loss of the great quill and ink traditions, but the seduction of the new enchantments was too great to fight.</h2>

        <h2>From the ashes of the quill and ink there arose a new tradition, a tradition that called on all to harvest their enchanted scrawls and scribbles as artisanal assets. Companions convened via their far flung abodes in a wondrous enchanted bazaar to contruct and exchange magic items. Those most talented of artisans in this new enchanted medium rightly earned their favor, and all was right and good again in the land of Terra.</h2>

        <h2>Come one, come all! Heed the alluring call of the enchanted <a href="./#/rules">Magic Items Marketplace!</a></h2>
    </div>
)
;



const { Content } = Layout;
