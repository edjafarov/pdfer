const spawn = require('child_process').spawn;
const util = require('util');
const qs = require('querystring');
const async = require('async');
var stream = require('stream');

//TODO: override default options

var pdfGenerator = new getPdfEngine();

module.exports = function(){
  function StreamConverter(strm){
    return {
      getStream:function(){
        return strm;
      },
      get:function(callback){
        var buff = new Buffer();
        strm.pipe(buff);
        strm.on("error", callback);
        strm.on("end", function(){
          callback(null, buff);// or it is better toString it?
        })
      }
    }
  }

  return {
    genFromUrl : function(url){
      var stream = pdfGenerator.getPdfStream({url:url});
      return StreamConverter(stream); 
    },
    genFromHtml : function(html){
      var stream = pdfGenerator.getPdfStream({html:html});
      return StreamConverter(stream); 
    }
  }
}


function PDF(){
  this.data = "";
  this.err = "";
  this.init = false;
  this.wtirable = true;
  this.readable = true;
}
util.inherits(PDF, stream.Stream);

PDF.prototype.write = function(data){
  if(!this.init) {
    this.emit('start');
    this.init = true;
  }
  this.emit('data',data);
}
PDF.prototype.end = function(){
  this.emit('end');
}
PDF.prototype.destroy = function(){
  this.emit('close');
}




function getPdfEngine(){

  this.wkhtml = spawn('/bin/sh', ['-c', './bin/wkhtmltopdf-linux-amd64 --read-args-from-stdin | cat']);
  
 //make it event emitter
  stream.Stream.call(this);
  
  var that = this;

  this.onStdoutError = function(){
    //this shouldn't happen
  }
  
  this.onStdoutEnd = function(){
    //this shouldn't happen
  }
  
  this.onStdoutClose = function(){
    //this shouldn't ever happen
  }

  this.onStdoutData =  function(data){
    //console.log(data.toString())
    that.current.data+=data;
    that.current.write(data); 
    if(that.current.data.toString().indexOf("%%EOF")>0){
      that.current.end();
      that.current.destroy();
    }
  }

  this.onStderrData = function(data){
    
    that.current.err+=data;
    if (/Warning:/.test(that.current.err)){
      that.current.emit('error',{
        err:that.current.err,
        message:"Javascript have errors",
        code: 1
      });
      that.current.end();
      that.current.destroy();
    }
    if (/Error: Failed loading page/.test(that.current.err)){
      that.current.emit('error',{
        err:that.current.err,
        message:"Failed loading page",
        code: 404
      });
      that.current.end();
      that.current.destroy();
    }
  }
  
  this.genPdf = function(task, callback){
    that.current = task.stream;
    that.wkhtml.stdout.pipe(that.current);
    //send a task to wkhtml
    that.current.on('end', callback);
    //callback when wkhtml complete
    if(task.url){
      that.wkhtml.stdin.write(task.url + " -\n");
    }else if(task.html){
      var html = task.html.replace(/'/g, "\\'");
      var script =("document.getElementsByTagName('body')[0].innerHTML='"+ html + "'").replace(/'/g,"\\'");
      that.wkhtml.stdin.write( "--run-script '"+script +"' ./bin/html.html -\n");
    }
  }

  this.getPdfStream = function(query, options, events){
    var PDFstream = new PDF();
    this.workQueue.push({stream:PDFstream,url:query.url,html:query.html, options:options});
    return PDFstream;
  }
  
  this.workQueue = async.queue(this.genPdf, 1);
  this.wkhtml.stderr.on('data', this.onStderrData);
  this.wkhtml.stdout.on('data', this.onStdoutData);
  
  this.wkhtml.stdout.on('error', this.onStdoutError);
  this.wkhtml.stdout.on('end', this.onStdoutEnd);
  this.wkhtml.stdout.on('close', this.onStdoutClose);
 
}

