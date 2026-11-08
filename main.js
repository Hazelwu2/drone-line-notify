(async function () {
  const { shouldSkip } = require('./weekend')
  const now = new Date()
  if (shouldSkip({ skipWeekend: process.env.PLUGIN_SKIP_WEEKEND, now })) {
    const taiwanDay = new Date(now.getTime() + 8 * 60 * 60 * 1000).getUTCDay()
    console.log(`台灣時間${taiwanDay === 6 ? '週六' : '週日'}，skip_weekend 已開啟，不推播`)
    return
  }

  const axios = require('axios')
  // const dayjs = require('dayjs')
  const flex = require('./flex.json')

  const {
      DRONE_REPO_NAME,
      DRONE_COMMIT_MESSAGE,
      DRONE_COMMIT_BRANCH,
      DRONE_BUILD_EVENT,
      DRONE_COMMIT_AUTHOR,
      CI_BUILD_NUMBER,
      DRONE_BUILD_STATUS,
      DRONE_COMMIT_LINK,
      DRONE_BUILD_LINK,
      PLUGIN_ACCESS_TOKEN,
      PLUGIN_TO,
      DRONE_BUILD_NUMBER,
  } = process.env

  flex.altText = `${DRONE_REPO_NAME}(${DRONE_COMMIT_BRANCH}) build ${CI_BUILD_NUMBER || DRONE_BUILD_NUMBER} ${DRONE_BUILD_STATUS}`
  flex.contents.body.contents[1].text = DRONE_REPO_NAME
  flex.contents.body.contents[2].text = DRONE_COMMIT_MESSAGE
  flex.contents.body.contents[4].contents[0].contents[1].text = DRONE_COMMIT_BRANCH
  flex.contents.body.contents[4].contents[1].contents[1].text = DRONE_BUILD_EVENT
  flex.contents.body.contents[4].contents[2].contents[1].text = DRONE_COMMIT_AUTHOR
  flex.contents.body.contents[4].contents[3].contents[1].text = CI_BUILD_NUMBER || DRONE_BUILD_NUMBER
  flex.contents.body.contents[4].contents[4].contents[1].text = DRONE_BUILD_STATUS
  flex.contents.body.contents[4].contents[4].contents[1].color = DRONE_BUILD_STATUS === 'success' ? '#33aa55' : '#cc3d33'
  flex.contents.body.contents[5].contents[0].action.uri = DRONE_COMMIT_LINK
  flex.contents.body.contents[5].contents[1].action.uri = DRONE_BUILD_LINK
  

  await axios.post('https://api.line.me/v2/bot/message/push',
      {
          'to': PLUGIN_TO,
          'messages': [ flex ]
      },
      {
          headers:
          {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${PLUGIN_ACCESS_TOKEN}`
          }
      }
  ).catch(err => {
    const response = err.response
    const details = response
      ? [response.status, response.data && response.data.message].filter(value => value !== undefined && value !== null && value !== '').join(' ')
      : err.message
    const oneLineDetails = String(details).replace(/[\r\n]+/g, ' ')
    const safeDetails = PLUGIN_ACCESS_TOKEN
      ? oneLineDetails.split(PLUGIN_ACCESS_TOKEN).join('[REDACTED]')
      : oneLineDetails
    console.log(`LINE 推播失敗：${safeDetails}`)
  })
})()
