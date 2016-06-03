import koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import net from 'net'
import onerror from 'koa-onerror'

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

const router = new Router()

router.get('/get', function* () {
  const { source, threshold, debug } = parseQuery(this.query)
  const ip = this.ip

  let result = yield segment(source, threshold, debug, ip)

  if (this.query.json == '1') {
    result = resultToArray(result, debug)
  }

  this.body = result
})

router.get('/get.php', function* () {
  const { source, threshold, debug } = parseQuery(this.query)
  const ip = this.ip

  let result = yield segment(source, threshold, debug, ip)

  if (this.query.json == '1') {
    result = resultToArray(result, debug)
  }

  this.body = result
})

router.post('/post', function* () {
  const { source, threshold, debug } = parseQuery(this.request.body)
  const ip = this.ip

  let result = yield segment(source, threshold, debug, ip)

  if (this.query.json == '1') {
    result = resultToArray(result, debug)
  }

  this.body = result
})

router.post('/post.php', function* () {
  const { source, threshold, debug } = parseQuery(this.request.body)
  const ip = this.ip

  let result = yield segment(source, threshold, debug, ip)

  if (this.query.json == '1') {
    result = resultToArray(result, debug)
  }

  this.body = result
})

const app = koa()
onerror(app, {
  json(err) {
    this.body = {
      error: err.message
    }
  },
  accepts() { return 'json' }
})
app.use(bodyParser())
app.use(function* (next) {
  this.set('Access-Control-Allow-Origin', '*')
  yield next
})
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(process.env.PORT || 80, () => {
  console.log('PullWord is running')
})