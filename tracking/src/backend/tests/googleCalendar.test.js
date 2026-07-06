const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCalendarEventPayload, normalizeCalendarDateTime } = require('../utils/googleCalendar');

test('normalizeCalendarDateTime creates a valid datetime for a date and time', () => {
  assert.equal(normalizeCalendarDateTime('2026-07-06', '08:00'), '2026-07-06T08:00:00');
  assert.equal(normalizeCalendarDateTime('2026-07-06', '08:30'), '2026-07-06T08:30:00');
});

test('buildCalendarEventPayload uses a default delivery end time when missing', () => {
  const payload = buildCalendarEventPayload({
    type: 'DEL',
    loadNumber: '1001',
    driverName: 'John',
    city: 'Dallas',
    date: '2026-07-06',
    timeFrom: '08:00',
    timeTo: '',
    truck: 'T-100',
    rate: 1200,
  });

  assert.equal(payload.summary, 'DEL - Load #1001 - John');
  assert.equal(payload.location, 'Dallas');
  assert.equal(payload.start.dateTime, '2026-07-06T08:00:00');
  assert.equal(payload.end.dateTime, '2026-07-06T09:00:00');
  assert.equal(payload.start.timeZone, 'America/Chicago');
});
