var expect = require('chai').expect;
var http = require('http');
var url = require('url');
var port = 1107;
var pdfer = require("../lib/pdfer.js")();
var util = require("util");
var expect = require("chai").expect;

describe("pdfer should generate pdf's and ", function(){
  before(function(done){
    http.createServer(function(req, res){
      var path = url.parse(req.url).path;
      if(path === "/true"){ 
        res.writeHead(200, {'Content-Type':'text/html'});
        res.write("<html><body>TEST</body></html>");
        return res.end(); 
      }
      if(path === "/notfound"){ 
        res.writeHead(404, {'Content-Type':'text/html'});
        return res.end(); 
      }
      if(path === "/500"){
        res.writeHead(500);
        return res.end();
      }
      if(path === "/timeout"){
        res.writeHead(200);
        //timeout
        return;
      }
      res.end();
    }).listen(port);  
    done();
  })

  it(" be able to fail 412 if timeouts",function(done){
    var ORIG_TIMEOUT = process.env.GEN_TIMEOUT || 3000;
    var pdfStream = pdfer.genFromUrl(util.format("http://localhost:%s/timeout", port));
    var pdf = "";
    process.env.GEN_TIMEOUT = 20;
    pdfStream.on('error', function(err){
      expect(err.code).to.be.equal(412);
      expect(err.message).to.be.equal("pdf generation timeout");
      process.env.GEN_TIMEOUT= ORIG_TIMEOUT;
      done();
    })
    pdfStream.on('data', function(data){
      pdf += data;
    });
  })


  it(" be able to generate pdf out of url successfully",function(done){
    var pdfStream = pdfer.genFromUrl(util.format("http://localhost:%s/true", port));
    var pdf = "";
    pdfStream.on('data', function(data){
      pdf += data;
    });
    pdfStream.on('end', function(){
      expect(pdf.substring(1,4)).to.be.equal("PDF");
      done();
    });
  })

  it(" be able to fail on 404 from remote url",function(done){
    var pdfStream = pdfer.genFromUrl(util.format("http://localhost:%s/notfound", port));
    var pdf = "";
    pdfStream.on('error', function(err){
      expect(err.code).to.be.equal(404);
      expect(err.message).to.be.equal("Failed loading page");
      done();
    })
    pdfStream.on('data', function(data){
      pdf += data;
    });
  })

  it(" be able to fail 500",function(done){
    var pdfStream = pdfer.genFromUrl(util.format("http://localhost:%s/500", port));
    var pdf = "";
    pdfStream.on('error', function(err){
      expect(err.code).to.be.equal(500);
      expect(err.message).to.be.equal("Failed while generating page");
      done();
    })
    pdfStream.on('data', function(data){
      pdf += data;
    });
  })
})
