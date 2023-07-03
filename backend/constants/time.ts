// These are to make calculations easier if only the definition of seconds is changed.
const cookieSecond = 1
const cookieMinute = 60 * cookieSecond
const cookieHour = 60 * cookieMinute
const cookieDay = 24 * cookieHour
const cookieWeek = 7 * cookieDay

export const cookieTime = {
  second: cookieSecond,
  minute: cookieMinute,
  hour: cookieHour,
  day: cookieDay,
  week: cookieWeek
}

// These are to make calculations easier if only the definition of seconds is changed.
const cacheSecond = 1
const cacheMinute = 60 * cacheSecond
const cacheHour = 60 * cacheMinute
const cacheDay = 24 * cacheHour
const cacheWeek = 7 * cacheDay

export const cacheTime = {
  second: cacheSecond,
  minute: cacheMinute,
  hour: cacheHour,
  day: cacheDay,
  week: cacheWeek
}

// This makes sure that sessionTime is consistent between cache and cookie.
export const sessionTime = {
  cookie: cookieWeek,
  cache: cacheWeek
}
