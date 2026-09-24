window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Print = {};

SimpleDoc.Print.run = function() {
  if (SimpleDoc.state.autoPaginate && SimpleDoc.Pagination) SimpleDoc.Pagination.paginateAll();
  SimpleDoc.getPages().forEach(SimpleDoc.warnOverflow);
  const overflow = document.querySelector('.a4-page.overflowing');
  if (overflow) {
    const ok = confirm('일부 페이지 내용이 A4 인쇄 영역을 초과했습니다. 초과된 내용은 잘릴 수 있습니다. 그대로 PDF 출력을 진행할까요?');
    if (!ok) return;
  }
  window.print();
};
