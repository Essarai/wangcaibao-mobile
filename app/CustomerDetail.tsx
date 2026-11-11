const days = [
  { date: '10/20', returning: 37, newCustomers: 30, unknown: 2 },
  { date: '10/21', returning: 44, newCustomers: 34, unknown: 2 },
  { date: '10/22', returning: 41, newCustomers: 29, unknown: 3 },
  { date: '10/23', returning: 48, newCustomers: 33, unknown: 1 },
  { date: '10/24', returning: 46, newCustomers: 31, unknown: 2 },
  { date: '10/25', returning: 45, newCustomers: 30, unknown: 1 },
  { date: '10/26', returning: 52, newCustomers: 32, unknown: 2 },
];

export default function CustomerDetail({ share, onBack }: { share: boolean; onBack: () => void }) {
  const title = share ? '老客占比' : '下单顾客数';
  const metric = (day: typeof days[number]) => share
    ? day.returning / (day.returning + day.newCustomers) * 100
    : day.returning + day.newCustomers + day.unknown;
  const format = (value: number) => share ? `${value.toFixed(1)}%` : `${value} 人`;
  const latest = days[days.length - 1];

  return <>
    <div className="chathead">
      <button aria-label="返回首页" onClick={onBack}><img className="control-icon" src="./assets/prototype/back.svg" alt="" /></button>
      <b>{title}</b>
      <span className="customer-detail-spacer" />
    </div>
    <div className="body customer-detail">
      <article>
        <div className="row"><h3>昨日{title}</h3><small>{latest.date} · 模拟数据</small></div>
        <strong className="amount">{format(metric(latest))}</strong>
        <div className="rank"><span>老客</span><b>{latest.returning} 人</b></div>
        <div className="rank"><span>新客</span><b>{latest.newCustomers} 人</b></div>
        <div className="rank"><span>身份未识别</span><b>{latest.unknown} 人</b></div>
        <p><small>{share ? '老客占比 = 老客人数 ÷ 已识别顾客人数（84 人）。' : '同一顾客当天多次下单只计 1 人。'}</small></p>
      </article>
      <article>
        <div className="row"><h3>近七日{title}</h3><small>截至昨日</small></div>
        {days.map(day => <div className="comparison-bar" key={day.date}>
          <div className="row"><span>{day.date}</span><b>{format(metric(day))}</b></div>
          <div className="track" aria-hidden="true"><span style={{width: `${metric(day)}%`}} /></div>
        </div>)}
      </article>
    </div>
  </>;
}
