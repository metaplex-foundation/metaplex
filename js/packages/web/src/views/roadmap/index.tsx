import React from 'react';
import { Link } from 'react-router-dom';
import './roadmap.less';

export function RoadmapView() {
    return (
    <div className="roadmap" style={{padding: '0 1rem', maxWidth: 640, margin: '0 auto'}}>
        <br /> 
        <h1>Roadmap</h1>

        <h2>What's next for ApeShit?</h2>


        <h3>Now</h3>

        <ul>
            <li>
            Season 1 launch with 2,500 gorillas available to be minted and adopted
            </li>
            <li>
            Private Discord (the treehouse) open
for members of ApeShit Social Club
            </li>
            <li>
            Launch Metaplex marketplace to enable
re-selling of ApeShit NFTs
            </li>
        </ul>
        <h3>Next</h3>

        <ul>
            <li>
            Season 2 launch (the ??? 🙊)
            </li>
            <li>
            Surprise drop for ASSC members
            </li>
        </ul>
        <h3>Later</h3>

        <ul>
            <li>
                Partnerships with other projects
            </li>
            <li>
                Season 3 & 4 Launches
            </li>
            <li>
                Mutant Apes
            </li>
        </ul>

        <br />

        <div style={{textAlign: 'center'}}>
                <Link style={{margin: '0 auto'}} to="/">
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

     </div>)
}