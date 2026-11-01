(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.WILS_FORM_ENHANCEMENTS = api;
    api.init(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // This module owns presentation only. The existing request controller keeps
  // ownership of values, validation, routing, hidden/disabled and submission.
  function init(win) {
    const doc = win.document;
    const form = doc.getElementById('request-form');
    if (!form || !form.matches('[data-request-form], [data-default-department]')) return null;
    if (form.dataset.requestEnhancementsReady === '101') return null;
    const email = form.querySelector('#request-email');
    if (!email || email.tagName !== 'INPUT' || email.type !== 'email') return null;

    form.dataset.requestEnhancementsReady = '101';
    let wrap = email.parentElement;
    if (!wrap || !wrap.classList.contains('request-input-wrap')) {
      const hadFocus = doc.activeElement === email;
      wrap = doc.createElement('div');
      wrap.className = 'request-input-wrap';
      email.parentNode.insertBefore(wrap, email);
      if (typeof wrap.moveBefore === 'function') wrap.moveBefore(email, null);
      else {
        wrap.appendChild(email);
        if (hadFocus) {
          try { email.focus({ preventScroll: true }); } catch (_) { email.focus(); }
        }
      }
    }
    let check = wrap.querySelector('.request-email-check');
    if (!check) {
      check = doc.createElement('span');
      check.className = 'request-email-check';
      check.hidden = true;
      check.setAttribute('aria-hidden', 'true');
      wrap.appendChild(check);
    }
    // Moving the existing input preserves its identity, native behavior and all
    // previously attached listeners. No replacement input or duplicate value.
    let emailInteracted = false;
    function syncEmail() {
      const value = email.value.trim();
      const ariaInvalid = (email.getAttribute('aria-invalid') || '').toLowerCase() === 'true';
      const disabled = email.disabled || email.matches(':disabled');
      const formatIsValid = value.length > 0 && value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      check.hidden = !(emailInteracted && formatIsValid && !disabled && !ariaInvalid && !email.validity.typeMismatch);
    }
    function emailChanged() {
      emailInteracted = true;
      syncEmail();
    }
    email.addEventListener('input', emailChanged);
    email.addEventListener('blur', emailChanged);

    const productFields = form.querySelector('#request-product-fields');
    const department = form.querySelector('#request-department');
    let productWasVisible = productFields ? !productFields.hidden : false;
    let productAnimation = null;
    const reduced = typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const prefersReduced = () => !!(reduced && reduced.matches);

    function cancelProductAnimation() {
      if (!productAnimation) return;
      const animation = productAnimation;
      productAnimation = null;
      try { animation.cancel(); } catch (_) { /* The natural CSS state stays visible. */ }
    }
    function syncProduct(animate) {
      if (!productFields) return;
      const visible = !productFields.hidden;
      const newlyVisible = visible && !productWasVisible;
      productWasVisible = visible;
      if (!visible) cancelProductAnimation();
      if (!animate || !newlyVisible) return;
      cancelProductAnimation();
      if (prefersReduced() || doc.hidden || typeof productFields.animate !== 'function') return;
      try {
        const animation = productFields.animate([
          { opacity: 0.4, transform: 'translateY(5px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 210, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'none' });
        productAnimation = animation;
        if (animation.finished && typeof animation.finished.then === 'function') {
          animation.finished.then(() => {
            if (productAnimation === animation) productAnimation = null;
          }, () => {
            if (productAnimation === animation) productAnimation = null;
          });
        }
      } catch (_) { cancelProductAnimation(); }
    }
    // The original listener is registered on the select before this module.
    // Bubbling observes its final visibility without setting hidden/disabled.
    form.addEventListener('change', event => {
      if (event.target === department) syncProduct(true);
    });

    if (typeof win.MutationObserver === 'function') {
      const observer = new win.MutationObserver(records => {
        let productChanged = false;
        let emailStateChanged = false;
        for (const record of records) {
          if (record.target === productFields) productChanged = true;
          else emailStateChanged = true;
        }
        if (emailStateChanged) syncEmail();
        if (productChanged) syncProduct(true);
      });
      observer.observe(email, { attributes: true, attributeFilter: ['aria-invalid', 'disabled'] });
      if (productFields) observer.observe(productFields, { attributes: true, attributeFilter: ['hidden'] });
    }

    function settle() {
      cancelProductAnimation();
      syncProduct(false);
      syncEmail();
    }
    function restored() {
      // The browser may restore/autofill the native value without input events.
      // This indicator only confirms syntax; it never claims delivery/existence.
      if (email.value.trim()) emailInteracted = true;
      settle();
    }
    win.addEventListener('pageshow', restored);
    win.addEventListener('pagehide', cancelProductAnimation);
    win.addEventListener('resize', cancelProductAnimation);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancelProductAnimation(); });
    if (reduced && typeof reduced.addEventListener === 'function') reduced.addEventListener('change', settle);
    else if (reduced && typeof reduced.addListener === 'function') reduced.addListener(settle);
    if (doc.readyState === 'complete') restored();
    else syncEmail();
    return { refresh: settle };
  }

  return { init };
});
