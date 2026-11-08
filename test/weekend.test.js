const assert = require('assert')
const { spawnSync } = require('child_process')
const { shouldSkip } = require('../weekend')

// 週五 16:00 UTC 是台灣週六 00:00。
assert.strictEqual(shouldSkip({ skipWeekend: true, now: new Date('2026-11-06T16:00:00Z') }), true)

// 週日 15:59 UTC 是台灣週日 23:59。
assert.strictEqual(shouldSkip({ skipWeekend: true, now: new Date('2026-11-08T15:59:00Z') }), true)

// 週日 16:00 UTC 是台灣週一 00:00。
assert.strictEqual(shouldSkip({ skipWeekend: true, now: new Date('2026-11-08T16:00:00Z') }), false)

// 週五 15:59 UTC 是台灣週五 23:59。
assert.strictEqual(shouldSkip({ skipWeekend: true, now: new Date('2026-11-06T15:59:00Z') }), false)

// 週五 16:00 UTC 是台灣週六 00:00，關閉設定仍要推播。
assert.strictEqual(shouldSkip({ skipWeekend: false, now: new Date('2026-11-06T16:00:00Z') }), false)

// Drone 的環境變數是字串；週五 16:00 UTC 是台灣週六 00:00。
assert.strictEqual(shouldSkip({ skipWeekend: 'true', now: new Date('2026-11-06T16:00:00Z') }), true)

// 週五 16:00 UTC 是台灣週六 00:00；未設定時照常推播。
assert.strictEqual(shouldSkip({ now: new Date('2026-11-06T16:00:00Z') }), false)

// 週五 16:00 UTC 是台灣週六 00:00；字串 false 仍要推播。
assert.strictEqual(shouldSkip({ skipWeekend: 'false', now: new Date('2026-11-06T16:00:00Z') }), false)

// 週五 16:00 UTC 是台灣週六 00:00；空字串仍要推播。
assert.strictEqual(shouldSkip({ skipWeekend: '', now: new Date('2026-11-06T16:00:00Z') }), false)

const mainCheck = spawnSync(process.execPath, ['-e', `
  const RealDate = Date
  global.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : ['2026-11-06T16:00:00Z']))
    }
  }
  const Module = require('module')
  const load = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === 'axios') {
      return { post: function () {
        process.stderr.write('LINE API called\\n')
        process.exitCode = 2
        return Promise.resolve()
      } }
    }
    return load.apply(this, arguments)
  }
  require('./main')
`], {
  cwd: require('path').resolve(__dirname, '..'),
  env: { PATH: process.env.PATH, PLUGIN_SKIP_WEEKEND: 'true' },
  encoding: 'utf8'
})

assert.strictEqual(mainCheck.status, 0, mainCheck.stderr)
assert.strictEqual(mainCheck.stdout.trim(), '台灣時間週六，skip_weekend 已開啟，不推播')
assert.strictEqual(mainCheck.stderr, '')
