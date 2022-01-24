import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

const el = document.getElementById('coinfra-candy-machine-ui');

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <App candyMachineId={el?.getAttribute('data-candy-machine-id')!} />
    </BrowserRouter>
  </React.StrictMode>,
  el,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
