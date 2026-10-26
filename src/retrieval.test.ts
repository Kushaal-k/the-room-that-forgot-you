import {expect,it} from 'vitest';
import {corpusCoverage,lexicalScores,terms} from './retrieval';
it('keeps lexical relations distinct from repeated person names',()=>{
  expect(terms('A.V. was returning to the neighbours.')).toContain('av');
  const scores=lexicalScores('Did A.V. leave the station?', ['A.V. left and returned to the station. Did the keeper leave?','A.V. was Ada Vale, the caretaker.']);
  expect(scores[0]).toBeGreaterThan(scores[1]);
});
it('requires archive coverage rather than trusting a shared name',()=>{
  const corpus='Ada Vale was the station caretaker. A blue enamel cup.';
  expect(corpusCoverage('What colour was Ada’s childhood bicycle?',corpus)).toBeLessThan(.35);
  expect(corpusCoverage('Who was Ada Vale?',corpus)).toBe(1);
});
