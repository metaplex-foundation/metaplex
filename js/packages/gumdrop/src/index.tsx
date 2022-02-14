import * as React from "react";
import { render } from "react-dom";
import App from "./components/App";

import './styles/index.less';

const rootEl = document.getElementById("root");

render(<App />, rootEl);
