import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once for the whole app. Vite/React can re-evaluate this
// module during HMR, so guard against double registration.
let registered = false;
export function ensureGsapRegistered() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export { gsap, ScrollTrigger };
