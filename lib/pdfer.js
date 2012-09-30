const spawn = require('child_process').spawn;
const util = require('util');
const qs = require('querystring');
const async = require('async');
var stream = require('stream');

//TODO: override default options

var pdfGenerator = null;

module.exports = function(options){
  if(!pdfGenerator){
    pdfGenerator = new getPdfEngine(options);
  }
  return {
    genFromUrl : function(url){
      var stream = pdfGenerator.getPdfStream({url:url});
      return stream; 
    },
    genFromHtml : function(html){
      var stream = pdfGenerator.getPdfStream({html:html.toString()});
      return stream; 
    }
  }
}

/*
 * PDF STREAM
 **/
function PDF(){
  this.data = "";
  this.err = "";
  this.init = false;
  this.wtirable = true;
  this.readable = true;
}
util.inherits(PDF, stream.Stream);
/*
 * we can assign function that will be executed right before first data chunk
 */
PDF.prototype.start = function(onStartFunc){
  this.onStart = onStartFunc;
}

PDF.prototype.write = function(data){
  if(!this.init) {
    this.emit('start');
    this.init = true;
  
    var that = this;
    if(this.onStart) this.onStart();
  }
  this.emit('data',data);  
}
PDF.prototype.end = function(){
  this.emit('end');
}
PDF.prototype.destroy = function(){
}

function getPdfEngine(options){
  var optString="";
  for(opt in options){
    if(options[opt] === true){
      optString+=" --"+opt;
    }else{
      optString+=" --"+opt+" "+options[opt];
    }
  }
  console.log(__dirname + '/../bin/wkhtmltopdf-linux-amd64 '+ optString +' --read-args-from-stdin | cat');
  //seems like following hack makes the process deattached - thus not disposable:(
  this.wkhtml = spawn('/bin/sh', ['-c', __dirname + '/../bin/wkhtmltopdf-linux-amd64 '+ optString +' --read-args-from-stdin | cat'], {stdio:'pipe'});
  
 //make it event emitter
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
    that.current.data+=data;
    that.current.write(data); 
    if(that.current.data.toString().indexOf("%%EOF")>0){
      console.log("jobEnd");
      that.current.end();
    }
  }

  this.onStderrData = function(data){
    if(!that.current) return console.log(data.toString())
    that.current.err+=data;
    if (/Warning:/.test(that.current.err)){
      that.current.emit('error',{
        err:that.current.err,
        message:"Javascript have errors",
        code: 1
      });
      that.current.end();
    }
    if (/Error: Failed loading page/.test(that.current.err)){
      that.current.emit('error',{
        err:that.current.err,
        message:"Failed loading page",
        code: 404
      });
      that.current.end();
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
      var script =("document.getElementsByTagName('body')[0].innerHTML='"+ html + "'").replace(/'/g,"\\'").replace(/\r\n/g,"");
      that.wkhtml.stdin.write( "--run-script \""+script +"\" ./bin/html.html -\n");
    }
  }

  this.getPdfStream = function(query, options, events){
    if(!query.url && !query.html){
      return console.log("Error empty query: "+ query.toString());
    }
    var PDFstream = new PDF();
    this.workQueue.push({stream:PDFstream,url:query.url,html:query.html, options:options});
    console.log(util.format("%s queued",query.url||'html'));
    return PDFstream;
  }
  
  this.workQueue = async.queue(this.genPdf, 1);
  
  this.wkhtml.stderr.on('data', this.onStderrData);
  this.wkhtml.stdout.on('data', this.onStdoutData);
  this.wkhtml.stdout.on('error', this.onStdoutError);
  this.wkhtml.stdout.on('end', this.onStdoutEnd);
  this.wkhtml.stdout.on('close', this.onStdoutClose);
 
}

