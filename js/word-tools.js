window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Tools = SimpleDoc.Tools || {};

(() => {
  const Tools = SimpleDoc.Tools;

  Tools.autosaveTimer = null;
  Tools.statsTimer = null;
  Tools.findState = {
    query: '',
    matchCase: false,
    index: -1,
    matches: [],
    replaceMode: false
  };

  /* =========================================================
     COMMON
  ========================================================= */

  Tools.message = function(message, ms = 1400) {
    const status = document.getElementById('saveStatus');
    if (!status) return;
    status.textContent = message;
    clearTimeout(Tools.messageTimer);
    Tools.messageTimer = setTimeout(() => {
      status.textContent = SimpleDoc.state.dirty ? '수정됨' : '저장됨';
    }, ms);
  };

  Tools.getRange = function() {
    const root = SimpleDoc.Selection?.getDocumentRoot?.();
    if (!root) return null;

    const sel = window.getSelection();

    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);

      if (SimpleDoc.Selection?.rangeIsInDocument?.(range)) {
        SimpleDoc.Selection?.saveRange?.(range.cloneRange());
        return range.cloneRange();
      }
    }

    return (
      SimpleDoc.Selection?.getSavedRange?.() ||
      SimpleDoc.Selection?.restoreOrCreate?.() ||
      null
    );
  };

  Tools.restoreRange = function() {
    const range = SimpleDoc.Selection?.restoreOrCreate?.();
    if (!range) return null;
    const editor = SimpleDoc.getActiveEditor?.();
    editor?.focus();
    return range;
  };

  Tools.startElement = function(range) {
    if (!range) return null;
    return (
      SimpleDoc.Selection?.firstSelectedTextElement?.(range) ||
      (range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range.startContainer.parentElement)
    );
  };

  Tools.afterChange = function(page = SimpleDoc.getActivePage?.()) {
    SimpleDoc.markDirty?.();
    SimpleDoc.snapshot?.();
    if (SimpleDoc.state.autoPaginate && SimpleDoc.Pagination) {
      SimpleDoc.Pagination.queue(page, 20);
    } else if (page) {
      SimpleDoc.warnOverflow?.(page);
    }
    Tools.scheduleStats();
    Tools.scheduleAutosave();
  };

  Tools.withSelection = function(callback) {
    const editor = SimpleDoc.getActiveEditor?.();
    if (!editor) return false;
    editor.focus();
    const range = Tools.restoreRange();
    if (!range) return false;
    callback(range, editor);
    return true;
  };

  Tools.styleSelection = function(styleObj) {
    SimpleDoc.Selection?.wrapSelection?.(styleObj);
    Tools.scheduleStats();
    Tools.scheduleAutosave();
  };

  Tools.blockStyle = function(styleObj) {
    SimpleDoc.Selection?.applyBlockStyles?.(styleObj);
    Tools.scheduleStats();
    Tools.scheduleAutosave();
  };

  /* =========================================================
     CHARACTER FORMATTING
  ========================================================= */

  Tools.execInlineCommand = function(command) {
    Tools.withSelection(() => {
      try {
        document.execCommand(command, false, null);
      } catch {}
      Tools.afterChange();
    });
  };

  Tools.toggleSuperscript = function() {
    const changed = SimpleDoc.Selection?.toggleScript?.('super') || [];
    if (changed.length) {
      Tools.scheduleStats();
      Tools.scheduleAutosave();
      Tools.message('위 첨자');
    }
  };

  Tools.toggleSubscript = function() {
    const changed = SimpleDoc.Selection?.toggleScript?.('sub') || [];
    if (changed.length) {
      Tools.scheduleStats();
      Tools.scheduleAutosave();
      Tools.message('아래 첨자');
    }
  };

  Tools.clearCharacterFormatting = function() {
    const changed = SimpleDoc.Selection?.clearCharacterFormatting?.() || [];

    if (changed.length) {
      Tools.scheduleStats();
      Tools.scheduleAutosave();
      Tools.message('보통 모양 적용');
    }
  };

  Tools.adjustFontSize = function(direction) {
    const range = Tools.getRange();
    if (!range) return;

    const el = Tools.startElement(range);
    const computed = el ? getComputedStyle(el) : null;
    const currentPx = parseFloat(computed?.fontSize || '14.6667');
    const currentPt = currentPx * 72 / 96;

    const sizes = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72];
    let index = sizes.findIndex(size => size >= currentPt - 0.2);
    if (index < 0) index = sizes.length - 1;

    if (direction > 0 && sizes[index] <= currentPt + 0.2) index++;
    if (direction < 0 && sizes[index] >= currentPt - 0.2) index--;

    index = Math.max(0, Math.min(sizes.length - 1, index));
    const size = sizes[index];

    Tools.styleSelection({ fontSize: `${size}pt` });

    const select = document.getElementById('fontSize');
    if (select && [...select.options].some(o => Number(o.value || o.textContent) === size)) {
      select.value = String(size);
    }

    Tools.message(`글자 크기 ${size}pt`);
  };

  Tools.adjustLetterSpacing = function(deltaPt) {
    const range = Tools.getRange();
    if (!range) return;
    const el = Tools.startElement(range);
    const raw = el ? getComputedStyle(el).letterSpacing : 'normal';
    let currentPx = parseFloat(raw);
    if (!Number.isFinite(currentPx)) currentPx = 0;
    const currentPt = currentPx * 72 / 96;
    const next = Math.max(-5, Math.min(20, currentPt + deltaPt));
    Tools.styleSelection({ letterSpacing: `${next.toFixed(2)}pt` });
    Tools.message(`자간 ${next.toFixed(2)}pt`);
  };

  Tools.setTextColor = function(color) {
    Tools.styleSelection({ color });
    const input = document.getElementById('textColor');
    if (input && /^#[0-9a-f]{6}$/i.test(color)) input.value = color;
  };

  /* =========================================================
     PARAGRAPH FORMATTING
  ========================================================= */

  Tools.getTargetBlocks = function(range = Tools.getRange()) {
    if (!range) return [];
    return SimpleDoc.Selection?.blocksInRange?.(range) || [];
  };

  Tools.adjustLineHeight = function(delta) {
    const range = Tools.getRange();
    const blocks = Tools.getTargetBlocks(range);
    if (!blocks.length) return;

    blocks.forEach(block => {
      const cs = getComputedStyle(block);
      const font = parseFloat(cs.fontSize || '16') || 16;
      let ratio;
      if (cs.lineHeight === 'normal') {
        ratio = 1.2;
      } else {
        const px = parseFloat(cs.lineHeight);
        ratio = Number.isFinite(px) ? px / font : 1.7;
      }
      ratio = Math.max(0.5, Math.min(5, ratio + delta));
      block.style.lineHeight = ratio.toFixed(2);
    });

    Tools.afterChange();
    Tools.message(delta > 0 ? '줄 간격 넓게' : '줄 간격 좁게');
  };

  Tools.adjustBlockPt = function(property, deltaPt, minPt = -300, maxPt = 300) {
    const range = Tools.getRange();
    const blocks = Tools.getTargetBlocks(range);
    if (!blocks.length) return;

    blocks.forEach(block => {
      const px = parseFloat(getComputedStyle(block)[property] || '0') || 0;
      const pt = px * 72 / 96;
      const next = Math.max(minPt, Math.min(maxPt, pt + deltaPt));
      block.style[property] = `${next.toFixed(2)}pt`;
    });

    Tools.afterChange();
  };

  Tools.firstLineIndent = function(direction) {
    Tools.adjustBlockPt('textIndent', direction * 11, -110, 220);
    Tools.message(direction > 0 ? '첫 줄 들여쓰기' : '첫 줄 내어쓰기');
  };

  Tools.shiftParagraph = function(direction) {
    Tools.adjustBlockPt('marginLeft', direction * 8, 0, 300);
    Tools.message(direction > 0 ? '문단 오른쪽 이동' : '문단 왼쪽 이동');
  };

  Tools.toggleList = function(kind) {
    const range = Tools.getRange();
    const blocks = Tools.getTargetBlocks(range);

    if (!range || !blocks.length) return;

    const tag = kind === 'ordered' ? 'ol' : 'ul';

    /*
     * 이미 같은 종류의 목록 안에 있고 선택된 목록 전체라면
     * 일반 문단으로 되돌린다.
     */
    const listParents = new Set(
      blocks
        .filter(block => block.tagName === 'LI')
        .map(block => block.parentElement)
        .filter(list => list?.matches?.('ol,ul'))
    );

    if (listParents.size) {
      let changed = false;
      const created = [];

      listParents.forEach(list => {
        const items = [...list.children].filter(el => el.tagName === 'LI');
        const selectedItems = items.filter(item => blocks.includes(item));

        /*
         * 같은 목록의 전체 항목이 선택됐을 때만 안전하게 목록 해제.
         * 일부만 선택된 경우에는 목록 종류만 변경한다.
         */
        if (
          list.tagName.toLowerCase() === tag &&
          selectedItems.length === items.length
        ) {
          const fragment = document.createDocumentFragment();

          items.forEach(item => {
            const para = document.createElement('p');
            para.className = 'doc-body';
            para.innerHTML = item.innerHTML || '<br>';
            fragment.appendChild(para);
            created.push(para);
          });

          list.replaceWith(fragment);
          changed = true;
        } else if (list.tagName.toLowerCase() !== tag) {
          const replacement = document.createElement(tag);

          [...list.attributes].forEach(attr => {
            if (attr.name !== 'start' && attr.name !== 'type') {
              replacement.setAttribute(attr.name, attr.value);
            }
          });

          while (list.firstChild) {
            replacement.appendChild(list.firstChild);
          }

          list.replaceWith(replacement);
          created.push(...replacement.querySelectorAll(':scope > li'));
          changed = true;
        }
      });

      if (changed) {
        if (created.length) {
          SimpleDoc.Selection?.restoreSelectionAround?.(created);
        }
        Tools.afterChange();
        return;
      }
    }

    /*
     * 보호 편집호스트는 외곽 객체를 없애면 안 되므로
     * host 내부 콘텐츠만 목록으로 감싼다.
     */
    const protectedHosts = blocks.filter(block =>
      SimpleDoc.Selection?.isProtectedHost?.(block)
    );

    const normalBlocks = blocks.filter(block =>
      !SimpleDoc.Selection?.isProtectedHost?.(block) &&
      block.tagName !== 'LI'
    );

    const changedNodes = [];

    protectedHosts.forEach(host => {
      const existing = host.querySelector(':scope > ol, :scope > ul');

      if (existing && existing.tagName.toLowerCase() === tag) {
        const fragment = document.createDocumentFragment();

        [...existing.children].forEach(item => {
          if (item.tagName === 'LI') {
            while (item.firstChild) fragment.appendChild(item.firstChild);
            fragment.appendChild(document.createElement('br'));
          }
        });

        existing.replaceWith(fragment);
        SimpleDoc.Boundary?.ensureNotEmpty?.(host);
        changedNodes.push(host);
        return;
      }

      const list = document.createElement(tag);
      const item = document.createElement('li');

      while (host.firstChild) {
        item.appendChild(host.firstChild);
      }

      if (!item.childNodes.length) item.innerHTML = '<br>';

      list.appendChild(item);
      host.appendChild(list);
      changedNodes.push(host);
    });

    /*
     * 일반 문단은 같은 부모 아래의 연속 문단끼리 묶어서
     * 올바른 <ol><li> 또는 <ul><li> 구조로 변환한다.
     */
    const parentGroups = new Map();

    normalBlocks.forEach(block => {
      const parent = block.parentNode;
      if (!parent) return;
      if (!parentGroups.has(parent)) parentGroups.set(parent, []);
      parentGroups.get(parent).push(block);
    });

    parentGroups.forEach((group, parent) => {
      group.sort((a, b) => {
        if (a === b) return 0;
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });

      /*
       * 선택 중간에 선택되지 않은 형제 블록이 있으면
       * 서로 다른 목록으로 나눈다.
       */
      let run = [];

      const flush = () => {
        if (!run.length) return;

        const list = document.createElement(tag);
        parent.insertBefore(list, run[0]);

        run.forEach(block => {
          const item = document.createElement('li');
          item.innerHTML = block.innerHTML || '<br>';

          /*
           * 문단의 직접 서식 일부는 LI에 보존.
           */
          if (block.getAttribute('style')) {
            item.setAttribute('style', block.getAttribute('style'));
          }

          list.appendChild(item);
          block.remove();
          changedNodes.push(item);
        });

        run = [];
      };

      group.forEach(block => {
        if (!run.length) {
          run.push(block);
          return;
        }

        const prev = run[run.length - 1];
        let cursor = prev.nextSibling;
        let onlyIgnorable = true;

        while (cursor && cursor !== block) {
          if (
            cursor.nodeType === Node.ELEMENT_NODE ||
            (cursor.nodeType === Node.TEXT_NODE && cursor.nodeValue.trim())
          ) {
            onlyIgnorable = false;
            break;
          }
          cursor = cursor.nextSibling;
        }

        if (cursor === block && onlyIgnorable) {
          run.push(block);
        } else {
          flush();
          run.push(block);
        }
      });

      flush();
    });

    if (!changedNodes.length) return;

    SimpleDoc.Selection?.restoreSelectionAround?.(changedNodes);
    SimpleDoc.Boundary?.upgrade?.(SimpleDoc.getActivePage?.());
    Tools.afterChange();
  };

  /* =========================================================
     DELETE
  ========================================================= */

  Tools.erase = function() {
    const range = Tools.getRange();
    if (!range) return;

    if (!range.collapsed) {
      const deleted = SimpleDoc.Selection?.deleteSelection?.(range);
      if (!deleted) {
        Tools.message('선택 영역을 삭제할 수 없습니다');
      }
      return;
    }

    /* 개체가 명시적으로 선택된 경우 개체 삭제 */
    if (SimpleDoc.Objects?.selected?.isConnected) {
      SimpleDoc.Objects.deleteSelectedObject?.();
      return;
    }

    if (SimpleDoc.Objects?.shouldBlockDelete?.('forward')) {
      return;
    }

    try {
      document.execCommand('forwardDelete', false, null);
    } catch {}

    const host =
      SimpleDoc.Selection?.nodeElement?.(range.startContainer)
        ?.closest?.(SimpleDoc.Selection?.PROTECTED_HOST_SELECTOR || '');

    if (host) {
      SimpleDoc.Objects?.ensureNotEmpty?.(host);
    }

    Tools.afterChange();
  };

  /* =========================================================
     INSERT TEXT / SYMBOL
  ========================================================= */

  Tools.insertText = function(text) {
    let range = Tools.getRange();
    if (!range) return;

    if (!range.collapsed) {
      const deleted = SimpleDoc.Selection?.deleteSelection?.(
        range,
        { finalize: false }
      );
      if (!deleted) return;
      range = SimpleDoc.Selection?.getSavedRange?.();
      if (!range) return;
    }

    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);

    SimpleDoc.Selection?.restoreRange?.(range, true);
    Tools.afterChange();
  };

  /* =========================================================
     PAGE BREAK
  ========================================================= */

  Tools.directChildOf = function(node, root) {
    let el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    while (el && el.parentElement !== root) el = el.parentElement;
    return el?.parentElement === root ? el : null;
  };

  Tools.insertPageBreak = function() {
    const page = SimpleDoc.getActivePage?.();
    const editor = SimpleDoc.getActiveEditor?.();
    if (!page || !editor) return;

    let range = Tools.getRange();

    if (range && !range.collapsed) {
      const deleted = SimpleDoc.Selection?.deleteSelection?.(
        range,
        { finalize: false }
      );
      if (!deleted) return;
      range = SimpleDoc.Selection?.getSavedRange?.();
    }

    let top = range ? Tools.directChildOf(range.startContainer, editor) : null;

    const newPage = SimpleDoc.createPage(
      '<p class="doc-body"><br></p>',
      false,
      { auto: false, after: page }
    );
    const newInner = newPage.querySelector('.page-inner');
    newInner.innerHTML = '';

    if (top) {
      let next = top.nextSibling;
      while (next) {
        const moving = next;
        next = next.nextSibling;
        newInner.appendChild(moving);
      }

      const splittable = top.matches?.(
        'p.doc-body,p,h1,h2,h3,h4,li,.doc-subtitle,.doc-note'
      );

      if (splittable && range && top.contains(range.startContainer)) {
        try {
          const tail = document.createRange();
          tail.setStart(range.startContainer, range.startOffset);
          tail.setEnd(top, top.childNodes.length);
          const frag = tail.extractContents();

          const hasTail =
            (frag.textContent || '').trim() ||
            frag.querySelector?.('img,input,br,span,strong,em,u');

          if (hasTail) {
            const clone = top.cloneNode(false);
            clone.appendChild(frag);
            newInner.insertBefore(clone, newInner.firstChild);
          }

          if (!(top.textContent || '').trim() && !top.querySelector('img,input,br')) {
            top.innerHTML = '<br>';
          }
        } catch {}
      }
    } else if (range && range.startContainer === editor) {
      const index = range.startOffset;
      const nodes = [...editor.childNodes].slice(index);
      nodes.forEach(node => newInner.appendChild(node));
    }

    if (!newInner.childNodes.length) {
      newInner.innerHTML = '<p class="doc-body"><br></p>';
    }

    SimpleDoc.Boundary?.upgrade?.(newInner);
    SimpleDoc.setActivePage(newPage);

    const target =
      newInner.querySelector('[contenteditable="true"]') ||
      newInner;

    target.focus();
    const caret = document.createRange();
    caret.selectNodeContents(target);
    caret.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(caret);
    if (SimpleDoc.Selection?.saveRange) {
      SimpleDoc.Selection.saveRange(caret.cloneRange());
    } else {
      SimpleDoc.state.savedRange = caret.cloneRange();
    }

    Tools.afterChange(newPage);
    Tools.message('쪽 나누기');
  };

  /* =========================================================
     FIND / REPLACE
  ========================================================= */

  Tools.editableTextNodes = function() {
    const nodes = [];
    SimpleDoc.getPages?.().forEach(page => {
      const root = page.querySelector('.page-inner');
      if (!root) return;

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            const host = parent.closest('[contenteditable]');
            if (host?.getAttribute('contenteditable') === 'false') {
              return NodeFilter.FILTER_REJECT;
            }

            if (
              parent.closest(
                'script,style,.no-print,dialog'
              )
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let node;
      while ((node = walker.nextNode())) nodes.push(node);
    });
    return nodes;
  };

  Tools.collectMatches = function(query, matchCase = false) {
    if (!query) return [];
    const needle = matchCase ? query : query.toLocaleLowerCase('ko-KR');
    const results = [];

    Tools.editableTextNodes().forEach(node => {
      const source = matchCase
        ? node.nodeValue
        : node.nodeValue.toLocaleLowerCase('ko-KR');

      let from = 0;
      while (from <= source.length - needle.length) {
        const at = source.indexOf(needle, from);
        if (at < 0) break;
        results.push({
          node,
          start: at,
          end: at + query.length
        });
        from = at + Math.max(1, query.length);
      }
    });

    return results;
  };

  Tools.selectMatch = function(match) {
    if (!match?.node?.isConnected) return false;

    const range = document.createRange();
    range.setStart(match.node, match.start);
    range.setEnd(match.node, match.end);

    const page = match.node.parentElement?.closest('.a4-page');
    if (page) SimpleDoc.setActivePage(page);

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    if (SimpleDoc.Selection?.saveRange) {
      SimpleDoc.Selection.saveRange(range.cloneRange());
    } else {
      SimpleDoc.state.savedRange = range.cloneRange();
    }

    match.node.parentElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    return true;
  };

  Tools.syncFindState = function() {
    const query = document.getElementById('findText')?.value || '';
    const matchCase = !!document.getElementById('findMatchCase')?.checked;

    if (
      query !== Tools.findState.query ||
      matchCase !== Tools.findState.matchCase
    ) {
      Tools.findState.query = query;
      Tools.findState.matchCase = matchCase;
      Tools.findState.index = -1;
    }

    Tools.findState.matches = Tools.collectMatches(query, matchCase);
    const info = document.getElementById('findCount');
    if (info) {
      info.textContent = Tools.findState.matches.length
        ? `${Math.max(1, Tools.findState.index + 1)} / ${Tools.findState.matches.length}`
        : '0 / 0';
    }

    return Tools.findState.matches;
  };

  Tools.findNext = function(reverse = false) {
    const matches = Tools.syncFindState();
    if (!matches.length) {
      Tools.message('찾는 내용이 없습니다');
      return;
    }

    if (reverse) {
      Tools.findState.index =
        Tools.findState.index <= 0
          ? matches.length - 1
          : Tools.findState.index - 1;
    } else {
      Tools.findState.index =
        (Tools.findState.index + 1) % matches.length;
    }

    Tools.selectMatch(matches[Tools.findState.index]);
    const info = document.getElementById('findCount');
    if (info) {
      info.textContent =
        `${Tools.findState.index + 1} / ${matches.length}`;
    }
  };

  Tools.replaceCurrent = function() {
    const query = document.getElementById('findText')?.value || '';
    const replacement = document.getElementById('replaceText')?.value || '';
    if (!query) return;

    const matches = Tools.syncFindState();
    if (!matches.length) return;

    let index = Tools.findState.index;
    if (index < 0 || index >= matches.length) index = 0;
    const match = matches[index];

    if (!match?.node?.isConnected) {
      Tools.syncFindState();
      return;
    }

    match.node.nodeValue =
      match.node.nodeValue.slice(0, match.start) +
      replacement +
      match.node.nodeValue.slice(match.end);

    Tools.findState.index = -1;
    Tools.afterChange(match.node.parentElement?.closest('.a4-page'));
    Tools.findNext(false);
  };

  Tools.replaceAll = function() {
    const query = document.getElementById('findText')?.value || '';
    const replacement = document.getElementById('replaceText')?.value || '';
    const matchCase = !!document.getElementById('findMatchCase')?.checked;
    if (!query) return;

    const matches = Tools.collectMatches(query, matchCase);
    if (!matches.length) {
      Tools.message('바꿀 내용이 없습니다');
      return;
    }

    const grouped = new Map();
    matches.forEach(match => {
      if (!grouped.has(match.node)) grouped.set(match.node, []);
      grouped.get(match.node).push(match);
    });

    grouped.forEach((nodeMatches, node) => {
      nodeMatches
        .sort((a, b) => b.start - a.start)
        .forEach(match => {
          node.nodeValue =
            node.nodeValue.slice(0, match.start) +
            replacement +
            node.nodeValue.slice(match.end);
        });
    });

    Tools.findState.index = -1;
    Tools.findState.matches = [];
    Tools.afterChange();
    Tools.message(`${matches.length}개 바꿈`);
    Tools.syncFindState();
  };

  Tools.openFind = function(replaceMode = false) {
    const dialog = document.getElementById('findDialog');
    if (!dialog) return;

    Tools.findState.replaceMode = replaceMode;
    dialog.classList.toggle('replace-mode', replaceMode);

    const title = dialog.querySelector('.dialog-title');
    if (title) title.textContent = replaceMode ? '찾아 바꾸기' : '찾기';

    dialog.querySelectorAll('.replace-only').forEach(element => {
      element.hidden = !replaceMode;
    });

    if (!dialog.open) dialog.showModal();

    const input = document.getElementById('findText');
    requestAnimationFrame(() => {
      input?.focus();
      input?.select();
    });
  };

  /* =========================================================
     CHARACTER / PARAGRAPH DIALOG
  ========================================================= */

  Tools.openCharacterDialog = function() {
    SimpleDoc.Selection?.capture?.();
    const range = Tools.getRange();
    const el = Tools.startElement(range);
    const cs = el ? getComputedStyle(el) : null;

    const dialog = document.getElementById('characterDialog');
    if (!dialog) return;

    const family = document.getElementById('charFont');
    if (family && cs) {
      const current = cs.fontFamily;
      const found = [...family.options].find(o =>
        current.toLowerCase().includes(
          o.textContent.toLowerCase().replace(/['"]/g, '')
        )
      );
      if (found) family.value = found.value;
    }

    const size = document.getElementById('charSize');
    if (size && cs) size.value = Math.round(parseFloat(cs.fontSize) * 72 / 96);

    const color = document.getElementById('charColor');
    if (color && cs?.color) {
      const m = cs.color.match(/\d+/g);
      if (m?.length >= 3) {
        color.value =
          '#' +
          m.slice(0, 3)
            .map(v => Number(v).toString(16).padStart(2, '0'))
            .join('');
      }
    }

    document.getElementById('charBold').checked =
      cs ? (parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === 'bold') : false;
    document.getElementById('charItalic').checked = cs?.fontStyle === 'italic';
    document.getElementById('charUnderline').checked =
      cs?.textDecorationLine?.includes('underline');

    const spacing = document.getElementById('charSpacing');
    if (spacing) {
      let px = parseFloat(cs?.letterSpacing || '0');
      if (!Number.isFinite(px)) px = 0;
      spacing.value = (px * 72 / 96).toFixed(2);
    }

    if (!dialog.open) dialog.showModal();
  };

  Tools.applyCharacterDialog = function() {
    const style = {
      fontFamily: document.getElementById('charFont').value,
      fontSize: `${Math.max(1, Number(document.getElementById('charSize').value || 11))}pt`,
      color: document.getElementById('charColor').value,
      fontWeight: document.getElementById('charBold').checked ? '700' : '400',
      fontStyle: document.getElementById('charItalic').checked ? 'italic' : 'normal',
      textDecorationLine: document.getElementById('charUnderline').checked ? 'underline' : 'none',
      letterSpacing: `${Number(document.getElementById('charSpacing').value || 0)}pt`
    };

    Tools.styleSelection(style);
    document.getElementById('characterDialog')?.close();
  };

  Tools.openParagraphDialog = function() {
    SimpleDoc.Selection?.capture?.();
    const range = Tools.getRange();
    const block = Tools.getTargetBlocks(range)[0];
    const cs = block ? getComputedStyle(block) : null;

    const dialog = document.getElementById('paragraphDialog');
    if (!dialog) return;

    const pxToPt = value => ((parseFloat(value || '0') || 0) * 72 / 96).toFixed(1);

    document.getElementById('paraAlign').value = cs?.textAlign || 'left';

    let lineHeight = 1.7;
    if (cs) {
      const font = parseFloat(cs.fontSize || '16') || 16;
      lineHeight = cs.lineHeight === 'normal'
        ? 1.2
        : (parseFloat(cs.lineHeight) || (font * 1.7)) / font;
    }
    document.getElementById('paraLineHeight').value = lineHeight.toFixed(2);
    document.getElementById('paraBefore').value = pxToPt(cs?.marginTop);
    document.getElementById('paraAfter').value = pxToPt(cs?.marginBottom);
    document.getElementById('paraLeft').value = pxToPt(cs?.marginLeft);
    document.getElementById('paraRight').value = pxToPt(cs?.marginRight);
    document.getElementById('paraIndent').value = pxToPt(cs?.textIndent);

    if (!dialog.open) dialog.showModal();
  };

  Tools.applyParagraphDialog = function() {
    const style = {
      textAlign: document.getElementById('paraAlign').value,
      lineHeight: String(Math.max(0.5, Number(document.getElementById('paraLineHeight').value || 1.7))),
      marginTop: `${Number(document.getElementById('paraBefore').value || 0)}pt`,
      marginBottom: `${Number(document.getElementById('paraAfter').value || 0)}pt`,
      marginLeft: `${Number(document.getElementById('paraLeft').value || 0)}pt`,
      marginRight: `${Number(document.getElementById('paraRight').value || 0)}pt`,
      textIndent: `${Number(document.getElementById('paraIndent').value || 0)}pt`
    };

    Tools.blockStyle(style);
    document.getElementById('paragraphDialog')?.close();
  };

  /* =========================================================
     SYMBOLS
  ========================================================= */

  Tools.openSymbolDialog = function() {
    SimpleDoc.Selection?.capture?.();
    const dialog = document.getElementById('symbolDialog');
    if (!dialog?.open) dialog?.showModal();
  };

  /* =========================================================
     TABLE KEYBOARD HELPERS
  ========================================================= */

  Tools.currentCell = function() {
    const range = Tools.getRange();
    const el = Tools.startElement(range);
    return el?.closest?.('td,th') || SimpleDoc.Table?.anchor || null;
  };

  Tools.ensureTableSelection = function() {
    const cell = Tools.currentCell();
    if (!cell) return null;
    if (SimpleDoc.Table?.anchor !== cell) {
      SimpleDoc.Table?.select?.(cell);
    }
    return cell;
  };

  Tools.moveTableCell = function(direction) {
    const cell = Tools.currentCell();
    const table = cell?.closest('table.editor-table');
    if (!cell || !table) return false;

    const editors = [...table.querySelectorAll('.cell-editor')];
    const currentEditor = cell.querySelector('.cell-editor');
    let index = editors.indexOf(currentEditor);
    if (index < 0) return false;

    let targetIndex = index + direction;

    if (targetIndex >= editors.length && direction > 0) {
      SimpleDoc.Table.select(cell);
      SimpleDoc.Table.addRow('below');
      const updated = [...table.querySelectorAll('.cell-editor')];
      targetIndex = Math.min(index + 1, updated.length - 1);
      const target = updated[targetIndex];
      target?.focus();
      if (target) SimpleDoc.placeCaretAtEnd(target);
      return true;
    }

    targetIndex = Math.max(0, Math.min(editors.length - 1, targetIndex));
    const target = editors[targetIndex];
    target?.focus();

    if (target) {
      const r = document.createRange();
      r.selectNodeContents(target);
      r.collapse(direction < 0 ? false : true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      if (SimpleDoc.Selection?.saveRange) {
        SimpleDoc.Selection.saveRange(r.cloneRange());
      } else {
        if (SimpleDoc.Selection?.saveRange) {
      SimpleDoc.Selection.saveRange(r.cloneRange());
    } else {
      SimpleDoc.state.savedRange = r.cloneRange();
    }
      }
      SimpleDoc.Table.select(target.closest('td,th'));
    }

    return true;
  };

  Tools.exitTable = function() {
    const cell = Tools.currentCell();
    const wrap = cell?.closest('.editor-table-wrap');
    if (!wrap) return false;

    let next = wrap.nextElementSibling;
    if (!next || !next.matches('p,.doc-body')) {
      next = document.createElement('p');
      next.className = 'doc-body';
      next.innerHTML = '<br>';
      wrap.insertAdjacentElement('afterend', next);
    }

    next.focus?.();
    const r = document.createRange();
    r.selectNodeContents(next);
    r.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    SimpleDoc.state.savedRange = r.cloneRange();
    return true;
  };

  Tools.openTableAction = function(mode) {
    const cell = Tools.ensureTableSelection();
    if (!cell) {
      Tools.message('표 안에서 실행하세요');
      return;
    }

    const dialog = document.getElementById('tableActionDialog');
    dialog.dataset.mode = mode;
    dialog.querySelector('.dialog-title').textContent =
      mode === 'insert' ? '줄/칸 추가하기' : '줄/칸 지우기';

    dialog.querySelectorAll('[data-table-insert]').forEach(el => {
      el.hidden = mode !== 'insert';
    });
    dialog.querySelectorAll('[data-table-delete]').forEach(el => {
      el.hidden = mode !== 'delete';
    });

    if (!dialog.open) dialog.showModal();
  };

  /* =========================================================
     ZOOM
  ========================================================= */

  Tools.setZoom = function(percent) {
    const input = document.getElementById('zoomRange');
    if (!input) return;
    const value = Math.max(Number(input.min || 55), Math.min(Number(input.max || 130), percent));
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  /* =========================================================
     DOCUMENT STATS
  ========================================================= */

  Tools.updateStats = function() {
    const text = SimpleDoc.getPages?.()
      .map(page => page.querySelector('.page-inner')?.innerText || '')
      .join('\n');

    const chars = text.replace(/\s/g, '').length;
    const charsWithSpaces = text.length;
    const words = (text.trim().match(/[^\s]+/g) || []).length;

    const el = document.getElementById('docStats');
    if (el) {
      el.textContent = `글자 ${chars.toLocaleString()} · 공백포함 ${charsWithSpaces.toLocaleString()} · 단어 ${words.toLocaleString()}`;
    }
  };

  Tools.scheduleStats = function() {
    clearTimeout(Tools.statsTimer);
    Tools.statsTimer = setTimeout(Tools.updateStats, 150);
  };

  /* =========================================================
     AUTOSAVE
  ========================================================= */

  Tools.performAutosave = function() {
    try {
      const data = SimpleDoc.Storage?.getDocumentData?.();
      if (!data) return;
      localStorage.setItem('simpledoc-autosave', JSON.stringify(data));
      Tools.message('자동저장됨', 900);
    } catch (error) {
      console.warn('[SimpleDoc autosave]', error);
    }
  };

  Tools.scheduleAutosave = function() {
    clearTimeout(Tools.autosaveTimer);
    Tools.autosaveTimer = setTimeout(Tools.performAutosave, 1200);
  };

  Tools.maybeRestoreAutosave = function() {
    try {
      const raw = localStorage.getItem('simpledoc-autosave');
      if (!raw) return;

      const data = JSON.parse(raw);
      if (!Array.isArray(data.pages) || !data.pages.length) return;

      if (sessionStorage.getItem('simpledoc-autosave-asked') === data.savedAt) return;
      sessionStorage.setItem('simpledoc-autosave-asked', data.savedAt || '1');

      const when = data.savedAt
        ? new Date(data.savedAt).toLocaleString('ko-KR')
        : '이전 작업';

      const title = data.title || '자동저장 문서';

      if (confirm(`자동저장된 문서가 있습니다.\n\n${title}\n${when}\n\n이 문서를 복원할까요?`)) {
        if (SimpleDoc.Storage.restoreAutosave()) {
          Tools.updateStats();
          Tools.message('자동저장 문서 복원됨');
        }
      }
    } catch {}
  };

  /* =========================================================
     UI
  ========================================================= */

  Tools.injectStyles = function() {
    if (document.getElementById('simpledoc-tools-style')) return;

    const style = document.createElement('style');
    style.id = 'simpledoc-tools-style';
    style.textContent = `
      .tool-btn.text-icon {
        width:auto;
        min-width:32px;
        padding:0 7px;
        font-size:11px;
      }

      .tool-btn sup,
      .tool-btn sub {
        font-size:8px;
      }

      .status-left {
        display:flex;
        align-items:center;
        gap:12px;
        min-width:0;
      }

      #docStats {
        color:var(--text-muted);
        white-space:nowrap;
      }

      .simpledoc-wide-dialog {
        width:min(620px, calc(100% - 30px));
        max-height:min(760px, calc(100vh - 30px));
        overflow:auto;
      }

      .simpledoc-dialog-body {
        padding:20px 22px 22px;
      }

      .simpledoc-form-grid {
        display:grid;
        grid-template-columns:repeat(2, minmax(0,1fr));
        gap:12px 14px;
      }

      .simpledoc-form-grid.three {
        grid-template-columns:repeat(3, minmax(0,1fr));
      }

      .simpledoc-field {
        display:grid;
        gap:6px;
        font-size:11px;
        color:var(--text-sub);
      }

      .simpledoc-field input,
      .simpledoc-field select {
        width:100%;
        height:36px;
        border:1px solid var(--border-strong);
        border-radius:8px;
        padding:0 9px;
        background:#fff;
        color:var(--ink);
      }

      .simpledoc-checks {
        display:flex;
        flex-wrap:wrap;
        gap:12px 18px;
        margin-top:14px;
        font-size:12px;
        color:var(--text-sub);
      }

      .find-row {
        display:grid;
        grid-template-columns:92px 1fr;
        align-items:center;
        gap:8px;
        margin-bottom:10px;
      }

      .find-row label {
        font-size:11px;
        color:var(--text-sub);
      }

      .find-row input[type="text"] {
        height:36px;
        border:1px solid var(--border-strong);
        border-radius:8px;
        padding:0 10px;
      }

      .find-footer {
        display:flex;
        gap:8px;
        align-items:center;
        justify-content:flex-end;
        flex-wrap:wrap;
        margin-top:14px;
      }

      #findCount {
        margin-right:auto;
        font-size:11px;
        color:var(--text-muted);
      }

      .symbol-grid {
        display:grid;
        grid-template-columns:repeat(10, 1fr);
        gap:6px;
      }

      .symbol-btn {
        height:34px;
        border:1px solid var(--border);
        border-radius:7px;
        background:#fff;
        cursor:pointer;
        font-size:17px;
      }

      .symbol-btn:hover {
        background:var(--blue-pale);
        border-color:var(--blue-mid);
      }

      .shortcut-table {
        width:100%;
        border-collapse:collapse;
        font-size:12px;
      }

      .shortcut-table th,
      .shortcut-table td {
        border-bottom:1px solid var(--border);
        padding:8px 9px;
        text-align:left;
        vertical-align:top;
      }

      .shortcut-table th {
        background:var(--blue-pale);
        color:var(--blue-deep);
      }

      .shortcut-key {
        font-family:Consolas, monospace;
        white-space:nowrap;
        color:var(--blue-deep);
        font-weight:700;
      }

      .shortcut-section td {
        padding-top:15px;
        color:var(--blue-deep);
        font-weight:800;
        background:#fbfdfe;
      }

      .table-action-grid {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
      }

      @media (max-width:640px) {
        .simpledoc-form-grid,
        .simpledoc-form-grid.three {
          grid-template-columns:1fr;
        }

        .symbol-grid {
          grid-template-columns:repeat(6, 1fr);
        }

        #docStats {
          display:none;
        }
      }
    `;
    document.head.appendChild(style);
  };

  Tools.injectToolbar = function() {
    const underline = document.getElementById('underlineBtn');
    const charGroup = underline?.closest('.tool-group');

    if (charGroup && !document.getElementById('superscriptBtn')) {
      const sup = document.createElement('button');
      sup.className = 'tool-btn';
      sup.id = 'superscriptBtn';
      sup.type = 'button';
      sup.title = '위 첨자 (Alt+Shift+P)';
      sup.innerHTML = 'x<sup>2</sup>';

      const sub = document.createElement('button');
      sub.className = 'tool-btn';
      sub.id = 'subscriptBtn';
      sub.type = 'button';
      sub.title = '아래 첨자 (Alt+Shift+S)';
      sub.innerHTML = 'x<sub>2</sub>';

      const clear = document.createElement('button');
      clear.className = 'tool-btn text-icon';
      clear.id = 'clearFormatBtn';
      clear.type = 'button';
      clear.title = '보통 모양 (Alt+Shift+C)';
      clear.textContent = '기본';

      charGroup.append(sup, sub, clear);
    }

    const paragraph = document.querySelector('.paragraph-tools');
    if (paragraph && !document.getElementById('bulletBtn')) {
      const num = document.createElement('button');
      num.className = 'tool-btn text-icon';
      num.id = 'numberBtn';
      num.type = 'button';
      num.title = '번호 매기기 (Ctrl+Shift+Insert)';
      num.textContent = '1.';

      const bullet = document.createElement('button');
      bullet.className = 'tool-btn text-icon';
      bullet.id = 'bulletBtn';
      bullet.type = 'button';
      bullet.title = '글머리표 (Ctrl+Shift+Delete)';
      bullet.textContent = '•';

      paragraph.append(num, bullet);
    }

    const undo = document.getElementById('undoBtn')?.closest('.tool-group');
    if (undo && !document.getElementById('findBtn')) {
      const find = document.createElement('button');
      find.className = 'btn compact';
      find.id = 'findBtn';
      find.type = 'button';
      find.title = '찾기 (Ctrl+F / F2)';
      find.textContent = '찾기';
      undo.parentElement.insertBefore(find, undo);
    }

    const actions = document.querySelector('.header-actions');
    if (actions && !document.getElementById('shortcutHelpBtn')) {
      const btn = document.createElement('button');
      btn.className = 'btn ghost';
      btn.id = 'shortcutHelpBtn';
      btn.type = 'button';
      btn.textContent = '단축키';
      btn.title = '한/글 호환 단축키';
      const docx = document.getElementById('docxBtn');
      actions.insertBefore(btn, docx);
    }

    const copyBtn = document.getElementById('formatCopyBtn');
    const pasteBtn = document.getElementById('formatPasteBtn');
    if (copyBtn) {
      copyBtn.textContent = '모양 복사';
      copyBtn.title = '모양 복사 (Alt+C)';
    }
    if (pasteBtn) {
      pasteBtn.textContent = '모양 붙이기';
      pasteBtn.title = '복사한 모양 붙이기 (대상 선택 후 Alt+C)';
    }

    const brand = document.querySelector('.brand-subtitle');
    if (brand) brand.textContent = 'A4 문서 편집기 · v9 · 한/글 단축키';
  };

  Tools.injectStatus = function() {
    const status = document.querySelector('.statusbar > div:first-child');
    if (!status || document.getElementById('docStats')) return;
    status.classList.add('status-left');

    const stats = document.createElement('span');
    stats.id = 'docStats';
    stats.textContent = '글자 0 · 단어 0';
    status.appendChild(stats);
  };

  Tools.injectDialogs = function() {
    if (document.getElementById('findDialog')) return;

    const symbols = [
      '※','●','○','■','□','◆','◇','▲','△','▼',
      '▽','▶','▷','◀','◁','★','☆','✓','✔','✕',
      '→','←','↑','↓','↔','⇒','⇔','①','②','③',
      '④','⑤','⑥','⑦','⑧','⑨','⑩','㉠','㉡','㉢',
      '㉣','㉤','㈜','☎','㎜','㎝','㎡','㎥','℃','±',
      '×','÷','≠','≤','≥','∞','∴','∵','§','※'
    ];

    const shortcutRows = [
      ['파일', '', ''],
      ['새 문서', 'Alt+N', '한/글'],
      ['불러오기', 'Alt+O', '한/글'],
      ['저장하기', 'Alt+S / Ctrl+S', '한/글'],
      ['다른 이름으로 저장', 'Alt+V', '한/글'],
      ['인쇄/PDF 출력', 'Alt+P / Ctrl+P', '한/글'],
      ['편집', '', ''],
      ['되돌리기', 'Ctrl+Z', '한/글'],
      ['다시 실행', 'Ctrl+Shift+Z', '한/글'],
      ['찾기', 'Ctrl+F / F2 / Ctrl+Q,F', '한/글'],
      ['찾아 바꾸기', 'Ctrl+H / Ctrl+F2 / Ctrl+Q,A', '한/글'],
      ['다시 찾기', 'Ctrl+L', '한/글'],
      ['거꾸로 찾기', 'Ctrl+Q,L', '한/글'],
      ['지우기', 'Ctrl+E', '한/글'],
      ['서식', '', ''],
      ['글자 모양', 'Alt+L', '한/글'],
      ['문단 모양', 'Alt+T', '한/글'],
      ['모양 복사/붙이기', 'Alt+C', '한/글'],
      ['진하게', 'Alt+Shift+B / Ctrl+B', '한/글'],
      ['기울임', 'Alt+Shift+I / Ctrl+I', '한/글'],
      ['밑줄', 'Alt+Shift+U / Ctrl+U', '한/글'],
      ['위 첨자', 'Alt+Shift+P', '한/글'],
      ['아래 첨자', 'Alt+Shift+S', '한/글'],
      ['보통 모양', 'Alt+Shift+C', '한/글'],
      ['글자 크게/작게', 'Alt+Shift+E / Alt+Shift+R', '한/글'],
      ['자간 넓게/좁게', 'Alt+Shift+W / Alt+Shift+N', '한/글'],
      ['줄 간격 넓게/좁게', 'Alt+Shift+Z / Alt+Shift+A', '한/글'],
      ['왼쪽/가운데/오른쪽/양쪽 정렬', 'Ctrl+Shift+L/C/R/M', '한/글'],
      ['첫 줄 내어쓰기/들여쓰기', 'Ctrl+F5 / Ctrl+F6', '한/글'],
      ['글머리표', 'Ctrl+Shift+Delete', '한/글'],
      ['번호 매기기', 'Ctrl+Shift+Insert', '한/글'],
      ['입력/쪽', '', ''],
      ['표 만들기', 'Ctrl+N,T', '한/글'],
      ['그림 넣기', 'Ctrl+N,I', '한/글'],
      ['글상자', 'Ctrl+N,B', '한/글'],
      ['문자표', 'Ctrl+F10', '한/글'],
      ['쪽 나누기', 'Ctrl+Enter / Ctrl+J', '한/글'],
      ['표 안 다음/이전 셀', 'Tab / Shift+Tab', '한/글'],
      ['표 줄 추가', 'Ctrl+Enter', '한/글 표 편집'],
      ['표 줄 삭제', 'Ctrl+Backspace', '한/글 표 편집'],
      ['줄/칸 추가', 'Alt+Insert', '한/글 표 편집'],
      ['줄/칸 삭제', 'Alt+Delete', '한/글 표 편집'],
      ['표 빠져나가기', 'Shift+Esc', '한/글 표 편집'],
      ['보기', '', ''],
      ['쪽 맞춤', 'Ctrl+G,P', '한/글'],
      ['폭 맞춤', 'Ctrl+G,W', '한/글'],
      ['100%', 'Ctrl+G,Q', '한/글']
    ];

    const shortcutHtml = shortcutRows.map(row => {
      if (!row[1]) {
        return `<tr class="shortcut-section"><td colspan="3">${row[0]}</td></tr>`;
      }
      return `<tr><td>${row[0]}</td><td class="shortcut-key">${row[1]}</td><td>${row[2]}</td></tr>`;
    }).join('');

    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="findDialog" class="dialog simpledoc-wide-dialog no-print">
        <div class="simpledoc-dialog-body">
          <div class="dialog-title">찾기</div>
          <div class="find-row">
            <label for="findText">찾을 내용</label>
            <input id="findText" type="text" autocomplete="off">
          </div>
          <div class="find-row replace-only" hidden>
            <label for="replaceText">바꿀 내용</label>
            <input id="replaceText" type="text" autocomplete="off">
          </div>
          <label class="dialog-check">
            <input id="findMatchCase" type="checkbox"> 대/소문자 구분
          </label>
          <div class="find-footer">
            <span id="findCount">0 / 0</span>
            <button class="btn ghost" id="findPrevBtn" type="button">이전</button>
            <button class="btn ghost" id="findNextBtn" type="button">다음</button>
            <button class="btn ghost replace-only" id="replaceOneBtn" type="button" hidden>바꾸기</button>
            <button class="btn primary replace-only" id="replaceAllBtn" type="button" hidden>모두 바꾸기</button>
            <button class="btn ghost" data-close-dialog="findDialog" type="button">닫기</button>
          </div>
        </div>
      </dialog>

      <dialog id="characterDialog" class="dialog simpledoc-wide-dialog no-print">
        <div class="simpledoc-dialog-body">
          <div class="dialog-title">글자 모양</div>
          <div class="simpledoc-form-grid three">
            <label class="simpledoc-field">글꼴
              <select id="charFont">
                <option value="Pretendard, 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">Pretendard</option>
                <option value="'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">Noto Sans KR</option>
                <option value="'Malgun Gothic', sans-serif">맑은 고딕</option>
                <option value="Batang, serif">바탕</option>
                <option value="Gulim, sans-serif">굴림</option>
                <option value="Dotum, sans-serif">돋움</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
              </select>
            </label>
            <label class="simpledoc-field">크기(pt)
              <input id="charSize" type="number" min="1" max="200" step="0.5" value="11">
            </label>
            <label class="simpledoc-field">자간(pt)
              <input id="charSpacing" type="number" min="-10" max="50" step="0.1" value="0">
            </label>
            <label class="simpledoc-field">글자색
              <input id="charColor" type="color" value="#34434d">
            </label>
          </div>
          <div class="simpledoc-checks">
            <label><input id="charBold" type="checkbox"> 진하게</label>
            <label><input id="charItalic" type="checkbox"> 기울임</label>
            <label><input id="charUnderline" type="checkbox"> 밑줄</label>
          </div>
          <div class="dialog-actions">
            <button class="btn ghost" data-close-dialog="characterDialog" type="button">취소</button>
            <button class="btn primary" id="applyCharacterBtn" type="button">적용</button>
          </div>
        </div>
      </dialog>

      <dialog id="paragraphDialog" class="dialog simpledoc-wide-dialog no-print">
        <div class="simpledoc-dialog-body">
          <div class="dialog-title">문단 모양</div>
          <div class="simpledoc-form-grid three">
            <label class="simpledoc-field">정렬
              <select id="paraAlign">
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
                <option value="justify">양쪽</option>
              </select>
            </label>
            <label class="simpledoc-field">줄 간격
              <input id="paraLineHeight" type="number" min="0.5" max="5" step="0.05" value="1.7">
            </label>
            <label class="simpledoc-field">문단 앞(pt)
              <input id="paraBefore" type="number" min="0" max="200" step="1" value="0">
            </label>
            <label class="simpledoc-field">문단 뒤(pt)
              <input id="paraAfter" type="number" min="0" max="200" step="1" value="6">
            </label>
            <label class="simpledoc-field">왼쪽 여백(pt)
              <input id="paraLeft" type="number" min="0" max="500" step="1" value="0">
            </label>
            <label class="simpledoc-field">오른쪽 여백(pt)
              <input id="paraRight" type="number" min="0" max="500" step="1" value="0">
            </label>
            <label class="simpledoc-field">첫 줄 들여쓰기(pt)
              <input id="paraIndent" type="number" min="-300" max="300" step="1" value="0">
            </label>
          </div>
          <div class="dialog-actions">
            <button class="btn ghost" data-close-dialog="paragraphDialog" type="button">취소</button>
            <button class="btn primary" id="applyParagraphBtn" type="button">적용</button>
          </div>
        </div>
      </dialog>

      <dialog id="symbolDialog" class="dialog simpledoc-wide-dialog no-print">
        <div class="simpledoc-dialog-body">
          <div class="dialog-title">문자표</div>
          <div class="symbol-grid">
            ${symbols.map(s => `<button class="symbol-btn" type="button" data-symbol="${s}">${s}</button>`).join('')}
          </div>
          <div class="dialog-actions">
            <button class="btn ghost" data-close-dialog="symbolDialog" type="button">닫기</button>
          </div>
        </div>
      </dialog>

      <dialog id="tableActionDialog" class="dialog no-print">
        <div class="simpledoc-dialog-body">
          <div class="dialog-title">줄/칸 추가하기</div>
          <div class="table-action-grid">
            <button class="btn ghost" data-table-insert="rowAbove" type="button">행 위 추가</button>
            <button class="btn ghost" data-table-insert="rowBelow" type="button">행 아래 추가</button>
            <button class="btn ghost" data-table-insert="colLeft" type="button">열 왼쪽 추가</button>
            <button class="btn ghost" data-table-insert="colRight" type="button">열 오른쪽 추가</button>
            <button class="btn ghost" data-table-delete="row" type="button" hidden>현재 행 삭제</button>
            <button class="btn ghost" data-table-delete="col" type="button" hidden>현재 열 삭제</button>
          </div>
          <div class="dialog-actions">
            <button class="btn ghost" data-close-dialog="tableActionDialog" type="button">취소</button>
          </div>
        </div>
      </dialog>

      <dialog id="shortcutDialog" class="dialog simpledoc-wide-dialog no-print">
        <div class="simpledoc-dialog-body">
          <div class="dialog-title">한/글 호환 단축키</div>
          <table class="shortcut-table">
            <thead><tr><th>기능</th><th>단축키</th><th>기준</th></tr></thead>
            <tbody>${shortcutHtml}</tbody>
          </table>
          <div class="dialog-actions">
            <button class="btn primary" data-close-dialog="shortcutDialog" type="button">닫기</button>
          </div>
        </div>
      </dialog>
    `);
  };

  Tools.bindUI = function() {
    const preventMouseDown = selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.addEventListener('mousedown', e => e.preventDefault());
      });
    };

    preventMouseDown('#superscriptBtn,#subscriptBtn,#clearFormatBtn,#numberBtn,#bulletBtn,#findBtn');

    document.getElementById('superscriptBtn')?.addEventListener('click', Tools.toggleSuperscript);
    document.getElementById('subscriptBtn')?.addEventListener('click', Tools.toggleSubscript);
    document.getElementById('clearFormatBtn')?.addEventListener('click', Tools.clearCharacterFormatting);
    document.getElementById('numberBtn')?.addEventListener('click', () => Tools.toggleList('ordered'));
    document.getElementById('bulletBtn')?.addEventListener('click', () => Tools.toggleList('unordered'));
    document.getElementById('findBtn')?.addEventListener('click', () => Tools.openFind(false));
    document.getElementById('shortcutHelpBtn')?.addEventListener('click', () => {
      document.getElementById('shortcutDialog')?.showModal();
    });

    document.getElementById('findNextBtn')?.addEventListener('click', () => Tools.findNext(false));
    document.getElementById('findPrevBtn')?.addEventListener('click', () => Tools.findNext(true));
    document.getElementById('replaceOneBtn')?.addEventListener('click', Tools.replaceCurrent);
    document.getElementById('replaceAllBtn')?.addEventListener('click', Tools.replaceAll);

    document.getElementById('findText')?.addEventListener('input', () => {
      Tools.findState.index = -1;
      Tools.syncFindState();
    });
    document.getElementById('findMatchCase')?.addEventListener('change', () => {
      Tools.findState.index = -1;
      Tools.syncFindState();
    });

    document.getElementById('applyCharacterBtn')?.addEventListener('click', Tools.applyCharacterDialog);
    document.getElementById('applyParagraphBtn')?.addEventListener('click', Tools.applyParagraphDialog);

    document.querySelectorAll('[data-symbol]').forEach(btn => {
      btn.addEventListener('click', () => {
        Tools.insertText(btn.dataset.symbol || '');
        document.getElementById('symbolDialog')?.close();
      });
    });

    document.querySelectorAll('[data-close-dialog]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.closeDialog)?.close();
      });
    });

    document.querySelectorAll('[data-table-insert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.tableInsert;
        if (action === 'rowAbove') SimpleDoc.Table.addRow('above');
        if (action === 'rowBelow') SimpleDoc.Table.addRow('below');
        if (action === 'colLeft') SimpleDoc.Table.addColumn('left');
        if (action === 'colRight') SimpleDoc.Table.addColumn('right');
        document.getElementById('tableActionDialog')?.close();
      });
    });

    document.querySelectorAll('[data-table-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tableDelete === 'row') SimpleDoc.Table.deleteRow();
        if (btn.dataset.tableDelete === 'col') SimpleDoc.Table.deleteColumn();
        document.getElementById('tableActionDialog')?.close();
      });
    });

    document.getElementById('findDialog')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey) Tools.findNext(true);
        else Tools.findNext(false);
      }
    });

    const root = document.getElementById('documentRoot');
    root?.addEventListener('input', () => {
      Tools.scheduleStats();
      Tools.scheduleAutosave();
    }, true);
    root?.addEventListener('change', () => {
      Tools.scheduleStats();
      Tools.scheduleAutosave();
    }, true);

    document.getElementById('docTitle')?.addEventListener('input', Tools.scheduleAutosave);

    window.addEventListener('focus', Tools.scheduleStats);
  };

  document.addEventListener('DOMContentLoaded', () => {
    Tools.injectStyles();
    Tools.injectToolbar();
    Tools.injectStatus();
    Tools.injectDialogs();
    Tools.bindUI();
    Tools.updateStats();

    setTimeout(Tools.maybeRestoreAutosave, 200);
  });
})();
