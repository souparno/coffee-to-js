var sh = require("shelljs");
var mkdirp = require('mkdirp');
var debug=require('debug')('coffee2jskeepcomments')
	,fs=require('fs')
	//,carrier = require('carrier')
	,cs=require('coffee-script')
	,os=require('os')
;

var path = require('path');  
var lineReader = require('line-reader');

/*
process.stdin.resume();
carrier.carry(process.stdin, function(line) {
    console.log('got one line: ' + line);
});
*/

function help(){
	console.log('Usage: xxx file1.coffee file2.coffee');
        console.log('Usage: xxx -c compile-dir -o output-dir');
}

function compilefile(p, outfile){

	var inblockcmts=false;
	
	outfile = outfile || path.dirname(p)+path.sep+path.basename(p,path.extname(p))+ '.js';
	//console.log('outfile='+ outfile);
	//var fout=fs.createWriteStream(p);
	var src='';
	
	var linenum=0;
	
	lineReader.eachLine(p, function(line, last) {
		linenum ++;
		//debug(linenum+"\t"+line);

		//block comment always start from 0?
		var i=line.indexOf('###');
		if (i>=0){
			inblockcmts = !inblockcmts;
			debug('in comments, linenum='+linenum+',inblockcmts='+inblockcmts);
			if (i===0){
				i=line.indexOf('###', 3);	//oneline block comments
				if (i>0){
					inblockcmts = !inblockcmts;
					debug('oneline block comments, linenum='+linenum+',inblockcmts='+inblockcmts);
				}
			}
		} else if (!inblockcmts && line.indexOf('#') ===0 ){
			debug('singleline comments, linenum='+linenum+',inblockcmts='+inblockcmts);
			//oneline comments
			line = line.replace('#', '');
			line = '###' + line + '###';
		}
		src += line + "\n";
				
		if(last){
			// or check if it's the last one
			//for debugging purpose
			//fs.writeFile(p+'.tmp.coffee', src);
			
			var dst='';
			try {
				dst=cs.compile(src);
			} catch (e){
				console.log(e);
			}

			//debug('dst=' + dst);
			//fs.writeFile(outfile+".tmp2.js", dst);			
			
			//Now, one problem is that there is two more empty lines after each /** **/
			//var lines=dst.split('\r');	//Not working?
			//var lines = dst.match(/^.*([\n\r]+|$)/gm);
			var lines = dst.split(/\r\n|\r|\n/g);
			
			debug("lines.length="+lines.length);
			var dst2='';
			for (var i = 0; i < lines.length; i++){
				line=lines[i];
				var x=line.indexOf('/*');
				var y=line.indexOf('*/');
				if (x>=0 && y>0){
					debug('single line comments at:'+i);
					line = line.replace('/*', '//');
					debug('****line='+line);
					line =line.replace('*/', '');
				}
				dst2 += line;
				dst2 += os.EOL;
			}
			fs.writeFile(outfile, dst2);
		}
	});
}

var walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var i = 0;
            (function next() {
                var file = list[i++];
                if (!file) return done(null, results);
                file = dir + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            next();
                        });
                    } else {
                        results.push(file);
                        next();
                    }
                });
            })();
        });
    }

function main(){
        var args = process.argv.slice(2);
	if (!args.length){
		help();
		return;
	}


	if(args[0] == "-c") {
           if(args[2] == "-o") {
             var cwd = sh.pwd();
             var compile_dir = args[1];
             var output_dir = cwd.stdout + "/" + args[3];
            //console.log(output_dir);
            //fs.emptydir(output_dir); 
             walk(compile_dir, function (err, results) {
               if(err) throw err;


         results.forEach(function (val, index, array) {
                 var dir = output_dir + val.substr(compile_dir.length);
                 var outputfile = dir.substr(dir.lastIndexOf("/"));
                 dir = dir.substr(0, dir.lastIndexOf("/"));
                 output_file = dir + outputfile.substr(0, outputfile.lastIndexOf(".")) + ".js"; 
                 //console.log(output_file);
                 mkdirp.sync(dir);
                 console.log(output_file);
                 compilefile(val, output_file);
        });
             }); 
             return;
           }
           help();
           return;
        }
	
	args.forEach(function (val, index, array) {
		console.log('Compiling:'+ index + ': ' + val);
		compilefile(val);
	});
}

main();
