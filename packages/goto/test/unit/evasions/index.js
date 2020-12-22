'use strict'

const test = require('ava')

const createBrowserless = require('browserless')
const onExit = require('signal-exit')
const path = require('path')

const evasions = require('../../../src/evasions')

const fileUrl = `file://${path.join(__dirname, '../../fixtures/dummy.html')}`

const browserless = createBrowserless({ evasions: false })

onExit(browserless.destroy)

test('randomize user agent', async t => {
  const page = await browserless.page()
  const userAgent = () => page.evaluate(() => window.navigator.userAgent)

  t.true(/HeadlessChrome/.test(await userAgent()))

  await evasions.randomizeUserAgent(page)

  t.false(/HeadlessChrome/.test(await userAgent()))

  await page.close()
})

test('hide navigator.webdriver', async t => {
  const page = await browserless.page()
  const webdriver = () => page.evaluate(() => window.navigator.webdriver)
  const javaEnabled = () => page.evaluate(() => navigator.javaEnabled())

  await page.goto(fileUrl)
  t.is(await webdriver(), undefined)
  t.is(await javaEnabled(), false)

  await page.close()
})

test('inject chrome runtime', async t => {
  const page = await browserless.page()
  const chrome = () => page.evaluate(() => window.chrome)
  t.is(await chrome(), undefined)

  await evasions.chromeRuntime(page)
  await page.goto(fileUrl)

  t.true((await chrome()) instanceof Object)

  await page.close()
})

test('override navigator.permissions', async t => {
  const page = await browserless.page()

  const permissionStatusState = () =>
    page.evaluate(async () => {
      const permissionStatus = await navigator.permissions.query({
        name: 'notifications'
      })
      return permissionStatus.state
    })

  t.is(await permissionStatusState(), 'prompt')

  await evasions.navigatorPermissions(page)
  await page.goto(fileUrl)

  t.is(await permissionStatusState(), 'denied')

  await page.close()
})

test('mock navigator.plugins', async t => {
  const page = await browserless.page()
  const plugins = () => page.evaluate(() => window.navigator.plugins.length)
  const mimeTypes = () => page.evaluate(() => window.navigator.mimeTypes.length)

  t.is(await plugins(), 0)
  t.is(await mimeTypes(), 0)

  await evasions.navigatorPlugins(page)
  await page.goto(fileUrl)

  t.is(await plugins(), 3)
  t.is(await mimeTypes(), 4)

  await page.close()
})

test('ensure navigator.languages is present', async t => {
  const page = await browserless.page()

  const languages = () => page.evaluate(() => window.navigator.languages)
  t.deepEqual(await languages(), ['en-US'])

  await page.close()
})

test('ensure media codecs are present', async t => {
  const page = await browserless.page()

  await page.goto(fileUrl, { waitUntil: 'networkidle0' })

  const videoCodecs = () =>
    page.evaluate(() => {
      const el = document.createElement('video')
      if (!el.canPlayType) return { ogg: 'unknown', h264: 'unknown', webm: 'unknown' }
      return {
        ogg: el.canPlayType('video/ogg; codecs="theora"'),
        h264: el.canPlayType('video/mp4; codecs="avc1.42E01E"'),
        webm: el.canPlayType('video/webm; codecs="vp8, vorbis"')
      }
    })

  const audioCodecs = () =>
    page.evaluate(() => {
      const el = document.createElement('audio')
      if (!el.canPlayType) {
        return { ogg: 'unknown', mp3: 'unknown', wav: 'unknown', m4a: 'unknown', aac: 'unknown' }
      }
      return {
        ogg: el.canPlayType('audio/ogg; codecs="vorbis"'),
        mp3: el.canPlayType('audio/mpeg;'),
        wav: el.canPlayType('audio/wav; codecs="1"'),
        m4a: el.canPlayType('audio/x-m4a;'),
        aac: el.canPlayType('audio/aac;')
      }
    })

  t.deepEqual(await videoCodecs(), { ogg: 'probably', h264: '', webm: 'probably' })

  t.deepEqual(await audioCodecs(), {
    ogg: 'probably',
    mp3: 'probably',
    wav: 'probably',
    m4a: '',
    aac: ''
  })

  await evasions.mediaCodecs(page)
  await page.goto(fileUrl)

  t.deepEqual(await videoCodecs(), { ogg: 'probably', h264: 'probably', webm: 'probably' })

  t.deepEqual(await audioCodecs(), {
    ogg: 'probably',
    mp3: 'probably',
    wav: 'probably',
    m4a: 'maybe',
    aac: 'probably'
  })

  await page.close()
})

test('console.debug is defined', async t => {
  const page = await browserless.page()

  const consoleDebug = () =>
    page.evaluate(() => {
      let gotYou = 0
      const spooky = /./
      spooky.toString = function () {
        gotYou++
        return 'spooky'
      }
      console.debug(spooky)
      return gotYou
    })

  t.is(await consoleDebug(), 1)

  await evasions.consoleDebug(page)
  await page.goto(fileUrl)

  t.is(await consoleDebug(), 0)

  await page.close()
})

test('navigator.vendor is defined', async t => {
  const page = await browserless.page()

  const vendor = () => page.evaluate(() => window.navigator.vendor)
  t.is(await vendor(), 'Google Inc.')

  await page.close()
})

test('hide webgl vendor', async t => {
  const page = await browserless.page()

  const webgl = () =>
    page.evaluate(() => {
      const canvas = document.createElement('canvas')
      const ctx =
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl') ||
        canvas.getContext('moz-webgl')
      const debugInfo = ctx.getExtension('WEBGL_debug_renderer_info')
      return {
        vendor: ctx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      }
    })

  t.deepEqual(await webgl(), {
    vendor: 'Google Inc.',
    renderer: 'Google SwiftShader'
  })

  await evasions.webglVendor(page)
  await page.goto(fileUrl)

  t.deepEqual(await webgl(), {
    vendor: 'Intel Inc.',
    renderer: 'Intel(R) Iris(TM) Plus Graphics 640'
  })

  await page.close()
})

test('hide webgl2 vendor', async t => {
  const page = await browserless.page()

  const webgl2 = () =>
    page.evaluate(() => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2')
      const debugInfo = ctx.getExtension('WEBGL_debug_renderer_info')
      return {
        vendor: ctx.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      }
    })

  t.deepEqual(await webgl2(), {
    vendor: 'Google Inc.',
    renderer: 'Google SwiftShader'
  })

  await evasions.webglVendor(page)
  await page.goto(fileUrl)

  t.deepEqual(await webgl2(), {
    vendor: 'Intel Inc.',
    renderer: 'Intel(R) Iris(TM) Plus Graphics 640'
  })

  await page.close()
})

test('window dimensions are defined', async t => {
  const page = await browserless.page()

  const windowOuterWidth = () => page.evaluate(() => window.outerWidth)
  const windowOuterHeight = () => page.evaluate(() => window.outerHeight)
  const windowInnerWidth = () => page.evaluate(() => window.innerWidth)
  const windowInnerHeight = () => page.evaluate(() => window.innerHeight)

  t.true((await windowOuterWidth()) > 0)
  t.true((await windowOuterHeight()) > 0)
  t.true((await windowInnerWidth()) > 0)
  t.true((await windowInnerHeight()) > 0)

  await page.close()
})

test('broken images have dimensions', async t => {
  const page = await browserless.page()

  const brokenImage = () =>
    page.evaluate(() => {
      const body = document.body
      const image = document.createElement('img')
      image.src = 'http://iloveponeydotcom32188.jg'
      image.setAttribute('id', 'fakeimage')
      image.onerror = () => Promise.resolve(`${image.width}x${image.height}`)
      body.appendChild(image)
    })

  t.true((await brokenImage()) !== '0x0')

  await page.close()
})

test('remove puppeteer from stack traces', async t => {
  const page = await browserless.page()

  const errorStackTrace = () =>
    page.evaluate(() => {
      const error = new Error('oh no!')
      return error.stack.toString()
    })

  t.true((await errorStackTrace()).includes('puppeteer_evaluation_script'))

  await evasions.errorStackTrace(page)
  await page.goto(fileUrl)

  t.false((await errorStackTrace()).includes('puppeteer_evaluation_script'))

  await page.close()
})
