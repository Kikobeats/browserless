'use strict'

const debug = require('debug-logfmt')('browserless')
const createGoto = require('@browserless/goto')
const importLazy = require('import-lazy')
const pReflect = require('p-reflect')
const pTimeout = require('p-timeout')
const pRetry = require('p-retry')
const whoops = require('whoops')

const driver = require('./driver')

const browserTimeout = whoops('BrowserTimeout', {
  message: ({ timeout }) => `Promise timed out after ${timeout} milliseconds`
})

module.exports = ({
  puppeteer = require('require-one-of')(['puppeteer', 'puppeteer-core', 'puppeteer-firefox']),
  incognito = false,
  timeout = 30000,
  retries = 3,
  ...launchOpts
} = {}) => {
  const goto = createGoto({ timeout, ...launchOpts })

  let browser = driver.spawn(puppeteer, { defaultViewport: goto.defaultViewport, ...launchOpts })

  const respawn = async () => {
    await driver.destroy(await browser)
    browser = driver.spawn(puppeteer, launchOpts)
  }

  const createPage = async () => {
    const _browser = await browser
    const context = incognito ? await _browser.createIncognitoBrowserContext() : _browser
    const page = await context.newPage()
    debug('new page', {
      pid: _browser.process().pid,
      incognito,
      pages: (await _browser.pages()).length - 1
    })
    return page
  }

  const wrapError = fn => async (...args) => {
    let page
    let isRejected = false

    const closePage = () => (page ? pReflect(page.close()) : undefined)

    const run = async () => {
      try {
        page = await createPage()
        const value = await fn(page)(...args)
        return value
      } finally {
        await closePage()
      }
    }

    const task = () =>
      pRetry(run, {
        retries,
        onFailedAttempt: async error => {
          if (!(error instanceof Error) && 'error' in error) error = error.error
          if (error.name === 'AbortError') throw error
          if (isRejected) throw new pRetry.AbortError()
          const { message, attemptNumber, retriesLeft } = error
          debug('retry', { attemptNumber, retriesLeft, message })
          await respawn()
        }
      })

    const { isFulfilled, value, reason } = await pReflect(
      pTimeout(task(), timeout, () => {
        throw browserTimeout({ timeout })
      })
    )

    if (isFulfilled) return value
    isRejected = true
    throw reason
  }

  const evaluate = (fn, gotoOpts) =>
    wrapError(page => async (url, opts) => {
      const { response } = await goto(page, { url, ...gotoOpts, ...opts })
      return fn(page, response)
    })

  const pdf = wrapError(page => importLazy(require('@browserless/pdf')({ goto }))(page))

  const screenshot = wrapError(page =>
    importLazy(require('@browserless/screenshot')({ goto }))(page)
  )

  return {
    // low level methods
    browser,
    close: async () => (await browser).close(),
    destroy: async opts => driver.destroy(await browser, opts),
    respawn,
    // high level methods
    evaluate,
    goto,
    html: evaluate(page => page.content()),
    page: createPage,
    pdf,
    screenshot,
    text: evaluate(page => page.evaluate(() => document.body.innerText)),
    getDevice: goto.getDevice
  }
}

module.exports.driver = driver
