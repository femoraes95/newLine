const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

function getTimeZoneOffset(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT-03:00';

  if (timeZoneName === 'GMT') {
    return '+00:00';
  }

  return timeZoneName.replace('GMT', '');
}

function getTimeZoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  return parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
}

function formatSaoPauloDateTime(date = new Date()) {
  const parts = getTimeZoneParts(date, SAO_PAULO_TIME_ZONE);
  const offset = getTimeZoneOffset(date, SAO_PAULO_TIME_ZONE);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

module.exports = {
  addHours,
  formatSaoPauloDateTime,
};
