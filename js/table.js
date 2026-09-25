window.SimpleDoc = window.SimpleDoc || {};

/* V8 table operations: object boundary is owned by object-manager.js */

SimpleDoc.Table = {

  anchor: null,

  focus: null,

  selected: []

};


/* =========================================================
   CELL HELPERS
========================================================= */

SimpleDoc.Table.createCell =
  function(
    tag = 'td',
    html = ''
  ) {

    const cell =
      document.createElement(
        tag
      );


    cell.contentEditable =
      'false';


    const editor =
      document.createElement(
        'div'
      );


    editor.className =
      'cell-editor sd-object-editor';


    editor.contentEditable =
      'true';


    editor.spellcheck =
      true;


    editor.innerHTML =
      (
        html &&
        html !== '&nbsp;'
      )

        ? html

        : '<br>';


    cell.appendChild(
      editor
    );


    return cell;

  };


SimpleDoc.Table.ensureCellEditor =
  function(cell) {

    return (
      SimpleDoc.Boundary
        .getCellEditor(
          cell
        )
    );

  };


SimpleDoc.Table.cellHTML =
  function(cell) {

    const editor =
      SimpleDoc.Table
        .ensureCellEditor(
          cell
        );


    if (!editor) {
      return '';
    }


    const text =
      (
        editor.textContent ||
        ''
      )
        .replace(
          /[\u200B\u00A0]/g,
          ''
        )
        .trim();


    if (
      !text &&
      !editor.querySelector(
        [
          'img',
          'input',
          'hr',
          'svg',
          'canvas'
        ].join(',')
      )
    ) {

      return '';

    }


    return editor.innerHTML;

  };


SimpleDoc.Table.setCellHTML =
  function(
    cell,
    html = ''
  ) {

    const editor =
      SimpleDoc.Table
        .ensureCellEditor(
          cell
        );


    if (!editor) {
      return;
    }


    editor.innerHTML =
      html ||
      '<br>';


    SimpleDoc.Boundary
      .ensureNotEmpty(
        editor
      );

  };


/* =========================================================
   BUILD TABLE
========================================================= */

SimpleDoc.Table.build =
  function(
    rows,
    cols,
    header
  ) {

    let html =

      '<div ' +
      'class="editor-table-wrap sd-object" data-sd-object="table" ' +
      'contenteditable="false">';


    html +=

      '<table ' +
      'class="editor-table" ' +
      'contenteditable="false">';


    for (
      let r = 0;
      r < rows;
      r++
    ) {

      html +=
        '<tr>';


      for (
        let c = 0;
        c < cols;
        c++
      ) {

        const tag =
          header &&
          r === 0

            ? 'th'

            : 'td';


        const value =
          header &&
          r === 0

            ? `제목 ${c + 1}`

            : '<br>';


        html +=
          `<${tag} contenteditable="false">`;


        html +=
          `<div ` +
          `class="cell-editor sd-object-editor" ` +
          `contenteditable="true">` +
          `${value}` +
          `</div>`;


        html +=
          `</${tag}>`;

      }


      html +=
        '</tr>';

    }


    html +=
      '</table>';


    html +=
      '</div>';


    html +=
      '<p class="doc-body"><br></p>';


    return html;

  };


/* =========================================================
   TABLE GRID
========================================================= */

SimpleDoc.Table.grid =
  function(table) {

    const grid =
      [];


    const rows =
      [
        ...table.rows
      ];


    rows.forEach(
      (row, r) => {

        grid[r] ||= [];


        let c =
          0;


        [
          ...row.cells
        ].forEach(
          cell => {

            while (
              grid[r][c]
            ) {

              c++;

            }


            const rs =
              Math.max(
                1,
                cell.rowSpan ||
                1
              );


            const cs =
              Math.max(
                1,
                cell.colSpan ||
                1
              );


            const entry = {

              cell,

              row: r,

              col: c,

              rowSpan: rs,

              colSpan: cs

            };


            for (
              let rr = r;
              rr < r + rs;
              rr++
            ) {

              grid[rr] ||= [];


              for (
                let cc = c;
                cc < c + cs;
                cc++
              ) {

                grid[rr][cc] =
                  entry;

              }

            }


            c += cs;

          }
        );

      }
    );


    return grid;

  };


SimpleDoc.Table.info =
  function(cell) {

    const table =
      cell?.closest(
        'table.editor-table'
      );


    if (!table) {
      return null;
    }


    const grid =
      SimpleDoc.Table.grid(
        table
      );


    for (
      let r = 0;
      r < grid.length;
      r++
    ) {

      for (
        let c = 0;
        c <
          (
            grid[r]?.length ||
            0
          );
        c++
      ) {

        const e =
          grid[r][c];


        if (
          e?.cell === cell &&
          e.row === r &&
          e.col === c
        ) {

          return {
            table,
            grid,
            ...e
          };

        }

      }

    }


    return null;

  };


/* =========================================================
   TABLE SELECTION
========================================================= */

SimpleDoc.Table.clearSelection =
  function() {

    document
      .querySelectorAll(
        '.table-selected-cell'
      )
      .forEach(
        cell => {

          cell.classList.remove(
            'table-selected-cell'
          );

        }
      );


    SimpleDoc.Table.selected =
      [];

  };


SimpleDoc.Table.select =
  function(
    cell,
    extend = false
  ) {

    const table =
      cell?.closest(
        'table.editor-table'
      );


    if (!table) {
      return;
    }


    if (

      !extend ||

      !SimpleDoc.Table.anchor ||

      SimpleDoc.Table.anchor
        .closest('table') !==
      table

    ) {

      SimpleDoc.Table.anchor =
        cell;


      SimpleDoc.Table.focus =
        cell;

    }

    else {

      SimpleDoc.Table.focus =
        cell;

    }


    SimpleDoc.Table
      .paintSelection();


    SimpleDoc.Table
      .updateTools();

  };


SimpleDoc.Table.paintSelection =
  function() {

    SimpleDoc.Table
      .clearSelection();


    const a =
      SimpleDoc.Table.info(
        SimpleDoc.Table.anchor
      );


    const b =
      SimpleDoc.Table.info(
        SimpleDoc.Table.focus
      );


    if (
      !a ||
      !b ||
      a.table !==
      b.table
    ) {

      return;

    }


    const r1 =
      Math.min(
        a.row,
        b.row
      );


    const r2 =
      Math.max(

        a.row +
        a.rowSpan -
        1,

        b.row +
        b.rowSpan -
        1

      );


    const c1 =
      Math.min(
        a.col,
        b.col
      );


    const c2 =
      Math.max(

        a.col +
        a.colSpan -
        1,

        b.col +
        b.colSpan -
        1

      );


    const unique =
      new Set();


    for (
      let r = r1;
      r <= r2;
      r++
    ) {

      for (
        let c = c1;
        c <= c2;
        c++
      ) {

        const e =
          a.grid[r]?.[c];


        if (
          e?.cell
        ) {

          unique.add(
            e.cell
          );

        }

      }

    }


    SimpleDoc.Table.selected =
      [
        ...unique
      ];


    SimpleDoc.Table.selected
      .forEach(
        cell => {

          cell.classList.add(
            'table-selected-cell'
          );

        }
      );

  };


SimpleDoc.Table.updateTools =
  function() {

    const bar =
      document.getElementById(
        'tableTools'
      );


    if (!bar) {
      return;
    }


    bar.hidden =
      !SimpleDoc.Table.anchor
        ?.isConnected;


    if (!bar.hidden) {

      const count =
        document.getElementById(
          'tableSelectionCount'
        );


      if (count) {

        count.textContent =
          `${
            SimpleDoc.Table
              .selected.length ||
            1
          }셀 선택`;

      }

      SimpleDoc.Table.syncSizeControls?.();

    }

  };


SimpleDoc.Table.currentInfo =
  function() {

    return (
      SimpleDoc.Table.info(
        SimpleDoc.Table.anchor
      )
    );

  };


/* =========================================================
   INSERT CELL
========================================================= */

SimpleDoc.Table.insertCellAt =
  function(
    row,
    targetCol,
    tag,
    oldGrid,
    oldRowIndex
  ) {

    const newCell =
      SimpleDoc.Table
        .createCell(
          tag ||
          'td'
        );


    const cells =
      [
        ...row.cells
      ];


    let before =
      null;


    for (
      const cell
      of cells
    ) {

      let anchorCol =
        Infinity;


      const gridRow =
        oldGrid[
          oldRowIndex
        ] ||
        [];


      for (
        let c = 0;
        c < gridRow.length;
        c++
      ) {

        const e =
          gridRow[c];


        if (
          e?.cell ===
            cell &&
          e.col === c
        ) {

          anchorCol =
            c;

          break;

        }

      }


      if (
        anchorCol >=
        targetCol
      ) {

        before =
          cell;

        break;

      }

    }


    if (before) {

      row.insertBefore(
        newCell,
        before
      );

    }

    else {

      row.appendChild(
        newCell
      );

    }


    return newCell;

  };


/* =========================================================
   ADD ROW
========================================================= */

SimpleDoc.Table.addRow =
  function(
    where = 'below'
  ) {

    const info =
      SimpleDoc.Table
        .currentInfo();


    if (!info) {
      return;
    }


    const {
      table,
      grid
    } = info;


    const rows =
      [
        ...table.rows
      ];


    const insertIndex =

      where ===
      'above'

        ? info.row

        : info.row +
          info.rowSpan;


    const cols =
      Math.max(
        ...grid.map(
          row =>
            row?.length ||
            0
        )
      );


    const tr =
      document.createElement(
        'tr'
      );


    const reference =
      rows[
        insertIndex
      ] ||
      null;


    const useHeader =

      insertIndex ===
        0 &&

      rows[0] &&

      [
        ...rows[0].cells
      ].every(
        cell =>
          cell.tagName ===
          'TH'
      );


    for (
      let c = 0;
      c < cols;
      c++
    ) {

      const above =

        insertIndex >
        0

          ? grid[
              insertIndex -
              1
            ]?.[c]

          : null;


      if (

        above &&

        above.row <
          insertIndex &&

        above.row +
          above.rowSpan >
          insertIndex

      ) {

        if (
          c ===
          above.col
        ) {

          above.cell.rowSpan =
            above.rowSpan +
            1;

        }


        continue;

      }


      tr.appendChild(

        SimpleDoc.Table
          .createCell(

            useHeader
              ? 'th'
              : 'td'

          )

      );

    }


    if (
      table.tBodies[0]
    ) {

      table.tBodies[0]
        .insertBefore(
          tr,
          reference
        );

    }

    else {

      table.insertBefore(
        tr,
        reference
      );

    }


    SimpleDoc.Table.select(
      tr.cells[0] ||
      info.cell
    );


    SimpleDoc.Table.changed();

  };


/* =========================================================
   DELETE ROW
========================================================= */

SimpleDoc.Table.deleteRow =
  function() {

    const info =
      SimpleDoc.Table
        .currentInfo();


    if (!info) {
      return;
    }


    const {
      table,
      grid,
      row
    } = info;


    const rows =
      [
        ...table.rows
      ];


    if (
      rows.length <=
      1
    ) {

      alert(
        '표에는 최소 1개의 행이 필요합니다.'
      );

      return;

    }


    const targetRow =
      rows[row];


    const entries =
      new Set(
        (
          grid[row] ||
          []
        ).filter(Boolean)
      );


    entries.forEach(
      entry => {

        if (
          entry.row <
          row
        ) {

          entry.cell.rowSpan =
            Math.max(
              1,
              entry.rowSpan -
              1
            );

        }

        else if (
          entry.row ===
            row &&
          entry.rowSpan >
            1
        ) {

          const nextRow =
            rows[
              row +
              1
            ];


          if (nextRow) {

            entry.cell.rowSpan =
              entry.rowSpan -
              1;


            const before =
              [
                ...nextRow.cells
              ].find(
                cell => {

                  const i =
                    SimpleDoc.Table.info(
                      cell
                    );


                  return (
                    i &&
                    i.col >
                    entry.col
                  );

                }
              );


            nextRow.insertBefore(
              entry.cell,
              before ||
              null
            );

          }

        }

      }
    );


    targetRow.remove();


    const remain =
      table.rows[
        Math.min(
          row,
          table.rows.length -
          1
        )
      ];


    SimpleDoc.Table.select(

      remain?.cells[0]

      ||

      table.rows[0]
        ?.cells[0]

    );


    SimpleDoc.Table.changed();

  };


/* =========================================================
   ADD COLUMN
========================================================= */

SimpleDoc.Table.addColumn =
  function(
    where = 'right'
  ) {

    const info =
      SimpleDoc.Table
        .currentInfo();


    if (!info) {
      return;
    }


    const {
      table,
      grid
    } = info;


    const insertCol =

      where ===
      'left'

        ? info.col

        : info.col +
          info.colSpan;


    const expanded =
      new Set();


    [
      ...table.rows
    ].forEach(
      (row, r) => {

        const left =

          insertCol >
          0

            ? grid[r]
              ?.[
                insertCol -
                1
              ]

            : null;


        if (

          left &&

          left.col <
            insertCol &&

          left.col +
            left.colSpan >
            insertCol

        ) {

          if (
            !expanded.has(
              left.cell
            )
          ) {

            left.cell.colSpan =
              left.colSpan +
              1;


            expanded.add(
              left.cell
            );

          }


          return;

        }


        const tag =

          row.cells[0]
            ?.tagName
            ?.toLowerCase()

          ||

          'td';


        SimpleDoc.Table
          .insertCellAt(
            row,
            insertCol,
            tag,
            grid,
            r
          );

      }
    );


    const newGrid =
      SimpleDoc.Table.grid(
        table
      );


    SimpleDoc.Table.select(

      newGrid[
        info.row
      ]?.[
        insertCol
      ]?.cell

      ||

      info.cell

    );


    SimpleDoc.Table.changed();

  };


/* =========================================================
   DELETE COLUMN
========================================================= */

SimpleDoc.Table.deleteColumn =
  function() {

    const info =
      SimpleDoc.Table
        .currentInfo();


    if (!info) {
      return;
    }


    const {
      table,
      grid,
      col
    } = info;


    const cols =
      Math.max(
        ...grid.map(
          row =>
            row?.length ||
            0
        )
      );


    if (
      cols <=
      1
    ) {

      alert(
        '표에는 최소 1개의 열이 필요합니다.'
      );

      return;

    }


    const entries =
      new Set(

        grid
          .map(
            row =>
              row?.[col]
          )
          .filter(Boolean)

      );


    entries.forEach(
      entry => {

        if (
          entry.colSpan >
          1
        ) {

          entry.cell.colSpan =
            entry.colSpan -
            1;

        }

        else {

          entry.cell.remove();

        }

      }
    );


    const newGrid =
      SimpleDoc.Table.grid(
        table
      );


    const next =

      newGrid[
        Math.min(
          info.row,
          newGrid.length -
          1
        )
      ]
      ?.[
        Math.min(
          col,
          cols -
          2
        )
      ]
      ?.cell;


    SimpleDoc.Table.select(

      next

      ||

      table.rows[0]
        ?.cells[0]

    );


    SimpleDoc.Table.changed();

  };


/* =========================================================
   MERGE CELLS
========================================================= */

SimpleDoc.Table.mergeSelected =
  function() {

    const a =
      SimpleDoc.Table.info(
        SimpleDoc.Table.anchor
      );


    const b =
      SimpleDoc.Table.info(
        SimpleDoc.Table.focus
      );


    if (
      !a ||
      !b ||
      a.table !==
      b.table
    ) {

      return;

    }


    const r1 =
      Math.min(
        a.row,
        b.row
      );


    const r2 =
      Math.max(

        a.row +
        a.rowSpan -
        1,

        b.row +
        b.rowSpan -
        1

      );


    const c1 =
      Math.min(
        a.col,
        b.col
      );


    const c2 =
      Math.max(

        a.col +
        a.colSpan -
        1,

        b.col +
        b.colSpan -
        1

      );


    if (
      r1 === r2 &&
      c1 === c2
    ) {

      return;

    }


    const unique =
      new Set();


    for (
      let r = r1;
      r <= r2;
      r++
    ) {

      for (
        let c = c1;
        c <= c2;
        c++
      ) {

        const entry =
          a.grid[r]
            ?.[c];


        if (!entry) {
          continue;
        }


        const er2 =
          entry.row +
          entry.rowSpan -
          1;


        const ec2 =
          entry.col +
          entry.colSpan -
          1;


        if (

          entry.row <
            r1 ||

          er2 >
            r2 ||

          entry.col <
            c1 ||

          ec2 >
            c2

        ) {

          alert(
            '이미 병합된 셀이 선택 영역 밖까지 걸쳐 있습니다. 먼저 해당 셀을 나눈 뒤 다시 시도하세요.'
          );


          return;

        }


        unique.add(
          entry
        );

      }

    }


    const top =
      a.grid[r1]
        ?.[c1];


    if (!top) {
      return;
    }


    /*
     * cell 자체의 innerHTML이 아니라
     * cell-editor 내용만 합침.
     *
     * 따라서 편집경계 wrapper가
     * 중첩되지 않는다.
     */
    const contents =

      [
        ...unique
      ]

        .sort(
          (x, y) =>
            x.row -
              y.row ||
            x.col -
              y.col
        )

        .map(
          entry =>
            SimpleDoc.Table
              .cellHTML(
                entry.cell
              )
        )

        .filter(Boolean);


    top.cell.rowSpan =
      r2 -
      r1 +
      1;


    top.cell.colSpan =
      c2 -
      c1 +
      1;


    SimpleDoc.Table
      .setCellHTML(

        top.cell,

        contents.length

          ? contents.join(
              '<br>'
            )

          : ''

      );


    unique.forEach(
      entry => {

        if (
          entry.cell !==
          top.cell
        ) {

          entry.cell.remove();

        }

      }
    );


    SimpleDoc.Table.anchor =
      top.cell;


    SimpleDoc.Table.focus =
      top.cell;


    SimpleDoc.Table
      .paintSelection();


    SimpleDoc.Table.changed();

  };


/* =========================================================
   SPLIT CELL
========================================================= */

SimpleDoc.Table.splitCell =
  function() {

    const info =
      SimpleDoc.Table
        .currentInfo();


    if (!info) {
      return;
    }


    const {
      table,
      grid,
      cell,
      row,
      col,
      rowSpan,
      colSpan
    } = info;


    if (
      rowSpan ===
        1 &&
      colSpan ===
        1
    ) {

      return;

    }


    const tag =
      cell.tagName
        .toLowerCase();


    cell.rowSpan =
      1;


    cell.colSpan =
      1;


    for (
      let r = row;
      r <
        row +
        rowSpan;
      r++
    ) {

      const tr =
        table.rows[r];


      if (!tr) {
        continue;
      }


      for (
        let c = col;
        c <
          col +
          colSpan;
        c++
      ) {

        if (
          r === row &&
          c === col
        ) {

          continue;

        }


        SimpleDoc.Table
          .insertCellAt(
            tr,
            c,
            tag,
            grid,
            r
          );

      }

    }


    SimpleDoc.Table.select(
      cell
    );


    SimpleDoc.Table.changed();

  };


/* =========================================================
   TABLE CHANGE
========================================================= */

SimpleDoc.Table.changed =
  function() {

    const page =
      SimpleDoc.getActivePage();


    /*
     * 새 행/열/셀도
     * 즉시 보호구조 적용
     */
    if (page) {

      SimpleDoc.Boundary
        .upgrade(
          page
        );

    }


    SimpleDoc.markDirty();

    SimpleDoc.snapshot();

    SimpleDoc.Table
      .updateTools();


    if (
      SimpleDoc.state
        .autoPaginate &&
      SimpleDoc.Pagination
    ) {

      SimpleDoc.Pagination.queue(
        page,
        20
      );

    }

    else if (page) {

      SimpleDoc.warnOverflow(
        page
      );

    }

  };


/* =========================================================
   TABLE SIZE — V8

   Word/HWP처럼 표 전체 너비를 숫자/슬라이더/드래그로 조절한다.
   표의 높이는 내용과 행 높이에 따라 자동으로 결정된다.
========================================================= */

SimpleDoc.Table.activeWrap = function() {
  const fromCell = SimpleDoc.Table.anchor?.closest?.('.editor-table-wrap');
  if (fromCell?.isConnected) return fromCell;

  const selected = SimpleDoc.Objects?.selected;
  if (selected?.isConnected && selected.dataset.sdObject === 'table') {
    return selected;
  }

  return null;
};

SimpleDoc.Table.widthPercent = function(wrap) {
  if (!wrap?.isConnected) return 100;

  /*
   * 화면 zoom은 getBoundingClientRect()에 반영되지만 clientWidth에는
   * 같은 방식으로 반영되지 않아 퍼센트가 왜곡될 수 있다.
   * 사용자가 지정한 논리 너비를 우선 사용한다.
   */
  const stored = Number.parseFloat(wrap.dataset.tableWidth || '');
  if (Number.isFinite(stored)) {
    return Math.max(25, Math.min(100, Math.round(stored)));
  }

  if (wrap.style.width?.endsWith('%')) {
    const styled = Number.parseFloat(wrap.style.width);
    if (Number.isFinite(styled)) {
      return Math.max(25, Math.min(100, Math.round(styled)));
    }
  }

  const parent = wrap.parentElement;
  const parentRect = parent?.getBoundingClientRect?.();
  const rect = wrap.getBoundingClientRect();
  const parentWidth = parentRect?.width || parent?.clientWidth || 1;

  return Math.max(
    25,
    Math.min(
      100,
      Math.round(rect.width / parentWidth * 100)
    )
  );
};

SimpleDoc.Table.syncSizeControls = function(wrap = SimpleDoc.Table.activeWrap()) {
  const range = document.getElementById('tableWidthRange');
  const value = document.getElementById('tableWidthValue');
  if (!range || !value || !wrap) return;

  const percent = SimpleDoc.Table.widthPercent(wrap);
  range.value = String(percent);
  value.textContent = `${percent}%`;
};

SimpleDoc.Table.setWidth = function(percent, wrap = SimpleDoc.Table.activeWrap(), options = {}) {
  if (!wrap?.isConnected) return false;

  const value = Math.max(25, Math.min(100, Number(percent) || 100));
  const table = wrap.querySelector(':scope > table.editor-table');

  wrap.style.width = `${value}%`;
  wrap.style.maxWidth = '100%';
  wrap.dataset.tableWidth = String(value);

  if (table) {
    table.style.width = '100%';
    table.style.tableLayout = 'fixed';
  }

  SimpleDoc.Table.syncSizeControls(wrap);

  if (!options.live) {
    SimpleDoc.Table.changed();
  } else {
    SimpleDoc.markDirty?.();
  }

  return true;
};

SimpleDoc.Table.fitContent = function(wrap = SimpleDoc.Table.activeWrap()) {
  if (!wrap?.isConnected) return false;

  const table = wrap.querySelector(':scope > table.editor-table');

  wrap.style.width = 'fit-content';
  wrap.style.maxWidth = '100%';
  wrap.dataset.tableWidth = 'fit';

  if (table) {
    table.style.width = 'auto';
    table.style.tableLayout = 'auto';
  }

  SimpleDoc.Table.syncSizeControls(wrap);
  SimpleDoc.Table.changed();
  return true;
};

SimpleDoc.Table.fullWidth = function(wrap = SimpleDoc.Table.activeWrap()) {
  return SimpleDoc.Table.setWidth(100, wrap);
};

SimpleDoc.Table.beginResize = function(event, handle) {
  const wrap = handle?.closest?.('.editor-table-wrap');
  if (!wrap) return false;

  event.preventDefault();
  event.stopPropagation();

  SimpleDoc.Objects?.select?.(wrap);

  const parent = wrap.parentElement;
  const parentWidth = parent?.clientWidth || wrap.getBoundingClientRect().width || 1;
  const startX = event.clientX;
  const startWidth = wrap.getBoundingClientRect().width;
  const pointerId = event.pointerId;

  try { handle.setPointerCapture(pointerId); } catch {}

  const move = moveEvent => {
    const widthPx = startWidth + (moveEvent.clientX - startX);
    const percent = Math.max(25, Math.min(100, widthPx / parentWidth * 100));
    SimpleDoc.Table.setWidth(percent, wrap, { live: true });
  };

  const finish = () => {
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('pointerup', finish, true);
    document.removeEventListener('pointercancel', finish, true);

    try { handle.releasePointerCapture(pointerId); } catch {}

    SimpleDoc.Table.changed();
  };

  document.addEventListener('pointermove', move, true);
  document.addEventListener('pointerup', finish, true);
  document.addEventListener('pointercancel', finish, true);

  return true;
};


/* =========================================================
   TABLE EVENT
========================================================= */

SimpleDoc.Table.bind =
  function() {

    document.addEventListener(
      'pointerdown',
      event => {

        const resizeHandle =
          event.target.closest?.('.sd-table-resize-handle');

        if (resizeHandle) {
          SimpleDoc.Table.beginResize(event, resizeHandle);
          return;
        }

        const cell =
          event.target.closest(
            'table.editor-table td, table.editor-table th'
          );


        if (cell) {

          SimpleDoc.Table.select(
            cell,
            event.shiftKey
          );


          return;

        }


        if (
          !event.target.closest(
            '#tableTools'
          )
        ) {

          SimpleDoc.Table
            .clearSelection();


          SimpleDoc.Table.anchor =
            null;


          SimpleDoc.Table.focus =
            null;


          SimpleDoc.Table
            .updateTools();

        }

      }
    );

    document.getElementById('tableWidthRange')?.addEventListener('input', event => {
      const wrap = SimpleDoc.Table.activeWrap();
      if (!wrap) return;
      SimpleDoc.Table.setWidth(event.target.value, wrap, { live: true });
    });

    document.getElementById('tableWidthRange')?.addEventListener('change', event => {
      const wrap = SimpleDoc.Table.activeWrap();
      if (!wrap) return;
      SimpleDoc.Table.setWidth(event.target.value, wrap);
    });

    document.getElementById('tableFitContentBtn')?.addEventListener('click', () => {
      SimpleDoc.Table.fitContent();
    });

    document.getElementById('tableFullWidthBtn')?.addEventListener('click', () => {
      SimpleDoc.Table.fullWidth();
    });

  };


