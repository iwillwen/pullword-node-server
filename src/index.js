import express from 'express'
import wrap from 'co-express'
import bodyParser from 'body-parser'
import net from 'net'

function segment(query, threshold = 0, debug = 0, ip) {
  return new Promise((resolve, reject) => {
    query = query.replace(/[\r\n\t]+/, ' ').trim()

    if (checkSingleWord(query)) {
      return reject(new Error('Cannot segment a single word'))
    }

    query += `\t${threshold}\t${debug}\t${ip}\r\n`

    const socket = net.connect(2015, (process.env.REMOTE ? 'api.pullword.com' : 'localhost'))

    let resultBuffer = new Buffer('')

    socket
      .on('connect', () => socket.write(query))
      .on('data', data => resultBuffer = Buffer.concat([resultBuffer, data]))
      .on('end', () => resolve(resultBuffer.toString()))
      .on('error', err => reject(err))
  })
}

function resultToArray(result, debug) {
  return result
    .split('\r\n')
    .filter(Boolean)
    .map(line => {
      if (debug > 0) {
        let [ word, probability ] = line.split(':')
        probability = parseFloat(probability)
        return { word, probability }
      } else {
        return line
      }
    })
}

function checkSingleWord(query) {
  return (
    (checkChinese(query) && query.length === 1) ||
    // Single Chinese character
    (!checkChinese(query) && !query.match(/(\s+)/))
    // Single English word 
  )
}

function checkChinese(query) {
  return !!query.match(/[\u4e00-\u9fa5]/)
}

function parseQuery(query) {
  const source = query.source || ''
  const threshold = parseFloat(query.threshold || query.param1 || 0)
  const debug = parseInt(query.debug || query.param2 || 0)

  return { source, threshold, debug }
}

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  next()
})

app.get('/get', wrap(function* (req, res) {
  const { source, threshold, debug } = parseQuery(req.query)
  const ip = req.ip

  let result = yield segment(source, threshold, debug, ip)

  if (req.query.json == '1') {
    result = resultToArray(result, debug)
    return res.json(result)
  }

  res.send(result)
}))

app.get('/get.php', wrap(function* (req, res) {
  const { source, threshold, debug } = parseQuery(req.query)
  const ip = req.ip

  let result = yield segment(source, threshold, debug, ip)

  if (req.query.json == '1') {
    result = resultToArray(result, debug)
    return res.json(result)
  }

  res.send(result)
}))

app.post('/post', wrap(function* (req, res) {
  const { source, threshold, debug } = parseQuery(req.body)
  const ip = req.ip

  let result = yield segment(source, threshold, debug, ip)

  if (req.query.json == '1') {
    result = resultToArray(result, debug)
    return res.json(result)
  }

  res.send(result)
}))

app.post('/post.php', wrap(function* (req, res) {
  const { source, threshold, debug } = parseQuery(req.body)
  const ip = req.ip

  let result = yield segment(source, threshold, debug, ip)

  if (req.query.json == '1') {
    result = resultToArray(result, debug)
    return res.json(result)
  }

  res.send(result)
}))

app.listen(process.env.PORT || 80, () => {
  console.log('PullWord is running')
})