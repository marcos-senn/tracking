function normalizeCalendarDateTime(date, time) {
  if (!date || !time) return null;
  const normalizedTime = time.length === 5 ? time : `${String(time).padStart(2, '0')}:00`;
  return `${date}T${normalizedTime}:00`;
}

function buildCalendarEventPayload({ type, loadNumber, driverName, city, date, timeFrom, timeTo, truck, rate }) {
  const startTime = timeFrom || '08:00';
  const endTime = timeTo || (() => {
    const [h, m] = startTime.split(':').map(Number);
    let newH = h + 1;
    if (newH >= 24) newH = 23;
    return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  })();

  return {
    summary: `${type} - Load #${loadNumber} - ${driverName || 'Unassigned'}`,
    location: city,
    description: `Truck: ${truck || 'N/A'}, Rate: $${rate || 0}`,
    start: { dateTime: normalizeCalendarDateTime(date, startTime), timeZone: 'America/Chicago' },
    end: { dateTime: normalizeCalendarDateTime(date, endTime), timeZone: 'America/Chicago' },
  };
}

module.exports = {
  normalizeCalendarDateTime,
  buildCalendarEventPayload,
};
