import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Elements that fade/slide in as they enter the viewport
const REVEAL = ".card, .feat, .about, .tl > .glass, .empty, section > .glass, section > h2";

/**
 * Page motion: smooth page fade, hero entrance, staggered scroll reveal.
 * Re-runs on every route change; GSAP/ScrollTrigger are reverted automatically.
 */
export function useMotion(ref, key, ready) {
  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !ready) return;
      window.scrollTo(0, 0);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // 1) smooth transition between pages
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out", clearProps: "opacity" });

      // 2) hero entrance (home page only)
      const hero = gsap.utils.toArray(".hero > *", root);
      if (hero.length) gsap.from(hero, { opacity: 0, y: 28, duration: 0.7, stagger: 0.12, delay: 0.1, ease: "power3.out", clearProps: "transform,opacity" });

      // 3) staggered reveal for cards and blocks, triggered by scroll
      const els = gsap.utils.toArray(REVEAL, root).filter((e) => !e.closest(".hero"));
      if (!els.length) return;
      gsap.set(els, { opacity: 0, y: 36 });
      const show = (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", overwrite: true, clearProps: "transform,opacity" });
      ScrollTrigger.batch(els, { start: "top 92%", once: true, onEnter: show });
    },
    { scope: ref, dependencies: [key, ready], revertOnUpdate: true }
  );
}
