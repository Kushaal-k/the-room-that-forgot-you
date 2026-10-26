// Evaluation inputs only. A real browser model must produce the expected connection.
// This file is not imported by the player's application or worker.
export const BENCHMARKS = [
  ['returns','Did A.V. leave the station forever?'],['returns','It looks like the keeper came back each winter.'],['returns','Was that a return journey rather than a final departure?'],['returns','The register and ticket contradict the abandonment label.'],
  ['clock','Why fix a clock after the station closed?'],['clock','The neighbours still relied on the station clock.'],['clock','Did the keeper pay for the clock for the town?'],
  ['light','Who needed the east window lamp?'],['light','She was lighting the crossing for the neighbours.'],['light','Why keep the light on when there were no trains?'],
  ['refuge','Was the waiting room used as a flood shelter?'],['refuge','What happened to the twenty-two people in the register?'],['refuge','The closed station became a refuge on high ground.'],
  ['knocks','Why do I hear three knocks?'],['knocks','Three knocks asked for rescue and two meant help was coming.'],['knocks','How did the Hale family get across safely?'],
  ['care','Was the furniture damaged or deliberately rearranged?'],['care','The tables were beds for children, not wreckage.'],['care','What do the cup and borrowed furniture tell us about care?'],
  ['identity','Who was A.V.?'],['identity','Ada Vale was the unnamed keeper, right?'],['identity','Can we connect the appointment record to the woman in the photograph?'],['identity','Whose initials appear throughout the station records?'],
  ['credit','Who actually opened the station during the flood?'],['credit','Was March a donor rather than the person who sheltered people?'],['credit','The official history left out Ada’s contribution.'],['credit','Who kept the doors open before instructions arrived?'],
  ['workroom','How did Elsie want Ada to be remembered?'],['workroom','Should the back office stay simple, with her ordinary things?'],['workroom','The key and letter point to keeping Ada’s workroom as it was.'],
] as const;

// Added after the hybrid retrieval rules were written; keep these separate from
// the original development set when reporting results.
export const ADDITIONAL_CASES = [
  ['returns','Was the station keeper a permanent absentee once passenger traffic ceased?'],
  ['clock','Who benefited from having the repaired timepiece at the station?'],
  ['light','Was the glowing window serving walkers instead of railway passengers?'],
  ['refuge','How many evacuees stayed in the building during the river emergency?'],
  ['knocks','What response told people at the shutter it was safe to wait for help?'],
  ['care','Were the displaced chairs evidence of violence or of hospitality?'],
  ['identity','What was the caretaker’s full name behind the abbreviated signature?'],
  ['credit','Did the exhibition financier also conduct the rescue?'],
  ['workroom','What should be done with the room that the little key unlocks?'],
  ['unknown','What instrument did the keeper play as a child?'],
] as const;
