<h1 align="center">
  <img style="width: 500px; margin:3rem 0 1.5rem;" src="/static/logo-banner.png" alt="browserless">
  <br>
</h1>

![Last version](https://img.shields.io/github/tag/Kikobeats/browserless.svg?style=flat-square)
[![Build Status](https://img.shields.io/travis/Kikobeats/browserless/master.svg?style=flat-square)](https://travis-ci.org/Kikobeats/browserless)
[![Coverage Status](https://img.shields.io/coveralls/Kikobeats/browserless.svg?style=flat-square)](https://coveralls.io/github/Kikobeats/browserless)
[![Dependency status](https://img.shields.io/david/Kikobeats/browserless.svg?style=flat-square)](https://david-dm.org/Kikobeats/browserless)
[![Dev Dependencies Status](https://img.shields.io/david/dev/Kikobeats/browserless.svg?style=flat-square)](https://david-dm.org/Kikobeats/browserless#info=devDependencies)
[![NPM Status](https://img.shields.io/npm/dm/browserless.svg?style=flat-square)](https://www.npmjs.org/package/browserless)

> A [puppeter](https://github.com/GoogleChrome/puppeteer)-like Node.js library for interacting with Headless production scenarios. 

## Why

Although you can think [puppeteer](https://github.com/GoogleChrome/puppeteer) could be enough, there is a set of use cases that make sense built on top of puppeteer and they are necessary to support into robust production scenario, like:

- Sensible good defaults, aborting unnecessary requests based of what you are doing (e.g, aborting image request if you just want to get [`.html`](#htmlurl-options) content).
- Easily create a pool of instance (via [`@browserless/pool`](#pool-of-instances)).
- Built-in adblocker for aborting ads requests.

## Install

**browserless** is built on top of puppeteer, so you need to install it as well.

```bash
$ npm install puppeteer browserless --save
```

You can use **browserless** together with [`puppeteer`](https://www.npmjs.com/package/puppeteer), [`puppeteer-core`](https://www.npmjs.com/package/puppeteer-core) or [`puppeteer-firefox`](https://www.npmjs.com/package/puppeteer-firefox).

Internally, the library is divided into different packages based on the functionality

## Usage

The **browserless** API is like puppeteer, but doing more things under the hood (not too much, I promise).

For example, if you want to take an [`screenshot`](#screenshoturl-options), just do:

```js
const browserless = require('browserless')()

browserless
  .screenshot('http://example.com', { device: 'iPhone 6' })
  .then(buffer => {
    console.log(`your screenshot is here!`)
  })
```

You can see more common recipes at [`@browserless/examples`](https://github.com/Kikobeats/browserless/tree/master/packages/examples).

## API

All methods follow the same interface:

- `url` (*required*): The target URL
- `options`: Specific settings for the method (*optional*).

The methods returns a Promise or a Node.js callback if pass an additional function as the last parameter.

### .constructor(options)

It creates the `browser` instance, using [puppeter.launch](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions) method.

```js
// Creating a simple instance
const browserless = require('browserless')()
```

or passing specific launchers options:

```js
// Creating an instance for running it at AWS Lambda
const browserless = require('browserless')({
  ignoreHTTPSErrors: true,
  args: [
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
    '--no-sandbox',
    '--hide-scrollbars'
  ]
})
```

#### options

See [puppeteer.launch#options](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).

By default the library will be pass a well known list of flags, so probably you don't need any additional setup.

##### timeout

type:`number`</br>
default: `30000`

This setting will change the default maximum navigation time.

##### puppeteer

type:`Puppeteer`</br>
default: `puppeteer`|`puppeteer-core`|`puppeteer-firefox`

It's automatically detected based on your `dependencies` being supported [puppeteer](https://www.npmjs.com/package/puppeteer), [puppeteer-extra](https://www.npmjs.com/package/puppeteer-extra), [puppeteer-core](https://www.npmjs.com/package/puppeteer-core) or [puppeteer-firefox](https://www.npmjs.com/package/puppeteer-firefox).

Alternatively, you can pass it.

##### incognito

type:`boolean`</br>
default: `false`

Every time a new page is created, it will be an incognito page.

An incognito page will not share cookies/cache with other browser pages.

##### stealthMode

type:`boolean`</br>
default: `false`

Enables a bunch of evasion techniques that make the headless browser detection harder.

Only works with the `puppeteer-extra` package and requires the [puppeteer-extra-plugin-stealth](https://www.npmjs.com/package/puppeteer-extra-plugin-stealth) to be installed

### .html(url, options)

It returns the full HTML content from the target `url`.

```js
const browserless = require('browserless')

;(async () => {
  const url = 'https://example.com'
  const html = await browserless.html(url)
  console.log(html)
})()
```

#### options

See [page.goto](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagegotourl-options).

Additionally, you can setup:

##### waitFor

type:`string`|`function`|`number`</br>
default: `0`

Wait a quantity of time, selector or function using [page.waitFor](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagewaitforselectororfunctionortimeout-options-args).

##### waitUntil

type:`array`</br>
default: `['networkidle0']`

Specify a list of events until consider navigation succeeded, using [page.waitForNavigation](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagewaitfornavigationoptions).

##### userAgent

It will setup a custom user agent, using [page.setUserAgent](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetuseragentuseragent) method.

##### viewport

It will setup a custom viewport, using [page.setViewport](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetviewportviewport) method.

##### abortTypes

type: `array` </br>
default: `['image', 'media', 'stylesheet', 'font', 'xhr']`

A list of `resourceType` requests that can be aborted in order to make the process faster.

##### cookies

type: `array` </br>

A collection of [cookie's object](https://github.com/GoogleChrome/puppeteer/blob/v1.16.0/docs/api.md#pagesetcookiecookies) to set in the requests send.

##### headers

type: `object` </br>

An object containing additional HTTP headers to be sent with every request.

##### adblock

type: `boolean`</br>
default: `true`

It will be abort requests detected as ads.

### .text(url, options)

It returns the full text content from the target `url`.

```js
const browserless = require('browserless')

;(async () => {
  const url = 'https://example.com'
  const text = await browserless.text(url)
  console.log(text)
})()
```

#### options

They are the same than [`.html`](#html) method.

### .pdf(url, options)

It generates the PDF version of a website behind an `url`.

```js
const browserless = require('browserless')

;(async () => {
  const url = 'https://example.com'
  const buffer = await browserless.pdf(url)
  console.log(`PDF generated!`)
})()
```

#### options

See [page.pdf](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions).

Additionally, you can setup:

##### media

Changes the CSS media type of the page using [page.emulateMedia](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageemulatemediamediatype).

##### device

It generate the PDF using the [device](#devices) descriptor name settings, like `userAgent` and `viewport`.

##### userAgent

It will setup a custom user agent, using [page.setUserAgent](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetuseragentuseragent) method.

##### viewport

It will setup a custom viewport, using [page.setViewport](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetviewportviewport) method.

### .screenshot(url, options)

It takes a screenshot from the target `url`.

```js
const browserless = require('browserless')

;(async () => {
  const url = 'https://example.com'
  const buffer = await browserless.screenshot(url)
  console.log(`Screenshot taken!`)
})()
```

#### options

See [page.screenshot](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions).

Additionally, you can setup:

The `options` provided are passed to [page.pdf](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions).

Additionally, you can setup:

##### device

It generate the PDF using the [device](#devices) descriptor name settings, like `userAgent` and `viewport`.

##### userAgent

It will setup a custom user agent, using [page.setUserAgent](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetuseragentuseragent) method.

##### viewport

It will setup a custom viewport, using [page.setViewport](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetviewportviewport) method.

### .devices

List of all available devices preconfigured with `deviceName`, `viewport` and `userAgent` settings.

These devices are used for emulation purposes.

#### .getDevice(deviceName)

Get a specific device descriptor settings by descriptor name.

```js
const browserless = require('browserless')

browserless.getDevice('Macbook Pro 15')

// {
//   name: 'Macbook Pro 15',
//   userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X …',
//   viewport: {
//     width: 1440,
//     height: 900,
//     deviceScaleFactor: 1,
//     isMobile: false,
//     hasTouch: false,
//     isLandscape: false
//   }
// }
```

## Advanced

The following methods are exposed to be used in scenarios where you need more granularity control and less magic.

### .browser

It returns the internal [browser](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-browser) instance used as singleton.

```js
const browserless = require('browserless')

;(async () => {
  const browserInstance = await browserless.browser
})()
```

### .evaluate(page, response)

It exposes an interface for creating your own evaluate function, passing you the `page` and `response`.

```js
const browserless = require('browserless')()

const getUrlInfo = browserless.evaluate((page, response) => ({
  statusCode: response.status(),
  url: response.url(),
  redirectUrls: response.request().redirectChain()
}))

;(async () => {
  const url = 'https://example.com'
  const info = await getUrlInfo(url)

  console.log(info)
  // {
  //   "statusCode": 200,
  //   "url": "https://example.com/",
  //   "redirectUrls": []
  // }
})()
```

Note you don't need to close the page; It will be done under the hood.

Internally the method performs a [.goto](#gotopage-options).

### .goto(page, options)

It performs a smart [page.goto](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagegotourl-options), blocking [ads trackers](https://npm.im/is-tracking-domain)) requests and other requests based on `resourceType`.

```js
const browserless = require('browserless')

;(async () => {
  const page = await browserless.page()
  await browserless.goto(page, {
    url: 'http://savevideo.me',
    abortTypes: ['image', 'media', 'stylesheet', 'font']
  })
})()
```

#### options

##### url

type: `string`

The target URL

##### abortTypes

type: `string`</br>
default: `[]`

A list of `req.resourceType()` to be aborted.

##### adblock

type: `boolean`</br>
default: `true`

It will be abort requests detected as ads.

##### waitFor

type:`string|function|number`</br>
default: `0`

Wait a quantity of time, selector or function using [page.waitFor](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagewaitforselectororfunctionortimeout-options-args).

##### waitUntil

type:`array`</br>
default: `['networkidle2', 'load', 'domcontentloaded']`

Specify a list of events until consider navigation succeeded, using [page.waitForNavigation](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagewaitfornavigationoptions).

##### userAgent

It will setup a custom user agent, using [page.setUserAgent](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetuseragentuseragent) method.

##### viewport

It will setup a custom viewport, using [page.setViewport](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetviewportviewport) method.

##### args

type: `object`

The settings to be passed to [page.goto](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagegotourl-options).

### .page()

It returns a standalone [browser new page](https://github.com/GoogleChrome/puppeteer/blob/ddc59b247282774ccc53e3cc925efc30d4e25675/docs/api.md#browsernewpage).

```js
const browserless = require('browserless')

;(async () => {
  const page = await browserless.page()
})()
```

## Pool of Instances

**browserless** uses internally a singleton browser instance.

You can use a pool instances using [`@browserless/pool`](https://github.com/Kikobeats/browserless/tree/master/packages/pool) package.

```js
const createBrowserless = require('@browserless/pool')
const browserlessPool = createBrowserless({
  poolOpts: {
    max: 15,
    min: 2
  }
})
```


The API is the same than `browserless`. now the constructor is accepting an extra option called `poolOpts`.

This setting is used for initializing the pool properly. You can see what you can specify there at [node-pool#opts](https://github.com/coopernurse/node-pool#createpool).

Also, you can interact with a standalone `browserless` instance of your pool.

```js
const createBrowserless = require('browserless')
const browserlessPool = createBrowserless.pool()

// get a browserless instance from the pool
browserlessPool(async browserless => {
  // get a page from the browser instance
  const page = await browserless.page()
  await browserless.goto(page, { url: url.toString() })
  const html = await page.content()
  console.log(html)
  process.exit()
})
```


You don't need to think about the acquire/release step: It's done automagically ✨.

## Packages

**browserless** is internally divided into multiple packages for ensuring just use the mininum quantity of code necessary for your user case.

| Package | Version | Dependencies |
|--------|-------|------------|
| [`browserless`](https://github.com/microlinkhq/metascraper/tree/master/packages/browserless) | [![npm](https://img.shields.io/npm/v/browserless.svg?style=flat-square)](https://www.npmjs.com/package/browserless) | [![Dependency Status](https://david-dm.org/microlinkhq/metascraper.svg?path=packages/browserless&style=flat-square)](https://david-dm.org/microlinkhq/metascraper?path=packages/browserless) |
| [`@browserless/pool`](https://github.com/microlinkhq/metascraper/tree/master/packages/@browserless/pool) | [![npm](https://img.shields.io/npm/v/@browserless/pool.svg?style=flat-square)](https://www.npmjs.com/package/@browserless/pool) | [![Dependency Status](https://david-dm.org/microlinkhq/metascraper.svg?path=packages/@browserless/pool&style=flat-square)](https://david-dm.org/microlinkhq/metascraper?path=packages/@browserless/pool) |
| [`@browserless/devices`](https://github.com/microlinkhq/metascraper/tree/master/packages/@browserless/devices) | [![npm](https://img.shields.io/npm/v/@browserless/devices.svg?style=flat-square)](https://www.npmjs.com/package/@browserless/devices) | [![Dependency Status](https://david-dm.org/microlinkhq/metascraper.svg?path=packages/@browserless/devices&style=flat-square)](https://david-dm.org/microlinkhq/metascraper?path=packages/@browserless/devices) |
| [`@browserless/goto`](https://github.com/microlinkhq/metascraper/tree/master/packages/@browserless/goto) | [![npm](https://img.shields.io/npm/v/@browserless/goto.svg?style=flat-square)](https://www.npmjs.com/package/@browserless/goto) | [![Dependency Status](https://david-dm.org/microlinkhq/metascraper.svg?path=packages/@browserless/goto&style=flat-square)](https://david-dm.org/microlinkhq/metascraper?path=packages/@browserless/goto) |
| [`@browserless/benchmark`](https://github.com/microlinkhq/metascraper/tree/master/packages/@browserless/benchmark) | [![npm](https://img.shields.io/npm/v/@browserless/benchmark.svg?style=flat-square)](https://www.npmjs.com/package/@browserless/benchmark) | [![Dependency Status](https://david-dm.org/microlinkhq/metascraper.svg?path=packages/@browserless/benchmark&style=flat-square)](https://david-dm.org/microlinkhq/metascraper?path=packages/@browserless/benchmark) |
| [`@browserless/examples`](https://github.com/microlinkhq/metascraper/tree/master/packages/@browserless/examples) | [![npm](https://img.shields.io/npm/v/@browserless/examples.svg?style=flat-square)](https://www.npmjs.com/package/@browserless/examples) | [![Dependency Status](https://david-dm.org/microlinkhq/metascraper.svg?path=packages/@browserless/examples&style=flat-square)](https://david-dm.org/microlinkhq/metascraper?path=packages/@browserless/examples) |

## Benchmark

![](/static/bench.png)

For testing different approach, we included a tiny benchmark tool called [`@browserless/benchmark`](https://github.com/Kikobeats/browserless/tree/master/packages/benchmark).

## FAQ

**Q: Why use browserless over Puppeteer?**

**browserless** not replace puppeteer, it complements. It's just a syntactic sugar layer over official Headless Chrome oriented for production scenarios.

**Q: Why do you block ads scripts by default?**

Headless navigation is expensive compared with just fetch the content from a website.

In order to speed up the process, we block ads scripts by default because they are so bloat.

**Q: My output is different from the expected**

Probably **browserless** was too smart and it blocked a request that you need.

You can active debug mode using `DEBUG=browserless` environment variable in order to see what is happening behind the code:

```
DEBUG=browserless node index.js
```

Consider open an [issue](https://github.com/Kikobeats/browserless/issues/new) with the debug trace.

**Q: Can I use browserless with my AWS Lambda like project?**

Yes, check [chrome-aws-lambda](https://github.com/alixaxel/chrome-aws-lambda) to setup AWS Lambda with a binary compatible.

## License

**browserless** © [Kiko Beats](https://kikobeats.com), Released under the [MIT](https://github.com/kikobeats/browserless/blob/master/LICENSE.md) License.<br>
Authored and maintained by Kiko Beats with help from [contributors](https://github.com/kikobeats/browserless/contributors).  

[logo](https://thenounproject.com/term/browser/288309/) designed by [xinh studio](https://xinh.studio/).

> [kikobeats.com](https://kikobeats.com) · GitHub [Kiko Beats](https://github.com/kikobeats) · Twitter [@kikobeats](https://twitter.com/kikobeats)
