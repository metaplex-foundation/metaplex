import {SignUpForm} from "../../components/SignUpForm";
import {Col, Divider, Row} from "antd";


export const RegistrationView = () => {
  return (
    <>
      <Row>
        <Col span={24}>
          <Divider>Signup</Divider>
        </Col>
      </Row>
      <Row>
        <Col span={24} style={{margin: 0}}>
          <SignUpForm/>
        </Col>
      </Row>
    </>
  )
};
