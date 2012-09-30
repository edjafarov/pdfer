nconf = require("nconf");
nconf.argv().env().defaults({
  PDF_PORT:process.env.PORT || 3000,
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

var pdfer = require("./pdfer.js")({
    "margin-left":"20mm",
    "margin-right":"20mm"
});

http.get(nconf.get("pdfApiPath"),function(req, res){
  var pdfStream = pdfer.genFromUrl(req.param("url"));
  
  pdfStream.start(function(){
    res.status(200);
    res.setHeader('Content-Type', "application/pdf"); 
  });
  pdfStream.on("error", function(err){
    res.status(500);
    res.end(JSON.stringify(err));  
  })
  pdfStream.on("close", function(){
    res.end();
  })
  pdfStream.pipe(res);
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
