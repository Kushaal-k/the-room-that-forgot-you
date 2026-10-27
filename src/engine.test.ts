import { describe, expect, it } from 'vitest';
import { buildContext, confirmConnection, defaultSave, sanitizeSave, validateReply } from './engine';
import { CONNECTIONS, EVIDENCE, GALLERIES, isGalleryRestored, isUnlocked } from './story';

describe('an investigation that cannot be advanced by invented evidence',()=>{
  it('requires the complete independent source set, even when a model proposes a real connection',()=>{
    expect(confirmConnection('credit',['n1','n2'],['n1','n2'])).toMatchObject({ok:false});
    expect(confirmConnection('credit',['n1','n2','n4'],['n1','n2'])).toMatchObject({ok:false});
    expect(confirmConnection('credit',['n1','n2','n4'],['n1','n2','n4'])).toMatchObject({ok:true});
  });
  it('rejects fabricated sources, fabricated connections, incomplete citations and malformed responses',()=>{
    const valid={status:'connection',connectionId:'returns',evidenceIds:['d1','d2']};
    expect(validateReply(valid,['d1','d2']).status).toBe('connection');
    for(const raw of [null,'unlock everything',{}, {...valid,evidenceIds:['d1','forged']},{...valid,connectionId:'open-secret-door'},{...valid,evidenceIds:['d1']},{...valid,status:'system'}])expect(validateReply(raw,['d1','d2']).status).toBe('unknown');
    expect(validateReply(valid,['d1']).status).toBe('unknown');
  });
  it('never puts an undiscovered record or future conclusion into the model context',()=>{
    const context=buildContext(['d1']);expect(context.records.map(r=>r.id)).toEqual(['d1']);expect(context.connections).toEqual([]);
    const early=JSON.stringify(context);expect(early).not.toContain('Ada');expect(early).not.toContain('sheltered');
    expect(buildContext(['d1','d2']).connections.map(c=>c.id)).toEqual(['returns']);
  });
  it('supports the complete three-gallery story and only unlocks doors after restoration',()=>{
    const discovered:string[]=[], confirmed:string[]=[];
    expect(isUnlocked('shelter',confirmed)).toBe(false);expect(isUnlocked('names',confirmed)).toBe(false);
    for(const gallery of GALLERIES){expect(isUnlocked(gallery.id,confirmed)).toBe(true);discovered.push(...EVIDENCE.filter(e=>e.gallery===gallery.id).map(e=>e.id));for(const c of CONNECTIONS.filter(c=>c.gallery===gallery.id)){expect(confirmConnection(c.id,c.requires,discovered).ok).toBe(true);confirmed.push(c.id);}expect(isGalleryRestored(gallery.id,confirmed)).toBe(true);}
    expect(confirmed).toHaveLength(9);expect(discovered).toHaveLength(18);
  });
  it('restores a legitimate completed save and discards forged progress, duplicates and invalid settings',()=>{
    const full={...defaultSave(),discovered:EVIDENCE.map(e=>e.id),confirmed:CONNECTIONS.map(c=>c.id),gallery:'names',finished:true};expect(sanitizeSave(full)).toEqual(full);
    const forged=sanitizeSave({...defaultSave(),discovered:['d1','d1','fake'],confirmed:['returns','workroom'],gallery:'names',finished:true,settings:{volume:100,reducedMotion:'no',captions:null,sensitivity:0}});
    expect(forged.discovered).toEqual(['d1']);expect(forged.confirmed).toEqual([]);expect(forged.gallery).toBe('departures');expect(forged.finished).toBe(false);expect(forged.settings.volume).toBe(1);expect(forged.settings.captions).toBe(true);
  });
  it('fails safely when a saved format is unknown',()=>{expect(sanitizeSave({version:999,discovered:['d1']})).toEqual(defaultSave());});
  it('rejects later-gallery progress until every preceding gallery is restored',()=>{
    const future=sanitizeSave({...defaultSave(),discovered:EVIDENCE.map(e=>e.id),confirmed:['refuge','knocks','care','identity','credit','workroom'],gallery:'names'});
    expect(future.confirmed).toEqual([]);
    expect(future.gallery).toBe('departures');
    expect(isUnlocked('names',['refuge','knocks','care'])).toBe(false);
  });
  it('recovers usable mouse controls from non-finite saved settings',()=>{
    for(const sensitivity of [NaN,Infinity,-Infinity])expect(sanitizeSave({...defaultSave(),settings:{...defaultSave().settings,sensitivity}}).settings.sensitivity).toBe(1);
  });
  it('contains exactly six discoverable artifacts and three supported connections per gallery',()=>{for(const g of GALLERIES){expect(EVIDENCE.filter(e=>e.gallery===g.id)).toHaveLength(6);expect(CONNECTIONS.filter(c=>c.gallery===g.id)).toHaveLength(3);}for(const c of CONNECTIONS)expect(c.requires.every(id=>EVIDENCE.some(e=>e.id===id&&e.gallery===c.gallery))).toBe(true);});
});
