const minuteMs = 60_000;
const clock = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const hour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Shanghai', hour: 'numeric', hourCycle: 'h23',
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

export function receiptWindow(now = Date.now()) {
  const end = Math.floor(now / minuteMs);
  const buckets = Array.from({length: 4}, (_, index) => {
    const start = end - 60 + index * 15;
    let cents = 0;
    let count = 0;
    for (let minute = start; minute < start + 15; minute++) {
      const localHour = Number(hour.format(minute * minuteMs));
      const chance = localHour >= 7 && localHour < 23 ? 47 : 4;
      if (sample(minute, 1) % 100 >= chance) continue;
      const size = 1 + Number(sample(minute, 2) % 7 === 0);
      for (let order = 0; order < size; order++) {
        const value = sample(minute, order + 3);
        cents += baskets[value % baskets.length] + (value % 5) * 10;
      }
      count += size;
    }
    return {start: clock.format(start * minuteMs), end: clock.format((start + 15) * minuteMs), cents, count};
  });
  const count = buckets.reduce((sum, item) => sum + item.count, 0);
  const cents = buckets.reduce((sum, item) => sum + item.cents, 0);
  return {buckets, count, cents, start: buckets[0].start, end: buckets[3].end};
}
