import { Row, Col, List, Avatar, Typography, Tag } from 'antd';
import { chunks } from '@oyster/common';

const { Title } = Typography;

export interface Props {}

const data = [
  {
    title: 'TYPE',
    color: 'magenta',
    description: [
      'Alien - Very rare',
      'Zombie - Very rare',
      'Spotted - rare',
      'Normal - Common',
    ],
  },
  {
    title: 'Head/Hat',
    color: 'red',
    description: [
      'Heisenhat - rare',
      'Doorag -rare',
      'Beanie - rare',
      'Backwards - rare',
      'Forwards hat - rare',
      'Normal head - common',
    ],
  },
  {
    title: 'Shades',
    color: 'volcano',
    description: [
      'Standard - Common',
      'Tron - Extremely rare',
      'Gold - Very rare',
      'Red - Rare',
    ],
  },
  {
    title: 'Chain',
    color: 'gold',
    description: [
      'No chain - common',
      'Silver chain - very rare',
      'Gold chain - extremely rare',
    ],
  },
  {
    title: 'Face Tattoo',
    color: 'lime',
    description: ['None - Common', 'Teardrop - Rare'],
  },
  {
    title: 'Ear-ring',
    color: 'green',
    description: ['None - common', 'Silver - rare', 'Gold - very rare'],
  },
  {
    title: 'Smoking',
    color: 'cyan',
    description: [
      'None - common',
      'Cigarette - rare',
      'Spliff - very rare',
      'Blunt - very rare',
    ],
  },
  {
    title: 'Role in gang',
    color: 'geekblue',
    description: [
      'Boss - extremely rare',
      'underboss - very rare',
      'enforcer - rare',
      'thug -common',
    ],
  },
  {
    title: 'Rapper',
    color: 'purple',
    description: ['All rappers equally rare'],
  },
];

export const FeatureList: React.FunctionComponent<Props> = () => {
  return (
    <>
      <Title
        level={3}
        className="welcome-text bungee-font-inline feature-list-title"
      >
        Feature List
      </Title>
      <br />
      <Row
        style={{ width: '100%' }}
        className="feature-list-home"
        gutter={[64, 0]}
      >
        {chunks(data, 3).map((chunk, index) => (
          <Col xs={{ span: 24 }} md={{ span: 8 }}>
            <div className="feature-list">
              <List
                itemLayout="horizontal"
                dataSource={chunk}
                renderItem={item => (
                  <List.Item key={item.color + item.title}>
                    <List.Item.Meta
                      // avatar={
                      //   <Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />
                      // }
                      title={
                        <>
                          <Tag color={item.color}>{item.title}</Tag>
                        </>
                      }
                      description={
                        <ul style={styles.ul}>
                          {item.description.map(el => (
                            <li>{el}</li>
                          ))}
                        </ul>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </Col>
        ))}
      </Row>
    </>
  );
};

const styles = {
  ul: {
    padding: '0',
    margin: '1em 0',
  },
  description: {
    color: 'white',
    fontSize: '1.5em',
    margin: 0,
  },
};

export default FeatureList;
