import {useState} from 'react';
import {receiptMoney, receiptTime, type receiptsToday} from './receipt-window';

export default function TrendChart({days, interactive = false}: {days: ReturnType<typeof receiptsToday>['history']; interactive?: boolean}) {
  const [selected, select] = useState<number | null>(null);
  const max = Math.max(1, ...days.map(day => day.cents));
  return <><div className="chart receipt-trend">
    {days.map((day, index) => <div key={day.from}>
      {interactive ? <button type="button" className="trend-value" aria-pressed={selected === index}
        aria-label={receiptTime(day.from).slice(0, 5) + ' 收款 ' + receiptMoney(day.cents) + ' 元'}
        onClick={() => select(index)}>{Math.round(day.cents / 100)}</button>
        : <span title={'¥' + receiptMoney(day.cents)}>{Math.round(day.cents / 100)}</span>}
      <div style={{height: day.cents / max * 108}}/>
      <small aria-label={receiptTime(day.from).slice(0, 5)}>{index % 2 === 0 ? receiptTime(day.from).slice(0, 5) : ''}</small>
    </div>)}
  </div>{selected !== null && <div className="chart-readout" aria-live="polite">{receiptTime(days[selected].from).slice(0, 5)} · ¥{receiptMoney(days[selected].cents)}</div>}</>;
}
