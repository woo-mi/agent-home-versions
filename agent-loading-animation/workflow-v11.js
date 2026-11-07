/* V11 keeps the V6 screen shell and replaces the loading artwork with a static canvas. */
(() => {
  'use strict';

  function create() {
    const element = document.createElement('div');
    element.className = 'build-static-canvas';
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', 'Empty dotted agent workflow canvas');
    return { element, render() {} };
  }

  window.AgentWorkflowVariants ||= {};
  window.AgentWorkflowVariants.v11 = Object.freeze({ create });
})();
