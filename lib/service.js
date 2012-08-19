nconf = require("nconf");
nconf.argv().env().defaults({
  PDF_PORT:3000,
  PDF_HOST:"localhost"
})

var util = require("util");
var express = require('express');
var http = express();

http.configure(function () {
  http.use(express.logger());
  http.use(http.router);
});

require("./pdfer.js")(http);

http.listen(nconf.get("PDF_PORT"));

console.log(util.format("pdfer started on %s and port %s",nconf.get("PDF_HOST"),nconf.get("PDF_PORT")));
