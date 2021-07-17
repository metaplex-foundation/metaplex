import React from 'react';
import './treehouse.less';
import { Link } from 'react-router-dom';
import useWindowDimensions from '../../utils/layout';
import { Layout } from 'antd';

import ape1 from './ape1.jpeg';
import ape2 from './ape2.jpeg';
import ape3 from './ape3.jpeg';
import ape4 from './ape4.jpeg';
import ape5 from './ape5.jpeg';
import ape6 from './ape6.jpeg';
const apeImgs = [
    ape1,
    ape2,
    ape3,
    ape4,
    ape5,
    ape6,
]

const { Content } = Layout;
export function Treehouse() {
    const { width } = useWindowDimensions();

    return (
        <Layout>
            <Content>
                <div className="treehouse" style={{ padding: '0 1rem', }}>
                    <br />
                    <h3 style={{ textAlign: 'center' }}>Introducing ApeShit Season I</h3>
                    <h1>The Gorilla</h1>

                    <div style={{ textAlign: 'center' }}>
                        Gorillas looking for a new home: 2500 / 2500
                    </div>

                    <br />
                    <br />
                    <div style={{ textAlign: 'center' }}>
                        <Link style={{ margin: '0 auto' }} to="/">
                            <button style={{
                                borderRadius: '9999rem',
                                border: 'none',
                                padding: '1rem 2rem',
                                cursor: 'pointer'
                            }}>
                                Adopt an Ape
                            </button>
                        </Link>
                    </div>
                    <br />
                    <br />

                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        {apeImgs.map(img => (
                            <img style={{
                                width: 'calc(33% - 1rem)',
                                flexWrap: 'wrap',
                                margin: '0.5rem'
                            }} src={img}></img>
                        ))}
                    </div>

                    <br />

                    <p style={{ textAlign: 'center', maxWidth: 480, margin: '1rem auto' }}>
                        After adoption, a randomly generated ape will be sent to your wallet, and you will be the new adopted guardian of said ape.
                    </p>

                    <strong style={{ textAlign: 'center', display: 'block', margin: '0 auto', fontSize: '1.25rem' }}>
                        1 Ape = 5 SOL
                    </strong>

                    <br />
                    <hr />
                    <br />
                    <h3 style={{ textAlign: 'center' }}>Possible Features</h3>

                    <br />
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: width > 786 ? 'repeat(2, 1fr)' : '1fr',
                        gridGap: '3rem 2rem'
                    }}>

                        <div>
                            <h4>Body</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                                <tr>
                                    <td className="key">Black</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">Grey</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Brown</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">Blonde</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Albino</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Green</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Silver</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Gold</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Ice</td>
                                    <td>1%</td>
                                </tr>
                            </table>
                        </div>
                        <div>
                            <h4>Mouth</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                                <tr>
                                    <td className="key">None</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">Teeth</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Red Lipstick</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">Tongue out</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Black Lipstick</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Banana</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Rose</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Gold Teeth</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Bubble Pipe</td>
                                    <td>1%</td>
                                </tr>
                            </table>

                        </div>
                        <div>
                            <h4>Eyes</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>

                                <tr>
                                    <td className="key">Brown</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">Green</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Blue</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">Blue (Winking)</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Glasses</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Sunglasses</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Dead Eyes</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Gems</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Lit pythons</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Insect Eyes</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Heart Eyes</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Psychedelic Eyes</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Hypno Eyes</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Alien</td>
                                    <td>1%</td>
                                </tr>
                            </table>
                        </div>

                        <div>
                            <h4>Head/Hair</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>

                                <tr>
                                    <td className="key">None</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">Short Hair</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Long Straight Hair</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">Long Wavy Brown</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Blonde Bob</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Beanie</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Baldin</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Fauxhawk</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Afro</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Pink Bob</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Long Straight Blue</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Mohawk</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Visor</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Top Hat</td>
                                    <td>1%</td>
                                </tr>
                            </table>
                        </div>
                        <div>
                            <h4>Clothes</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>

                                <tr>
                                    <td className="key">None</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">White T-Shirt</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Football Jersey</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">String Vest</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Soccer Jersey</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Prom Dress</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Blue Tuxedo</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Bra</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Plaid Shirt</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Solana T-Shirt</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Corset</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Hoodie</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Cape</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">King Robe</td>
                                    <td>1%</td>
                                </tr>
                            </table>
                        </div>

                        <div>
                            <h4>Sign</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>

                                <tr>
                                    <td className="key">Aries</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">Taurus</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Gemini</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">Cancer</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Leo</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Virgo</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Libra</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Scorpio</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Sagittarius</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Capricorn</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Pisces</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Aquarius</td>
                                    <td>1%</td>
                                </tr>
                            </table>
                        </div>


                        <div>
                            <h4>Clan</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>

                                <tr>
                                    <td className="key">Harambe</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">Digit</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Koko</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">Gargantue</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Shaboni</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Titus</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Binti Jua</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Bobo</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Colo</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Michael</td>
                                    <td>1%</td>
                                </tr>
                            </table>
                        </div>

                        <div>
                            <h4>Background</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>

                                <tr>
                                    <td className="key">Bamboo Green</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">Banana Yellow</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Belly Pink</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">Royal Purple</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Blood Red</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Beach Gradient</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Clouds</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Stars</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Solana Gradient</td>
                                    <td>1%</td>
                                </tr>
                            </table>
                        </div>

                        <div>
                            <h4>Accessories</h4>
                            <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>

                                <tr>
                                    <td className="key">None</td>
                                    <td>40%</td>
                                </tr>
                                <tr>
                                    <td className="key">Nose Ring Silver</td>
                                    <td>20%</td>
                                </tr>
                                <tr>
                                    <td className="key">Septum Ring</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td className="key">Nose Ring Gold</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Septum Ring Silver</td>
                                    <td>1%</td>
                                </tr>
                                <tr>
                                    <td className="key">Earring Gold</td>
                                    <td>1%</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </Content>
        </Layout>

    )
}