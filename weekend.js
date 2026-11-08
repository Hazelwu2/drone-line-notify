function shouldSkip({ skipWeekend, now }) {
  const taiwanDay = new Date(now.getTime() + 8 * 60 * 60 * 1000).getUTCDay()
  return (skipWeekend === true || skipWeekend === 'true') && (taiwanDay === 6 || taiwanDay === 0)
}

module.exports = { shouldSkip }
