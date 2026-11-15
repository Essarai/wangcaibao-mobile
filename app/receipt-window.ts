const minuteMs = 60_000;
const clock = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const baskets = [450, 690, 880, 1190, 1480, 1680, 1990, 2350, 2780, 3280, 3990, 4580, 5680, 7290, 8990];

export function receiptMoney(cents: number) {
  return (cents / 100).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function sample(minute: number, salt: number) {
  let value = minute ^ Math.imul(salt, 0x9e3779b1);
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

const dayMinutes = 1440;
const shanghaiOffset = 480;
const openingHour = 7;
const closingHour = 23;

function transactions(start: number, end: number) {
  const rows: {minute: number; cents: number}[] = [];
  for (let minute = start; minute < end; minute++) {
    const hour = Math.floor(((minute + shanghaiOffset) % dayMinutes) / 60);
    if (hour < openingHour || hour >= closingHour) continue;
    const chance = hour === 12 || hour === 18 ? 68 : 47;
    if (sample(minute, 1) % 100 >= chance) continue;
    const size = 1 + Number(sample(minute, 2) % 7 === 0);
    for (let order = 0; order < size; order++) {
      const value = sample(minute, order + 3);
      rows.push({minute, cents: baskets[value % baskets.length] + (value % 5) * 10});
    }
  }
  return rows;
}

function totals(rows: ReturnType<typeof transactions>) {
  const cents = rows.reduce((sum, row) => sum + row.cents, 0);
  return {cents, count: rows.length, average: rows.length ? Math.round(cents / rows.length) : 0};
}

export function receiptTime(minute: number) {
  return clock.format(minute * minuteMs);
}

function period(start: number, end: number, step: number) {
  const rows = transactions(start, end);
  const buckets = Array.from({length: Math.ceil((end - start) / step)}, (_, index) => {
    const from = start + index * step;
    const to = Math.min(end, from + step);
    return {from, to, ...totals(rows.filter(row => row.minute >= from && row.minute < to))};
  });
  return {start, end, rows, buckets, ...totals(rows)};
}

export function receiptWindow(now = Date.now()) {
  const end = Math.floor(now / minuteMs);
  return period(end - 60, end, 15);
}

export function receiptsToday(now = Date.now()) {
  const end = Math.floor(now / minuteMs);
  const start = Math.floor((end + shanghaiOffset) / dayMinutes) * dayMinutes - shanghaiOffset;
  return {
    today: period(start, end, 60),
    yesterday: period(start - dayMinutes, end - dayMinutes, 60),
    lastWeek: period(start - 7 * dayMinutes, end - 7 * dayMinutes, 60),
    history: Array.from({length: 7}, (_, index) => {
      const from = start - (7 - index) * dayMinutes;
      return {from, ...totals(transactions(from, from + dayMinutes))};
    }),
  };
}

export function tradingPeriods(today: ReturnType<typeof receiptsToday>['today']) {
  const labels = ['上午', '午间', '下午', '晚间'];
  const duration = (closingHour - openingHour) * 60 / labels.length;
  return labels.flatMap((label, index) => {
    const from = today.start + openingHour * 60 + index * duration;
    if (from >= today.end) return [];
    const scheduledEnd = from + duration;
    const to = Math.min(today.end, scheduledEnd);
    return [{label, from, to, scheduledEnd, ...totals(today.rows.filter(row => row.minute >= from && row.minute < to))}];
  });
}

export const tradingHours = [openingHour, closingHour].map(hour => String(hour).padStart(2, '0') + ':00').join('–');

export function growth(current: number, previous: number) {
  if (!previous) return '—';
  const change = (current - previous) / previous * 100;
  return (change > 0 ? '+' : '') + change.toFixed(1) + '%';
}

export function priorHour(now: number) {
  return receiptWindow(now - dayMinutes * minuteMs);
}
