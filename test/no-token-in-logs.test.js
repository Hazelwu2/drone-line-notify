const assert = require('assert')
const { spawnSync } = require('child_process')
const path = require('path')

const token = 'FAKE-TOKEN-FOR-TEST-123'

function runMain(scenario) {
  return spawnSync(process.execPath, ['-e', `
    const Module = require('module')
    const load = Module._load
    Module._load = function (request, parent, isMain) {
      if (request === 'axios') {
        return { post: function (url, body, config) {
          if (config.headers.Authorization !== 'Bearer FAKE-TOKEN-FOR-TEST-123') {
            process.stderr.write('Authorization header mismatch\\n')
            process.exitCode = 2
          }
          if (${JSON.stringify(scenario)} === 'http-error') {
            return Promise.reject({
              config: config,
              response: { status: 401, data: { message: 'Authentication failed' } }
            })
          }
          if (${JSON.stringify(scenario)} === 'network-error') {
            return Promise.reject({ config: config, message: 'Network Error' })
          }
          if (${JSON.stringify(scenario)} === 'echoed-token') {
            return Promise.reject({
              config: config,
              response: { status: 401, data: { message: 'Authentication failed: FAKE-TOKEN-FOR-TEST-123' } }
            })
          }
          return Promise.resolve()
        } }
      }
      return load.apply(this, arguments)
    }
    require('./main')
  `], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      PATH: process.env.PATH,
      PLUGIN_ACCESS_TOKEN: token,
      PLUGIN_TO: 'FAKE-RECIPIENT',
      DRONE_REPO_NAME: 'test-repo',
      DRONE_COMMIT_MESSAGE: 'test commit',
      DRONE_COMMIT_BRANCH: 'test',
      DRONE_BUILD_EVENT: 'push',
      DRONE_COMMIT_AUTHOR: 'tester',
      DRONE_BUILD_NUMBER: '1',
      DRONE_BUILD_STATUS: 'success',
      DRONE_COMMIT_LINK: 'https://example.com/commit',
      DRONE_BUILD_LINK: 'https://example.com/build'
    },
    encoding: 'utf8'
  })
}

const success = runMain('success')
assert.strictEqual((success.stdout + success.stderr).includes(token), false, '成功推播的輸出洩漏 token')
assert.strictEqual(success.status, 0, success.stderr)

const httpError = runMain('http-error')
const httpOutput = httpError.stdout + httpError.stderr
assert.strictEqual(httpOutput.includes(token), false, 'HTTP 失敗的輸出洩漏 token')
assert.strictEqual(httpError.status, 0, httpOutput)
assert.strictEqual(httpOutput.trim(), 'LINE 推播失敗：401 Authentication failed')

const networkError = runMain('network-error')
const networkOutput = networkError.stdout + networkError.stderr
assert.strictEqual(networkOutput.includes('Network Error'), true, '網路錯誤沒有印出 err.message')
assert.strictEqual(networkOutput.includes(token), false, '網路錯誤的輸出洩漏 token')
assert.strictEqual(networkError.status, 0, networkOutput)

const echoedToken = runMain('echoed-token')
const echoedOutput = echoedToken.stdout + echoedToken.stderr
assert.strictEqual(echoedOutput.includes(token), false, 'LINE 錯誤訊息回顯 token')
assert.strictEqual(echoedToken.status, 0, echoedOutput)
assert.strictEqual(echoedOutput.trim(), 'LINE 推播失敗：401 Authentication failed: [REDACTED]')
