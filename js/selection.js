window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Selection = {};

SimpleDoc.Selection.capture = function() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const editor = SimpleDoc.getActiveEditor();
  if (editor && editor.contains(range.commonAncestorContainer)) {
    SimpleDoc.state.savedRange = range.cloneRange();
  }
};

SimpleDoc.Selection.restoreOrCreate = function() {
  const editor = SimpleDoc.getActiveEditor();
  if (!editor) return null;
  let range = SimpleDoc.state.savedRange;
  if (range && editor.contains(range.commonAncestorContainer)) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return range;
  }
  range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  SimpleDoc.state.savedRange = range.cloneRange();
  return range;
};

SimpleDoc.Selection.closestBlock = function(node) {
  if (!node) return null;
  let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  const editor = SimpleDoc.getActiveEditor();
  const blockTags = new Set(['P','DIV','H1','H2','H3','H4','LI','TD','TH','SECTION','HEADER','FIGURE']);
  while (el && el !== editor) {
    if (blockTags.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return editor;
};

SimpleDoc.Selection.blocksInRange = function(range) {
  const editor = SimpleDoc.getActiveEditor();
  if (!editor || !range) return [];
  if (range.collapsed) {
    const block = SimpleDoc.Selection.closestBlock(range.startContainer);
    return block && block !== editor ? [block] : [];
  }
  const selector = 'p,h1,h2,h3,h4,li,td,th,.doc-textbox,.doc-callout,.intro';
  return [...editor.querySelectorAll(selector)].filter(el => {
    try { return range.intersectsNode(el); } catch { return false; }
  });
};

SimpleDoc.Selection.wrapSelection = function(styleObj = {}) {
  const editor = SimpleDoc.getActiveEditor();
  if (!editor) return;
  editor.focus();
  const range = SimpleDoc.Selection.restoreOrCreate();
  if (!range) return;

  if (range.collapsed) {
    const span = document.createElement('span');
    Object.assign(span.style, styleObj);
    span.appendChild(document.createTextNode('\u200B'));
    range.insertNode(span);
    range.setStart(span.firstChild, 1);
    range.collapse(true);
  } else {
    const span = document.createElement('span');
    Object.assign(span.style, styleObj);
    try {
      range.surroundContents(span);
    } catch (e) {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    range.selectNodeContents(span);
    range.collapse(false);
  }
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  SimpleDoc.state.savedRange = range.cloneRange();
  SimpleDoc.markDirty();
  SimpleDoc.snapshot();
};

SimpleDoc.Selection.toggleStyle = function(property, onValue, offValue = 'normal') {
  const range = SimpleDoc.Selection.restoreOrCreate();
  if (!range) return;
  const startEl = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
  const current = startEl ? getComputedStyle(startEl)[property] : '';
  let isOn = false;
  if (property === 'fontWeight') isOn = Number(current) >= 600 || current === 'bold';
  else if (property === 'fontStyle') isOn = current === 'italic';
  else if (property === 'textDecorationLine') isOn = current.includes('underline');
  SimpleDoc.Selection.wrapSelection({ [property]: isOn ? offValue : onValue });
};

SimpleDoc.Selection.applyBlockStyles = function(styleObj) {
  const range = SimpleDoc.Selection.restoreOrCreate();
  if (!range) return;
  const blocks = SimpleDoc.Selection.blocksInRange(range);
  if (!blocks.length) return;
  blocks.forEach(block => Object.assign(block.style, styleObj));
  SimpleDoc.markDirty();
  SimpleDoc.snapshot();
  if (SimpleDoc.state.autoPaginate && SimpleDoc.Pagination) SimpleDoc.Pagination.queue(SimpleDoc.getActivePage(), 20);
};

SimpleDoc.Selection.align = function(value) {
  SimpleDoc.Selection.applyBlockStyles({ textAlign: value });
};
