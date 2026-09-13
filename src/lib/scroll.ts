/** Keep the mobile header and navigation in place when moving within the content pane. */
export function scrollToContent(element: HTMLElement | null, behavior: ScrollBehavior = 'auto') {
  if (!element) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) behavior = 'auto';
  const main = element.closest('main');
  if (main && ['auto', 'scroll'].includes(getComputedStyle(main).overflowY)) {
    const padding = Number.parseFloat(getComputedStyle(main).scrollPaddingTop) || 0;
    main.scrollTo({
      top:
        main.scrollTop +
        element.getBoundingClientRect().top -
        main.getBoundingClientRect().top -
        padding,
      behavior,
    });
  } else {
    element.scrollIntoView({ block: 'start', behavior });
  }
}
