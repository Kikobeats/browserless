'use strict'

const puppeteerDevices = require('puppeteer/DeviceDescriptors')
const customDevices = require('./devices.json')

const devices = puppeteerDevices.concat(customDevices)

const getDevice = deviceName =>
  devices.find(device => device.name.toLowerCase() === deviceName.toLowerCase())

module.exports.devices = devices
module.exports.getDevice = getDevice
