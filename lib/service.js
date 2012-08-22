nconf = require("nconf");
nconf.argv().env().defaults({
  PDF_PORT:3000,
  PDF_HOST:"localhost",
  pdfApiPath:"/api/urltopdf",
  htmlApiPath:"/api/htmltopdf"
})

var util = require("util");
var express = require('express');
var http = express();

http.configure(function () {
  http.use(express.logger());
  http.use(http.router);
});

var pdfer = require("./pdfer.js")();

http.get(nconf.get("pdfApiPath"),function(req, res){
  var pdfStream = pdfer.genFromUrl(req.param("url")).getStream();
  pdfStream.pipe(res);
  pdfStream.on("start", function(){
    res.status(200);
    res.setHeader('Content-Type', "application/pdf"); 
  });
  pdfStream.on("error", function(err){
    res.status(500);
    res.end(JSON.stringify(err));  
  })
});

http.get(nconf.get("htmlApiPath"),function(req, res){
  var pdfStream = pdfer.genFromHtml(req.param("html")).getStream();
  pdfStream.pipe(res);
  pdfStream.on("start", function(){
    res.status(200);
    res.setHeader('Content-Type', "application/pdf"); 
  });
  pdfStream.on("error", function(err){
    res.status(500);
    res.end(JSON.stringify(err));  
  })
});

http.listen(nconf.get("PDF_PORT"));

console.log(util.format("pdfer started on %s and port %s",nconf.get("PDF_HOST"),nconf.get("PDF_PORT")));