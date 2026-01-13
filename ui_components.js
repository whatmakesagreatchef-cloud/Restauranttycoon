export function money(n){
  const v = Math.round(n);
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString()}`;
}

export function pct(n){
  return `${(n*100).toFixed(1)}%`;
}

export function el(html){
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

export function topTags(obj, limit=6){
  return Object.entries(obj || {}).sort((a,b)=> b[1]-a[1]).slice(0,limit);
}
