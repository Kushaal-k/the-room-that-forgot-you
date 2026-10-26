// Relation summaries describe the authored evidence, not a list of benchmark queries.
export const RELATIONS:Record<string,string>={
  returns:'The keeper A.V. did not abandon the station permanently. The ticket and register prove repeated journeys back to Greyhaven after passenger closure.',
  clock:'A.V. paid to repair the station clock because townspeople depended on it to set the clocks in their homes.',
  light:'The keeper left the lamp burning for neighbours walking across the railway crossing in the dark, despite the absence of trains.',
  refuge:'The waiting room provided emergency accommodation to twenty-two people who escaped the flood. All twenty-two were safe.',
  knocks:'The Hale family used a three-knock rescue signal. The keeper replied twice and fetched them with a handcart.',
  care:'The displaced furniture, children’s beds, dry shoes and hot drinks show how people were cared for during the emergency.',
  identity:'The initials A.V. identify Ada Vale, the unnamed caretaker pictured beside the station kitchen window.',
  credit:'The person responsible for opening the flood shelter was Ada Vale. Edwin March was a later financial donor. Official museum history omitted Ada’s rescue work.',
  workroom:'Elsie wished to commemorate Ada through the modest office and ordinary working objects: the kettle, clock, lamp, key and cup.',
};
const STOP=new Set('a an the is was were be been being am are did do does has have had to of on in at by for from with and or as it its this that these those there their they she he her his we you your i me us who whose what which how why can could would should really actually rather about than then even ever forever not no so only still again into all through during after before between very some tell'.split(' '));
export function terms(text:string):string[]{
  const words=text.replace(/a\.v\./gi,'av').toLowerCase().replace(/neighbour/g,'neighbor').match(/[a-z0-9]+/g)||[];
  return [...new Set(words.filter(w=>w.length>1&&!STOP.has(w)).map(w=>w.length>5?w.replace(/(?:ing|ed|s)$/,'').replace(/e$/,''):w.length>3?w.replace(/s$/,''):w))];
}
export function lexicalScores(question:string,documents:string[]):number[]{
  const query=terms(question);const docs=documents.map(d=>new Set(terms(d)));
  const weights=query.map(q=>1+Math.log((docs.length+1)/(1+docs.filter(d=>d.has(q)).length)));
  const total=weights.reduce((a,b)=>a+b,0)||1;
  return docs.map(d=>query.reduce((score,q,i)=>score+(d.has(q)?weights[i]:0),0)/total);
}
export function corpusCoverage(question:string,corpus:string):number {
  const q=terms(question);if(!q.length)return 0;const known=new Set(terms(corpus));return q.filter(t=>known.has(t)).length/q.length;
}
