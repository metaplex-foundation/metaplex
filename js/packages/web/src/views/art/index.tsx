import React, { useState, Component, SetStateAction } from 'react';
import {
  Row,
  Col,
  Divider,
  Layout,
  Tag,
  Button,
  Skeleton,
  Form,
  Input,
  Select,
  List,
  Card,
} from 'antd';
import { useParams } from 'react-router-dom';
import { useArt, useExtendedArt } from '../../hooks';
import { ArtContent } from '../../components/ArtContent';
import { shortenAddress, useConnection } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { MetaAvatar } from '../../components/MetaAvatar';
import { sendSignMetadata } from '../../actions/sendSignMetadata';
import { ViewOn } from '../../components/ViewOn';
import { ArtType } from '../../types';
import { ArtMinting } from '../../components/ArtMinting';
import Arweave from 'arweave';
import { ArtistCard } from '../../components/ArtistCard';

const { Content } = Layout;

export const ArtView = () => {
  const { id } = useParams<{ id: string }>();
  const wallet = useWallet();
  const [remountArtMinting, setRemountArtMinting] = useState(0);

  const connection = useConnection();
  const art = useArt(id);
  let badge = '';
  if (art.type === ArtType.NFT) {
    badge = 'Unique';
  } else if (art.type === ArtType.Master) {
    if (typeof art.maxSupply != 'undefined') {
      badge = `Master: Max ${art.maxSupply} Prints`;
    } else {
      badge = `Master: ∞ Prints`;
    }
  } else if (art.type === ArtType.Print) {
    badge = `${art.edition} of Max Supply`;
  }
  const { ref, data } = useExtendedArt(id);

  // const { userAccounts } = useUserAccounts();

  // const accountByMint = userAccounts.reduce((prev, acc) => {
  //   prev.set(acc.info.mint.toBase58(), acc);
  //   return prev;
  // }, new Map<string, TokenAccount>());

  const description = data?.description;
  const attributes = data?.attributes;

  const pubkey = wallet?.publicKey?.toBase58() || '';

  const tag = (
    <div className="info-header">
      <Tag color="blue">UNVERIFIED</Tag>
    </div>
  );

  const unverified = (
    <>
      {tag}
      <div style={{ fontSize: 12 }}>
        <i>
          This artwork is still missing verification from{' '}
          {art.creators?.filter(c => !c.verified).length} contributors before it
          can be considered verified and sellable on the platform.
        </i>
      </div>
      <br />
    </>
  );

  const arweave = Arweave.init({
    host: 'arweave.net',
  });

  //This is used down at the bottom for the dropdown menu value.
  const { Option } = Select;
  const [loreUser, setLoreUser] = useState('');
  function handleChange(value: string) {
    console.log(`selected ${value}`);
    setLoreUser(value);
  }

  const onFinish = loreSubmit => {
    console.log(loreSubmit.itemLore);
    submitLore(loreSubmit.itemLore);
  };

  const titleString = art.title.replace(/\s+/g, '');
  const loreUserString = loreUser.replace(/\s+/g, '');

  async function submitLore(itemLore: any) {
    const permissions = ['ACCESS_ADDRESS', 'SIGN_TRANSACTION', 'SIGNATURE'];
    await window.arweaveWallet.connect(permissions, {
      name: 'ItemLore',
      logo: 'https://magicitems.org/img/ghosty.gif',
    });

    let key = {
      kty: 'RSA',
      e: 'AQAB',
      n: '3sLnVddB4tU5EK0DIaV1Q46D4L3GblkkrPkrDaZKb7jWn9sYUjEtYJF-Dnc1UtToLe47Whs0rnhsoWMVLboadQZ6TB_EO0fOkDAYNeEUXLK97NMyDbVvlZw8gLnZoyyUc0_5ySe0VeQPSndwSYuH5EPoLa36h7J5QxS87jwD42oem4T6iQmBcgTOjadIkcVieuexQdT1mP-VcXTUgzWSjx23HzcK-F4cevrZYsOXju6GUsoIzmpgir7IY9gPqrXcPVlNWbqfVUd_yOdN_aedU4pwVy163-LBlpHGSMlhZAWtpyzbTlxWviWBp2BxK8Bxaxr8e4a4type11v-jB2O8kY2sxTDdmyJnmgzHicCjHyAhuogzCDLHKoerI1foyLx7fxkC011__BPjjIognZLuMRRA_i3Xj6ZoPMijxvqTZjufbfxF-a6LRtCiNjxBHprn3xUsLoJFNmKC-SZvME2h5TKBI52FkuI7QZjvgKR8OIWtkko0b3bPcZtd5i8DhAlNV_gW_4r6GN43JA0wghunTZkC9cAfZB8Vg8kHebWfRve3_lXDGgnvp9m1WrA1KcNng9-9SmjMtoqlkDmkBy1grL26u5pr7oEIaIXnjd79M2d6wwbiFO7STyETIrAK2FVvrj9dtGYCZqszCmGyCcedfvL8GNWSo39lK411TJCz5k',
      d: 'C90I6XEslNpCrwDrzwWrDFVBcD1jHTrZoW2mrZQq2C7ZnUtTjQMJ9d_hvP77w8TLdbC_j_GteVI4BNNMTDJiWNOmvTme34JYPaUWEP6C8VnilAN-Ya0FO4xFy5w6Oz6zTD3Y4W3gJIfgCZj5Ta1k6BL2wUIH-uSWISywUCa5lUmwRhuLpTMwpeQcJP6g9oRy1XVT4xvmlYadDJ0KeU9n1f_g4gRyLN6EOUd1PtWIU4gf9rZESEvxhsoYzXpzASYsy8afADWYaTgE1ev9oxHjZtDTYU0ug1Bl-3EZhIRXD7bes-3HYzG3O-qu8D1KYahe0fOuuRxoZ3bV9LW1RXyIgYSpssjSdzS1BmtgJnjBQFytxrXs1agLwBnSxuMNbhcVBWkkaA8NT8IeTO7Ecd7nHvTIp2zk-Ua9IRxvMa2GMccVnBQkzGs0at88Uog04d72OC2HnNagEHYbJC4lT1yYh4bhOoLJ4KtMR-L0U55KOr4IgCIsROTfHJJg7UGm9YMsJ5u12s2OBIOjx5Aqm5A7Ba-z5Bm8bv-tLiwbx6BmCeRiaSD-Obsd95VIeJLU_izwuBXgJyj2TP3SM5PWf2OqLvfDEDvMvibp82t7hzMLN_dfacQD-v-uqS_4UubcvYfq3zqycfCKSzCRCJ1XZ_9PxRjXp0JnUKqnwmVROjPIqkE',
      p: '9iN5eVcuvFtQ72JwofYODnSpswAXmA34cNE5YrdCSXJ6eUDy3j32I8opFbGM8Xzln5TZuyZXhP5_w8C-rf7ZRYIrWv1QbdOV1_iwxJCbQnX9AAVYEnWrm1sfOvAih4mJIjeC0XghcmUFzbCmVRKu_3uw22oVqL2BP9cqh2T0TkwAJfvB7FGmUDHfQUTYI7DUekOifr0hgadBFcBgcy36wMTEGDBC7-xuGS4f7s4volAlFUQoP2QCQjfHOgWW_Ui4JkUSBljLlxwgo0pG2JtaDb4nMpAPGsc0ymiI0F9uE3LW9hy7khW2ohLSbrquOQ00s54dx8t4XfJD83eJ5rfs4Q',
      q: '56-o-7pRwsHnkDUxZ6gqKLkeRyHo0jPvURgl0PL_pTYkKC6BKK_PT0bFZImK3WTBuwPrfQmdZrZViC7ieaDDy6EL4E7Htd1AdqwXYEdk2PfhQKOYYDdV8KqHt0mXJtCvyhM4hKa2i5RLUrjhr4Z6zTmyE0KW9V_vuQggPy9MNd8Xfmbm8bio-EhGybCBqSP2fKz1ieFG9mm2dqbak2x9aRuAY_oVc1bu9EZmEEmiQSrnmK3FAOCX_F1tH7OJRlSO_uTcTxDELqJfeKwaB1yiQsoP_UiUcNBeja-pBBmG9fNAP-Klkze_9PkFKaREay2XkRFWksWV1-xJJpdhyyPBuQ',
      dp: '6HPmM88_RwmibQF1x6995O8OmQs8PRDskXc2j-DsjDq-KadJ9tNjkrdIh8FPj3zZyxUjb5itTN-hP_jW27Hz9a4STfMvsxkAyZ-HKYw75M9TKWLio0RX1fd_jgTdR01_oj30oOioBcYcbf4nh-6GMKfbBcyxOdQGrYkCFC4mf49NEJIruYf-3nvLEXP3__TvJaycWL87VpvjXqx5Ki3BQ65QV1u0y6to6wThiYFWAR9ZdjURIZTMgUb2Mvi2eOvlZdcTR8UyOLqKpEvwjn5g1NvBXwIoEa0SURnaI5gMd_ebxYCrMDKrcXL_Iy3QffbXz85C575kJa03uUYqiScoYQ',
      dq: 'ncsigQedxdJAfxPraRi8Ve32dCXhJsDeXlHe95d4i7H7IC7EIszSmcCukdGndS-5TkDWMtvIivrl-BFOh935XAd8SjH9jJx62hhM93LIeYkhrd992RH3Aylxs2B4hKQfBbbfiGDu9NN0FYv7kYs6uelwofN5UvcbEt847y-sbQhbPOiio8DLvAWlyJnhRSxMJQ-7T0PSC-NltRvgxAVgyKRFZlIeJ-buagpEWxV7X3z0LSU0hmtwuB19Q9kIRpEyruF6NpNJuiU2dr5oH9l0XZ63Ex9KkicoLsGTkEo-g-Y_PQOFF2Yh45tya7EINCLiFphDaUUOz_eKvrDdlvfsaQ',
      qi: '0v5UPGmF3Ue6Q8407AYSATrrBNIOAxjgu8qPTejxzIFOuYBSMGVjw7tWEGL2ss67FsQQx4fL0k2xOd3fki2UFAyFRBeftXWnDyQFx8D9Mvwugf38dxeTwfZwitn_nAYFL0QfTYpGjlcGzvxM3znJ5c4tfo26riSZmgmYW-e1gbQQsrT7JY2Vg3s7T2FPPglYJbeo7_wCO-jE-X9LGJfYMZJYR76oUpuHouSA8mWwg4AI121PDZUvojWKENfNlVc6yOw7LPZadD81ZS8V5D6eKVGeeEknfmH_yibNKwus8f2vxgsMhfTaKilK3E5fvk-fWwPkFcFnt0pf8UZA5aWy4w',
    };

    console.log('ArtTitle Tag: ' + titleString);
    console.log('User Tag: ' + loreUserString);
    console.log('Print Tag: ' + art.edition);

    /*
    let key = {
      kty: 'RSA',
      e: 'AQAB',
      n: 'fu-fugy-VcXTUgzWSjx23HzcK-F4cevrZYsOXju6GUsoIzmpgir7IY9gPqrXcPVlNWbqfVUd_yOdN_aedU4pwVy163-LBlpHGSMlhZAWtpyzbTlxWviWBp2BxK8Bxaxr8e4a4type11v-jB2O8kY2sxTDdmyJnmgzHicCjHyAhuogzCDLHKoerI1foyLx7fxkC011__BPjjIognZLuMRRA_i3Xj6ZoPMijxvqTZjufbfxF-a6LRtCiNjxBHprn3xUsLoJFNmKC-SZvME2h5TKBI52FkuI7QZjvgKR8OIWtkko0b3bPcZtd5i8DhAlNV_gW_4r6GN43JA0wghunTZkC9cAfZB8Vg8kHebWfRve3_lXDGgnvp9m1WrA1KcNng9-9SmjMtoqlkDmkBy1grL26u5pr7oEIaIXnjd79M2d6wwbiFO7STyETIrAK2FVvrj9dtGYCZqszCmGyCcedfvL8GNWSo39lK411TJCz5k',
      d: 'fugry-Ya0FO4xFy5w6Oz6zTD3Y4W3gJIfgCZj5Ta1k6BL2wUIH-uSWISywUCa5lUmwRhuLpTMwpeQcJP6g9oRy1XVT4xvmlYadDJ0KeU9n1f_g4gRyLN6EOUd1PtWIU4gf9rZESEvxhsoYzXpzASYsy8afADWYaTgE1ev9oxHjZtDTYU0ug1Bl-3EZhIRXD7bes-3HYzG3O-qu8D1KYahe0fOuuRxoZ3bV9LW1RXyIgYSpssjSdzS1BmtgJnjBQFytxrXs1agLwBnSxuMNbhcVBWkkaA8NT8IeTO7Ecd7nHvTIp2zk-Ua9IRxvMa2GMccVnBQkzGs0at88Uog04d72OC2HnNagEHYbJC4lT1yYh4bhOoLJ4KtMR-L0U55KOr4IgCIsROTfHJJg7UGm9YMsJ5u12s2OBIOjx5Aqm5A7Ba-z5Bm8bv-tLiwbx6BmCeRiaSD-Obsd95VIeJLU_izwuBXgJyj2TP3SM5PWf2OqLvfDEDvMvibp82t7hzMLN_dfacQD-v-uqS_4UubcvYfq3zqycfCKSzCRCJ1XZ_9PxRjXp0JnUKqnwmVROjPIqkE',
      p: 'gfslwehj-rf7ZRYIrWv1QbdOV1_iwxJCbQnX9AAVYEnWrm1sfOvAih4mJIjeC0XghcmUFzbCmVRKu_3uw22oVqL2BP9cqh2T0TkwAJfvB7FGmUDHfQUTYI7DUekOifr0hgadBFcBgcy36wMTEGDBC7-xuGS4f7s4volAlFUQoP2QCQjfHOgWW_Ui4JkUSBljLlxwgo0pG2JtaDb4nMpAPGsc0ymiI0F9uE3LW9hy7khW2ohLSbrquOQ00s54dx8t4XfJD83eJ5rfs4Q',
      q: '56-o-foodle-EhGybCBqSP2fKz1ieFG9mm2dqbak2x9aRuAY_oVc1bu9EZmEEmiQSrnmK3FAOCX_F1tH7OJRlSO_uTcTxDELqJfeKwaB1yiQsoP_UiUcNBeja-pBBmG9fNAP-Klkze_9PkFKaREay2XkRFWksWV1-xJJpdhyyPBuQ',
      dp: 'feedle-DsjDq-feedle-hP_jW27Hz9a4STfMvsxkAyZ-HKYw75M9TKWLio0RX1fd_jgTdR01_oj30oOioBcYcbf4nh-6GMKfbBcyxOdQGrYkCFC4mf49NEJIruYf-3nvLEXP3__TvJaycWL87VpvjXqx5Ki3BQ65QV1u0y6to6wThiYFWAR9ZdjURIZTMgUb2Mvi2eOvlZdcTR8UyOLqKpEvwjn5g1NvBXwIoEa0SURnaI5gMd_ebxYCrMDKrcXL_Iy3QffbXz85C575kJa03uUYqiScoYQ',
      dq: 'doopy-5TkDWMtvIivrl-BFOh935XAd8SjH9jJx62hhM93LIeYkhrd992RH3Aylxs2B4hKQfBbbfiGDu9NN0FYv7kYs6uelwofN5UvcbEt847y-sbQhbPOiio8DLvAWlyJnhRSxMJQ-7T0PSC-NltRvgxAVgyKRFZlIeJ-buagpEWxV7X3z0LSU0hmtwuB19Q9kIRpEyruF6NpNJuiU2dr5oH9l0XZ63Ex9KkicoLsGTkEo-g-Y_PQOFF2Yh45tya7EINCLiFphDaUUOz_eKvrDdlvfsaQ',
      qi: 'sooper-e1gbQQsrT7JY2Vg3s7T2FPPglYJbeo7_wCO-jE-X9LGJfYMZJYR76oUpuHouSA8mWwg4AI121PDZUvojWKENfNlVc6yOw7LPZadD81ZS8V5D6eKVGeeEknfmH_yibNKwus8f2vxgsMhfTaKilK3E5fvk-fWwPkFcFnt0pf8UZA5aWy4w',
    };
    */

    //let key = await arweave.wallets.generate();

    // Plain text submission only
    let transactionA = await arweave.createTransaction(
      {
        data: Buffer.from(itemLore, 'utf8'),
      },
      key,
    );

    transactionA.addTag('Content-Type', 'text/html');
    transactionA.addTag('App-Name', 'ItemLore');
    transactionA.addTag('Item-Name', titleString);
    if (art.type === ArtType.Print) {
      transactionA.addTag('Print-Number', `${art.edition}`);
    } else {
      transactionA.addTag('Print-Number', '0');
    }
    transactionA.addTag('User-Name', loreUserString);

    await arweave.transactions.sign(transactionA);

    let uploader = await arweave.transactions.getUploader(transactionA);

    while (!uploader.isComplete) {
      await uploader.uploadChunk();
      console.log(
        `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`,
      );
    }
  }

  const query = {
    query: `query {
            transactions(
                tags: [
                    {
                        name: "App-Name",
                        values: ["ItemLore"]
                    },
                    {
                      name: "Item-Name",
                      values: ["${titleString}"]
                  }
                ]
            ) {
                edges {
                    node {
                        id
                        owner {
                          address
                        }
                      tags{
                        name
                        value
                      }
                      
                    }
                }
            }
        }`,
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(query),
  };

  //Make an array of stories through Arweave API
  async function fetchStories() {
    const res1 = await fetch('https://arweave.net/graphql', requestOptions);
    const queryList = await res1.clone().json();
    //console.log(queryList);
    const txs = queryList.data.transactions.edges;
    const txArray = new Array();
    for (let n = 0; n < txs.length; n++) {
      const tx = txs[n];
      const arrayid = n;
      const address = tx.node.owner.address;
      const userName = 'User: ' + tx.node.tags[4].value + ', ';
      const print = ' Print #' + tx.node.tags[3].value;
      const txid = tx.node.id;
      const txstory = await arweave.transactions
        .getData(tx.node.id, { decode: true, string: true })
        .then(txstory => {
          console.log(txstory);
          let newEntry = { arrayid, address, userName, print, txid, txstory };
          txArray.push(newEntry);
          //console.log(txArray);
        });
    }
    return txArray;
  }

  //useState Hook to display lore
  const [lores, setLores] = useState([
    { address: '', arrayid: 0, userName: '', print: 0, txid: '', txstory: '' },
  ]);

  async function showStories() {
    let txArray: any[] = await fetchStories();
    setLores(txArray);
  }

  return (
    <Content>
      <Col>
        <Row ref={ref}>
          <Col xs={{ span: 24 }} md={{ span: 12 }} style={{ padding: '30px' }}>
            <ArtContent
              style={{ width: '300px', height: '300px', margin: '0 auto' }}
              height={300}
              width={300}
              className="artwork-image"
              pubkey={id}
              active={true}
              allowMeshRender={true}
            />
          </Col>
          {/* <Divider /> */}
          <Col
            xs={{ span: 24 }}
            md={{ span: 12 }}
            style={{ textAlign: 'left', fontSize: '1.4rem' }}
          >
            <Row>
              <div style={{ fontWeight: 700, fontSize: '4rem' }}>
                {art.title || <Skeleton paragraph={{ rows: 0 }} />}
              </div>
            </Row>
            <Row>
              <Col span={6}>
                <h6>Royalties</h6>
                <div className="royalties">
                  {((art.seller_fee_basis_points || 0) / 100).toFixed(2)}%
                </div>
              </Col>
              <Col span={12}>
                <ViewOn id={id} />
              </Col>
            </Row>
            <Row>
              <Col>
                <h6 style={{ marginTop: 5 }}>Created By</h6>
                <div className="creators">
                  {(art.creators || []).map((creator, idx) => {
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: 5,
                        }}
                      >
                        <MetaAvatar creators={[creator]} size={64} />
                        <div>
                          <span className="creator-name">
                            {creator.name ||
                              shortenAddress(creator.address || '')}
                          </span>
                          <div style={{ marginLeft: 10 }}>
                            {!creator.verified &&
                              (creator.address === pubkey ? (
                                <Button
                                  onClick={async () => {
                                    try {
                                      await sendSignMetadata(
                                        connection,
                                        wallet,
                                        id,
                                      );
                                    } catch (e) {
                                      console.error(e);
                                      return false;
                                    }
                                    return true;
                                  }}
                                >
                                  Approve
                                </Button>
                              ) : (
                                tag
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Col>
            </Row>
            <Row>
              <Col>
                <h6 style={{ marginTop: 5 }}>Edition</h6>
                <div className="art-edition">{badge}</div>
              </Col>
            </Row>

            {/* <Button
                  onClick={async () => {
                    if(!art.mint) {
                      return;
                    }
                    const mint = new PublicKey(art.mint);

                    const account = accountByMint.get(art.mint);
                    if(!account) {
                      return;
                    }

                    const owner = wallet.publicKey;

                    if(!owner) {
                      return;
                    }
                    const instructions: any[] = [];
                    await updateMetadata(undefined, undefined, true, mint, owner, instructions)

                    sendTransaction(connection, wallet, instructions, [], true);
                  }}
                >
                  Mark as Sold
                </Button> */}

            {/* TODO: Add conversion of MasterEditionV1 to MasterEditionV2 */}
            <ArtMinting
              id={id}
              key={remountArtMinting}
              onMint={async () => await setRemountArtMinting(prev => prev + 1)}
            />
          </Col>
          <Col span="24">
            <Divider />
            {art.creators?.find(c => !c.verified) && unverified}
            <br />
            <div className="info-header">[• About the Item •]</div>
            <div className="info-content">{description}</div>
            <br />
            {/*
              TODO: add info about artist


            <div className="info-header">About the Creator</div>
            <div className="info-content">{art.about}</div> */}
          </Col>
          <Col span="24">
            {attributes && (
              <>
                <Divider />
                <br />
                <div className="info-header">Attributes</div>
                <List size="large" grid={{ column: 4 }}>
                  {attributes.map(attribute => (
                    <List.Item>
                      <Card title={attribute.trait_type}>
                        {attribute.value}
                      </Card>
                    </List.Item>
                  ))}
                </List>
              </>
            )}
          </Col>
          <Col span="24">
            <Divider />
            {art.creators?.find(c => !c.verified) && unverified}
            <br />
            <div className="info-header">[• Item Lore •]</div>
            <h1>Select your User Name:</h1>
            <Form onFinish={onFinish}>
              <Form.Item>
                <Select
                  defaultValue="Select Your User Name:"
                  style={{ width: 500 }}
                  onChange={handleChange}
                >
                  <Option value="Ghost Outfit">Ghost Outfit</Option>
                  <Option value="Momo">Momo</Option>
                  <Option value="A-Mad-Hollow">A-Mad-Hollow</Option>
                  <Option value="AstroZombie">AstroZombie</Option>
                  <Option value="Badler">Badler</Option>
                  <Option value="BenJarWar">BenJarWar</Option>
                  <Option value="Rudoks-Tavern">Rudoks-Tavern</Option>
                </Select>
              </Form.Item>
              <div>
                <h1>ItemLore Arweave Tags:</h1>
                <p>
                  Title: {titleString} / UserName: {loreUserString} / Print:{' '}
                  {art.edition}
                </p>
              </div>
              <Form.Item name="itemLore">
                <Input.TextArea placeholder="Tell a story..."></Input.TextArea>
              </Form.Item>
              <Form.Item>
                <Button block type="primary" htmlType="submit">
                  Submit ItemLore
                </Button>
              </Form.Item>
            </Form>
            <br />
            <Button block type="default" onClick={showStories}>
              Show ItemLore
            </Button>
            <br></br>
            <br></br>
            <div className="App">
              <ul>
                {/*map over the id array*/}
                {lores.map(lore => (
                  <div key={lore.arrayid}>
                    <h1>
                      <strong>
                        {lore.userName} {lore.print}
                      </strong>
                    </h1>
                    <h1>{lore.txstory}</h1>
                    <br></br>
                    <hr></hr>
                    <br></br>
                  </div>
                ))}
              </ul>
            </div>
          </Col>
        </Row>
      </Col>
    </Content>
  );
};
