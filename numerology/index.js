function reduce(n) {
  n = Math.abs(Math.round(n));
  while (n > 9) { n = String(n).split('').reduce((a,d)=>a+parseInt(d),0); }
  return n===0?1:n;
}
function sumDigits(str) {
  return String(str).split('T')[0].replace(/\D/g,'').split('').reduce((a,d)=>a+parseInt(d),0);
}
function destinyNumber(birthDate) { if(!birthDate)return 1; return reduce(sumDigits(birthDate)); }
function vibrationDay(date) { if(!date)return 1; return reduce(sumDigits(date)); }
function vibrationPerson(birthDate,targetDate) {
  if(!birthDate||!targetDate)return 1;
  return reduce(sumDigits(birthDate)+sumDigits(targetDate));
}
module.exports={reduce,destinyNumber,vibrationDay,vibrationPerson};
