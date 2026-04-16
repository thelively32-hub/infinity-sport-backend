function reduce(n) {
  while (n > 9) {
    n = String(n).split('').reduce((a, d) => a + parseInt(d), 0);
  }
  return n;
}

function destinyNumber(birthDate) {
  if (!birthDate) return 1;
  const str = String(birthDate).split('T')[0].replace(/-/g,'');
  return reduce(str.split('').reduce((a,d)=>a+parseInt(d),0));
}

function vibrationDay(date) {
  if (!date) return 1;
  const str = String(date).split('T')[0].replace(/-/g,'');
  return reduce(str.split('').reduce((a,d)=>a+parseInt(d),0));
}

function vibrationPerson(birthDate, targetDate) {
  if (!birthDate || !targetDate) return 1;
  const bStr = String(birthDate).split('T')[0].replace(/-/g,'');
  const tStr = String(targetDate).split('T')[0].replace(/-/g,'');
  const bSum = bStr.split('').reduce((a,d)=>a+parseInt(d),0);
  const tSum = tStr.split('').reduce((a,d)=>a+parseInt(d),0);
  return reduce(bSum + tSum);
}

module.exports = { reduce, destinyNumber, vibrationDay, vibrationPerson };
