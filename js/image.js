window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Image = {
  selected: null
};

SimpleDoc.Image.insertFile = function(file) {
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();

  reader.onload = () => {
    const alt = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/["<>]/g, '');

    SimpleDoc.insertHTML(`
      <figure class="doc-image-block sd-object" data-sd-object="image" contenteditable="false">
        <img class="doc-image" src="${reader.result}" alt="${alt}" style="width:75%;">
      </figure>
      <p class="doc-body sd-free-paragraph"><br></p>
    `);
  };

  reader.readAsDataURL(file);
};

SimpleDoc.Image.select = function(img, options = {}) {
  document.querySelectorAll('.doc-image.selected').forEach(x => {
    x.classList.remove('selected');
  });

  SimpleDoc.Image.selected = img || null;
  SimpleDoc.state.selectedImage = img || null;

  if (img) img.classList.add('selected');

  const tools = document.getElementById('imageTools');
  if (tools) tools.hidden = !img;

  if (img) {
    const width = parseInt(img.style.width || '75', 10) || 75;
    const sel = document.getElementById('imageWidth');

    if (sel) {
      const values = [25, 50, 75, 100];
      sel.value = String(
        values.reduce((a, b) =>
          Math.abs(b - width) < Math.abs(a - width) ? b : a
        )
      );
    }

    if (!options.fromObjectManager) {
      const block = img.closest('.doc-image-block');
      if (block) SimpleDoc.Objects?.select?.(block);
    }
  }
};

SimpleDoc.Image.setWidth = function(value) {
  const img = SimpleDoc.state.selectedImage;
  if (!img?.isConnected) return;

  img.style.width = `${value}%`;

  const page = img.closest('.a4-page');
  SimpleDoc.markDirty?.();
  SimpleDoc.snapshot?.();

  if (SimpleDoc.state.autoPaginate && SimpleDoc.Pagination) {
    SimpleDoc.Pagination.queue(page, 20);
  } else if (page) {
    SimpleDoc.warnOverflow?.(page);
  }
};

SimpleDoc.Image.remove = function() {
  const img = SimpleDoc.state.selectedImage;
  if (!img?.isConnected) return;

  const block = img.closest('.doc-image-block');

  if (block) {
    if (SimpleDoc.Objects?.selected === block) {
      SimpleDoc.Objects.deleteSelectedObject();
      return;
    }

    SimpleDoc.Objects?.select?.(block);
    SimpleDoc.Objects?.deleteSelectedObject?.();
  }
};

SimpleDoc.Image.bind = function() {
  document.addEventListener('click', event => {
    const img = event.target.closest?.('.doc-image');

    if (img) {
      event.preventDefault();
      SimpleDoc.Image.select(img);
      return;
    }

    if (
      !event.target.closest?.('#imageTools') &&
      !event.target.closest?.('#objectTools') &&
      !event.target.closest?.('#insertImageBtn')
    ) {
      SimpleDoc.Image.select(null, { fromObjectManager: true });
    }
  });
};
