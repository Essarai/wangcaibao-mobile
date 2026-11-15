import {receiptMoney, type receiptWindow} from './receipt-window';
import TrendChart from './TrendChart';
export type Kind='summary'|'hour'|'trend'|'time'|'compare'|'advice'|'unknown';
export function classify(q:string,previous:Kind='summary'):Kind{
 if(/建议|改善|怎么做|原因|提升|优化/.test(q))return 'advice';
 if(/最近一小时|近一小时|最近60分钟|过去一小时/.test(q))return 'hour';
 if(/趋势|走势|七天|7天|一周/.test(q))return 'trend';
 if(/时段|几点|高峰|最多|小时/.test(q))return 'time';
 if(/对比|比较|昨日|昨天|上周|增长/.test(q))return 'compare';
 if(/今天|今日|收款|表现|营收|概况/.test(q))return 'summary';
 if(/继续|详细|展开/.test(q))return previous;
 return 'unknown';
}
export const intros:Record<Kind,string>={hour:'',summary:'截至16:30，今天成功收款 ¥3,680.00，共 80 笔。较昨日同时段增长 +15.0%。',trend:'10月21日—27日成功收款 ¥25,820.00。今天仅统计至16:30，不宜直接与历史全天比较。',time:'今天截至16:30，14:00时段收款最高（¥524.29）。这代表收款发生时间，不能直接推断顾客到店时间。',compare:'今天截至16:30收款 ¥3,680.00，昨日同时段 ¥3,200.00，变化 +15.0%，对比采用相同截止时刻。',advice:'明天下午先看 14 点的收银排队，再决定要不要加人。',unknown:'目前我可以帮你分析收款趋势、时段贡献、经营对比和经营建议。这个问题暂时没有对应的演示数据，请选择下方主题继续。'};
const advicePlans = {
  time: {
    lead: intros.advice,
    evidence: '今天 14 点收款 ¥524.29，是截至 16:30 收款最高的完整小时。金额可能被几笔大单拉高，排队情况需要现场确认。',
    action: '明天 14:00–14:30，请当班店员每 10 分钟记一次等候人数。若连续两次有 4 人或以上等候，请能操作收银的同事支援 15 分钟。4 人先作为试行阈值。',
    review: '支援前后各记一次等候人数。如果接下来几个可比营业日反复出现排队，且支援后队伍明显缩短，再考虑固定安排。',
  },
  compare: {
    lead: '先找出今天多出来的 10 笔付款集中在哪个时段。',
    evidence: '截至 16:30，比昨天多收 ¥480。按笔数和笔均金额拆分，笔数变化贡献约 ¥457，笔均变化贡献约 ¥23。',
    action: '今晚交班时，把今天和昨天 16:30 前的成功支付按小时数一遍。找到多出笔数最多的时段，问当班店员当时有没有做活动或遇到团购集中付款。',
    review: '接下来 3 个可比营业日，继续记这个时段的支付笔数，并标记有无活动。若增加只出现了一次，先按原计划排班。',
  },
  trend: {
    lead: '先复盘 10 月 26 日的高点，找一个这周能复测的做法。',
    evidence: '10 月 26 日收款 ¥4,600，是这段走势里的高点。今天的数据截至 16:30，复盘时用完整营业日比较。',
    action: '今天交班时，把 10 月 26 日和上周同星期的交易按小时对照。找到差额最大的小时，查看是订单多了还是出现高额订单，再请当班店员补记当天的活动或团购。',
    review: '如果找到一个可以复做的动作，下个同星期只试这一项，记录同时段笔数、收款和优惠成本，再决定是否继续。',
  },
};

export function advicePlan(context?: Kind) {
  if (context === 'compare' || context === 'trend') return advicePlans[context];
  return advicePlans.time;
}

export const followups:Record<Kind,string[]>={hour:['刷新最近一小时收款'],summary:['今天哪个时段收款最多？','经营对比'],trend:['经营对比','趋势变化原因与改善建议'],time:['高峰时段如何改善','收款趋势'],compare:['变化原因与改善建议','时段分析'],advice:['经营对比','收款趋势'],unknown:['收款趋势','时段分析']};
export function AnswerCards({kind,context,onAsk,receipts}:{kind:Kind;context?:Kind;onAsk:(q:string)=>void;receipts?:ReturnType<typeof receiptWindow>}){return <div className="answer-cards">
{kind==='hour'&&receipts&&<>
  <p className="explanation">{receipts.start} – {receipts.end} · 北京时间 · 演示数据</p>
  <h4>每 15 分钟收款</h4>
  {receipts.buckets.map(bucket=><div className="rank" key={bucket.start}>
    <span>{bucket.start.slice(-5)}–{bucket.end.slice(-5)} · {bucket.count} 笔</span>
    <em>¥ {receiptMoney(bucket.cents)}</em>
  </div>)}
</>}
{kind==='summary'&&<><h4>时段贡献排行</h4>{[['9:00—12:00','¥ 1,840.00'],['12:00—15:00','¥ 1,240.00'],['15:00—18:00','¥ 600.00'],['18:00—23:59','未发生交易']].map(([label,value],i)=><div className="rank" key={label}><span>{i+1}　{label}</span><em>{value}</em></div>)}</>}
{kind==='trend'&&<><div className="metrics"><div>收款笔数<strong>80</strong><small>今日截至16:30</small></div><div>笔均金额（元）<strong>46</strong><small>成功收款口径</small></div></div><h4>收款走势</h4><TrendChart/><p className="explanation">10/21～10/26，日收款从 ¥2,680.00 升至 ¥4,600.00，变化 +71.6%。最高为10/26。虚线表示今天未完结的数据。</p></>}
{kind==='time'&&<><h4>小时收款分布</h4><div className="hour-bars">{[120,210,360,445,385,460,430,524.29,390,355.71].map((v,i)=><div key={i} title={`${i+7}:00 ¥${v}`}><div style={{height:v/5}} className={i===7?'peak':''}/><small>{i+7}时</small></div>)}</div><div className="insight"><b>14:00　¥524.29</b><p>当前最高收款小时。16时数据仅统计到16:30，不能直接与完整小时比较。</p></div></>}
{kind==='compare'&&<><h4>1. 把对照放在同一截止时刻</h4>{[['今日 10-27','¥ 3,680.00',100],['前一日 10-26','¥ 3,200.00',87],['上周同日 10-20','¥ 2,950.00',80]].map(([x,y,w])=><div className="comparison-bar" key={x}><div className="row"><span>{x}</span><b>{y}</b></div><div className="track"><span style={{width:`${w}%`}}/></div></div>)}<p className="explanation">本期与前一日、上周同日均按16:30前比较。较上周同日 +24.7%。不把今天半天与昨日全天直接比较。</p><h4>2. 将金额变化拆成两部分</h4><div className="comparison-bar blue"><div className="row">支付笔数变化贡献<b>+¥457.14</b></div><div className="track"><span style={{width:"95.2%"}}/></div></div><div className="comparison-bar blue"><div className="row">笔均金额变化贡献<b>+¥22.86</b></div><div className="track"><span style={{width:"4.8%"}}/></div></div><p className="explanation">收款净变化 +¥480.00。按“先笔数、后笔均”拆分，两项之和等于金额变化，表示算术贡献，不代表经营原因。</p><table><thead><tr><th>指标</th><th>本期</th><th>前一日</th></tr></thead><tbody><tr><td>成功笔数</td><td>80</td><td>70</td></tr><tr><td>笔均金额</td><td>¥46.00</td><td>¥45.71</td></tr></tbody></table><div className="comparison-conclusion"><b>ⓘ 这组对比意味着什么？</b><p>把支付笔数和笔均金额分别跟踪。缺少现场和订单数据时，不直接归因于新客增长或营销活动。</p></div></>}
{kind==='advice'&&<AdviceSteps context={context}/>}
<div className="followups"><small>继续分析：</small>{followups[kind].map(q=><button key={q} onClick={()=>onAsk(q)}>{q} <img className="follow-icon" src={new URL('./assets/prototype/follow.svg',location.href).pathname} alt=""/></button>)}</div></div>}

function AdviceSteps({context}: {context?: Kind}) {
  const {evidence, action, review} = advicePlan(context);
  return <div className="advice-steps">
    <p className="advice-evidence">{evidence}</p>
    <h4>怎么做</h4><p>{action}</p>
    <h4>怎么复盘</h4><p>{review}</p>
  </div>;
}

export function AnswerText({text}:{text:string}){return <>{text.split(/(¥[\d,]+(?:\.\d+)?|[+]\d+(?:\.\d+)?%|\b80\b)/g).map((part,i)=>part.startsWith('¥')?<strong className="answer-money" key={i}>{part}</strong>:part.startsWith('+')?<em className="answer-growth" key={i}>{part}</em>:part==='80'?<strong key={i}>{part}</strong>:part)}</>}
