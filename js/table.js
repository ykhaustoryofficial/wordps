window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Table = {
  anchor: null,
  focus: null,
  selected: []
};

SimpleDoc.Table.build = function(rows, cols, header) {
  let html = '<div class="editor-table-wrap"><table class="editor-table">';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      const tag = header && r === 0 ? 'th' : 'td';
      html += `<${tag}>${header && r === 0 ? `제목 ${c + 1}` : '&nbsp;'}</${tag}>`;
    }
    html += '</tr>';
  }
  html += '</table></div><p class="doc-body"><br></p>';
  return html;
};

SimpleDoc.Table.grid = function(table) {
  const grid = [];
  const rows = [...table.rows];
  rows.forEach((row, r) => {
    grid[r] ||= [];
    let c = 0;
    [...row.cells].forEach(cell => {
      while (grid[r][c]) c++;
      const rs = Math.max(1, cell.rowSpan || 1);
      const cs = Math.max(1, cell.colSpan || 1);
      const entry = { cell, row: r, col: c, rowSpan: rs, colSpan: cs };
      for (let rr = r; rr < r + rs; rr++) {
        grid[rr] ||= [];
        for (let cc = c; cc < c + cs; cc++) grid[rr][cc] = entry;
      }
      c += cs;
    });
  });
  return grid;
};

SimpleDoc.Table.info = function(cell) {
  const table = cell?.closest('table.editor-table');
  if (!table) return null;
  const grid = SimpleDoc.Table.grid(table);
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length || 0); c++) {
      const e = grid[r][c];
      if (e?.cell === cell && e.row === r && e.col === c) return { table, grid, ...e };
    }
  }
  return null;
};

SimpleDoc.Table.clearSelection = function() {
  document.querySelectorAll('.table-selected-cell').forEach(cell => cell.classList.remove('table-selected-cell'));
  SimpleDoc.Table.selected = [];
};

SimpleDoc.Table.select = function(cell, extend = false) {
  const table = cell.closest('table.editor-table');
  if (!table) return;
  if (!extend || !SimpleDoc.Table.anchor || SimpleDoc.Table.anchor.closest('table') !== table) {
    SimpleDoc.Table.anchor = cell;
    SimpleDoc.Table.focus = cell;
  } else {
    SimpleDoc.Table.focus = cell;
  }
  SimpleDoc.Table.paintSelection();
  SimpleDoc.Table.updateTools();
};

SimpleDoc.Table.paintSelection = function() {
  SimpleDoc.Table.clearSelection();
  const a = SimpleDoc.Table.info(SimpleDoc.Table.anchor);
  const b = SimpleDoc.Table.info(SimpleDoc.Table.focus);
  if (!a || !b || a.table !== b.table) return;
  const r1 = Math.min(a.row, b.row);
  const r2 = Math.max(a.row + a.rowSpan - 1, b.row + b.rowSpan - 1);
  const c1 = Math.min(a.col, b.col);
  const c2 = Math.max(a.col + a.colSpan - 1, b.col + b.colSpan - 1);
  const unique = new Set();
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const e = a.grid[r]?.[c];
      if (e?.cell) unique.add(e.cell);
    }
  }
  SimpleDoc.Table.selected = [...unique];
  SimpleDoc.Table.selected.forEach(cell => cell.classList.add('table-selected-cell'));
};

SimpleDoc.Table.updateTools = function() {
  const bar = document.getElementById('tableTools');
  if (!bar) return;
  bar.hidden = !SimpleDoc.Table.anchor?.isConnected;
  if (!bar.hidden) {
    const count = document.getElementById('tableSelectionCount');
    if (count) count.textContent = `${SimpleDoc.Table.selected.length || 1}셀 선택`;
  }
};

SimpleDoc.Table.currentInfo = function() {
  return SimpleDoc.Table.info(SimpleDoc.Table.anchor);
};

SimpleDoc.Table.insertCellAt = function(row, targetCol, tag, oldGrid, oldRowIndex) {
  const newCell = document.createElement(tag || 'td');
  newCell.innerHTML = '&nbsp;';
  const cells = [...row.cells];
  let before = null;
  for (const cell of cells) {
    let anchorCol = Infinity;
    const gridRow = oldGrid[oldRowIndex] || [];
    for (let c = 0; c < gridRow.length; c++) {
      const e = gridRow[c];
      if (e?.cell === cell && e.col === c) { anchorCol = c; break; }
    }
    if (anchorCol >= targetCol) { before = cell; break; }
  }
  if (before) row.insertBefore(newCell, before);
  else row.appendChild(newCell);
  return newCell;
};

SimpleDoc.Table.addRow = function(where = 'below') {
  const info = SimpleDoc.Table.currentInfo();
  if (!info) return;
  const { table, grid } = info;
  const rows = [...table.rows];
  const insertIndex = where === 'above' ? info.row : info.row + info.rowSpan;
  const cols = Math.max(...grid.map(r => r?.length || 0));
  const tr = document.createElement('tr');
  const reference = rows[insertIndex] || null;
  const useHeader = insertIndex === 0 && rows[0] && [...rows[0].cells].every(c => c.tagName === 'TH');

  for (let c = 0; c < cols; c++) {
    const above = insertIndex > 0 ? grid[insertIndex - 1]?.[c] : null;
    if (above && above.row < insertIndex && above.row + above.rowSpan > insertIndex) {
      if (c === above.col) above.cell.rowSpan = above.rowSpan + 1;
      continue;
    }
    const cell = document.createElement(useHeader ? 'th' : 'td');
    cell.innerHTML = '&nbsp;';
    tr.appendChild(cell);
  }
  table.tBodies[0] ? table.tBodies[0].insertBefore(tr, reference) : table.insertBefore(tr, reference);
  SimpleDoc.Table.select(tr.cells[0] || info.cell);
  SimpleDoc.Table.changed();
};

SimpleDoc.Table.deleteRow = function() {
  const info = SimpleDoc.Table.currentInfo();
  if (!info) return;
  const { table, grid, row } = info;
  const rows = [...table.rows];
  if (rows.length <= 1) { alert('표에는 최소 1개의 행이 필요합니다.'); return; }
  const targetRow = rows[row];
  const entries = new Set((grid[row] || []).filter(Boolean));
  entries.forEach(e => {
    if (e.row < row) {
      e.cell.rowSpan = Math.max(1, e.rowSpan - 1);
    } else if (e.row === row && e.rowSpan > 1) {
      const nextRow = rows[row + 1];
      if (nextRow) {
        e.cell.rowSpan = e.rowSpan - 1;
        const before = [...nextRow.cells].find(cell => {
          const i = SimpleDoc.Table.info(cell);
          return i && i.col > e.col;
        });
        nextRow.insertBefore(e.cell, before || null);
      }
    }
  });
  targetRow.remove();
  const remain = table.rows[Math.min(row, table.rows.length - 1)];
  SimpleDoc.Table.select(remain?.cells[0] || table.rows[0]?.cells[0]);
  SimpleDoc.Table.changed();
};

SimpleDoc.Table.addColumn = function(where = 'right') {
  const info = SimpleDoc.Table.currentInfo();
  if (!info) return;
  const { table, grid } = info;
  const insertCol = where === 'left' ? info.col : info.col + info.colSpan;
  const expanded = new Set();
  [...table.rows].forEach((row, r) => {
    const left = insertCol > 0 ? grid[r]?.[insertCol - 1] : null;
    if (left && left.col < insertCol && left.col + left.colSpan > insertCol) {
      if (!expanded.has(left.cell)) {
        left.cell.colSpan = left.colSpan + 1;
        expanded.add(left.cell);
      }
      return;
    }
    const tag = row.cells[0]?.tagName?.toLowerCase() || 'td';
    SimpleDoc.Table.insertCellAt(row, insertCol, tag, grid, r);
  });
  const newGrid = SimpleDoc.Table.grid(table);
  SimpleDoc.Table.select(newGrid[info.row]?.[insertCol]?.cell || info.cell);
  SimpleDoc.Table.changed();
};

SimpleDoc.Table.deleteColumn = function() {
  const info = SimpleDoc.Table.currentInfo();
  if (!info) return;
  const { table, grid, col } = info;
  const cols = Math.max(...grid.map(r => r?.length || 0));
  if (cols <= 1) { alert('표에는 최소 1개의 열이 필요합니다.'); return; }
  const entries = new Set(grid.map(r => r?.[col]).filter(Boolean));
  entries.forEach(e => {
    if (e.colSpan > 1) e.cell.colSpan = e.colSpan - 1;
    else e.cell.remove();
  });
  const newGrid = SimpleDoc.Table.grid(table);
  const next = newGrid[Math.min(info.row, newGrid.length - 1)]?.[Math.min(col, cols - 2)]?.cell;
  SimpleDoc.Table.select(next || table.rows[0]?.cells[0]);
  SimpleDoc.Table.changed();
};

SimpleDoc.Table.mergeSelected = function() {
  const a = SimpleDoc.Table.info(SimpleDoc.Table.anchor);
  const b = SimpleDoc.Table.info(SimpleDoc.Table.focus);
  if (!a || !b || a.table !== b.table) return;
  const r1 = Math.min(a.row, b.row);
  const r2 = Math.max(a.row + a.rowSpan - 1, b.row + b.rowSpan - 1);
  const c1 = Math.min(a.col, b.col);
  const c2 = Math.max(a.col + a.colSpan - 1, b.col + b.colSpan - 1);
  if (r1 === r2 && c1 === c2) return;

  const unique = new Set();
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
    const e = a.grid[r]?.[c];
    if (!e) continue;
    const er2 = e.row + e.rowSpan - 1;
    const ec2 = e.col + e.colSpan - 1;
    if (e.row < r1 || er2 > r2 || e.col < c1 || ec2 > c2) {
      alert('이미 병합된 셀이 선택 영역 밖까지 걸쳐 있습니다. 먼저 해당 셀을 나눈 뒤 다시 시도하세요.');
      return;
    }
    unique.add(e);
  }
  const top = a.grid[r1]?.[c1];
  if (!top) return;
  const contents = [...unique]
    .sort((x, y) => x.row - y.row || x.col - y.col)
    .map(e => e.cell.innerHTML.trim())
    .filter(v => v && v !== '&nbsp;');
  top.cell.rowSpan = r2 - r1 + 1;
  top.cell.colSpan = c2 - c1 + 1;
  top.cell.innerHTML = contents.length ? contents.join('<br>') : '&nbsp;';
  unique.forEach(e => { if (e.cell !== top.cell) e.cell.remove(); });
  SimpleDoc.Table.anchor = top.cell;
  SimpleDoc.Table.focus = top.cell;
  SimpleDoc.Table.paintSelection();
  SimpleDoc.Table.changed();
};

SimpleDoc.Table.splitCell = function() {
  const info = SimpleDoc.Table.currentInfo();
  if (!info) return;
  const { table, grid, cell, row, col, rowSpan, colSpan } = info;
  if (rowSpan === 1 && colSpan === 1) return;
  const tag = cell.tagName.toLowerCase();
  cell.rowSpan = 1;
  cell.colSpan = 1;
  for (let r = row; r < row + rowSpan; r++) {
    const tr = table.rows[r];
    if (!tr) continue;
    for (let c = col; c < col + colSpan; c++) {
      if (r === row && c === col) continue;
      SimpleDoc.Table.insertCellAt(tr, c, tag, grid, r);
    }
  }
  SimpleDoc.Table.select(cell);
  SimpleDoc.Table.changed();
};

SimpleDoc.Table.changed = function() {
  SimpleDoc.markDirty();
  SimpleDoc.snapshot();
  SimpleDoc.Table.updateTools();
  if (SimpleDoc.state.autoPaginate && SimpleDoc.Pagination) SimpleDoc.Pagination.queue(SimpleDoc.getActivePage(), 20);
};

SimpleDoc.Table.bind = function() {
  document.addEventListener('pointerdown', e => {
    const cell = e.target.closest('table.editor-table td, table.editor-table th');
    if (cell) {
      SimpleDoc.Table.select(cell, e.shiftKey);
      return;
    }
    if (!e.target.closest('#tableTools')) {
      SimpleDoc.Table.clearSelection();
      SimpleDoc.Table.anchor = null;
      SimpleDoc.Table.focus = null;
      SimpleDoc.Table.updateTools();
    }
  });
};
