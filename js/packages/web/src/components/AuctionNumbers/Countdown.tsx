import React, { FC } from 'react';
import { Col, Row } from 'antd';
import { CountdownState } from '@oyster/common';

const isEnded = (state?: CountdownState) =>
  state?.days === 0 &&
  state?.hours === 0 &&
  state?.minutes === 0 &&
  state?.seconds === 0;

export const Countdown: FC<{ state?: CountdownState }> = ({ state }) => {
  return (
    <>
      <div style={{ width: '100%' }}>
        <>
          <div
            className="info-header"
            style={{
              margin: '12px 0',
              fontSize: 18,
            }}
          >
            Time left
          </div>
          {state &&
            (isEnded(state) ? (
              <Row style={{ width: '100%' }}>
                <div className="cd-number">This auction has ended</div>
              </Row>
            ) : (
              <Row style={{ width: '100%', flexWrap: 'nowrap' }}>
                {state && state.days > 0 && (
                  <Col>
                    <div className="cd-number">
                      {state.days < 10 && (
                        <span style={{ opacity: 0.2 }}>0</span>
                      )}
                      {state.days}
                      <span style={{ opacity: 0.2 }}>:</span>
                    </div>
                    <div className="cd-label">days</div>
                  </Col>
                )}
                <Col>
                  <div className="cd-number">
                    {state.hours < 10 && (
                      <span style={{ opacity: 0.2 }}>0</span>
                    )}
                    {state.hours}
                    <span style={{ opacity: 0.2 }}>:</span>
                  </div>
                  <div className="cd-label">hour</div>
                </Col>
                <Col>
                  <div className="cd-number">
                    {state.minutes < 10 && (
                      <span style={{ opacity: 0.2 }}>0</span>
                    )}
                    {state.minutes}
                    {state.days === 0 && (
                      <span style={{ opacity: 0.2 }}>:</span>
                    )}
                  </div>
                  <div className="cd-label">mins</div>
                </Col>
                {!state.days && (
                  <Col>
                    <div className="cd-number">
                      {state.seconds < 10 && (
                        <span style={{ opacity: 0.2 }}>0</span>
                      )}
                      {state.seconds}
                    </div>
                    <div className="cd-label">secs</div>
                  </Col>
                )}
              </Row>
            ))}
        </>
      </div>
    </>
  );
};
