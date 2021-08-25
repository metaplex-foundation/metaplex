import React from 'react';
import { Link } from 'react-router-dom';
import { Typography, Button, Timeline } from 'antd';
const { Title } = Typography;

export function RoadmapView() {
  return (
    <div 
      className="roadmap"
      style={{ padding: '0 1rem', maxWidth: 640, margin: '0 auto' }}
    >
      <br />
      <Title level={1}>Roadmap</Title>

      <Title level={2}>What's next for ApeShit?</Title>

      <Title level={3}>Now</Title>

      <Timeline>
        <Timeline.Item color="green">
            Season 1 launch with 2,500 gorillas available to be minted and adopted
        </Timeline.Item>
        <Timeline.Item  color="green">
              Private Discord (the treehouse) open for members of ApeShit Social
              Club
        </Timeline.Item>
      </Timeline>

      <Title level={3}>Next</Title>

      <Timeline>
        <Timeline.Item color="blue">
          Launch Metaplex marketplace to enable re-selling of ApeShit NFTs
        </Timeline.Item>
        <Timeline.Item color="blue">
          Season 2 launch (the ??? 🙊)
        </Timeline.Item>
        <Timeline.Item color="blue">
        Surprise drop for ASSC members
        </Timeline.Item>
      </Timeline>

      <Title level={3}>Later</Title>

      <Timeline>
        <Timeline.Item color="blue">
          Partnerships with other projects
        </Timeline.Item>
        <Timeline.Item color="blue">
          Partnerships with other projects
        </Timeline.Item>
        <Timeline.Item color="blue">
          Season 3 & 4 Launches
        </Timeline.Item>
        <Timeline.Item color="blue">
          Mutant Apes
        </Timeline.Item>
      </Timeline>
      
      <br />
      <div style={{ textAlign: 'center' }}>
        <Link style={{ margin: '0 auto' }} to="/">
          <Button
            shape="round"
            size="large"
            type="primary"
            style={{
              cursor: 'pointer',
            }}
          >
            Adopt an Ape
          </Button>
        </Link>
      </div>
    </div>
  );
}

