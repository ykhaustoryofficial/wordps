window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.HWP = SimpleDoc.HWP || {};

(() => {
  const HWP = SimpleDoc.HWP;
  HWP.prefix = null;
  HWP.prefixTimer = null;
  HWP.formatReady = false;
  HWP.tableBlockMode = false;

  const prevent = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const key = event => (event.key || '').toLowerCase();

  const isDialogInput = target =>
    !!target?.closest?.('dialog') &&
    !!target?.matches?.('input,textarea,select');

  const inEditor = () => {
    const sel = window.getSelection();
    const editor = SimpleDoc.getActiveEditor?.();
    return !!(
      editor &&
      sel?.rangeCount &&
      editor.contains(sel.getRangeAt(0).commonAncestorContainer)
    );
  };

  const inTable = () => !!SimpleDoc.Tools?.currentCell?.();

  const setPrefix = (name, event) => {
    prevent(event);
    HWP.prefix = name;
    clearTimeout(HWP.prefixTimer);
    HWP.prefixTimer = setTimeout(() => {
      HWP.prefix = null;
    }, 1600);
    SimpleDoc.Tools?.message?.(`${name.replace('ctrl+', 'Ctrl+').toUpperCase()} …`);
  };

  const consumePrefix = event => {
    if (!HWP.prefix) return false;

    const prefix = HWP.prefix;
    HWP.prefix = null;
    clearTimeout(HWP.prefixTimer);

    const k = key(event);

    if (prefix === 'ctrl+q') {
      if (k === 'f') {
        prevent(event);
        SimpleDoc.Tools.openFind(false);
        return true;
      }
      if (k === 'a') {
        prevent(event);
        SimpleDoc.Tools.openFind(true);
        return true;
      }
      if (k === 'l') {
        prevent(event);
        SimpleDoc.Tools.findNext(true);
        return true;
      }
    }

    if (prefix === 'ctrl+n') {
      if (k === 't') {
        prevent(event);
        SimpleDoc.Selection?.capture?.();
        document.getElementById('tableDialog')?.showModal();
        return true;
      }
      if (k === 'i') {
        prevent(event);
        SimpleDoc.Selection?.capture?.();
        document.getElementById('imageFileInput')?.click();
        return true;
      }
      if (k === 'b') {
        prevent(event);
        SimpleDoc.Selection?.capture?.();
        SimpleDoc.Textbox?.insert?.();
        return true;
      }
    }

    if (prefix === 'ctrl+m') {
      const colors = {
        k: '#000000',
        r: '#ff0000',
        b: '#0000ff',
        d: '#800080',
        g: '#008000',
        y: '#ffff00',
        c: '#00a6a6',
        w: '#ffffff'
      };

      if (colors[k]) {
        prevent(event);
        SimpleDoc.Tools.setTextColor(colors[k]);
        return true;
      }
    }

    if (prefix === 'ctrl+g') {
      if (k === 'p') {
        prevent(event);
        SimpleDoc.Tools.setZoom(85);
        SimpleDoc.Tools.message('쪽 맞춤');
        return true;
      }
      if (k === 'w') {
        prevent(event);
        SimpleDoc.Tools.setZoom(110);
        SimpleDoc.Tools.message('폭 맞춤');
        return true;
      }
      if (k === 'q') {
        prevent(event);
        SimpleDoc.Tools.setZoom(100);
        SimpleDoc.Tools.message('화면 확대 100%');
        return true;
      }
    }

    return false;
  };

  const toggleButton = id => {
    SimpleDoc.Selection?.capture?.();
    document.getElementById(id)?.click();
  };

  const handleAltShift = event => {
    if (!(event.altKey && event.shiftKey) || event.ctrlKey || event.metaKey) return false;
    const k = key(event);

    const actions = {
      b: () => toggleButton('boldBtn'),
      i: () => toggleButton('italicBtn'),
      u: () => toggleButton('underlineBtn'),
      p: () => SimpleDoc.Tools.toggleSuperscript(),
      s: () => SimpleDoc.Tools.toggleSubscript(),
      c: () => SimpleDoc.Tools.clearCharacterFormatting(),
      e: () => SimpleDoc.Tools.adjustFontSize(1),
      r: () => SimpleDoc.Tools.adjustFontSize(-1),
      w: () => SimpleDoc.Tools.adjustLetterSpacing(0.1),
      n: () => SimpleDoc.Tools.adjustLetterSpacing(-0.1),
      z: () => SimpleDoc.Tools.adjustLineHeight(0.1),
      a: () => SimpleDoc.Tools.adjustLineHeight(-0.1),
      arrowleft: () => SimpleDoc.Tools.shiftParagraph(-1),
      arrowright: () => SimpleDoc.Tools.shiftParagraph(1)
    };

    if (actions[k]) {
      prevent(event);
      actions[k]();
      return true;
    }
    return false;
  };

  const handleAlt = event => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
    const k = key(event);

    if (k === 'n') {
      prevent(event);
      document.getElementById('newDocBtn')?.click();
      return true;
    }

    if (k === 'o') {
      prevent(event);
      document.getElementById('loadFileInput')?.click();
      return true;
    }

    if (k === 's') {
      prevent(event);
      SimpleDoc.Storage?.download?.();
      return true;
    }

    if (k === 'v') {
      prevent(event);
      SimpleDoc.Storage?.download?.();
      SimpleDoc.Tools?.message?.('다른 이름으로 저장');
      return true;
    }

    if (k === 'p') {
      prevent(event);
      SimpleDoc.Print?.run?.();
      return true;
    }

    if (k === 'l') {
      prevent(event);
      SimpleDoc.Tools?.openCharacterDialog?.();
      return true;
    }

    if (k === 't') {
      prevent(event);
      SimpleDoc.Tools?.openParagraphDialog?.();
      return true;
    }

    if (k === 'c') {
      prevent(event);

      SimpleDoc.Selection?.capture?.();
      const range = SimpleDoc.Tools?.getRange?.();

      if (HWP.formatReady && range && !range.collapsed) {
        const pasted = SimpleDoc.Format?.paste?.();
        if (pasted !== false) {
          HWP.formatReady = false;
          SimpleDoc.Tools?.message?.('모양 붙이기');
        }
      } else {
        const copied = SimpleDoc.Format?.copy?.();
        HWP.formatReady = copied === true;
        if (HWP.formatReady) {
          SimpleDoc.Tools?.message?.('모양 복사됨 · 대상 선택 후 Alt+C');
        }
      }
      return true;
    }

    if (key(event) === 'insert' && inTable()) {
      prevent(event);
      SimpleDoc.Tools.openTableAction('insert');
      return true;
    }

    if (key(event) === 'delete' && inTable()) {
      prevent(event);
      SimpleDoc.Tools.openTableAction('delete');
      return true;
    }

    return false;
  };

  const handleCtrlShift = event => {
    if (!(event.ctrlKey && event.shiftKey) || event.altKey || event.metaKey) return false;
    const k = key(event);

    if (k === 'z') {
      prevent(event);
      SimpleDoc.redo?.();
      return true;
    }

    const align = {
      l: 'left',
      c: 'center',
      r: 'right',
      m: 'justify',
      t: 'justify'
    };

    if (align[k]) {
      prevent(event);
      SimpleDoc.Selection?.align?.(align[k]);
      return true;
    }

    if (k === 'insert') {
      prevent(event);
      SimpleDoc.Tools.toggleList('ordered');
      return true;
    }

    if (k === 'delete') {
      prevent(event);
      SimpleDoc.Tools.toggleList('unordered');
      return true;
    }

    if (k === 'g') {
      prevent(event);
      SimpleDoc.Tools.adjustBlockPt('marginLeft', 1, 0, 500);
      return true;
    }

    if (k === 'e') {
      prevent(event);
      SimpleDoc.Tools.adjustBlockPt('marginLeft', -1, 0, 500);
      return true;
    }

    if (k === 'd') {
      prevent(event);
      SimpleDoc.Tools.adjustBlockPt('marginRight', 1, 0, 500);
      return true;
    }

    if (k === 'f') {
      prevent(event);
      SimpleDoc.Tools.adjustBlockPt('marginRight', -1, 0, 500);
      return true;
    }

    return false;
  };

  const handleCtrl = event => {
    if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return false;
    const k = key(event);

    if (k === 'q') {
      setPrefix('ctrl+q', event);
      return true;
    }

    if (k === 'n') {
      setPrefix('ctrl+n', event);
      return true;
    }

    if (k === 'm') {
      setPrefix('ctrl+m', event);
      return true;
    }

    if (k === 'g') {
      setPrefix('ctrl+g', event);
      return true;
    }

    if (k === 'a') {
      prevent(event);
      SimpleDoc.Selection?.selectAllDocument?.();
      return true;
    }

    if (k === 's') {
      prevent(event);
      SimpleDoc.Storage?.download?.();
      return true;
    }

    if (k === 'p') {
      prevent(event);
      SimpleDoc.Print?.run?.();
      return true;
    }

    if (k === 'z') {
      prevent(event);
      SimpleDoc.undo?.();
      return true;
    }

    if (k === 'f') {
      prevent(event);
      SimpleDoc.Tools.openFind(false);
      return true;
    }

    if (k === 'h') {
      prevent(event);
      SimpleDoc.Tools.openFind(true);
      return true;
    }

    if (k === 'l') {
      prevent(event);
      SimpleDoc.Tools.findNext(false);
      return true;
    }

    if (k === 'e') {
      prevent(event);
      SimpleDoc.Tools.erase();
      return true;
    }

    if (k === 'b') {
      prevent(event);
      toggleButton('boldBtn');
      return true;
    }

    if (k === 'i') {
      prevent(event);
      toggleButton('italicBtn');
      return true;
    }

    if (k === 'u') {
      prevent(event);
      toggleButton('underlineBtn');
      return true;
    }

    if (k === ']') {
      prevent(event);
      SimpleDoc.Tools.adjustFontSize(1);
      return true;
    }

    if (k === '[') {
      prevent(event);
      SimpleDoc.Tools.adjustFontSize(-1);
      return true;
    }

    if (k === 'f5') {
      prevent(event);
      SimpleDoc.Tools.firstLineIndent(-1);
      return true;
    }

    if (k === 'f6') {
      prevent(event);
      SimpleDoc.Tools.firstLineIndent(1);
      return true;
    }

    if (k === 'f10') {
      prevent(event);
      SimpleDoc.Tools.openSymbolDialog();
      return true;
    }

    if (k === 'enter' || k === 'j') {
      prevent(event);

      if (inTable()) {
        SimpleDoc.Tools.ensureTableSelection();
        SimpleDoc.Table.addRow('below');
      } else {
        SimpleDoc.Tools.insertPageBreak();
      }
      return true;
    }

    if (k === 'backspace' && inTable()) {
      prevent(event);
      SimpleDoc.Tools.ensureTableSelection();
      SimpleDoc.Table.deleteRow();
      return true;
    }

    if (k === 'f2') {
      prevent(event);
      SimpleDoc.Tools.openFind(true);
      return true;
    }

    return false;
  };

  const handleFunctionKeys = event => {
    const k = key(event);

    if (k === 'f11' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      prevent(event);
      if (!SimpleDoc.Objects?.selectPreviousFromCaret?.()) {
        SimpleDoc.Tools?.message?.('현재 쪽에 선택할 개체가 없습니다');
      }
      return true;
    }

    if (k === 'f2' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      prevent(event);
      SimpleDoc.Tools.openFind(false);
      return true;
    }

    if (k === 'f5' && inTable() && !event.ctrlKey && !event.altKey && !event.metaKey) {
      prevent(event);
      const cell = SimpleDoc.Tools.ensureTableSelection();
      if (cell) {
        HWP.tableBlockMode = true;
        SimpleDoc.Tools.message('셀 블록 선택');
      }
      return true;
    }

    return false;
  };

  const handleTableNavigation = event => {
    if (!inTable()) return false;

    const k = key(event);

    if (k === 'tab') {
      prevent(event);
      SimpleDoc.Tools.moveTableCell(event.shiftKey ? -1 : 1);
      return true;
    }

    if (event.shiftKey && k === 'escape') {
      prevent(event);
      SimpleDoc.Tools.exitTable();
      HWP.tableBlockMode = false;
      return true;
    }

    if (HWP.tableBlockMode && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (k === 'm') {
        prevent(event);
        SimpleDoc.Table.mergeSelected?.();
        HWP.tableBlockMode = false;
        return true;
      }
      if (k === 's') {
        prevent(event);
        SimpleDoc.Table.splitCell?.();
        HWP.tableBlockMode = false;
        return true;
      }
    }

    return false;
  };

  const handleTabOutsideTable = event => {
    if (key(event) !== 'tab' || inTable() || !inEditor()) return false;

    prevent(event);

    if (event.shiftKey) {
      SimpleDoc.Tools.firstLineIndent(-1);
    } else {
      SimpleDoc.Tools.insertText('\u00A0\u00A0\u00A0\u00A0');
    }
    return true;
  };

  document.addEventListener('keydown', event => {
    if (consumePrefix(event)) return;

    /* Word/HWP 계열처럼 Esc로 모양 붙이기 대기 상태를 취소 */
    if (
      key(event) === 'escape' &&
      HWP.formatReady &&
      !isDialogInput(event.target)
    ) {
      prevent(event);
      HWP.formatReady = false;
      SimpleDoc.Tools?.message?.('모양 복사 취소');
      return;
    }

    if (isDialogInput(event.target)) {
      if (
        !(
          (event.ctrlKey && ['s','p'].includes(key(event))) ||
          (event.altKey && ['s','p'].includes(key(event)))
        )
      ) {
        return;
      }
    }

    if (handleTableNavigation(event)) return;
    if (handleAltShift(event)) return;
    if (handleAlt(event)) return;
    if (handleCtrlShift(event)) return;
    if (handleCtrl(event)) return;
    if (handleFunctionKeys(event)) return;
    if (handleTabOutsideTable(event)) return;

    if (event.ctrlKey && key(event) === 'f2') {
      prevent(event);
      SimpleDoc.Tools.openFind(true);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    const copyBtn = document.getElementById('formatCopyBtn');

    copyBtn?.addEventListener('click', () => {
      /* format.js의 copy 핸들러가 먼저 실행된 뒤 실제 clipboard 상태를 반영 */
      setTimeout(() => {
        HWP.formatReady = SimpleDoc.Format?.hasClipboard?.() === true;
      }, 0);
    });

    document.getElementById('formatPasteBtn')?.addEventListener('click', () => {
      HWP.formatReady = false;
    });
  });
})();
