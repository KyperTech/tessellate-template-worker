var port = process.env.PORT || 3000,
  http = require('http'),
  fs = require('fs'),
  WorkerTask = require('./lib/index.js');

var log = function(entry) {
  fs.appendFileSync('/tmp/sample-app.log', new Date().toISOString() + ' - ' + entry + '\n');
};
var server = http.createServer(function (req, res) {
  //Handle Message from SQS Queue
  if (req.method === 'POST') {
    var body = '';

    req.on('data', function(chunk) {
      body += chunk;
    });

    req.on('end', function() {
      if (req.url === '/message') {
        var task = new WorkerTask(body);
        //Split message into seperate chuncks
        task.run().then(function() {
          res.writeHead(200, 'OK', {'Content-Type': 'text/plain'});
          res.end();
        }, function(err) {
          log('Error running task:', JSON.stringify(err));
          res.writeHead(500, 'OK', {'Content-Type': 'text/plain'});
          res.end();
        });
      } else if (req.url = '/scheduled') {
        log('Received task ' + req.headers['x-aws-sqsd-taskname'] + ' scheduled at ' + req.headers['x-aws-sqsd-scheduled-at']);
        res.writeHead(200, 'OK', {'Content-Type': 'text/plain'});
        res.end();
      } else {
        //Otherwise respond 200 (Not message or task)
        res.writeHead(200, 'OK', {'Content-Type': 'text/plain'});
        res.end();
      }
    });
  } else {
    //Otherwise respond 200 (Health Checks)
    res.writeHead(200,'OK', {'Content-Type': 'text/plain'});
    res.end();
  }
});

// Listen on port 3000, IP defaults to 127.0.0.1
server.listen(port);

// console.log('Server running at http://127.0.0.1:' + port + '/');
