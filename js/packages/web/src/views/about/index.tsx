import React from 'react';

import { Link } from 'react-router-dom';
import { Layout , Typography, Button } from 'antd';
const { Content } = Layout;
const { Title,} = Typography;

export function AboutView() {
    return (
        <Layout className="about">
            <Content>
                <div style={{ padding: '0 1rem', maxWidth: 640, margin: '0 auto' }}>
                    <br />

                    <Title style={{ textAlign: 'center', fontSize: '2rem' }}>What is the ApeShit Social Club?</Title>
                    <br />

                  
                    <p>
                        DeFi is home to degens touting sub-50 IQs,  investors proudly over 200, and everyone else in the middle.
                    </p>
                    <p>
                        What we all have in common is our love for crypto and the thrill of making enough to retire in one trade. Well, some of us.
                    </p>
                    <p>
                        There are a lot more reasons to be in the space, but we aren’t the investing experts.
                        We’re just some humble apes.
                    </p>
                    <p>
                        We we can’t provide you with the best alpha,
                        but we can help you meet other like-minded apes and provide a place where you can hodl and chill.
                    </p>
                    <p>
                        There is only one requirement for you to join the collective - adopt an ape.
                    </p>

                    <Title level={3}>
                        10% of all proceeds will go to the Dian Fossey Gorilla Fund International.
                    </Title>

                    <a href="https://gorillafund.org/" target="_blank">
                      <img 
                        alt="Dian Fossey Gorilla Fund Logo" 
                        data-srcset="https://gorillafund.org/wp-content/uploads/2020/11/image009.jpg 1017w, https://gorillafund.org/wp-content/uploads/2020/11/image009-300x161.jpg 300w, https://gorillafund.org/wp-content/uploads/2020/11/image009-768x413.jpg 768w" 
                        data-src="https://gorillafund.org/wp-content/uploads/2020/11/image009.jpg" 
                        data-sizes="(max-width: 1017px) 100vw, 1017px" 
                        src="https://gorillafund.org/wp-content/uploads/2020/11/image009.jpg" 
                        sizes="(max-width: 1017px) 100vw, 1017px" 
                        srcSet="https://gorillafund.org/wp-content/uploads/2020/11/image009.jpg 1017w, https://gorillafund.org/wp-content/uploads/2020/11/image009-300x161.jpg 300w, https://gorillafund.org/wp-content/uploads/2020/11/image009-768x413.jpg 768w" 
                        width="1017" 
                        style={{
                          margin: '2rem auto',
                            width: 480,
                            maxWidth: '100%',
                            display: 'block',
                        }}
                        height="547"/>
                    </a>


                    <p>
                        The rest of the funds will go towards supporting the team in our endeavor of creating dope art and connecting you with fellow apes, and some surprises along the way!
                    </p>
                    <p style={{fontWeight: 'bold', textAlign: 'center', paddingTop: '1rem'}}>
                        Adopt an ape and come join the shitshow.
                    </p>

                    <br />
                    <div style={{ textAlign: 'center' }}>
                      <Link style={{ margin: '0 auto' }} to="/">
                          <Button shape="round" size="large" type="primary" style={{
                              cursor: 'pointer'
                          }}>
                              Adopt an Ape
                          </Button>
                      </Link>
                  </div>
                </div>
            </Content>
        </Layout>
    )
}