export class MuseumAudio {
  private context?: AudioContext;
  private gain?: GainNode;
  private noise?: AudioBufferSourceNode;
  private timer?: number;
  start(volume: number) {
    if (this.context) { void this.context.resume(); this.setVolume(volume); return; }
    const context = new AudioContext(); this.context = context;
    const master = context.createGain(); master.gain.value = volume*.15; master.connect(context.destination); this.gain = master;
    const buffer = context.createBuffer(1, context.sampleRate*3, context.sampleRate);
    const samples = buffer.getChannelData(0); for(let i=0;i<samples.length;i++) samples[i]=(Math.random()*2-1)*.3;
    const noise = context.createBufferSource(); noise.buffer=buffer;noise.loop=true;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;
    noise.connect(filter);filter.connect(master);noise.start();this.noise=noise;
  }
  setVolume(volume:number) { if(this.context&&this.gain)this.gain.gain.setTargetAtTime(volume*.15,this.context.currentTime,.15); }
  tone(frequency:number, delay=0, duration=.1, amount=.4) {
    if(!this.context||!this.gain)return; const c=this.context;const o=c.createOscillator();const g=c.createGain();o.type='sine';o.frequency.value=frequency;
    g.gain.setValueAtTime(.001,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(amount,c.currentTime+delay+.005);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+delay+duration);
    o.connect(g);g.connect(this.gain);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration+.05);
  }
  restore() { [220,277.18,329.63].forEach((f,i)=>this.tone(f,i*.15,1,.3)); }
  knocks(answered:boolean) { [0,.35,.7].forEach(t=>this.tone(105,t,.11,.9));if(answered)[1.5,1.9].forEach(t=>this.tone(130,t,.11,.65)); }
  ticking(enabled:boolean) { if(this.timer)window.clearInterval(this.timer);this.timer=enabled?window.setInterval(()=>this.tone(900,0,.025,.09),1800):undefined; }
  stop() { if(this.timer)window.clearInterval(this.timer);this.noise?.stop();void this.context?.close();this.context=undefined; }
}
