export function mulberry32(seed){
  let t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, min, max){
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick(rng, arr){
  return arr[Math.floor(rng() * arr.length)];
}

export function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

export function hashStrToSeed(str){
  let h = 2166136261;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
