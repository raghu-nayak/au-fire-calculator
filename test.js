/* Unit tests for the FIRE engine.

   The engine is pure -- no DOM, no globals -- and sits between the
   engine:start and engine:end markers so it can be pulled out of the page and
   run in node:

     node test.js index.html
*/
var fs = require('fs');
var src = fs.readFileSync(process.argv[2] || (__dirname + '/index.html'), 'utf8');
var m = src.indexOf('/* --- engine:start --- */'), n = src.indexOf('/* --- engine:end --- */');
if (m < 0 || n < 0) throw new Error('engine markers not found');
var code = src.slice(m, n);
var api = new Function(code + '\nreturn {AU:AU,clamp:clamp,bracketTax:bracketTax,lito:lito,' +
  'sapto:sapto,medicareLevy:medicareLevy,personalTax:personalTax,marginalRate:marginalRate,' +
  'div293:div293,minDrawRate:minDrawRate,agePensionFor:agePensionFor,project:project,' +
  'earliestAge:earliestAge,monteCarlo:monteCarlo};')();

var pass = 0, fail = 0;
function near(a, b, tol){ return Math.abs(a - b) <= (tol == null ? 0.5 : tol); }
function ck(name, got, want, tol){
  if (near(got, want, tol)){ pass++; }
  else { fail++; console.log('FAIL  ' + name + '\n      got ' + got + '  want ' + want); }
}
function ckTrue(name, cond, extra){
  if (cond){ pass++; }
  else { fail++; console.log('FAIL  ' + name + (extra != null ? '  [' + extra + ']' : '')); }
}
function head(s){ console.log('\n' + s); }

/* ------------------------------------------------------------ income tax */
head('income tax, FY ' + api.AU.fy);

ck('nothing earned, nothing owed', api.bracketTax(0, 1), 0);
ck('the tax-free threshold is free', api.bracketTax(18200, 1), 0);
ck('$45,000 is $26,800 at 15%', api.bracketTax(45000, 1), 4020, 0.01);
ck('$135,000 adds $90,000 at 30%', api.bracketTax(135000, 1), 31020, 0.01);
ck('$190,000 adds $55,000 at 37%', api.bracketTax(190000, 1), 51370, 0.01);
ck('$250,000 adds $60,000 at 45%', api.bracketTax(250000, 1), 78370, 0.01);
ck('indexing the scale scales the bill with it',
   api.bracketTax(45000 * 1.1, 1.1), 4020 * 1.1, 0.01);

ck('the full offset applies below its first threshold', api.lito(37500, 1), 700);
ck('$40,000 tapers at 5c in the dollar', api.lito(40000, 1), 575, 0.01);
ck('$45,000 has lost $375 of it', api.lito(45000, 1), 325, 0.01);
ck('$60,000 tapers on at 1.5c', api.lito(60000, 1), 100, 0.01);
ck('and it runs out before $67,000', api.lito(67000, 1), 0);
ckTrue('it is never negative', [0, 20000, 50000, 200000].every(function(t){
  return api.lito(t, 1) >= 0;
}));

ck('the levy starts at its threshold, not below it', api.medicareLevy(28011, false, 1), 0);
ck('$30,000 is inside the 10c shade-in', api.medicareLevy(30000, false, 1), 198.9, 0.01);
ck('$40,000 has cleared it and pays the flat 2%', api.medicareLevy(40000, false, 1), 800, 0.01);
ck('a senior gets a higher threshold', api.medicareLevy(44268, true, 1), 0);
ck('which a non-senior on the same income does not',
   api.medicareLevy(44268, false, 1), 885.36, 0.01);

ck('SAPTO is full below its threshold', api.sapto(32279, false, 1), 2230, 0.01);
ck('and tapers at 12.5c', api.sapto(40000, false, 1), 1264.875, 0.01);
ck('still a sliver of it left at $50,000', api.sapto(50000, false, 1), 14.875, 0.01);
ck('and gone by $50,200', api.sapto(50200, false, 1), 0);
ckTrue('a member of a couple gets the smaller amount',
  api.sapto(0, true, 1) < api.sapto(0, false, 1));

ck('$45,000: $4,020 less $325 offset plus $900 levy',
   api.personalTax(45000, false, false, 1), 4595, 0.01);
ck('the same income as a senior, with SAPTO and the higher levy threshold',
   api.personalTax(45000, true, false, 1), 3128.325, 0.01);
ck('offsets cannot turn into a refund', api.personalTax(20000, false, false, 1), 0);
ck('and a negative income is treated as none', api.personalTax(-5000, false, false, 1), 0);
ckTrue('tax never falls as income rises', (function(){
  for (var t = 0; t < 400000; t += 2500)
    if (api.personalTax(t + 2500, false, false, 1) < api.personalTax(t, false, false, 1)) return false;
  return true;
})());

ck('at $60,000 the marginal rate is 30% plus the levy plus the LITO taper',
   api.marginalRate(60000, false, false, 1), 0.335, 1e-6);
ck('at $250,000 it is the top rate plus the levy',
   api.marginalRate(250000, false, false, 1), 0.47, 1e-6);

/* -------------------------------------------------------------- super */
head('contributions and drawdown');

ck('below the threshold Division 293 does not apply', api.div293(200000, 30000), 0);
ck('it charges 15% on the part of the contribution over it',
   api.div293(240000, 30000), 3000, 0.01);
ck('and on the whole contribution once income alone clears it',
   api.div293(300000, 30000), 4500, 0.01);
ck('landing exactly on the threshold charges nothing extra',
   api.div293(220000, 30000), 0);

ck('under 65 the minimum drawdown is 4%', api.minDrawRate(64), 0.04, 1e-9);
ck('65 to 74 is 5%', api.minDrawRate(65), 0.05, 1e-9);
ck('74 is still 5%', api.minDrawRate(74), 0.05, 1e-9);
ck('75 steps to 6%', api.minDrawRate(75), 0.06, 1e-9);
ck('94 is 11%', api.minDrawRate(94), 0.11, 1e-9);
ck('95 and over is 14%', api.minDrawRate(95), 0.14, 1e-9);
ck('and it does not keep climbing after that', api.minDrawRate(105), 0.14, 1e-9);
ckTrue('the rate never falls with age', (function(){
  for (var a = 55; a < 105; a++) if (api.minDrawRate(a + 1) < api.minDrawRate(a)) return false;
  return true;
})());

/* -------------------------------------------------------- age pension */
head('the age pension, on both tests');

var MAXP = api.AU.ap.maxFn.single * 26;
ck('with nothing at all you get the full rate',
   api.agePensionFor(0, 0, false, true, 1), MAXP, 0.01);
ck('at the asset-free area the income test is already biting',
   api.agePensionFor(333000, 0, false, true, 1), 28585.65, 0.01);
ck('a large enough balance cuts it out entirely',
   api.agePensionFor(5000000, 0, false, true, 1), 0);
ckTrue('a non-homeowner keeps more of it',
  api.agePensionFor(500000, 0, false, false, 1) > api.agePensionFor(500000, 0, false, true, 1));
ckTrue('a couple has a higher maximum',
  api.agePensionFor(0, 0, true, true, 1) > api.agePensionFor(0, 0, false, true, 1));
ckTrue('other income reduces it',
  api.agePensionFor(200000, 40000, false, true, 1) < api.agePensionFor(200000, 0, false, true, 1));
ckTrue('it never goes below nothing or above the maximum', (function(){
  for (var a = 0; a <= 3000000; a += 50000){
    var v = api.agePensionFor(a, 0, false, true, 1);
    if (v < 0 || v > MAXP + 0.01) return false;
  }
  return true;
})());
ckTrue('and it never rises as assets do', (function(){
  var prev = Infinity;
  for (var a = 0; a <= 3000000; a += 25000){
    var v = api.agePensionFor(a, 0, false, true, 1);
    if (v > prev + 1e-9) return false;
    prev = v;
  }
  return true;
})());

/* --------------------------------------------------------- the plan */
head('the projection');

var BASE = {
  age: 40, retireAge: 60, planTo: 90, couple: false, homeowner: true,
  salary: 120000, partnerSalary: 0, partnerSuper: 0,
  salaryGrowth: 0.01, sg: 0.12, sacrifice: 0, fillCap: false,
  spendNow: 70000, spendRet: 70000,
  superBal: 150000, outBal: 80000, outGain: 0,
  retSuper: 0.075, retOut: 0.075, feeSuper: 0.006, feeOut: 0.002,
  inflation: 0.025, vol: 0.12,
  drawOrder: 'super', agePension: true, indexTax: true,
  distYield: 0.025, franked: 0.4,
  items: [{ kind: 'out', amt: 0, from: 60, to: 75 }, { kind: 'in', amt: 0, from: 55, to: 67 }]
};
function P(o){ return Object.assign({}, BASE, o || {}); }

var base = api.project(P());
ck('one row per year of the plan, plus a closing point', base.rows.length, 51);
ckTrue('and the last of them is that closing point', base.rows[50].closing === true);
ckTrue('which carries no flows, only the balances it ends on',
  base.rows[50].sal === 0 && base.rows[50].spend === 0 &&
  base.rows[50].total === base.rows[50].totalOpen);
ck('starting at the age you gave it', base.rows[0].age, 40);
ck('and ending the year before the plan does', base.rows[49].age, 89);
ck('prices compound one year at a time', base.rows[10].ix, Math.pow(1.025, 10), 1e-9);
ck('the closing total is the two buckets added up',
   base.endTotal, base.endSup + base.endOut, 0.01);
ckTrue('every figure on every row is finite', base.rows.every(function(r){
  return Object.keys(r).every(function(k){
    return typeof r[k] === 'boolean' || isFinite(r[k]);
  });
}));
ckTrue('neither bucket ever goes negative',
  base.rows.every(function(r){ return r.sup >= -0.01 && r.out >= -0.01; }));

var early = api.project(P({ retireAge: 52 }));
ckTrue('before 60 the plan is flagged as not working, or does not touch super',
  early.rows.filter(function(r){ return !r.working && !r.access; })
           .every(function(r){ return near(r.supW, 0, 0.01) && near(r.forced, 0, 0.01); }));
ckTrue('a bridge year is a real thing here', early.bridgeYears > 0);
ck('and there are as many of them as there are years before 60',
   early.bridgeYears, Math.min(8, early.rows.filter(function(r){
     return !r.working && !r.access; }).length), 0);

ckTrue('working longer leaves more behind',
  api.project(P({ retireAge: 65 })).endTotal > api.project(P({ retireAge: 60 })).endTotal);
ckTrue('spending more leaves less',
  api.project(P({ spendRet: 90000 })).endTotal < api.project(P({ spendRet: 70000 })).endTotal);
ckTrue('a better return leaves more',
  api.project(P({ retSuper: 0.09, retOut: 0.09 })).endTotal > base.endTotal);
ckTrue('a higher fee leaves less',
  api.project(P({ feeSuper: 0.02, feeOut: 0.02 })).endTotal < base.endTotal);

var doomed = api.project(P({ retireAge: 42, spendRet: 250000 }));
ckTrue('a plan that cannot be paid for is reported as failing', !doomed.ok && !!doomed.fail);
ckTrue('and it says which year it ran out in',
  doomed.fail.age >= 42 && doomed.fail.age <= 90);
ckTrue('a plan with plenty behind it does not fail',
  api.project(P({ superBal: 4000000, outBal: 4000000, retireAge: 60 })).ok);

ckTrue('the age pension can be switched off',
  api.project(P({ agePension: false })).rows.every(function(r){ return r.pension === 0; }));
ckTrue('and when it is on it only arrives at pension age',
  api.project(P()).rows.every(function(r){
    return r.age >= api.AU.pensionAge || r.pension === 0;
  }));

ck('filling the cap never breaches it', api.project(P({ fillCap: true })).capBreach, 0, 0.01);
ckTrue('a sacrifice large enough to breach it is reported',
  api.project(P({ sacrifice: 60000 })).capBreach > 0);
ck('an ordinary salary pays no Division 293 in year one',
   api.project(P()).rows[0].d293, 0, 0.01);
ckTrue('a large one pays it straight away', api.project(P({ salary: 320000 })).rows[0].d293 > 0);
/* Every other threshold in this engine is multiplied by the year's index; the
   $250,000 one is not, which is true to the law -- it has not moved since 2017
   and nothing indexes it. The consequence is worth pinning down rather than
   discovering: on a salary that merely keeps pace, the surcharge eventually
   arrives on its own. */
ckTrue('the Division 293 threshold is the one figure that does not move with prices',
  api.project(P({ indexTax: true })).d293Total > 0);
ckTrue('and it lands late, not at the start', (function(){
  var r = api.project(P()).rows.filter(function(x){ return x.d293 > 0.01; });
  return r.length > 0 && r[0].age > BASE.age + 10;
})());

var earliest = api.earliestAge(P());
ckTrue('there is an earliest age that still works', earliest !== null);
ckTrue('retiring at it works', !api.project(P(), { retireAge: earliest, light: true }).fail);
ckTrue('and a year earlier does not',
  earliest <= 40 || !!api.project(P(), { retireAge: earliest - 1, light: true }).fail);

/* --------------------------------------------------- other markets */
head('a thousand other markets');

var mc1 = api.monteCarlo(P(), 200);
var mc2 = api.monteCarlo(P(), 200);
ck('the seed is fixed, so the success rate repeats exactly', mc1.rate, mc2.rate, 0);
ckTrue('and so does every band', mc1.bands.every(function(b, i){
  return b.every(function(v, y){ return v === mc2.bands[i][y]; });
}));
ck('the bands run the length of the plan plus a closing point',
   mc1.bands[0].length, 51);
ckTrue('the bands are ordered, lowest percentile first', (function(){
  for (var y = 0; y < mc1.bands[0].length; y++)
    for (var b = 1; b < mc1.bands.length; b++)
      if (mc1.bands[b][y] < mc1.bands[b - 1][y] - 1e-6) return false;
  return true;
})());
ckTrue('the success rate sits between none and all', mc1.rate >= 0 && mc1.rate <= 1);
ck('and it is the count over the paths', mc1.rate, mc1.ok / 200, 1e-12);
ckTrue('no volatility at all reproduces the steady plan',
  near(api.monteCarlo(P({ vol: 0 }), 20).bands[2][50], api.project(P()).endTotal, 1));

/* ------------------------------------------------------- the version */
/* The colophon is plain HTML so it still prints on a page whose script never
   ran, which makes it a second copy of the version -- and a second copy drifts.
   Both are read straight out of the source rather than through the engine's
   exports, because neither belongs to the engine. */
head('the version, in the two places it is written');
var vFooter = /<span id="ver">v([0-9]+\.[0-9]+\.[0-9]+)<\/span>/.exec(src);
var vConst  = /var APP_VERSION = '([0-9]+\.[0-9]+\.[0-9]+)';/.exec(src);
ckTrue('the footer carries a semver literal', !!vFooter);
ckTrue('the code declares a semver constant', !!vConst);
ckTrue('and the two agree', !!vFooter && !!vConst && vFooter[1] === vConst[1],
  vFooter && vConst ? vFooter[1] + ' vs ' + vConst[1] : 'missing');
ckTrue('the CSV header is built from the constant, not a third literal',
  /L\.push\(\[APP_NAME \+ ' ' \+ APP_VERSION\]\)/.test(src));
ckTrue('the copyright names a holder and a year', /&copy;\s*20\d\d\s+\S+/.test(src));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
