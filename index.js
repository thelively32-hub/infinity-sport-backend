// numerology/index.js
// Core numerology engine - no master numbers, always reduce to 1-9

function reduce(n) {
  while (n > 9) {
    n = String(n).split('').reduce((a, d) => a + parseInt(d), 0);
  }
  return n;
}

function destinyNumber(birthDate) {
  if (!birthDate) return 1;
  const [y, m, d] = String(birthDate).split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return 1;
  return reduce(y + m + d);
}

function vibrationDay(date) {
  if (!date) return 1;
  const [y, m, d] = String(date).split('T')[0].split('-').map(Number);
  if (!y) return 1;
  return reduce(y + m + d);
}

function vibrationPerson(birthDate, targetDate) {
  if (!birthDate || !targetDate) return 1;
  const [by, bm, bd] = String(birthDate).split('T')[0].split('-').map(Number);
  const [ty, tm, td] = String(targetDate).split('T')[0].split('-').map(Number);
  if (!by || !ty) return 1;
  return reduce(by + bm + bd + ty + tm + td);
}

module.exports = { reduce, destinyNumber, vibrationDay, vibrationPerson };
