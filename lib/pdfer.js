const spawn = require('child_process').spawn;
const util = require('util');
const qs = require('querystring');
const async = require('async');

var pdfGenerator = new getPdfEngine();


module.exports = function(http){
  http.get("/api/pdfer",function(req, res){
    pdfGenerator.pdf(req.param('url'), res);
  });
}

function getPdfEngine(){
  this.workQueue = async.queue(getPdf, 1);
  this.currentPdf;

  this.wkhtml = spawn('/bin/sh', ['-c', './bin/wkhtmltopdf-linux-amd64 --read-args-from-stdin | cat']);
  
  this.wkhtml.stderr.on('data', onStderrData);
  this.wkhtml.stdout.on('data', onStdoutData);
  this.wkhtml.stdout.on('error', onStdoutError);

  this.wkhtml.stdout.on('end', onStdoutEnd);
  this.wkhtml.stdout.on('close', onStdoutClose);

  var that = this;

  this.resetPdf = function(url, res, callback){
    that.currentPdf = {
      err:"",
      data:"",
      initialized: false,
      url: url,
      name: null,
      res : res,
      callback : callback
    }   
  }
  function onStdoutError(){}
  function onStdoutEnd(){
    pdfGenerator = new getPdfEngine();
  }
  function onStdoutClose(){}

  function onStdoutData(data){
    if(!that.currentPdf.initialized){
      that.currentPdf.initialized = true;
      that.currentPdf.res.status(200);
      that.currentPdf.res.setHeader('Content-Type', "application/pdf"); 
 
    }
    that.currentPdf.data+=data;   
    if(that.currentPdf.data.toString().indexOf("%%EOF")>0){
     process.nextTick(function(){
        that.currentPdf.res.end();
        that.currentPdf.callback();
      });
    }
  }
  
  function onStderrData(data){
    that.currentPdf.err+=data;
    console.log(that.currentPdf.err);
    if (/Warning:/.test(that.currentPdf.err)){
      that.currentPdf.res.status(412);
      that.currentPdf.res.end(); 
    }
    if (/Error: Failed loading page/.test(that.currentPdf.err)){
      that.currentPdf.res.status(404);
      that.currentPdf.res.end("the page "+ that.currentPdf.url +" is not found");
    }
  }

  function getPdf(task, callback){
    that.resetPdf(task.url, task.res, callback);
    that.wkhtml.stdout.pipe(task.res);
    that.wkhtml.stdin.write(task.url + " -\n");
  }

  this.pdf = function(url, res){
    that.workQueue.push({url:url, res:res});
  }
}

