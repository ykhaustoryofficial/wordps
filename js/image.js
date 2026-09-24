window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Image = {};

SimpleDoc.Image.insertFile = function(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const alt = file.name.replace(/\.[^.]+$/, '').replace(/["<>]/g, '');
    SimpleDoc.insertHTML(`
      <figure class="doc-image-block" contenteditable="false">
        <img class="doc-image" src="${reader.result}" alt="${alt}" style="width:75%;">
      </figure>
      <p class="doc-body"><br></p>
    `);
  };
  reader.readAsDataURL(file);
};

SimpleDoc.Image.select = function(img) {
  document.querySelectorAll('.doc-image.selected').forEach(x => x.classList.remove('selected'));
  SimpleDoc.state.selectedImage = img || null;
  if (img) img.classList.add('selected');
  const tools = document.getElementById('imageTools');
  if (tools) tools.hidden = !img;
  if (img) {
    const width = parseInt(img.style.width || '75', 10) || 75;
    const sel = document.getElementById('imageWidth');
    if (sel) sel.value = String([25,50,75,100].reduce((a,b) => Math.abs(b-width) < Math.abs(a-width) ? b : a));
  }
};

SimpleDoc.Image.setWidth = function(value) {
  const img = SimpleDoc.state.selectedImage;
  if (!img?.isConnected) return;
  img.style.width = `${value}%`;
  SimpleDoc.markDirty();
  SimpleDoc.snapshot();
  if (SimpleDoc.state.autoPaginate && SimpleDoc.Pagination) SimpleDoc.Pagination.queue(img.closest('.a4-page'), 20);
};

SimpleDoc.Image.remove = function() {
  const img = SimpleDoc.state.selectedImage;
  if (!img?.isConnected) return;
  const block = img.closest('.doc-image-block');
  const page = img.closest('.a4-page');
  block?.remove();
  SimpleDoc.Image.select(null);
  SimpleDoc.markDirty();
  SimpleDoc.snapshot();
  if (SimpleDoc.state.autoPaginate && SimpleDoc.Pagination) SimpleDoc.Pagination.queue(page, 20);
};

SimpleDoc.Image.bind = function() {
  document.addEventListener('click', e => {
    const img = e.target.closest('.doc-image');
    if (img) {
      e.preventDefault();
      SimpleDoc.Image.select(img);
    } else if (!e.target.closest('#imageTools') && !e.target.closest('#insertImageBtn')) {
      SimpleDoc.Image.select(null);
    }
  });
};
