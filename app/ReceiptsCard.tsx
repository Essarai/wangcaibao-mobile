import {useEffect, useRef, useState} from 'react';

export default function ReceiptsCard({onOpen, icon}: {onOpen: () => void; icon: string}) {
  const gesture = useRef<{pointer: number; start: number} | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [direction, setDirection] = useState(0);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  function open(side: number) {
    if (timer.current !== null) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onOpen();
      return;
    }
    setDirection(side);
    timer.current = setTimeout(onOpen, 260);
  }

  return <button
    type="button"
    className="receipts-card"
    aria-label="最近一小时收款"
    data-dragging={dragging}
    data-exiting={direction !== 0}
    style={{transform: `translateX(${direction ? direction * 330 : offset}px) rotate(${direction ? direction * 12 : offset / 16}deg)`}}
    onClick={event => { if (event.detail === 0) open(1); }}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0 || timer.current !== null) return;
      gesture.current = {pointer: event.pointerId, start: event.clientX};
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }}
    onPointerMove={event => {
      const start = gesture.current;
      if (start?.pointer !== event.pointerId) return;
      setOffset(Math.max(-114, Math.min(114, event.clientX - start.start)));
    }}
    onPointerUp={event => {
      const start = gesture.current;
      if (start?.pointer !== event.pointerId) return;
      gesture.current = null;
      setDragging(false);
      const distance = event.clientX - start.start;
      if (Math.abs(distance) < 7 || Math.abs(distance) >= 56) open(distance < -7 ? -1 : 1);
      setOffset(0);
    }}
    onLostPointerCapture={() => {
      gesture.current = null;
      setDragging(false);
      setOffset(0);
    }}
  >
    <img className="topic-icon" src={icon} alt="" draggable={false}/>
    <span>最近一小时收款<small>左右轻刷或点按</small></span>
    <span className="receipts-arrow" aria-hidden="true">→</span>
  </button>;
}
