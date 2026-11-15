import {growth, priorHour, receiptMoney, receiptTime, receiptWindow, receiptsToday} from './receipt-window';
import TrendChart from './TrendChart';

export type Kind = 'summary'|'hour'|'hourCompare'|'trend'|'time'|'compare'|'advice'|'unknown';

export function classify(q: string, previous: Kind = 'summary'): Kind {
  if (/建议|改善|怎么做|怎么稳|原因|提升|优化/.test(q)) return 'advice';
  const hour = /(?:最近|近|过去)(?:一|1)(?:个)?小时|(?:最近|过去|近)\s*60\s*分钟/.test(q);
  const comparison = /对比|比较|相比|比昨|昨日|昨天|上周|增长/.test(q);
  if (hour) return comparison ? 'hourCompare' : 'hour';
  if (comparison && (previous === 'hour' || previous === 'hourCompare') && !/今天|今日|全天|经营对比/.test(q)) return 'hourCompare';
  if (/趋势|走势|七天|7天|一周/.test(q)) return 'trend';
  if (comparison) return 'compare';
  if (/时段|几点|高峰|最多|小时/.test(q)) return 'time';
  if (/今天|今日|收款|表现|营收|概况/.test(q)) return 'summary';
  if (/继续|详细|展开/.test(q)) return previous;
  return 'unknown';
}

const money = (cents: number) => '¥' + receiptMoney(cents);
const time = (minute: number) => receiptTime(minute).slice(-5);
const span = (from: number, to: number) => time(from) + '–' + time(to);

type Period = ReturnType<typeof receiptWindow>;
type Bucket = Period['buckets'][number];

function diff(current: number, prior: number) {
  return (current > prior ? '多' : '少') + money(Math.abs(current - prior));
}

function comparison(current: Period, prior: Period, label: string) {
  if (current.cents === prior.cents) return label + '收款持平，均为 ' + money(current.cents) + '。';
  const headline = label + diff(current.cents, prior.cents) + '。';
  if (!current.count || !prior.count) return headline + '两期分别有 ' + current.count + ' 笔和 ' + prior.count + ' 笔成功付款。';
  const volume = (current.count - prior.count) * prior.cents / prior.count;
  const other = current.cents - prior.cents - volume;
  const driver = Math.abs(volume) >= Math.abs(other)
    ? '付款' + (current.count > prior.count ? '多' : '少') + '了 ' + Math.abs(current.count - prior.count) + ' 笔'
    : '笔均从 ' + money(prior.average) + ' 变为 ' + money(current.average);
  return headline + '影响较大的是' + driver + '。';
}

function peak(buckets: Bucket[], metric: 'cents' | 'count') {
  return buckets.filter(bucket => bucket[metric] > 0).sort((a, b) => b[metric] - a[metric])[0];
}

function advice(context: Kind, now: number) {
  const hourly = context === 'hour' || context === 'hourCompare';
  const {today, yesterday, history} = receiptsToday(now);
  if (hourly || context === 'compare') {
    const current = hourly ? receiptWindow(now) : today;
    const prior = hourly ? priorHour(now) : yesterday;
    const changes = current.buckets.map((bucket, index) => ({...bucket, delta: bucket.count - (prior.buckets[index]?.count ?? 0)}));
    const standout = changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    if (standout?.delta) return {
      lead: '先核对 ' + span(standout.from, standout.to) + ' 的付款变化。',
      evidence: '和昨天同一段相比，这段支付笔数' + (standout.delta > 0 ? '多' : '少') + '了 ' + Math.abs(standout.delta) + ' 笔，是本次对比里笔数变化最大的时段。',
      action: '交班时问当班同事，这段时间是否有团购、促销、暂停收银或其他情况。结合订单明细确认，先记下最可能的一个解释。',
      review: '接下来 3 个可比营业日继续看同一时段的支付笔数，记录当时有没有类似情况，再决定是否调整。',
    };
    return {
      lead: '先保持当前安排，复查同一时段的笔均金额。',
      evidence: '本次对比的各时段付款笔数没有明显差异。',
      action: '交班时查看这个时间范围内金额最高的几笔订单，确认是否有团购或大额单。',
      review: '在下一个可比营业日复查同一时段。若只出现一次波动，先维持现有安排。',
    };
  }
  if (context === 'trend') {
    const best = [...history].sort((a, b) => b.cents - a.cents)[0];
    return {
      lead: '先复盘 ' + receiptTime(best.from).slice(0, 5) + ' 的收款高点。',
      evidence: '这天完整营业日收了 ' + money(best.cents) + '，是近七个完整日最高。',
      action: '交班时对照这天和上一周同星期的订单明细，找出拉高收款的时段，再向当班店员确认是否有大单或活动。',
      review: '如果找到可以复做的动作，下一个同星期只试这一项，记录同时段付款笔数、收款金额和优惠成本。',
    };
  }
  const busiest = peak(today.buckets.filter(bucket => bucket.to - bucket.from === 60), 'count');
  const shift = busiest ? span(busiest.from, busiest.from + 30) : '下一次营业高峰前 30 分钟';
  return {
    lead: '先观察收银排队，再决定要不要临时加人。',
    evidence: busiest ? span(busiest.from, busiest.to) + ' 是今天已完整统计、付款笔数最多的时段，共 ' + busiest.count + ' 笔。' : '今天还没有足够的完整小时数据来判断最忙时段。',
    action: '下个可比营业日 ' + shift + '，安排当班店员每 10 分钟记一次等候人数。连续两次有 4 人或以上等候时，试行支援收银 15 分钟。',
    review: '支援前后各记一次等候人数。几个可比营业日都出现排队，且支援后队伍明显缩短，再考虑固定安排。',
  };
}

export function answerLead(kind: Kind, context: Kind, now: number) {
  if (kind === 'advice') return advice(context, now).lead;
  if (kind === 'hour' || kind === 'hourCompare') {
    const latest = receiptWindow(now);
    const prior = priorHour(now);
    if (kind === 'hourCompare') return comparison(latest, prior, '比昨天同一小时');
    return '最近一小时成功收款 ' + money(latest.cents) + '，共 ' + latest.count + ' 笔' + (latest.count ? '，笔均 ' + money(latest.average) : '') + '。' +
      (prior.count ? '比昨天同一小时' + (latest.cents === prior.cents ? '持平' : diff(latest.cents, prior.cents)) + '。' : '昨天同一小时暂无成功付款。');
  }
  const {today, yesterday, history} = receiptsToday(now);
  if (kind === 'compare') return comparison(today, yesterday, '比昨天同时段');
  if (kind === 'trend') return '近七个完整日共收款 ' + money(history.reduce((sum, day) => sum + day.cents, 0)) + '。今天截至 ' + time(today.end) + '，收款 ' + money(today.cents) + '。';
  if (kind === 'time') {
    const complete = today.buckets.filter(bucket => bucket.to - bucket.from === 60);
    const mostMoney = peak(complete, 'cents');
    const mostOrders = peak(complete, 'count');
    if (!mostMoney || !mostOrders) return '今天暂时没有可排序的完整小时收款。';
    return '金额最高的是 ' + span(mostMoney.from, mostMoney.to) + '（' + money(mostMoney.cents) + '），笔数最多的是 ' + span(mostOrders.from, mostOrders.to) + '（' + mostOrders.count + ' 笔）。';
  }
  if (kind === 'summary') return '今天截至 ' + time(today.end) + '，成功收款 ' + money(today.cents) + '，共 ' + today.count + ' 笔。';
  return '目前可以分析收款趋势、时段和经营对比。这个问题暂时没有对应的演示数据。';
}

const followups: Record<Kind, string[]> = {
  hour: ['和昨天同一小时比怎么样？', '最近一小时怎么改善？', '刷新最近一小时收款'],
  hourCompare: ['最近一小时怎么改善？', '刷新最近一小时收款'],
  summary: ['今天哪个时段收款最多？', '经营对比'],
  trend: ['经营对比', '趋势变化原因与改善建议'],
  time: ['高峰时段如何改善', '收款趋势'],
  compare: ['变化原因与改善建议', '时段分析'],
  advice: ['经营对比', '收款趋势'],
  unknown: ['收款趋势', '时段分析'],
};

function BucketRows({buckets}: {buckets: Bucket[]}) {
  return <>{buckets.map(bucket => <div className="rank" key={bucket.from}>
    <span>{span(bucket.from, bucket.to)} · {bucket.count} 笔</span>
    <em>{money(bucket.cents)}</em>
  </div>)}</>;
}

export function AnswerCards({kind,context,onAsk,now}: {kind:Kind;context:Kind;onAsk:(q:string)=>void;now:number}) {
  const {today, yesterday, lastWeek, history} = receiptsToday(now);
  const hourly = kind === 'hour' || kind === 'hourCompare';
  const latest = hourly ? receiptWindow(now) : today;
  const prior = hourly ? priorHour(now) : yesterday;
  const plan = kind === 'advice' ? advice(context, now) : undefined;
  return <div className="answer-cards">
    {hourly && <>
      <p className="explanation">{receiptTime(latest.start)} – {receiptTime(latest.end)} · 北京时间 · 演示数据</p>
      {kind === 'hour' && <><h4>每 15 分钟收款</h4><BucketRows buckets={latest.buckets}/></>}
    </>}
    {kind === 'summary' && <><h4>今日有收款的时段</h4><BucketRows buckets={today.buckets.filter(bucket => bucket.count)}/></>}
    {kind === 'trend' && <><h4>近七个完整日 · 元</h4><TrendChart days={history}/><p className="explanation">今日截至 {time(today.end)} · {money(today.cents)}</p></>}
    {kind === 'time' && <><h4>各时段收款与笔数</h4><BucketRows buckets={today.buckets.filter(bucket => bucket.count)}/><p className="explanation">最高时段只在完整小时中比较。支付笔数可辅助判断收银忙闲，现场排队需另行观察。</p></>}
    {(kind === 'compare' || kind === 'hourCompare') && <>
      <h4>{hourly ? '昨天同一小时' : '截至 ' + time(today.end) + ' 的同时段对比'}</h4>
      <table><thead><tr><th>指标</th><th>本期</th><th>昨日</th></tr></thead><tbody>
        <tr><td>成功收款</td><td>{money(latest.cents)}</td><td>{money(prior.cents)}</td></tr>
        <tr><td>付款笔数</td><td>{latest.count}</td><td>{prior.count}</td></tr>
        <tr><td>笔均金额</td><td>{latest.count ? money(latest.average) : '—'}</td><td>{prior.count ? money(prior.average) : '—'}</td></tr>
      </tbody></table>
      {!hourly && lastWeek.count > 0 && <p className="explanation">较上周同日同时段 {growth(today.cents, lastWeek.cents)}</p>}
    </>}
    {plan && <div className="advice-steps"><p className="advice-evidence">{plan.evidence}</p>
      <h4>怎么做</h4><p>{plan.action}</p>
      <h4>怎么复盘</h4><p>{plan.review}</p>
    </div>}
    <div className="followups"><small>继续分析：</small>{followups[kind].map(q => <button key={q} onClick={()=>onAsk(q)}>{q} <img className="follow-icon" src={new URL('./assets/prototype/follow.svg',location.href).pathname} alt=""/></button>)}</div>
  </div>;
}

export function AnswerText({text}: {text: string}) {
  return <>{text.split(/(¥[\d,]+(?:\.\d+)?)/g).map((part, index) => part.startsWith('¥')
    ? <strong className="answer-money" key={index}>{part}</strong> : part)}</>;
}
