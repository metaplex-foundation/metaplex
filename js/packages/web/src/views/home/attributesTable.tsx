import React from 'react';
import { Typography } from 'antd';
import useWindowDimensions from '../../utils/layout';
import {attributes} from './attributes';
const { Title } = Typography;

const tableRow = (obj: any[]) => (
    <tr key={obj[0]}>
    <td className="key">{obj[0]}</td>
    {/* <td className="rarity-score">{Math.round((1 / (1 / (2500 / +obj[1]))) / 10)}</td> */}
    <td className="rarity-score">{obj[2]}</td>
    {/* <td>{obj[1]}%</td> */}
</tr>
)
export function AttributesTable() {
    const { width } = useWindowDimensions();

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: width > 768 ? 'repeat(2, 1fr)' : '1fr',
            gridGap: '3rem 2rem'
        }}>

            <div>
                <Title level={4}>Body</Title>
                <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tbody>
                        {attributes.body.map(tableRow)}
                    </tbody>
                </table>
            </div>
            <div>
                <Title level={4}>Mouth</Title>
                <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tbody>
                        {attributes.mouth.map(tableRow)}
                    </tbody>
                </table>

            </div>
            <div>
                <Title level={4}>Eyes</Title>
                <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tbody>
                        {attributes.eyes.map(tableRow)}

                    </tbody>
                </table>

            </div>

            <div>
                <Title level={4}>Head/Hair</Title>
                <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tbody>
                        {attributes.head.map(tableRow)}
                    </tbody>
                </table>
            </div>
            <div>
                <Title level={4}>Clothes</Title>
                <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tbody>
                        {attributes.clothes.map(tableRow)}
                    </tbody>
                </table>
            </div>

            <div>
                <Title level={4}>Background</Title>
                <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tbody>
                        {attributes.background.map(tableRow)}
                    </tbody>
                </table>
            </div>

            <div>
                <Title level={4}>Accessories</Title>
                <table style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tbody>
                        {attributes.accessories.map(tableRow)}
                    </tbody>
                </table>
            </div>

            {width >= 768 && <div></div>}
            <div>
                <Title level={4}>Sign</Title>
                <table className="no-rarity-score" style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tr>
                      <th style={{textAlign: 'right'}}></th>
                      <th style={{textAlign: 'right'}}></th>
                      <th style={{textAlign: 'right'}}></th>
                      {/* <th style={{textAlign: 'right'}}>Chance</th> */}
                    </tr>
                    <tbody>
                        {attributes.sign.map(tableRow)}
                    </tbody>
                </table>
            </div>
            <div>
                <Title level={4}>Clan</Title>
                <table className="no-rarity-score" style={{ width: 'calc(100% - 4rem)', margin: '0 2rem' }}>
                    <tr>
                      <th style={{textAlign: 'right'}}></th>
                      <th style={{textAlign: 'right'}}></th>
                      <th style={{textAlign: 'right'}}></th>
                      {/* <th style={{textAlign: 'right'}}>Chance</th> */}
                    </tr>
                    <tbody>
                        {attributes.clan.map(tableRow)}
                    </tbody>
                </table>
            </div>
        </div>
    )
}