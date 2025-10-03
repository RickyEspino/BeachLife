export type Grade = 'S' | 'A' | 'B' | 'C';

export function computeGrade(victory: boolean, dps: number, maxCombo: number): Grade {
  if (!victory) return 'C';
  let grade: Grade;
  if (dps >= 55) grade = 'S';
  else if (dps >= 40) grade = 'A';
  else if (dps >= 28) grade = 'B';
  else grade = 'C';
  if (maxCombo >= 12 && grade !== 'S') {
    if (grade === 'A') grade = 'S';
    else if (grade === 'B') grade = 'A';
    else if (grade === 'C') grade = 'B';
  }
  return grade;
}

export function shellsFor(grade: Grade, dps: number): number {
  switch (grade) {
    case 'S': return 25 + Math.floor(dps / 4);
    case 'A': return 16 + Math.floor(dps / 5);
    case 'B': return 10 + Math.floor(dps / 6);
    default: return 5;
  }
}
