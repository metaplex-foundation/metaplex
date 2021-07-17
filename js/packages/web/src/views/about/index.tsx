import React from 'react';
import './about.less';
import { Link } from 'react-router-dom';
import { Layout } from 'antd';
const { Content } = Layout;

export function AboutView() {
    return (
        <Layout className="about">
            <Content>
                <div style={{ padding: '0 1rem', maxWidth: 640, margin: '0 auto' }}>
                    <br />
                    <h1 style={{ textAlign: 'center', fontSize: '2rem' }}>What is the ApeShit Social Club?</h1>
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

                    <p>
                        10% of all proceeds will go to the World Wildlife Foundation, so good is also being done.
                    </p>
                    <p>
                        The rest of the funds will go towards supporting the team in our endeavor of creating dope art and connecting you with fellow apes, and some surprises along the way!
                    </p>
                    <p>
                        Season 1 (the gorilla) is now live.
                    </p>
                    <p>
                        Adopt an ape and come join the shitshow.
                    </p>

                    <br />
                    <div style={{ textAlign: 'center' }}>
                        <Link style={{ margin: '0 auto' }} to="/">
                            <button style={{
                                borderRadius: '9999rem',
                                border: 'none',
                                padding: '1rem 2rem'
                            }}>
                                Adopt an Ape
                            </button>
                        </Link>
                    </div>
                </div>
            </Content>
        </Layout>
    )
}