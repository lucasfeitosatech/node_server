
const express = require('express');
const bodyParser = require('body-parser');
//const qr = require('qr-image');
const ejs = require('ejs');
const app = express();

app.set('view engine', 'ejs');
// Set static folder
// app.use(express.static('static'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(require('./routes'));



const port = 3000;
const server = app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

app.get('/teste', function (req, res) {
  res.send("Hello World");
});

const path = require('path');

