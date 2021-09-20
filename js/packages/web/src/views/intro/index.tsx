import React from 'react';
import { Col, Layout } from 'antd';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { ArtistCard } from '../../components/ArtistCard';
import { useMeta } from '../../contexts';


export const IntroView = () => (
    <div className="has-dropcap">
        <h2>A crude metal crown fashioned from thin, sharp, rusty metal and adorned with the flesh and bones of a dead rat. This item requires attunement. While wearing this crown, an attuned wearer can direct a swarm of up to 30 rats to follow simple commands - new commands can be made as a bonus action. The swarm will attack anyone who shows hostility to the wearer, fighting to the death unless ordered to retreat. Once per day, the wearer can attempt to call nearby rats to join the swarm, attracting 1d4, 1d10, or 1d20 rats, depending on the prevalence of rats in a given location (at the DM’s discretion). The wearer must make a Charisma save, DC 10. On a failed save, only half the rats are convinced to join the swarm (rounded down), and the rest disperse.</h2>
        <br></br>
        <h2>Akifa glanced up the steps at her fellow adventurers. She saw Fatfoot beckoning her to turn around, smiled in his general direction, then ignored him. She looked back at the statue, and listened carefully. Was it talking to her?</h2>
        <h2><i>Join Me. Just one blood sacrifice is all I require.</i></h2>
        <h2>Akifa looked downward. Hundreds of rats swarmed her feet. Certainly a rat servant would count as a blood sacrifice, and she wouldn’t want to disappoint the spirit of Merhaba. She lowered her hand to the ground, and a rat ran up her arm and out to the end of her other hand. She loved how trusting and loyal they were. The best friends a girl could have!</h2>
        <h2>She closed her hand around her friend. And removed a knife from its sheath. With one swift movement she ran the rat’s belly through. Blood dripped through her fingers as the rat’s corpse went limp.</h2>
        <h2><i>You have pleased me greatly, Akifa Rat Queen. Now come a few steps closer and join Me.</i></h2>
        <h2>Akifa reached up and felt the crown, suddenly gripping much more tightly against her skull.</h2>
        <br></br>
        <h2><b>420</b></h2>
        <br></br>
        <h2>Ages past in the land of Terra, there lived a vibrant community of adventurers, jesters, historians, and artisans; bands of companions who gathered weekly to regale each other with tales of magic and mystery. Amidst this ritual they wielded quill, ink, and parchment to produce elaborate depictions of detailed maps, hideous monsters, adventurers’ likenesses and the magic items they carried on their quests. Much favor was heaped upon those most talented of artisans, and all was right and good.</h2>

        <h2>One dark spring, a great and noxious plague descended onto Terra, driving our heroes deep into hiding - to huts and caves and dungeons, wherever they could find isolation. Companions turned to enchanted means of telepathy to carry on their revelry, but those same enchantments distorted their quill and ink traditions into crude scrawls and scribbles, bastardizing the artistry of olde. </h2>

        <h2>Lo, then the most talented mages and healers of Terra developed elixirs to protect the people from this noxious plague, and some companions reconvened face to face. However, many had grown so used to communication through enchantment that they resolved to never again set foot outside their caves. They mourned the loss of the great quill and ink traditions, but the seduction of the new enchantments was too great to fight.</h2>

        <h2>From the ashes of the quill and ink there arose a new tradition, a tradition that called on all to harvest their enchanted scrawls and scribbles as artisanal assets. Companions convened via their far flung abodes in a wondrous enchanted bazaar to contruct and exchange magic items. Those most talented of artisans in this new enchanted medium rightly earned their favor, and all was right and good again in the land of Terra.</h2>

        <h2>Come one, come all! Heed the alluring call of the enchanted <a href="./#/rules">Magic Items Marketplace!</a></h2>
    </div>
)
;



const { Content } = Layout;
