'use strict'

const { ensureError, browserTimeout } = require('@browserless/errors')
const debug = require('debug-logfmt')('browserless:lighthouse')
const requireOneOf = require('require-one-of')
const pTimeout = require('p-timeout')
const pRetry = require('p-retry')
const pEvent = require('p-event')
const execa = require('execa')
const path = require('path')

const lighthousePath = path.resolve(__dirname, 'lighthouse.js')

const getBrowser = async browserlessPromise => {
  const browserless = await browserlessPromise
  const browser = await browserless.browser
  return browser
}

const destroySubprocess = (subprocess, { reason }) => {
  if (!subprocess) return
  subprocess.kill()
  debug(`destroy:${reason}`, { pid: subprocess.pid })
}

const getConfig = ({
  onlyCategories = ['performance', 'best-practices', 'accessibility', 'seo'],
  device = 'desktop',
  ...props
}) => ({
  extends: 'lighthouse:default',
  settings: {
    onlyCategories,
    emulatedFormFactor: device,
    ...props
  }
})

// See https://github.com/GoogleChrome/lighthouse/blob/master/docs/readme.md#configuration
const getFlags = (
  browser,
  { disableStorageReset = true, logLevel = 'error', output = 'json' }
) => ({
  disableStorageReset,
  logLevel,
  output,
  port: new URL(browser.wsEndpoint()).port
})

module.exports = async (
  url,
  {
    disableStorageReset,
    getBrowserless = requireOneOf(['browserless']),
    logLevel,
    output,
    retries = 5,
    timeout = 30000,
    ...opts
  } = {}
) => {
  const browserless = getBrowserless()
  const config = getConfig(opts)

  let isRejected = false
  let subprocess

  async function run () {
    try {
      const browser = await getBrowser(browserless)
      const flags = await getFlags(browser, { disableStorageReset, logLevel, output })

      subprocess = execa.node(lighthousePath)
      subprocess.stderr.pipe(process.stderr)

      debug('run', { pid: subprocess.pid })
      subprocess.send({ url, flags, config })

      return pEvent(subprocess, 'message')
    } catch (error) {
      throw ensureError(error)
    }
  }

  const task = () =>
    pRetry(run, {
      retries,
      onFailedAttempt: async error => {
        if (error.name === 'AbortError') throw error
        if (isRejected) throw new pRetry.AbortError()

        destroySubprocess(subprocess, { reason: 'retry' })
        await browserless.respawn()

        const { message, attemptNumber, retriesLeft } = error
        debug('retry', { attemptNumber, retriesLeft, message })
      }
    })

  // main
  const result = await pTimeout(task(), timeout, () => {
    isRejected = true
    destroySubprocess(subprocess, { reason: 'timeout' })
    throw browserTimeout({ timeout })
  })

  destroySubprocess(subprocess, { reason: 'done' })

  return result
}
