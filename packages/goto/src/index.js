'use strict'

const { PuppeteerBlocker } = require('@cliqz/adblocker-puppeteer')
const debug = require('debug-logfmt')('browserless:goto')
const createDevices = require('@browserless/devices')
const { getDomain } = require('tldts')
const path = require('path')
const fs = require('fs')

const engine = PuppeteerBlocker.deserialize(
  new Uint8Array(fs.readFileSync(path.resolve(__dirname, './engine.bin')))
)

const isEmpty = val => val == null || !(Object.keys(val) || val).length

const parseCookies = (url, str) => {
  const domain = `.${getDomain(url)}`
  return str.split(';').reduce((acc, str) => {
    const [name, value] = str.split('=')
    const cookie = {
      name: name.trim(),
      value,
      domain,
      url,
      path: '/'
    }
    return [...acc, cookie]
  }, [])
}

const doDisableAnimations = () => {
  const rule = `
  *,
  ::before,
  ::after {
    animation-delay: 0s !important;
    transition-delay: 0s !important;
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }
`
  const style = document.createElement('style')
  if (document.body) document.body.append(style)
  if (style.sheet) style.sheet.insertRule(rule)
}

module.exports = deviceOpts => {
  const getDevice = createDevices(deviceOpts)

  const goto = async (
    page,
    { url, media, adblock = true, headers = {}, waitFor = 0, disableAnimations = true, ...args }
  ) => {
    if (adblock) {
      await engine.enableBlockingInPage(page)
      engine.on('request-blocked', ({ url }) => debug('adblock:block', url))
      engine.on('request-redirected', ({ url }) => debug('adblock:redirect', url))
    }

    if (Object.keys(headers).length !== 0) {
      debug('headers', headers)
      await page.setExtraHTTPHeaders(headers)
    }

    if (typeof headers.cookie === 'string') {
      const cookies = parseCookies(url, headers.cookie)
      debug('cookies', ...cookies)
      await page.setCookie(...cookies)
    }

    const device = getDevice({ headers, ...args })

    if (device.userAgent) {
      debug({ userAgent: device.userAgent })
      await page.setUserAgent(device.userAgent)
    }

    if (!isEmpty(device.viewport)) {
      debug('viewport', device.viewport)
      await page.setViewport(device.viewport)
    }

    if (media) {
      await page.emulateMediaType(media)
    }

    const response = await page.goto(url, args)

    if (disableAnimations) {
      await page.evaluate(doDisableAnimations)
    }

    if (waitFor) {
      debug({ waitFor })
      await page.waitFor(waitFor)
    }

    return { response, device }
  }

  goto.getDevice = getDevice

  return goto
}

module.exports.parseCookies = parseCookies
