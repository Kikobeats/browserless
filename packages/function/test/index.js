'use strict'

const test = require('ava')

const browserlessFunction = require('..')

const vmOpts = {
  require: {
    external: {
      builtin: ['path', 'url'],
      modules: [
        'p-reflect',
        'p-retry',
        'browserless',
        'metascraper',
        'metascraper-',
        '@metascraper',
        'lodash'
      ]
    }
  }
}

test('access to query', async t => {
  const code = `({ query }) => query.url`
  const query = { code, url: 'https://example.com ' }

  t.deepEqual(await browserlessFunction(query, { vmOpts }), {
    isFulfilled: true,
    isRejected: false,
    value: query.url
  })
})

test('access to response', async t => {
  const code = `({ response }) => response.status()`
  const query = { code, url: 'https://example.com ' }

  t.deepEqual(await browserlessFunction(query, { vmOpts }), {
    isFulfilled: true,
    isRejected: false,
    value: 200
  })
})

test('access to page', async t => {
  const code = `({ page }) => page.title()`
  const query = { code, url: 'https://example.com ' }

  t.deepEqual(await browserlessFunction(query, { vmOpts }), {
    isFulfilled: true,
    isRejected: false,
    value: 'Example Domain'
  })
})
