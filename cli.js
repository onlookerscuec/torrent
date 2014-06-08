#!/usr/bin/env node

var minimist = require('minimist')
var fs = require('fs')
var log = require('single-line-log').stdout
var bytes = require('pretty-bytes')

var torrent = require('./')
var createTorrent = require('create-torrent')

var argv = minimist(process.argv.slice(2), {
  alias: { outfile: 'o', help: 'h' }
})

if (argv.help) {
  fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout)
  return
}

var source = argv._.shift()

if (source === 'create') {
  var dir = argv._.shift()
  var outfile = argv.outfile
  if (outfile === '-') outfile = null

  if (outfile && fs.existsSync(outfile)) {
    console.error('refusing to overwrite existing torrent file')
    process.exit(1)
  }

  createTorrent(dir, function (err, torrent) {
    if (err) {
      console.error(err.stack)
      process.exit(1)
    }
    else if (outfile) {
      fs.writeFile(outfile, torrent, function (err) {
        if (err) {
          console.error(err.stack)
          process.exit(1)
        }
      })
    }
    else process.stdout.write(torrent)
  })

  return
}

if (source.indexOf('.torrent') > -1) source = fs.readFileSync(source)

if (!argv.path) argv.path = process.cwd()

var dl = torrent(source, argv)

var hs;

dl.on('hotswap', function() {
  hs++
})

dl.on('ready', function() {
  console.log(dl.files.length.toString(), 'file(s) in torrent')
  console.log(dl.files.map(function(f){ return f.name.trim() }).join('\n'))

  hs = 0

  var status = function() {
    var down = bytes(dl.swarm.downloaded)
    var downSpeed = bytes(dl.swarm.downloadSpeed()) +'/s'
    var up = bytes(dl.swarm.uploaded)
    var upSpeed = bytes(dl.swarm.uploadSpeed()) +'/s'

    log(
      'Connected to '+dl.swarm.wires.reduce(notChoked, 0)+'/'+dl.swarm.wires.length+' peers\n'+
      'Downloaded '+down+' ('+downSpeed+') with '+hs+' hotswaps\n'+
      'Uploaded '+up+ ' ('+upSpeed+')\n'
    )
  }

  var interval = setInterval(status, 500)
  status()
})

function notChoked(result, wire) {
  return result + (wire.peerChoking ? 0 : 1)
}

