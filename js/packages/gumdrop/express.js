const express = require('express');
const path = require('path');

const app = express();
const portNumber = 3000;
const sourceDir = 'dist';

app.use('/', express.static(sourceDir));

app.use(function (req, res, next) {
  res.status(404).sendFile(__dirname + `/dist/404.html`)
})

app.listen(portNumber, () => {
  console.log(`Express web server started: http://localhost:${portNumber}`);
  console.log(`Serving content from /${sourceDir}/`);
});
