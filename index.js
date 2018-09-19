const express = require('express');
const app = express();
const https = require('https');
const http = require('http');
var fs = require('fs');
var path = require("path");

const privateKey = fs.readFileSync('security/cert.key', 'utf8');
const certificate = fs.readFileSync('security/cert.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate
};
// app.use(express.static('./build/red5pro-html-testbed-5.0.0/sm-test/publishStreamManager/'));
app.use(express.static(path.join(__dirname, '/build/red5pro-html-testbed-5.0.0')));
app.use(express.static(path.join(__dirname, '/static/lib')));
app.get('/', function (req, res) {
    console.log(__dirname);
    res.sendFile(path.join(__dirname + '/public/index.html'));
})

const httpsServer = https.createServer(credentials, app);
const httpServer = http.createServer(app);

httpServer.listen(3000, _ => {
    console.log('Http listen on 3000');
});
httpsServer.listen(6969, _ => {
    console.log('Https listen on 6969');
});