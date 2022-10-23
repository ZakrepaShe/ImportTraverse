import treeJson from './tree.js';

const sample = {
  name: 'root',
  children: [
    {
      name: 'child1',
      children: [],
    },
    {
      name: 'child2',
      children: [
        {
          name: 'child3',
          children: [],
        },
        {
          name: 'child4',
          children: [],
        },
      ],
    },
  ],
};

const view = 'squares';

const views = ['outlined', 'squares'];
const currentView = views.includes(view) ? view : views[0];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const paddingWidth = 20;
const parentPadding = 10;
const elementHeight = 50;
const squaresWidth = 30;
const tooltipsData = [];

let maxY = 0;

function prepareTree(tree, x = 0, y = 0) {
  tree.x = x;
  tree.y = y;
  tree.shortName = getShortName(tree.name);
  tree.nameWidth = ctx.measureText(tree.shortName).width;
  let width = getElementWidthByView(tree);
  if(y>maxY) {
    maxY = y;
  }

  if (tree.children) {
    const treeLevelY = y + elementHeight;
    let lastChildX = x;
    const widths = [];
    tree.children.forEach((child) => {
      widths.push(prepareTree(child, lastChildX, treeLevelY));
      lastChildX += child.width + paddingWidth;
    });
    if (widths.length !== 0) {
      const allChildrenWidths = (
        widths.reduce((sum, val) => sum + val, 0)
        // space between children without outer bounds
        + (widths.length - 1) * paddingWidth
      );
      if (allChildrenWidths > width) {
        width = allChildrenWidths;
      }
    }
  }

  tree.width = width;

  // collect tooltips dimensions
  tooltipsData.push({
    name: tree.name,
    x0: x,
    y0: y + parentPadding,
    x1: x + tree.width,
    y1: y + elementHeight - parentPadding,
  });

  return width;
}

function getElementWidthByView(tree) {
  switch (currentView) {
    case 'squares':
      return squaresWidth;
    case 'outlined':
      return tree.nameWidth;
    default:
      return tree.nameWidth;
  }
}

ctx.font = '32px courier';
prepareTree(treeJson);
treeJson.subTrees.forEach(subtree => {
  prepareTree(subtree, 0, maxY + 100)
})
console.log(treeJson);


function renderTree(tree) {
  const drawFunc = currentView === 'outlined'
    ? drawRect
    : fillRect

  drawFunc(tree.x, tree.y + parentPadding, tree.width, elementHeight - parentPadding * 2);

  if (currentView === 'outlined' || tree.nameWidth < tree.width) {
    drawText(tree.shortName, tree.x + tree.width / 2 - tree.nameWidth / 2, tree.y + elementHeight - 15);
  }
  if (tree.children) {
    tree.children.forEach((child) => {
      renderTree(child);
    });
  }
}

function drawTestPattern() {
  ctx.fillStyle = '#991111';
  drawRect(-50, -50, 100, 100);

  ctx.fillStyle = '#eecc77';
  drawRect(-35, -35, 20, 20);
  drawRect(15, -35, 20, 20);
  drawRect(-35, 15, 70, 20);

  ctx.fillStyle = '#fff';
  drawText('Simple Pan and Zoom Canvas', -255, -100);
}

function getShortName(name) {
  const chunks = name.split(/[/\\]/g);
  return chunks[chunks.length - 1];
}

const origin = {
  x: -window.innerWidth / 2,
  y: -window.innerHeight / 2,
};

const frozenDragOrigin = {
  x: origin.x,
  y: origin.y,
};

const tooltip = {
  x: origin.x,
  y: origin.y,
  text: '',
  visible: false,
};

const zoomIntensity = 0.15;
let scale = 1;


function draw() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  ctx.translate(0, 0);
  ctx.scale(scale, scale);
  ctx.translate(-origin.x, -origin.y);

  renderTree(treeJson);
  treeJson.subTrees.forEach(subtree => {
    renderTree(subtree)
  });

  if (tooltip.visible) {
    drawTooltip(tooltip);
  }
  requestAnimationFrame(draw);
}


function drawRect(x, y, width, height) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#991111';
  ctx.strokeRect(x, y, width, height);
}

function fillRect(x, y, width, height) {
  ctx.fillStyle = '#991111';
  ctx.fillRect(x, y, width, height);
}

function drawText(text, x, y, size = 32, font = 'courier') {
  ctx.fillStyle = '#fff';
  ctx.font = `${size}px ${font}`;
  ctx.fillText(text, x, y);
}

function drawTooltip(tooltip) {
  const tooltipFormattedText = `Path:${tooltip.text}`;
  ctx.font = '32px courier';
  const textWidth = ctx.measureText(tooltipFormattedText).width;
  ctx.fillStyle = '#991111';
  ctx.fillRect(tooltip.x + 5 - textWidth / 2, tooltip.y - 10 - 25, textWidth, 25);
  drawText(tooltipFormattedText, tooltip.x + 10 - textWidth / 2, tooltip.y - 15);
}

let isDragging = false;
const dragStart = {
  x: 0,
  y: 0,
};

function onPointerDown(e) {
  isDragging = true;
  frozenDragOrigin.x = origin.x;
  frozenDragOrigin.y = origin.y;
  dragStart.x = e.clientX - canvas.offsetLeft;
  dragStart.y = e.clientY - canvas.offsetTop;
}

function onPointerUp(e) {
  isDragging = false;
  frozenDragOrigin.x = origin.x;
  frozenDragOrigin.y = origin.y;
}

function onPointerMove(e) {
  if (isDragging) {
    origin.x = parseInt(frozenDragOrigin.x + (dragStart.x - e.clientX) / scale);
    origin.y = parseInt(frozenDragOrigin.y + (dragStart.y - e.clientY) / scale);
  } else {
    const hit = tooltipsData.find(
      ({x0, x1, y0, y1}) =>
        e.clientX / scale > x0 - origin.x &&
        e.clientX / scale < x1 - origin.x &&
        e.clientY / scale > y0 - origin.y &&
        e.clientY / scale < y1 - origin.y);

    if (hit) {
      tooltip.x = e.clientX / scale + origin.x;
      tooltip.y = e.clientY / scale + origin.y;
      tooltip.text = hit.name;
      tooltip.visible = true;
    } else {
      tooltip.visible = false;
    }
  }
}

function adjustZoom(e) {
  if (!isDragging) {
    e.preventDefault();
    const mousex = e.clientX - canvas.offsetLeft;
    const mousey = e.clientY - canvas.offsetTop;

    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);
    origin.x -= parseInt(mousex / (scale * zoom) - mousex / scale);
    origin.y -= parseInt(mousey / (scale * zoom) - mousey / scale);
    scale *= zoom;
  }
}

canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('wheel', adjustZoom);

// Ready, set, go
draw();
