import { Component, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, AudioLines, BookOpen, Check, ChevronRight, CircleHelp, Download, Headphones, KeyRound, LoaderCircle, Maximize, Moon, Pause, Play, Radio, Send, Settings2, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import Museum from './Museum';
import Dialog from './Dialog';
import { CONNECTIONS, ENDING, EVIDENCE, GALLERIES, isGalleryRestored, isUnlocked } from './story';
import type { Evidence, GalleryId } from './story';
import { buildContext, confirmConnection, defaultSave, validateReply } from './engine';
import type { ArchivistReply, Save } from './engine';
import { loadSave, writeSave } from './storage';
import { MuseumAudio } from './audio';
import { fixWebmDuration } from '@fix-webm-duration/fix';
type Panel = 'journal' | 'archivist' | 'settings' | 'about' | 'help' | null;
type ModelStatus = 'sleeping' | 'loading' | 'ready' | 'error';
type Message = {
    question: string;
    reply?: ArchivistReply;
    error?: string;
    seconds?: number;
};
function Mark({ small = false }: {
    small?: boolean;
}) { return <svg className={small ? 'brand-mark small' : 'brand-mark'} viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M4 45V19C4-1 36-1 36 19V45M12 45V20C12 8 28 8 28 20V45M4 28H36M20 2V45M1 45H39" stroke="currentColor" strokeWidth="1.3"/><circle cx="20" cy="35" r="2" fill="currentColor"/></svg>; }
class SceneBoundary extends Component<{
    children: ReactNode;
    onFailure: () => void;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { this.props.onFailure(); }
    render() { return this.state.failed ? <div className="scene-fallback"><Mark /><p>The hall cannot be rendered on this device.</p></div> : this.props.children; }
}
const TourTimeline = [
    { time: 0, gallery: 'departures' as GalleryId, title: 'A museum after hours.', text: 'The last train has gone. Someone has left a light on.', ids: [], connections: [] },
    { time: 12, gallery: 'departures' as GalleryId, title: 'A return ticket. A winter register.', text: 'A.V. came back each winter. This was a return, not a farewell.', ids: ['d1', 'd2'], connections: ['returns'] },
    { time: 27, gallery: 'departures' as GalleryId, title: 'Time for the town.', text: 'A repaired clock. A lamp for the crossing. The station was still useful after the trains stopped.', ids: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'], connections: ['returns', 'clock', 'light'] },
    { time: 42, gallery: 'shelter' as GalleryId, title: 'Three knocks in the rain.', text: 'The warning directed families uphill. Twenty-two people found shelter in the waiting room.', ids: ['s1', 's2'], connections: ['refuge'] },
    { time: 56, gallery: 'shelter' as GalleryId, title: 'Then someone answered.', text: 'Three knocks asked for help. Two knocks promised that someone was coming.', ids: ['s3', 's4'], connections: ['refuge', 'knocks'] },
    { time: 69, gallery: 'shelter' as GalleryId, title: 'Tea first. Questions later.', text: 'The furniture was moved to make beds. The unsettling room becomes a place of care.', ids: ['s1', 's2', 's3', 's4', 's5', 's6'], connections: ['refuge', 'knocks', 'care'] },
    { time: 82, gallery: 'names' as GalleryId, title: 'The person behind the initials.', text: 'A personnel record. A name on the back of a photograph. A.V. was Ada Vale, the caretaker.', ids: ['n2', 'n3'], connections: ['identity'] },
    { time: 96, gallery: 'names' as GalleryId, title: 'Who kept the doors open?', text: 'The donor funded the exhibition. Ada opened the station. The museum had confused one act with the other.', ids: ['n1', 'n2', 'n3', 'n4'], connections: ['identity', 'credit'] },
    { time: 109, gallery: 'names' as GalleryId, title: 'She was here.', text: 'A clock. A kettle. A blue cup. You leave the light on.', ids: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'], connections: ['identity', 'credit', 'workroom'] },
];
export default function App() {
    const [save, setSave] = useState<Save>(defaultSave);
    const [loaded, setLoaded] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const [storageReady, setStorageReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'intro' | 'play' | 'tour' | 'ending'>('intro');
    const [panel, setPanel] = useState<Panel>(null);
    const [inspected, setInspected] = useState<Evidence | null>(null);
    const [toast, setToast] = useState('');
    const [sceneReady, setSceneReady] = useState(false);
    const [sceneError, setSceneError] = useState(false);
    const [fps, setFps] = useState(0);
    const [modelStatus, setModelStatus] = useState<ModelStatus>('sleeping');
    const [progress, setProgress] = useState(0);
    const [modelError, setModelError] = useState('');
    const [modelInfo, setModelInfo] = useState('');
    const [supported, setSupported] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [candidate, setCandidate] = useState('returns');
    const [boardError, setBoardError] = useState('');
    const [journalTab, setJournalTab] = useState<'fragments' | 'connections'>('fragments');
    const [tourTime, setTourTime] = useState(0);
    const [tourPaused, setTourPaused] = useState(false);
    const [recording, setRecording] = useState(false);
    const [recordedAvailable, setRecordedAvailable] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [offline, setOffline] = useState(!navigator.onLine);
    const worker = useRef<Worker | null>(null);
    const started = useRef(0);
    const requestId = useRef(0);
    const timeout = useRef<number | undefined>(undefined);
    const audio = useRef<MuseumAudio | null>(null);
    const saveRef = useRef(save);
    saveRef.current = save;
    const announce = useCallback((text: string) => setToast(text), []);
    const closePanel = useCallback(() => setPanel(null), []);
    const closeInspect = useCallback(() => setInspected(null), []);
    useEffect(() => { loadSave().then(value => { setSave(value); setStorageReady(true); }).catch(() => setSaveError(true)).finally(() => setLoaded(true)); return () => { worker.current?.terminate(); audio.current?.stop(); window.clearTimeout(timeout.current); }; }, []);
    useEffect(() => {
        if (!loaded || !storageReady) return;
        let current = true;
        setSaving(true);
        void writeSave(save).then(() => { if (current) { setSaveError(false); setSaving(false); } })
            .catch(() => { if (current) { setSaveError(true); setSaving(false); } });
        return () => { current = false; };
    }, [loaded, storageReady, save]);
    useEffect(() => { if (!toast)
        return; const t = window.setTimeout(() => setToast(''), 6500); return () => window.clearTimeout(t); }, [toast]);
    useEffect(() => { const check = () => setOffline(!navigator.onLine); window.addEventListener('online', check); window.addEventListener('offline', check); return () => { window.removeEventListener('online', check); window.removeEventListener('offline', check); }; }, []);
    useEffect(() => { let cancelled = false; (async () => { try {
        const gpu = (navigator as unknown as {
            gpu?: {
                requestAdapter: () => Promise<unknown>;
            };
        }).gpu;
        const adapter = gpu ? await gpu.requestAdapter() : null;
        if (!cancelled)
            setSupported(!!adapter);
    }
    catch {
        if (!cancelled)
            setSupported(false);
    } })(); return () => { cancelled = true; }; }, []);
    useEffect(() => { audio.current?.setVolume(save.settings.volume); audio.current?.ticking(mode === 'play' && save.confirmed.includes('clock')); }, [save.settings.volume, save.confirmed, mode]);
    useEffect(() => { if (mode !== 'play' || save.gallery !== 'shelter' || !save.settings.volume)
        return; audio.current?.knocks(save.confirmed.includes('knocks')); const id = window.setInterval(() => audio.current?.knocks(saveRef.current.confirmed.includes('knocks')), 20000); return () => window.clearInterval(id); }, [mode, save.gallery, save.confirmed, save.settings.volume]);
    useEffect(() => { if (mode !== 'tour' || tourPaused)
        return; const began = performance.now(); const base = tourTime; const t = window.setInterval(() => setTourTime(Math.min(120, base + (performance.now() - began) / 1000)), 250); return () => window.clearInterval(t); }, [mode, tourPaused]);
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat ||
                panel || inspected || mode !== 'play' ||
                (event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (event.key === 'Escape') setPanel('settings');
            if (event.key.toLowerCase() === 'j') setPanel('journal');
            if (event.key.toLowerCase() === 'r') setPanel('archivist');
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [panel, inspected, mode]);
    useEffect(() => { if (panel || inspected || mode !== 'play')
        document.exitPointerLock?.(); }, [panel, inspected, mode]);
    const startAudio = () => { if (!audio.current)
        audio.current = new MuseumAudio(); audio.current.start(save.settings.volume); };
    const begin = () => { startAudio(); setMode('play'); setPanel(null); announce('Move with W A S D. Click a fragment’s + to inspect it. Open your journal with J.'); };
    const inspect = useCallback((id: string) => { const e = EVIDENCE.find(e => e.id === id); if (e)
        setInspected(e); }, []);
    const collect = (id: string) => { setSave(s => ({ ...s, discovered: [...new Set([...s.discovered, id])] })); setInspected(null); announce('Fragment kept. Its words are now available to the archivist.'); };
    const tourStep = [...TourTimeline].reverse().find(s => tourTime >= s.time)!;
    const gallery = mode === 'tour' ? tourStep.gallery : save.gallery;
    const galleryInfo = GALLERIES.find(g => g.id === gallery)!;
    const confirmed = mode === 'tour' ? tourStep.connections : save.confirmed;
    const discovered = mode === 'tour' ? tourStep.ids : save.discovered;
    const restored = isGalleryRestored(save.gallery, save.confirmed);
    const allRestored = save.confirmed.length === CONNECTIONS.length;
    const changeGallery = (id: GalleryId) => { if (!isUnlocked(id, save.confirmed)) {
        announce('Restore the previous gallery to open this door.');
        return;
    } setSave(s => ({ ...s, gallery: id })); setCandidate(CONNECTIONS.find(c => c.gallery === id && !save.confirmed.includes(c.id))?.id || CONNECTIONS.find(c => c.gallery === id)!.id); setSelected([]); setBoardError(''); };
    const testConnection = (id: string, sources: string[]) => { const result = confirmConnection(id, sources, save.discovered); if (!result.ok) {
        setBoardError(result.message);
        announce(result.message);
        return;
    } if (save.confirmed.includes(id)) {
        announce('This connection has already been restored.');
        return;
    } setSave(s => ({ ...s, confirmed: [...new Set([...s.confirmed, id])] })); setBoardError(''); setPanel(null); audio.current?.restore(); announce(result.message); };
    function loadModel() {
        if (supported !== true) {
            setModelError('Local inference needs a WebGPU-compatible browser and graphics adapter. You can explore with the evidence journal or watch the authored walkthrough.');
            return;
        }
        if (modelStatus === 'loading' || modelStatus === 'ready')
            return;
        worker.current?.terminate();
        const w = new Worker(new URL('./archivist.worker.ts', import.meta.url), { type: 'module' });
        worker.current = w;
        setModelStatus('loading');
        setProgress(0);
        setModelError('');
        w.onmessage = ({ data }) => {
            if (data.type === 'progress') {
                setProgress(Math.max(0, Math.min(1, data.progress)));
                setModelInfo(data.text);
            }
            if (data.type === 'ready') {
                setModelStatus('ready');
                setProgress(1);
                announce('The archivist is awake. All inference stays in your browser.');
            }
            if (data.type === 'reply' && data.id === requestId.current) {
                window.clearTimeout(timeout.current);
                const reply = validateReply(data.reply, saveRef.current.discovered);
                setMessages(m => m.map((item, i) => i === m.length - 1 ? { ...item, reply, seconds: (performance.now() - started.current) / 1000 } : item));
                setBusy(false);
            }
            if (data.type === 'error') {
                window.clearTimeout(timeout.current);
                if (data.id === undefined) {
                    setModelStatus('error');
                    setModelError(data.message);
                }
                else if (data.id === requestId.current) {
                    setBusy(false);
                    setMessages(m => m.map((item, i) => i === m.length - 1 ? { ...item, error: 'The signal broke. Your discoveries are safe; try that question again.' } : item));
                }
            }
        };
        w.onerror = () => { setBusy(false); setModelStatus('error'); setModelError('The local model worker stopped. Retry loading; your museum progress is safe.'); };
        w.postMessage({ type: 'load' });
    }
    function ask(e: FormEvent) {
        e.preventDefault();
        if (!question.trim() || busy)
            return;
        if (modelStatus !== 'ready') {
            setModelError('Wake the local archivist first. No response has been generated.');
            return;
        }
        const q = question.trim();
        setQuestion('');
        setBusy(true);
        started.current = performance.now();
        requestId.current++;
        setMessages(m => [...m, { question: q }]);
        worker.current?.postMessage({ type: 'ask', id: requestId.current, question: q, context: buildContext(save.discovered) });
        timeout.current = window.setTimeout(() => { requestId.current++; setBusy(false); setModelStatus('error'); worker.current?.terminate(); setModelError('The response timed out after 45 seconds. Reload the archivist to retry.'); setMessages(m => m.map((item, i) => i === m.length - 1 ? { ...item, error: 'The signal faded before a response arrived. No progress was changed.' } : item)); }, 45000);
    }
    const startTour = () => { document.exitPointerLock?.(); setPanel(null); setInspected(null); setTourTime(0); setTourPaused(false); setMode('tour'); startAudio(); };
    async function recordTour() {
        const source = document.querySelector('canvas');
        if (!source || recording)
            return;
        if (!('MediaRecorder' in window)) {
            announce('This browser cannot record a walkthrough.');
            return;
        }
        startTour();
        setRecording(true);
        const composite = document.createElement('canvas');
        composite.width = 1280;
        composite.height = 720;
        const ctx = composite.getContext('2d')!;
        const stream = composite.captureStream(24);
        const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
        const recorder = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 2400000 } : undefined);
        const chunks: BlobPart[] = [];
        let frame = 0;
        const began = performance.now();
        const draw = () => { const elapsed = (performance.now() - began) / 1000; const step = [...TourTimeline].reverse().find(s => elapsed >= s.time) || TourTimeline[0]; ctx.drawImage(source, 0, 0, 1280, 720); const grad = ctx.createLinearGradient(0, 400, 0, 720); grad.addColorStop(0, 'transparent'); grad.addColorStop(1, 'rgba(7,15,13,.97)'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 1280, 720); ctx.fillStyle = '#d0b38b'; ctx.font = '15px sans-serif'; ctx.fillText('THE ROOM THAT FORGOT YOU   /   AUTHORED WALKTHROUGH · AI INACTIVE', 55, 52); ctx.fillStyle = '#f2e9d8'; ctx.font = '42px Georgia'; ctx.fillText(step.title, 55, 565); ctx.font = '21px Georgia'; const words = step.text.split(' '); let line = '', y = 612; for (const word of words) {
            if (ctx.measureText(line + word).width > 1120) {
                ctx.fillText(line, 55, y);
                line = '';
                y += 30;
            }
            line += word + ' ';
        } ctx.fillText(line, 55, y); ctx.fillStyle = '#b5a68b'; ctx.fillRect(55, 686, 1170 * Math.min(1, elapsed / 120), 2); frame = requestAnimationFrame(draw); };
        recorder.ondataavailable = e => { if (e.data.size)
            chunks.push(e.data); };
        recorder.onerror = () => { cancelAnimationFrame(frame); stream.getTracks().forEach(t => t.stop()); setRecording(false); announce('Video recording failed on this browser. The authored walkthrough remains available.'); };
        recorder.onstop = async () => {
            cancelAnimationFrame(frame);
            stream.getTracks().forEach(t => t.stop());
            const raw = new Blob(chunks, { type: type || 'video/webm' });
            const blob = await fixWebmDuration(raw, performance.now() - began, { logger: false }).catch(() => raw);
            const url = URL.createObjectURL(blob);
            if (videoUrl)
                URL.revokeObjectURL(videoUrl);
            setVideoUrl(url);
            setRecording(false);
            announce('Your captioned walkthrough is ready. Use Download recorded walkthrough to save it. AI is inactive in this demo.');
            // Local artifact export avoids automatic-download limitations in embedded preview browsers.
            // This fixed-path, same-origin middleware is only present in the local Vite server.
            if (['127.0.0.1', 'localhost'].includes(location.hostname))
                void fetch('/__export/walkthrough', { method: 'POST', headers: { 'Content-Type': 'video/webm', 'X-Greyhaven-Export': 'walkthrough' }, body: blob }).then(r => { if (r.ok)
                    announce('The two-minute walkthrough was also saved in the local project.'); }).catch(() => { });
        };
        draw();
        recorder.start(1000);
        window.setTimeout(() => { if (recorder.state === 'recording')
            recorder.stop(); }, 120000);
    }
    const returnHome = () => { setMode('intro'); setPanel(null); setInspected(null); audio.current?.ticking(false); };
    const notifyReady = useCallback(() => setSceneReady(true), []);
    const notifyFailure = useCallback(() => setSceneError(true), []);
    const notifyFps = useCallback((n: number) => setFps(n), []);
    return <main className={`app mode-${mode} ${save.settings.reducedMotion ? 'reduced-motion' : ''}`}>
    <div className="scene" aria-label={`Three-dimensional ${galleryInfo.title} gallery`}><SceneBoundary onFailure={notifyFailure}><Museum gallery={gallery} confirmed={confirmed} discovered={discovered} exploring={mode === 'play'} blocked={!!panel || !!inspected} reducedMotion={save.settings.reducedMotion} busy={busy} walkthrough={mode === 'tour'} ended={mode === 'ending' || (mode === 'tour' && tourTime >= 109)} sensitivity={save.settings.sensitivity} onInspect={inspect} onReady={notifyReady} onFailure={notifyFailure} onFps={notifyFps}/></SceneBoundary></div>
    <div className="atmosphere"/><div className="film-grain" aria-hidden="true"/>
    <header className="topbar">
      <button className="brand" onClick={returnHome} aria-label="Greyhaven Museum home"><Mark /><span>GREYHAVEN<span className="brand-sub">A MUSEUM AFTER HOURS</span></span></button>
      <nav aria-label="Main navigation"><button className={panel === 'about' ? 'active' : ''} onClick={() => setPanel('about')}>The story</button><button onClick={() => { setJournalTab('fragments'); setPanel('journal'); }}>Field notes <span className="nav-count">{save.discovered.length.toString().padStart(2, '0')}</span></button><span className="nav-rule"/><button className="sound-button" onClick={() => { startAudio(); setSave(s => ({ ...s, settings: { ...s.settings, volume: s.settings.volume ? 0 : .35 } })); }} aria-label={save.settings.volume ? 'Mute atmosphere' : 'Unmute atmosphere'}>{save.settings.volume ? <Volume2 size={16}/> : <VolumeX size={16}/>}</button><button className="icon-button settings-button" onClick={() => setPanel('settings')} aria-label="Settings"><Settings2 size={16}/></button></nav>
    </header>
    {mode === 'intro' && <>
      <section className="hero"><div className="eyebrow hero-eyebrow"><span className="tiny-line"/> AN INTERACTIVE STORY OF REMEMBRANCE</div><h1>The room<br />that <em>forgot you.</em></h1><p className="hero-description">A museum remembers everything.<br />Except the person who kept it alive.</p><div className="hero-actions"><button className="primary" onClick={begin} disabled={!loaded}>{save.discovered.length ? 'Continue the story' : 'Enter the museum'}<ArrowRight size={19}/></button><button className="text-button" onClick={startTour}><Play size={12} fill="currentColor"/> Watch the walkthrough</button></div><div className="hero-details"><span><Headphones size={14}/> Best with headphones</span><span className="dot"/><span>25–35 minute story</span></div></section>
      <div className="scene-note"><span className="scene-note-line"/><span className="eyebrow">01 / THE WAITING ROOM</span><p>The last train has gone.<br />Someone has left a light on.</p></div>
      <div className="open-hours"><span className="status-dot"/> THE MUSEUM IS CLOSED. YOU ARE EXPECTED.</div>
      <section className="chapter-strip" aria-label="The three galleries"><div className="chapter-intro"><span className="eyebrow">FOLLOW THE FRAGMENTS</span><p>Every object has a story.<br />Some are waiting for a name.</p><ArrowDown size={17}/></div>{GALLERIES.map(g => <button key={g.id} className={`chapter-card ${save.gallery === g.id ? 'current' : ''}`} onClick={() => { if (isUnlocked(g.id, save.confirmed)) {
            changeGallery(g.id);
            begin();
        }
        else
            announce('Begin in Departures. Each restored gallery opens the next.'); }}><span className="chapter-number">{g.number}<span>{isGalleryRestored(g.id, save.confirmed) ? <Check size={13}/> : <ChevronRight size={15}/>}</span></span><h2>{g.title}</h2><p>{g.subtitle}</p></button>)}<div className="chapter-end"><Mark small/><span>18 fragments.<br />One forgotten life.</span></div></section>
      <footer className="intro-footer"><span>A FICTIONAL PLACE. A VERY HUMAN STORY.</span><button onClick={() => setPanel('about')}><span className="status-dot"/> OPEN-WEIGHT AI · ON YOUR DEVICE <ArrowRight size={12}/></button></footer>
    </>}
    {mode === 'play' && <>
      <div className="play-heading"><span className="eyebrow">GALLERY {galleryInfo.number} / THREE</span><h1>{galleryInfo.title}</h1><p>{restored ? galleryInfo.restored : galleryInfo.description}</p></div>
      <div className="play-status"><span className="eyebrow">THE MUSEUM REMEMBERS</span><div className="memory-dots">{CONNECTIONS.map(c => <span key={c.id} className={save.confirmed.includes(c.id) ? 'lit' : ''} title={save.confirmed.includes(c.id) ? c.title : 'A connection waiting to be found'}/>)}</div><span>{save.confirmed.length} of 9 connections</span></div>
      <div className="crosshair" aria-hidden="true"/>
      {save.settings.captions && <div className="caption" aria-live="polite">{gallery === 'shelter' ? (save.confirmed.includes('knocks') ? '[Three knocks. A pause. Two knocks answer.]' : '[Rain. Three distant knocks.]') : save.confirmed.includes('clock') ? '[Rain beyond the windows. A clock ticking.]' : '[Rain beyond the windows. The clock is silent.]'}</div>}
      <div className="play-toolbar"><div className="movement-hint"><span className="key-cap">W A S D</span> move <span className="hint-separator">/</span> click the hall to look <span className="hint-separator">/</span> <span className="key-cap">ESC</span> release</div><div className="tool-buttons"><button onClick={() => { setJournalTab('fragments'); setPanel('journal'); }}><BookOpen size={17}/><span>Field notes</span><kbd>J</kbd></button><button onClick={() => setPanel('archivist')}><Radio size={18}/><span>The archivist</span><span className={`status-dot ${modelStatus === 'ready' ? 'awake' : ''}`}/><kbd>R</kbd></button><button className="icon-button" aria-label="How to play" onClick={() => setPanel('help')}><CircleHelp size={19}/></button></div></div>
      {restored && <div className="next-gallery"><Sparkles size={15}/><span>This gallery remembers.</span>{save.gallery !== 'names' ? <button onClick={() => changeGallery(save.gallery === 'departures' ? 'shelter' : 'names')}>Enter {save.gallery === 'departures' ? 'Shelter' : 'Names'} <ArrowRight size={16}/></button> : allRestored ? <button onClick={() => { setMode('ending'); setSave(s => ({ ...s, finished: true })); audio.current?.restore(); }}>Open the workroom <KeyRound size={16}/></button> : null}</div>}
    </>}
    {mode === 'tour' && recordedAvailable && !recording && <section className="recorded-walkthrough"><span className="eyebrow">TWO-MINUTE AUTHORED WALKTHROUGH · AI INACTIVE</span><video aria-label="Recorded museum walkthrough" src="/walkthrough.webm" controls autoPlay muted playsInline onError={() => setRecordedAvailable(false)}/><div><button className="text-button" onClick={returnHome}><ArrowLeft size={15}/> Return to the museum</button><button className="primary" onClick={begin}>Begin your investigation <ArrowRight size={15}/></button></div></section>}
    {mode === 'tour' && (!recordedAvailable || recording) && <section className="tour-overlay"><div className="tour-label"><span className="status-dot"/> AUTHORED WALKTHROUGH · AI INACTIVE</div><div className="tour-caption" key={tourStep.time}><span className="eyebrow">{GALLERIES.find(g => g.id === tourStep.gallery)!.title} / GREYHAVEN</span><h1>{tourStep.title}</h1><p>{tourStep.text}</p></div><div className="tour-controls"><button className="icon-button" onClick={() => setTourPaused(p => !p)} aria-label={tourPaused ? 'Resume walkthrough' : 'Pause walkthrough'}>{tourPaused ? <Play size={18}/> : <Pause size={18}/>}</button><input type="range" min="0" max="120" step="1" value={tourTime} onChange={e => { setTourPaused(true); setTourTime(Number(e.target.value)); }} aria-label="Walkthrough position"/><span>{Math.floor(tourTime / 60)}:{Math.floor(tourTime % 60).toString().padStart(2, '0')} / 2:00</span><button onClick={returnHome}>Leave tour <X size={15}/></button></div>{tourTime >= 120 && <button className="primary tour-begin" onClick={begin}>Begin your own investigation <ArrowRight size={17}/></button>}</section>}
    {mode === 'ending' && <section className="ending-overlay"><span className="eyebrow">ADA VALE · KEEPER OF GREYHAVEN · 1951–1981</span><h1>{ENDING.title}</h1><p>{ENDING.text}</p><div className="ending-actions"><button className="primary" onClick={returnHome}>Leave the light on <ArrowRight size={17}/></button><button className="text-button" onClick={() => { setJournalTab('connections'); setPanel('journal'); }}>Read the restored record</button></div><span className="ending-note">You remembered all nine connections. Thank you for staying.</span></section>}
    {!sceneReady && !sceneError && <div className="scene-loading"><LoaderCircle size={16} className="spin"/> Opening the waiting room…</div>}
    {sceneError && <div className="scene-error">The 3D hall is unavailable on this device. The field notes and authored story remain readable.<button onClick={startTour}>Open walkthrough</button></div>}
    {offline && <div className="offline-badge">Offline · using cached resources</div>}
    {videoUrl && <a className="video-download" href={videoUrl} download="the-room-that-forgot-you-walkthrough.webm"><Download size={15}/> Download recorded walkthrough</a>}
    {saveError && <div className="save-warning" role="status">This browser could not save progress. Keep this tab open.</div>}
    {toast && <div className="toast" role="status"><span className="tiny-line"/>{toast}</div>}

    {inspected && <Dialog title={inspected.title} onClose={closeInspect}><div className="evidence-sheet"><span className="eyebrow">FRAGMENT {EVIDENCE.findIndex(e => e.id === inspected.id) + 1} / 18 · {inspected.kind}</span><div className={`document-object prop-${inspected.prop}`}><span>GREYHAVEN<br /><small>RAILWAY ARCHIVE</small></span><div className="document-rule"/><strong>{inspected.inscription}</strong><span className="document-stamp">{inspected.id.toUpperCase()}<br />ORIGINAL RECORD</span></div><h2>{inspected.title}</h2><span className="evidence-date">{inspected.date}</span><p className="evidence-text">{inspected.text}</p><button className="primary full" onClick={() => collect(inspected.id)}>{save.discovered.includes(inspected.id) ? 'Return to the gallery' : 'Keep this fragment'}{save.discovered.includes(inspected.id) ? <ArrowLeft size={16}/> : <BookOpen size={16}/>}</button></div></Dialog>}
    {panel === 'journal' && <Dialog title="Field notes" onClose={closePanel} wide><div className="journal-header"><h2>Field notes<span className="serif-muted">{save.discovered.length}/18</span></h2><p>A record of what remains. A place to make connections.</p></div><div className="tabs"><button className={journalTab === 'fragments' ? 'active' : ''} onClick={() => setJournalTab('fragments')}>The fragments</button><button className={journalTab === 'connections' ? 'active' : ''} onClick={() => setJournalTab('connections')}>Make a connection <span>{save.confirmed.length}/9</span></button></div>
      {journalTab === 'fragments' ? <div className="fragments-content"><div className="gallery-tabs">{GALLERIES.map(g => <button key={g.id} className={gallery === g.id ? 'active' : ''} disabled={!isUnlocked(g.id, save.confirmed)} onClick={() => changeGallery(g.id)}>{g.number} {g.title}{isGalleryRestored(g.id, save.confirmed) && <Check size={12}/>}</button>)}</div><div className="fragment-grid">{EVIDENCE.filter(e => e.gallery === save.gallery).map(e => <button key={e.id} className={`fragment-card ${save.discovered.includes(e.id) ? 'collected' : ''}`} onClick={() => { closePanel(); setInspected(e); }}><span className="fragment-id">{e.id.toUpperCase()} <span>{save.discovered.includes(e.id) ? <Check size={13}/> : <span className="small-plus">+</span>}</span></span><span className="fragment-kind">{e.kind}</span><h3>{e.title}</h3><span className="fragment-state">{save.discovered.includes(e.id) ? 'Read fragment' : 'Inspect this exhibit'}<ArrowRight size={12}/></span></button>)}</div><div className="journal-tip"><BookOpen size={15}/><span>Explore the objects in the hall, or inspect them here using the keyboard.</span></div></div> : <div className="connection-layout"><div className="connection-list">{CONNECTIONS.filter(c => isUnlocked(c.gallery, save.confirmed)).map(c => <button key={c.id} className={`connection-option ${candidate === c.id ? 'active' : ''}`} onClick={() => { setCandidate(c.id); setSelected([]); setBoardError(''); }}><span className="connection-number">{save.confirmed.includes(c.id) ? <Check size={14}/> : String(CONNECTIONS.indexOf(c) + 1).padStart(2, '0')}</span><span>{c.question}</span><ChevronRight size={14}/></button>)}</div><div className="connection-detail"><span className="eyebrow">A THEORY NEEDS A RECORD</span><h3>{CONNECTIONS.find(c => c.id === candidate)?.title}</h3>{save.confirmed.includes(candidate) ? <><span className="restored-badge"><Check size={13}/> Restored</span><p>{CONNECTIONS.find(c => c.id === candidate)!.truth}</p><div className="source-list">{CONNECTIONS.find(c => c.id === candidate)!.requires.map(id => <span key={id}>{EVIDENCE.find(e => e.id === id)!.title}</span>)}</div></> : <><p>Choose the independent fragments that establish this connection. The archivist can help you think it through.</p><div className="source-checkboxes">{EVIDENCE.filter(e => save.discovered.includes(e.id) && e.gallery === CONNECTIONS.find(c => c.id === candidate)?.gallery).map(e => <label key={e.id}><input type="checkbox" checked={selected.includes(e.id)} onChange={() => setSelected(s => s.includes(e.id) ? s.filter(id => id !== e.id) : [...s, e.id])}/><span><strong>{e.title}</strong><small>{e.kind}</small></span></label>)}{!EVIDENCE.some(e => save.discovered.includes(e.id) && e.gallery === CONNECTIONS.find(c => c.id === candidate)?.gallery) && <p className="empty-message">No fragments from this gallery yet. Return to the exhibits and keep a record.</p>}</div>{boardError && <p className="inline-error" role="alert">{boardError}</p>}<button className="primary full" disabled={!selected.length} onClick={() => testConnection(candidate, selected)}>Test this connection <ArrowRight size={16}/></button></>}</div></div>}
    </Dialog>}
    {panel === 'archivist' && <Dialog title="The archivist" onClose={closePanel} wide><div className="archivist-header"><div className="receiver-symbol"><Radio size={27}/></div><div><span className="eyebrow">A VOICE IN THE RECORD</span><h2>The archivist</h2></div><span className={`model-pill ${modelStatus === 'ready' ? 'ready' : ''}`}><span className="status-dot"/>{modelStatus === 'ready' ? 'Local model awake' : modelStatus === 'loading' ? 'Waking up' : 'Local model asleep'}</span></div>
      {modelStatus !== 'ready' && <div className="model-onboarding"><h3>{modelStatus === 'loading' ? 'Gathering the surviving words…' : 'Let the museum answer.'}</h3><p>The archivist reads only the fragments you have discovered. A small semantic encoder finds relevant records; Qwen resolves ambiguous questions. Both models run on this device.</p><div className="model-facts"><span><Download size={14}/> Initial model download required</span><span><Moon size={14}/> Cached for later visits</span><span><Radio size={14}/> No account or API key</span></div>{supported === false && <p className="inline-error">WebGPU is unavailable here. You can still investigate with the field notes, or watch the authored walkthrough. No AI response will be simulated.</p>}{modelStatus === 'loading' ? <><div className="download-progress"><span style={{ width: `${progress * 100}%` }}/></div><span className="progress-text">{Math.round(progress * 100)}% · {modelInfo.slice(0, 130)}</span><button className="text-button" onClick={() => { worker.current?.terminate(); setModelStatus('sleeping'); setProgress(0); }}>Cancel model loading</button></> : <button className="primary" onClick={loadModel} disabled={supported !== true}><Download size={16}/>{modelStatus === 'error' ? 'Retry model loading' : 'Download & wake the archivist'}</button>}<button className="text-button" onClick={() => { setJournalTab('connections'); setPanel('journal'); }}>Continue with the evidence journal <ArrowRight size={14}/></button></div>}
      {modelError && <p className="inline-error" role="alert">{modelError}</p>}
      <div className="conversation" aria-live="polite">{messages.length === 0 && <div className="first-message"><span className="eyebrow">ARCHIVIST / SURVIVING RECORD</span><p>“I know the names on the plaques. The other names are harder. Bring me what you find.”</p><span>{save.discovered.length} fragments available · {modelStatus === 'ready' ? 'Ready for a question' : 'Authored introduction · model not responding yet'}</span></div>}{messages.map((m, i) => <div className="exchange" key={i}><div className="visitor-message"><span className="eyebrow">YOU</span><p>{m.question}</p></div><div className="archivist-message"><span className="eyebrow">ARCHIVIST {m.seconds !== undefined && <small>· {m.seconds.toFixed(1)}s · local inference</small>}</span>{m.error ? <p className="inline-error">{m.error}</p> : !m.reply ? <p className="thinking"><AudioLines size={15}/> Listening to the record…</p> : m.reply.status === 'unknown' ? <p>“I cannot establish that from the surviving fragments. I would rather leave a space than put someone else’s words in it.”</p> : <><p>{m.reply.connectionId ? CONNECTIONS.find(c => c.id === m.reply!.connectionId)?.truth : 'These surviving fragments may help answer your question.'}</p><div className="quote-cards">{m.reply.evidenceIds.map(id => { const record = EVIDENCE.find(e => e.id === id)!; return <button key={id} onClick={() => { closePanel(); setInspected(record); }}><span>{id.toUpperCase()} / {record.title}</span><p>{record.text}</p></button>; })}</div>{m.reply.connectionId && !save.confirmed.includes(m.reply.connectionId) && <button className="primary" onClick={() => testConnection(m.reply!.connectionId!, m.reply!.evidenceIds)}>Confirm this connection <Check size={15}/></button>}</>}</div></div>)}</div><form className="question-form" onSubmit={ask}><label className="sr-only" htmlFor="question">Ask the archivist</label><input id="question" value={question} maxLength={700} onChange={e => setQuestion(e.target.value)} placeholder={modelStatus === 'ready' ? 'What do these fragments mean?' : 'Wake the archivist to ask a question…'} disabled={busy || modelStatus !== 'ready'}/><button type="submit" disabled={busy || modelStatus !== 'ready' || !question.trim()} aria-label="Send question">{busy ? <LoaderCircle className="spin" size={19}/> : <Send size={19}/>}</button></form><p className="model-footnote">MiniLM retrieval · Qwen2.5 disambiguation · {supported === true ? 'WebGPU available' : supported === null ? 'Checking graphics support' : 'WebGPU unavailable'} · discoveries remain on your device</p>
    </Dialog>}
    {panel === 'about' && <Dialog title="The story" onClose={closePanel}><div className="about"><Mark /><span className="eyebrow">WHY WE KEEP THE LIGHT ON</span><h2>Some lives never<br />make it onto a plaque.</h2><p>Greyhaven is a fictional museum built around a very real question: who disappears when we only preserve the official version?</p><p>Follow eighteen fragments through three changing galleries. Ask an archivist what the surviving records mean. Restore the name of someone whose ordinary work held a community together.</p><div className="about-rule"/><h3>Open words. On your own machine.</h3><p>The optional live archivist uses two Apache-2.0 open-weight models: MiniLM through Transformers.js for semantic retrieval and Qwen2.5 through WebLLM for ambiguous questions. Code checks every proposed connection. No remote inference, account, or API key.</p><p>After the initial downloads, the app and model are designed to work from browser caches. Offline availability depends on those resources remaining stored. Browser and graphics support vary.</p><p className="about-disclosure">The walkthrough is an authored demonstration, with AI inactive. The 25–35 minute duration is a design target pending fresh-player testing.</p><button className="primary full" onClick={begin}>Step inside <ArrowRight size={17}/></button></div></Dialog>}
    {panel === 'help' && <Dialog title="How to investigate" onClose={closePanel}><span className="eyebrow">YOUR FIRST VISIT</span><h2>A small guide<br />to remembering.</h2><ol className="help-steps"><li><strong>Look closely.</strong> Move with W A S D or ↑ ↓. Click empty space to look with the mouse; Esc releases it. ← → also turn.</li><li><strong>Keep a record.</strong> Click a glowing + to inspect an object. Keep the fragment so it enters your field notes.</li><li><strong>Ask a question.</strong> Press R to wake the local archivist. It only sees evidence you have found.</li><li><strong>Connect the fragments.</strong> Press J, choose “Make a connection,” and select supporting records. Nothing is lost if a theory is wrong.</li><li><strong>Watch the room remember.</strong> Three connections restore a gallery and open the next.</li></ol><p className="muted">All exhibits can also be inspected using keyboard-accessible buttons in Field notes.</p><button className="primary full" onClick={closePanel}>I’ll look closely <ArrowRight size={16}/></button></Dialog>}
    {panel === 'settings' && <Dialog title="Settings" onClose={closePanel}><span className="eyebrow">TAKE YOUR TIME</span><h2>The room,<br />at your pace.</h2><div className="settings-list"><label><span><Volume2 size={16}/> Atmosphere volume</span><input type="range" min="0" max="1" step=".05" value={save.settings.volume} onChange={e => { startAudio(); setSave(s => ({ ...s, settings: { ...s.settings, volume: Number(e.target.value) } })); }}/></label><label><span>Reduced motion</span><input type="checkbox" checked={save.settings.reducedMotion} onChange={e => setSave(s => ({ ...s, settings: { ...s.settings, reducedMotion: e.target.checked } }))}/></label><label><span>Environmental captions</span><input type="checkbox" checked={save.settings.captions} onChange={e => setSave(s => ({ ...s, settings: { ...s.settings, captions: e.target.checked } }))}/></label><label><span>Mouse sensitivity</span><input type="range" min=".2" max="2" step=".1" value={save.settings.sensitivity} onChange={e => setSave(s => ({ ...s, settings: { ...s.settings, sensitivity: Number(e.target.value) } }))}/></label></div><div className="settings-diagnostics"><span>Progress {saveError ? 'not saved' : saving ? 'saving…' : !loaded ? 'loading…' : 'saved on this device'}</span><span>{fps} FPS · {modelStatus === 'ready' ? 'local AI ready' : 'AI inactive'}</span></div><div className="settings-actions"><button className="primary full" onClick={closePanel}>Return to the room <ArrowRight size={16}/></button><button className="secondary full" onClick={startTour}><Play size={15}/> Watch two-minute walkthrough</button><button className="text-button" onClick={recordTour} disabled={recording || !sceneReady}><Download size={14}/>{recording ? 'Recording two-minute walkthrough…' : 'Export walkthrough video'}</button><button className="text-button" onClick={() => document.documentElement.requestFullscreen?.().catch(() => announce('Fullscreen is unavailable here.'))}><Maximize size={14}/> Fullscreen</button><details className="reset-details"><summary>Start a new investigation</summary><p>This clears discoveries and connections on this device.</p><button className="danger" onClick={() => { setSave(defaultSave()); setMessages([]); setSelected([]); setCandidate('returns'); setBoardError(''); returnHome(); announce('A fresh page. The museum is waiting.'); }}>Clear progress & start again</button></details></div></Dialog>}
  </main>;
}
