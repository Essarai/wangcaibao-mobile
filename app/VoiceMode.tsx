import {useEffect, useRef, useState} from 'react';

type Recognition = {
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: {results: ArrayLike<ArrayLike<{transcript: string}>>}) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};

export default function VoiceMode({onClose, onAsk}: {
  onClose: () => void;
  onAsk: (question: string) => string | undefined;
}) {
  const [phase, setPhase] = useState<'idle' | 'starting' | 'listening' | 'speaking'>('idle');
  const [notice, setNotice] = useState('');
  const [turn, setTurn] = useState({question: '', answer: ''});
  const recognition = useRef<Recognition | null>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const active = phase === 'starting' || phase === 'listening';

  useEffect(() => () => {
    const mic = recognition.current;
    recognition.current = null;
    mic?.abort();
    if (speech.current) {
      speech.current = null;
      window.speechSynthesis.cancel();
    }
  }, []);

  function reply(question: string) {
    if (!question.trim()) return;
    const answer = onAsk(question);
    if (!answer) {
      setNotice('上一条回复还在生成，请稍后再试。');
      return;
    }
    setNotice('');
    setTurn({question, answer});
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = 'zh-CN';
    speech.current = utterance;
    const finish = () => {
      if (speech.current !== utterance) return;
      speech.current = null;
      setPhase('idle');
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    setPhase('speaking');
    window.speechSynthesis.speak(utterance);
  }

  function toggleMic() {
    if (active) {
      const mic = recognition.current;
      recognition.current = null;
      mic?.abort();
      setPhase('idle');
      return;
    }
    if (speech.current) {
      speech.current = null;
      window.speechSynthesis.cancel();
      setPhase('idle');
    }
    const browser = window as Window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const SpeechRecognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice('当前浏览器无法识别语音，可以试一条示例。');
      return;
    }
    const mic = new SpeechRecognition();
    recognition.current = mic;
    mic.lang = 'zh-CN';
    setNotice('');
    mic.onstart = () => {
      if (recognition.current === mic) setPhase('listening');
    };
    mic.onend = () => {
      if (recognition.current !== mic) return;
      recognition.current = null;
      setPhase('idle');
    };
    mic.onerror = () => {
      if (recognition.current === mic) setNotice('语音识别未成功，请检查麦克风权限后重试。');
    };
    mic.onresult = event => {
      if (recognition.current !== mic) return;
      recognition.current = null;
      mic.abort();
      setPhase('idle');
      reply(event.results[0][0].transcript);
    };
    try {
      setPhase('starting');
      mic.start();
    } catch {
      recognition.current = null;
      setPhase('idle');
      setNotice('麦克风暂时无法使用，可以试一条示例。');
    }
  }

  const status = {idle: '点麦克风，说说你想了解什么', starting: '正在开启麦克风…', listening: '正在聆听…', speaking: '财掌柜正在回答'}[phase];

  return <section className="voice-mode" aria-label="财掌柜语音对话">
    <div className="voice-heading">财掌柜</div>
    <div className="voice-stage">
      <div className="voice-orb" data-phase={phase} aria-hidden="true" />
      <div className="voice-caption" aria-live="polite">
        <p>{notice || status}</p>
        {turn.question && <small>你：{turn.question}</small>}
        {turn.answer && <p>{turn.answer}</p>}
      </div>
    </div>
    <div className="voice-actions">
      <button className="voice-mic" type="button" onClick={toggleMic} aria-label={active ? '关闭麦克风' : '开启麦克风'} aria-pressed={active}>
        <span aria-hidden="true" />
      </button>
      <button className="voice-demo" type="button" disabled={phase !== 'idle'} onClick={() => reply('今天收款表现怎么样？')}>试一条示例</button>
      <button className="voice-exit" type="button" onClick={onClose} aria-label="结束语音对话">×</button>
    </div>
  </section>;
}
