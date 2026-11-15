import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BookOpen, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { seed, type State } from './domain';
import './onboarding.css';

const seenKey = 'bspb-onboarding-v1';
export function onboardingSeen() { try { return localStorage.getItem(seenKey) === 'seen'; } catch { return false; } }
export function markOnboardingSeen() { try { localStorage.setItem(seenKey, 'seen'); } catch { /* Optional preference. */ } }
export function trainingState(): State {
  const initial = seed();
  return { ...initial, invoices: [], hedges: [], events: [], policy: { ...initial.policy, coverage: 70 } };
}

export function TutorialWelcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="tutorial-welcome" aria-labelledby="welcome-title" onCancel={onSkip}>
    <button className="icon welcome-close" aria-label="Закрыть приглашение" onClick={onSkip}><X size={20}/></button>
    <span className="lesson-badge"><BookOpen size={16}/> ПЕРВЫЙ РАЗ В КАБИНЕТЕ?</span>
    <h2 id="welcome-title">Давайте пройдём<br/>первую сделку вместе</h2>
    <p>Покажем, куда нажимать и что означают цифры. Вы сами загрузите учебный счёт, подтвердите защиту курса и увидите результат.</p>
    <ol><li>Зададим правила защиты</li><li>Загрузим счёт поставщика</li><li>Проверим сделку и бюджет</li></ol>
    <div className="welcome-note"><CheckCircle2 size={18}/><span>Отдельный учебный режим. Ваши сохранённые данные останутся на месте.</span></div>
    <button className="btn large" onClick={onStart}>Начать обучение <ArrowRight size={18}/></button>
    <button className="text-btn welcome-skip" onClick={onSkip}>Пока самостоятельно</button>
    <small>Около 2 минут · обучение можно закрыть и запустить снова</small>
  </dialog>;
}

type Lesson = { title: string; text: string; task: string; target: string; allow?: string; action?: boolean; next?: string };
const lessons: Lesson[] = [
  { title: 'Вы — импортёр. Курс может измениться', text: 'Через два месяца нужно заплатить рублёвый эквивалент 25 000 юаней. Если юань подорожает, счёт в рублях вырастет. Здесь мы защитим часть этого платежа.', task: 'Пройдём путь на одном учебном счёте. Все операции — демонстрационные.', target: '[data-tour="overview"]', next: 'Задать правила' },
  { title: '1. Сначала правила, потом сделка', text: 'Хедж-политика — это ваши инструкции банку: какую часть суммы защищать, на какой срок и кто подтверждает сделку.', task: 'Нажмите «Настроить политику».', target: '[data-tour="policy-open"]', action: true },
  { title: '2. Защитим 70% суммы', text: '70% — параметр примера из презентации. Это 17 500 из 25 000 юаней. Остальные 7 500 останутся зависеть от курса. Режим — с вашим подтверждением каждой сделки.', task: 'Для урока оставьте 70% и «С подтверждением каждой сделки». Другие условия можно изучить после обучения.', target: '[data-tour="policy-coverage"]', next: 'Понятно, дальше' },
  { title: '3. Согласуйте правила', text: 'Банк не должен заключать сделки без вашего согласия. Галочка подтверждает выбранные правила и ограничения учебной политики.', task: 'Отметьте галочку «Подтверждаю правила…», затем нажмите «Дальше» в подсказке.', target: '[data-tour="policy-agreement"]' },
  { title: '4. Сохраните политику', text: 'Согласование правил ещё не покупает валюту и не оплачивает поставщика. Оно разрешает подготовить предложение по новому обязательству.', task: 'Нажмите «Подтвердить политику v2» в форме.', target: '[data-tour="policy-save"]', action: true },
  { title: '5. Откуда берётся счёт', text: 'В будущем данные приходят из учётной системы компании. В этом прототипе 1С — учебный адаптер: реальная бухгалтерия не подключается.', task: 'Выберите «1С».', target: '[data-tour="erp-1С"]', action: true },
  { title: '6. Загрузите учебный инвойс', text: 'Инвойс — это счёт поставщика. Мы добавим один счёт ERP-2026-001 на 25 000 юаней с оплатой в рублях по будущему курсу.', task: 'Нажмите «Загрузить демо-инвойсы». Кабинет подготовит предложение на 70% суммы.', target: '[data-tour="erp-sync"]', action: true },
  { title: '7. Перейдите к предложению', text: 'Счёт уже загружен. Предложение хеджа подготовлено, но пока не исполнено: на пилоте каждую сделку подтверждает клиент.', task: 'Откройте раздел «Микрохеджирование».', target: '[data-tour="nav-2"]', action: true },
  { title: '8. Проверьте условия', text: 'Предложение на 17 500 юаней связано с конкретным счётом. Перед подтверждением важны сумма, дата расчёта и источник курса.', task: 'Нажмите «Условия» в строке предложения.', target: '[data-tour="lesson-quote"] button', action: true },
  { title: '9. Подтвердите учебную сделку', text: 'NDF — расчётный форвард: при изменении курса одна сторона платит другой разницу в рублях. Юани не зачисляются, оплата поставщику остаётся отдельной операцией.', task: 'Проверьте условия и нажмите «Подтвердить исполнение в демо».', target: '[data-tour="hedge-execute"]', action: true },
  { title: '10. Что получилось в рублях', text: 'При курсе 13 ₽ счёт — 325 000 ₽. Банк компенсирует 17 500 ₽; итог — 307 500 ₽ до затрат. При курсе 11 ₽ вы платите по NDF 17 500 ₽; итог — 292 500 ₽. Покрытие 70% уменьшает колебания, но не фиксирует весь бюджет.', task: 'Можно подвигать ползунок курса. После просмотра нажмите «К отчёту».', target: '[data-tour="budget-scenario"] .scenario-totals', allow: '[data-tour="budget-scenario"]', next: 'К отчёту' },
  { title: '11. Результат нужен и бухгалтерии', text: 'В отчёте связаны счёт поставщика, расчёт по NDF и общий отток денег. Это помогает сверять бюджет, а не запоминать отдельные курсы.', task: 'Откройте «Документы и отчёты».', target: '[data-tour="nav-5"]', action: true },
  { title: 'Вы прошли первую сделку!', text: 'Правила → счёт → предложение → подтверждение → бюджет. Этот урок показывает NDF под лимит — часть решения «Хедж-политика». Опционы и якорный хедж из презентации в этом кабинете пока не реализованы.', task: 'Отчёт можно выгрузить в CSV или распечатать. Завершив урок, вы вернётесь к своим сохранённым данным.', target: '[data-tour="budget-report"] .panel-heading', next: 'Завершить обучение' },
];

function visibleTarget(selector: string) {
  return [...document.querySelectorAll<HTMLElement>(selector)].find(node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
}
type Props = { step: number; state: State; page: number; modal: string; onNext: () => void; onExit: (completed?: boolean) => void; onRestart: () => void; onNavigate: (page: number) => void };
export function TutorialGuide({ step, state, page, modal, onNext, onExit, onRestart, onNavigate }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const [host, setHost] = useState<HTMLElement>(document.body);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight, cardHeight: 300 });
  const lesson = lessons[step];
  const nextRef = useRef(onNext); nextRef.current = onNext;
  const exitRef = useRef(onExit); exitRef.current = onExit;
  useEffect(() => { setHost(document.querySelector<HTMLDialogElement>('dialog[open]') || document.body); }, [modal]);

  useEffect(() => {
    if (step === 1) onNavigate(2);
    if (step === 5) onNavigate(6);
    if (step === 10) onNavigate(2);
  }, [step, onNavigate]);
  useEffect(() => {
    const advanced = (step === 1 && modal === 'policy') ||
      (step === 4 && state.policy.approved && state.policy.coverage === 70 && state.policy.mode === 'manual' && modal !== 'policy') ||
      (step === 5 && state.erp === '1С') ||
      (step === 6 && state.invoices.some(i => i.number === 'ERP-2026-001')) ||
      (step === 7 && page === 2) || (step === 8 && modal === 'hedge') ||
      (step === 9 && state.hedges.some(h => h.status === 'Исполнен в демо') && modal !== 'hedge') ||
      (step === 11 && page === 5);
    if (advanced) nextRef.current();
  }, [step, state, page, modal]);

  useEffect(() => {
    const popover = layer.current;
    if (!popover?.isConnected) return;
    // Re-open after native dialogs so the coach remains in the browser's top layer.
    if (popover?.matches(':popover-open')) popover.hidePopover();
    popover?.showPopover();
    const target = visibleTarget(lesson.target);
    target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const measure = () => {
      const current = visibleTarget(lesson.target);
      setRect(current?.getBoundingClientRect() || null);
      setSize({ width: innerWidth, height: innerHeight, cardHeight: card.current?.offsetHeight || 300 });
      const coverage = document.querySelector<HTMLInputElement>('[data-tour="policy-coverage"] input');
      const mode = document.querySelector<HTMLSelectElement>('[data-tour="policy-mode"] select');
      const checked = document.querySelector<HTMLInputElement>('[data-tour="policy-agreement"] input')?.checked;
      setReady(step === 2 ? coverage?.value === '70' && mode?.value === 'manual' : step === 3 ? !!checked : !lesson.action);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (target) observer.observe(target);
    if (card.current) observer.observe(card.current);
    window.addEventListener('resize', measure);
    document.addEventListener('scroll', measure, true);
    document.addEventListener('input', measure, true);
    document.addEventListener('change', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('scroll', measure, true);
      document.removeEventListener('input', measure, true);
      document.removeEventListener('change', measure, true);
      if (popover?.matches(':popover-open')) popover.hidePopover();
    };
  }, [step, page, modal, lesson, host]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); exitRef.current(false); }
      if (e.key === 'Tab') {
        const allowed = visibleTarget(lesson.allow || lesson.target);
        const selector = 'button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]';
        const nodes = [...(allowed?.matches(selector) ? [allowed] : []), ...allowed?.querySelectorAll<HTMLElement>(selector) || [], ...layer.current?.querySelectorAll<HTMLElement>(selector) || []];
        const controls = nodes.filter(n => n.getBoundingClientRect().width > 0);
        if (controls.length) {
          e.preventDefault();
          const index = controls.indexOf(document.activeElement as HTMLElement);
          const next = index < 0 ? (e.shiftKey ? controls.length - 1 : 0) : (index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
          controls[next].focus({ preventScroll: true });
        }
      }
    };
    const guard = (e: MouseEvent) => {
      const target = e.target as Node;
      const allowed = visibleTarget(lesson.allow || lesson.target);
      if (!layer.current?.contains(target) && !allowed?.contains(target)) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('click', guard, true);
    return () => { document.removeEventListener('keydown', handleKey, true); document.removeEventListener('click', guard, true); };
  }, [lesson]);

  const pad = 8;
  const hole = rect ? { left: Math.max(4, rect.left - pad), top: Math.max(4, rect.top - pad), right: Math.min(size.width - 4, rect.right + pad), bottom: Math.min(size.height - 4, rect.bottom + pad) } : null;
  const width = Math.min(382, size.width - 24);
  const left = hole ? Math.max(12, Math.min(hole.left, size.width - width - 12)) : (size.width - width) / 2;
  const top = hole && size.height - hole.bottom > size.cardHeight + 24 ? hole.bottom + 12 : hole && hole.top > size.cardHeight + 24 ? hole.top - size.cardHeight - 12 : hole && hole.top > size.height / 2 ? 12 : Math.max(12, size.height - size.cardHeight - 12);
  return createPortal(<div ref={layer} popover="manual" className="tutorial-layer" data-tour-step={step}>
    {hole ? <>
      <div className="tour-shade" style={{ left: 0, top: 0, width: '100%', height: hole.top }}/>
      <div className="tour-shade" style={{ left: 0, top: hole.bottom, width: '100%', bottom: 0 }}/>
      <div className="tour-shade" style={{ left: 0, top: hole.top, width: hole.left, height: Math.max(0, hole.bottom - hole.top) }}/>
      <div className="tour-shade" style={{ left: hole.right, top: hole.top, right: 0, height: Math.max(0, hole.bottom - hole.top) }}/>
      <div className="tour-outline" style={{ left: hole.left, top: hole.top, width: Math.max(0, hole.right - hole.left), height: Math.max(0, hole.bottom - hole.top) }}/>
    </> : <div className="tour-shade" style={{ inset: 0 }}/>}
    <section ref={card} role="region" aria-label="Пошаговое обучение" className="tour-card" style={{ left, top, width }}>
      <div className="tour-card-header"><span><BookOpen size={14}/> УЧЕБНЫЙ РЕЖИМ · {step + 1}/{lessons.length}</span><button className="icon" aria-label="Выйти из обучения" onClick={() => onExit(false)}><X size={18}/></button></div>
      <div className="tour-progress" aria-label={`Шаг ${step + 1} из ${lessons.length}`}><i style={{ width: `${(step + 1) / lessons.length * 100}%` }}/></div>
      <div aria-live="polite"><h2>{lesson.title}</h2><p>{lesson.text}</p><div className="tour-task">{lesson.task}</div></div>
      {step === 2 && !ready && <p className="error">Для этого урока нужны 70% и подтверждение каждой сделки.</p>}
      <div className="tour-actions"><button className="text-btn" aria-label="Начать обучение заново" onClick={onRestart}><RotateCcw size={14}/> Заново</button>{lesson.action ? <span className="tour-waiting">Нажмите выделенную кнопку</span> : <button className="btn" disabled={!ready} onClick={step === lessons.length - 1 ? () => onExit(true) : onNext}>{lesson.next || 'Дальше'} <ArrowRight size={16}/></button>}</div>
    </section>
  </div>, host);
}
