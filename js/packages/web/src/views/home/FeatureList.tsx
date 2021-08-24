import { Row, Col, List, Avatar, Typography, Tag } from 'antd';
import { chunks } from '@oyster/common';

const { Title } = Typography;

export interface Props {}

const data = [
  {
    title: 'Background Color',
    color: 'magenta',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Head Color',
    color: 'red',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Neck Color',
    color: 'volcano',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Shades',
    color: 'orange',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Chain',
    color: 'gold',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Face Tattoo',
    color: 'lime',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Ear-ring',
    color: 'green',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Beak Color',
    color: 'cyan',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Smoking',
    color: 'blue',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Position in gang',
    color: 'geekblue',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Favourite rapper',
    color: 'purple',
    description: 'Silve, Gold, MEtal',
  },
  {
    title: 'Head accessories',
    color: 'red',
    description: 'Silve, Gold, MEtal',
  },
];

export const FeatureList: React.FunctionComponent<Props> = () => {
  return (
    <>
      <Title level={3} className="welcome-text bungee-font-inline" style={{ fontSize: '2em', margin: '1em 0 2em' }}>
        Feature List
      </Title>
      <Row
        style={{ width: '100%' }}
        className="feature-list-home"
        gutter={[64, 0]}
      >
        {chunks(data, 6).map((chunk, index) => (
          <Col span={12}>
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
                      description={item.description}
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

export default FeatureList;
