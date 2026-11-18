/* =================================================================
   slide.js — SHOWS ONE SLIDE (loaded by every slides/*.html)
   -----------------------------------------------------------------
   Scales the 1920 × 1080 slide to fit the window, shows a labelled
   box for a picture that's missing, and passes key presses to the
   workshop page around it (steps.js), so ← → still change step
   after someone clicks on a slide.
   ================================================================= */

const slide = document.querySelector('section');

function fitSlide() {
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  const left = (innerWidth - 1920 * scale) / 2;
  const top = (innerHeight - 1080 * scale) / 2;
  slide.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
}
addEventListener('resize', fitSlide);
fitSlide();

// Fill the edges around the slide with the slide's own colour.
document.body.style.background = getComputedStyle(slide).backgroundColor;

// A picture that isn't in slides/img/ yet becomes a box with its description.
for (const img of slide.querySelectorAll('img')) {
  img.addEventListener('error', () => {
    const box = document.createElement('div');
    box.className = 'missing-img';
    box.style.cssText = img.style.cssText;
    box.textContent = `[Missing picture: ${img.getAttribute('src')}] ${img.alt}`;
    img.replaceWith(box);
  });
}

// Pass keys to the workshop page, if this slide is shown inside it.
if (window.parent !== window) {
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    window.parent.postMessage({ slideKey: e.key }, '*');
  });
}
