import {SignUpForm} from "../../components/SignUpForm";
import {Col, Row, Tabs} from "antd";
import {LoginForm} from "../../components/LoginForm";

const { TabPane } = Tabs;


export const RegistrationView = () => {
  return (
    <>
      <Tabs defaultActiveKey="2" centered size={'large'}>
        <TabPane tab="Signup" key="1">
          <Row>
            <Col span={24} style={{margin: 0}}>
              <SignUpForm/>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab="Login" key="2">
          <Row>
            <Col span={24} style={{margin: 0}}>
              <LoginForm/>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </>
  )
};
