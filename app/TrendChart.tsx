import {receiptMoney, receiptTime, type receiptsToday} from './receipt-window';

export default function TrendChart({days}: {days: ReturnType<typeof receiptsToday>['history']}) {
  const max = Math.max(1, ...days.map(day => day.cents));
  return <div className="chart receipt-trend">
    {days.map((day, index) => <div key={day.from}>
      <span title={'¥' + receiptMoney(day.cents)}>{Math.round(day.cents / 100)}</span>
      <div style={{height: day.cents / max * 108}}/>
      <small aria-label={receiptTime(day.from).slice(0, 5)}>{index % 2 === 0 ? receiptTime(day.from).slice(0, 5) : ''}</small>
    </div>)}
  </div>;
}
