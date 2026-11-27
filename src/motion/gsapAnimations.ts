import { useEffect, RefObject } from 'react';
import gsap from 'gsap';

export function animateEnter(el: HTMLElement | null, yOffset = 8, duration = 0.24) {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: yOffset },
    {
      autoAlpha: 1,
      y: 0,
      duration,
      ease: 'power3.out',
      force3D: true,
      clearProps: 'transform,opacity,visibility',
    }
  );
}

export function animateModalIn(panelEl: HTMLElement | null, backdropEl?: HTMLElement | null) {
  if (backdropEl) {
    gsap.killTweensOf(backdropEl);
    gsap.fromTo(
      backdropEl,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.18, ease: 'power2.out', clearProps: 'opacity,visibility' }
    );
  }
  if (panelEl) {
    gsap.killTweensOf(panelEl);
    gsap.fromTo(
      panelEl,
      { autoAlpha: 0, scale: 0.96, y: 10 },
      {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.26,
        ease: 'power3.out',
        force3D: true,
        clearProps: 'transform,opacity,visibility',
      }
    );
  }
}

export function animateDrawerRightIn(panelEl: HTMLElement | null, backdropEl?: HTMLElement | null) {
  if (backdropEl) {
    gsap.killTweensOf(backdropEl);
    gsap.fromTo(
      backdropEl,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.18, ease: 'power2.out', clearProps: 'opacity,visibility' }
    );
  }
  if (panelEl) {
    gsap.killTweensOf(panelEl);
    gsap.fromTo(
      panelEl,
      { xPercent: 100, autoAlpha: 0.85 },
      {
        xPercent: 0,
        autoAlpha: 1,
        duration: 0.28,
        ease: 'power3.out',
        force3D: true,
        clearProps: 'transform,opacity,visibility',
      }
    );
  }
}

export function animateStaggerCards(
  containerEl: HTMLElement | null,
  selector = '[data-gsap-card]',
  stagger = 0.03
) {
  if (!containerEl) return;
  const targets = containerEl.querySelectorAll(selector);
  if (!targets || targets.length === 0) return;
  gsap.killTweensOf(targets);
  gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 8 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.24,
      stagger,
      ease: 'power3.out',
      force3D: true,
      clearProps: 'transform,opacity,visibility',
    }
  );
}

export function useGsapEnter(ref: RefObject<HTMLElement | null>, deps: unknown[], yOffset = 8) {
  useEffect(() => {
    animateEnter(ref.current, yOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useGsapModal(
  panelRef: RefObject<HTMLElement | null>,
  backdropRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  variant: 'modal' | 'drawer-right' = 'modal'
) {
  useEffect(() => {
    if (!isOpen) return;
    if (variant === 'drawer-right') {
      animateDrawerRightIn(panelRef.current, backdropRef.current);
    } else {
      animateModalIn(panelRef.current, backdropRef.current);
    }
  }, [isOpen, panelRef, backdropRef, variant]);
}

export function scrollToResultOnMobile(ref: RefObject<HTMLElement | null>) {
  if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
  window.requestAnimationFrame(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
