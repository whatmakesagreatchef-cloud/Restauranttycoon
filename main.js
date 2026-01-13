import { loadState, saveState, defaultState } from "./state.js";
import { render } from "./ui_screens.js";

let state = loadState();

// first-run onboarding
if(!state.seenSetup){
  state.route = "setup";
}

// allow ui_screens to request a fresh default
window.__RESIM_DEFAULT_STATE__ = defaultState;

function setState(mutator){
  state = mutator(state) || state;
  saveState(state);
  refresh();
}

function refresh(){
  document.querySelectorAll(".tab").forEach(btn=>{
    const r = btn.getAttribute("data-route");
    btn.classList.toggle("active", r === state.route);
  });
  render(state, setState);
}

document.addEventListener("click", (e)=>{
  const help = e.target.closest("[data-action=\"help\"]");
  if(help){
    setState(s=>{ s.route = "setup"; return s; });
    return;
  }

  const tab = e.target.closest(".tab");
  if(tab){
    const r = tab.getAttribute("data-route");
    setState(s=>{ s.route = r; return s; });
  }
});

refresh();
