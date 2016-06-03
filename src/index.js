import koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import net from 'net'

function segment(query, threshold = 0, debug = 0, ip) {
  return new Promise((resolve, reject) => {
    query = query.replace(/[\r\n\t]+/, ' ').trim()

    if (checkSingleWord(query)) {
      return reject(new Error('Could not segment a single word'))
    }

    query += `\t${threshold}\t${debug}\t${ip}`

    const socket = net.connect(2015, 'localhost')

    let resultBuffer = new Buffer('')

    socket
      .on('connect', () => socket.write(query))
      .on('data', data => resultBuffer = resultBuffer.concat(data))
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
        const [ word, probability ] = line.split(':')
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
  const str = query.source || ''
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
    result = resultToArray(result)
  }

  this.body = result
})

router.get('/get.php', function* () {
  const { source, threshold, debug } = parseQuery(this.query)
  const ip = this.ip

  let result = yield segment(source, threshold, debug, ip)

  if (this.query.json == '1') {
    result = resultToArray(result)
  }

  this.body = result
})

router.post('/post', function* () {
  const { source, threshold, debug } = parseQuery(this.request.body)
  const ip = this.ip

  let result = yield segment(source, threshold, debug, ip)

  if (this.query.json == '1') {
    result = resultToArray(result)
  }

  this.body = result
})

router.post('/post.php', function* () {
  const { source, threshold, debug } = parseQuery(this.request.body)
  const ip = this.ip

  let result = yield segment(source, threshold, debug, ip)

  if (this.query.json == '1') {
    result = resultToArray(result)
  }

  this.body = result
})

const app = koa()
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(80, () => {
  console.log('PullWord is running')
})