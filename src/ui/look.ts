// Visual mock-ups (index.css, "Looks"): the same game with another skin, picked with ?look=<name> and
// kept on the phone, so testers can compare them. ?look=original (or any unknown name) goes back.
import { UI } from './uiConfig';

export function applyLook(param: string | null): void {
  try {
    if (param !== null) {
      if (UI.looks.includes(param)) localStorage.setItem(UI.lookKey, param);
      else localStorage.removeItem(UI.lookKey);
    }
    const look = localStorage.getItem(UI.lookKey);
    if (look && UI.looks.includes(look)) document.documentElement.dataset.look = look;
    else delete document.documentElement.dataset.look;
  } catch {
    // Storage unavailable: the URL's look still applies to this visit.
    if (param && UI.looks.includes(param)) document.documentElement.dataset.look = param;
  }
}
