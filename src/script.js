let originalChordsText = "";
const noteOrder = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const chordRegex = /([A-H][b#]?)(m?(?:add|sus|dim|aj|aug|#|°|\+|\-)?\d*\-?\d*)?(\n?\W)/g;
const chordRegexWithNC = /((?:[Nn]\.[Cc]\.))|([A-H][b#]?)(m?(?:add|sus|dim|aj|aug|#|°|\+|\-)?\d*\-?\d*)?(\n?\W)/g;
let scrollInterval = null;
let currentFontSize = 16;
let transposeOffset = 0;

async function get_chords(){
  const response = await fetch('src/chords_ceg.json');
  const chords_ceg = await response.json();
  
  return [chords_ceg];
}

function transposeNote(note, semitones) {
  const index = noteOrder.indexOf(note);
  if (index === -1) return note;
  return noteOrder[(index + semitones + 12) % 12];
}

function transposeChords(semitones) {
  if (!originalChordsText) return;

  let transposed = originalChordsText.replace(chordRegexWithNC, (match, nc, note, suffix, ending) => {
    if(nc) return nc;
    const base = note;
    const transposedNote = transposeNote(base, semitones);
    return transposedNote + (suffix || '') + (ending || '');
  });

  document.getElementById('chords-text').innerHTML = transposed;
  let chordsFound = Array.from(transposed.matchAll(chordRegexWithNC), m => m[2] + (m[3] || ''));
  const uniqueChords = [...new Set(chordsFound)];
  const chordsList = document.getElementById('chords-list');
  chordsList.innerHTML = '';
  if (uniqueChords.length > 0) {
    uniqueChords.forEach(chord => {
      const li = document.createElement('li');
      li.textContent = chord;
      chordsList.appendChild(li);
    });
  } else {
    chordsList.innerHTML = '<li>Аккорды не найдены</li>';
  }
}

function changeTranspose(step) {
  transposeOffset += step;
  document.getElementById('transposeDisplay').textContent = transposeOffset;
  transposeChords(transposeOffset);
}

function changeFontSize(step) {
  currentFontSize += step;
  if (currentFontSize < 12) currentFontSize = 12;
  if (currentFontSize > 32) currentFontSize = 32;
  document.getElementById('chords-text').style.fontSize = currentFontSize + 'px';
  document.getElementById('fontSizeDisplay').textContent = currentFontSize;
}

function toggleAutoScroll() {
  const btn = document.getElementById('playPauseBtn');
  if (scrollInterval) {
    stopAutoScroll();
    btn.innerHTML = '▶';
  } else {
    startAutoScroll();
    btn.innerHTML = `&#9724`;
  }
}

function startAutoScroll() {
  stopAutoScroll();
  const speed = parseInt(document.getElementById('scrollSpeed').value);
  if (speed <= 0) return;
  scrollInterval = setInterval(() => {
    window.scrollBy({ top: 2, behavior: 'auto' });
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
      stopAutoScroll();
      document.getElementById('playPauseBtn').textContent = '▶';
    }
  }, speed);
}

function stopAutoScroll() {
  if (scrollInterval) clearInterval(scrollInterval);
  scrollInterval = null;
}

document.addEventListener('keydown', function (e) {
  if (e.code === 'Space') {
    e.preventDefault();
    toggleAutoScroll();
  }
});

function handleScrollSpeedChange() {
  if (scrollInterval) {
    startAutoScroll(); // Restart with new speed if already scrolling
  }
}


function convertToAmerican(chordsText) {
  return chordsText.replace(/\b(B)(m?\d*)\b/g, 'A#$2').replace(/\b(H)(m?\d*)\b/g, 'B$2');
}

function convertToEuropean(chordsText) {
  return chordsText.replace(/\b(B)(m?\d*)\b/g, 'H$2');
}

let NotationInit = false;

function toggleNotation() {
  let chordsText = document.getElementById('chords-text').innerHTML;
  let chordsFound = [];
  if (chordsText) {
    chordsFound = Array.from(chordsText.matchAll(chordRegexWithNC), m => (m[2] || '') + (m[3] || ''));
  }
  const uniqueChords = [...new Set(chordsFound)];

  const hasEuropeanH = uniqueChords.includes("H");
  const hasAmericanB = uniqueChords.includes("B");
    
  let text = hasAmericanB && !hasEuropeanH? convertToEuropean(chordsText) : convertToAmerican(chordsText);
  document.getElementById('chords-text').innerHTML = text;
  document.getElementById('notationBtn').textContent = hasEuropeanH ? 'Американская' : !hasAmericanB ? 'Не влияет' : 'Европейская';

}

async function parseAmdm() {
  stopAutoScroll();
  document.getElementById('playPauseBtn').textContent = '▶';

  const url = document.getElementById('urlInput').value.trim();
  if (!url || !url.includes('amdm.ru')) {
    alert('Введите корректную ссылку с сайта amdm.ru');
    return;
  }

  const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);

  try {
    const response = await fetch(proxyUrl);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const chordsTextElement = doc.querySelector('pre.field__podbor_new');
    let chordsText = chordsTextElement ? chordsTextElement.textContent : "Не найден";
    
    chordsText = chordsText.replace(/(\[.*\]:)/g, `$1\n`);
    chordsText = chordsText.replace(/(\/\*\ ?([\s\S]*?)\*\/)/g, `<span class="inchords-comment">$2</span>\n`);

    chordsText = chordsText.replace(chordRegexWithNC, '<span class="chord">$1$2$3</span>$4');

    originalChordsText = chordsText;
    document.getElementById('chords-text').innerHTML = chordsText;
    
    let chordsFound = [];
    if (chordsText) {
      chordsFound = Array.from(chordsText.matchAll(chordRegexWithNC), m => (m[2] || '') + (m[3] || ''));
    }
    const chordsL = [
      await (await fetch("src/chords_ceg.json")).json()
    ];

    const uniqueChords = [...new Set(chordsFound)];
    const chordsList = document.getElementById('chords-list');
    chordsList.innerHTML = '';
    if (uniqueChords.length > 0) {
      
      uniqueChords.forEach(chord => {
        const li = document.createElement('li');
        var canvas = document.createElement('canvas');
        li.appendChild(canvas);
        chordsList.appendChild(li);
        var ctx = canvas.getContext('2d');
        console.log(chordsL[0]);
        drawFretboardOnCanvas(ctx, chordsL[0].tuning, chordsL[0].chords[chord][0], "balalaika", chord);
      });
    } else {
      chordsList.innerHTML = '<li>Аккорды не найдены</li>';
    }

    const authorLinkElement = doc.querySelector('.b-author__name a[href]');
    const authorLink = document.getElementById('author-link');
    if (authorLinkElement) {
      const authorName = authorLinkElement.textContent.trim();
      const authorHref = authorLinkElement.getAttribute('href').trim();
      authorLink.textContent = authorName;
      authorLink.setAttribute('href', authorHref);
    } else {
      authorLink.textContent = 'Не найден';
      authorLink.setAttribute('href', '#');
    }

    const statsElements = doc.querySelectorAll('.b-stats .b-stats__item');
    statsElements.forEach(stat => {
      const icon = stat.querySelector('i');
      if (!icon) return;
      const text = stat.textContent.replace(icon.outerHTML, '').trim();

      if (icon.classList.contains('fa-eye')) {
        document.getElementById('views').textContent = text;
      } else if (icon.classList.contains('fa-star')) {
        document.getElementById('stars').textContent = text;
      } else if (icon.classList.contains('fa-calendar')) {
        document.getElementById('date').textContent = text;
      }
    });

    const titleElement = doc.querySelector('h1');
    if (titleElement) {
      const fullTitle = titleElement.textContent.replace(/[\s]+/g, ' ').trim();
      const match = fullTitle.match(/(.+?)\s*-\s*(.+?),/);
      if (match) {
        document.getElementById('artist').textContent = match[1];
        document.getElementById('song-title').textContent = match[2];
      } else {
        document.getElementById('artist').textContent = 'Неизвестен';
        document.getElementById('song-title').textContent = fullTitle;
      }
    }

  } catch (error) {
    console.error(error);
    alert('Ошибка при загрузке или парсинге страницы.');
  }
}



function drawFretboardOnCanvas(ctx, tuning, pressedFrets, instrumentType = 'guitar', chordName) {
  const FRET_DISTANCE_RATIO = Math.pow(2, 1 / 12);
  const DOT_PATTERN = {
    guitar: [3, 2, 2, 2, 3],
    balalaika: [2, 3, 2, 3, 2]
  };

  const STRING_SPACING = 20;
  const FRETS_START_X = 12;
  let FIRST_FRET_WIDTH = 8;

  // Determine needed frets and whether to hide zero fret
  const allPressedFrets = pressedFrets.filter(f => f !== null && f !== 0);
  let minFretToShow = 0;

  if (allPressedFrets.length > 0) {
    const maxPressedFret = Math.max(...allPressedFrets);
    const minPressedFret = Math.min(...allPressedFrets.filter((x) => x != 0));
  neededFrets = maxPressedFret - minPressedFret + 3 + (maxPressedFret == minPressedFret);
  minFretToShow = Math.max(minPressedFret - 1, 1);
  }

  // Calculate total width
  let calculatedWidth = FRETS_START_X;
  let currentX = FRETS_START_X * 2;
  for (let i = 0; i < neededFrets; i++) {
    currentX += FIRST_FRET_WIDTH / Math.pow(FRET_DISTANCE_RATIO, i);
  }

  calculatedWidth = 100;

  FIRST_FRET_WIDTH *= (calculatedWidth - FRETS_START_X * 2) / (currentX - FRETS_START_X * 2);
  console.log(FIRST_FRET_WIDTH);

  const CANVAS_HEIGHT = tuning.length * STRING_SPACING + 30;
  ctx.canvas.width = calculatedWidth;
  ctx.canvas.height = CANVAS_HEIGHT;
  ctx.clearRect(0, 0, calculatedWidth, CANVAS_HEIGHT);

  // Recalculate fret positions
  let fretPositions = [];
  currentX = FRETS_START_X;
  for (let i = 0; i <= neededFrets; i++) {
    fretPositions.push(Math.round(currentX));
    currentX += FIRST_FRET_WIDTH / Math.pow(FRET_DISTANCE_RATIO, i + 1);
  }

  // Dot pattern logic
  const dotSpacing = DOT_PATTERN[instrumentType] || [2, 2, 2, 2, 2];
  let dotPositions = [];
  let pos = 0;
  for (let interval of dotSpacing) {
    pos += interval;
    dotPositions.push(pos);
  }
for (let interval of dotSpacing) {
    pos += interval;
    dotPositions.push(pos);
  }


  ctx.fillStyle = "#555";
  for (let f = 1; f < fretPositions.length - 1; f++) {
    const globalFretNumber = f + minFretToShow;
    if (dotPositions.includes(globalFretNumber)) {
      const centerX = (fretPositions[f] + fretPositions[f + 1]) / 2;
      const centerY = 10;

      if (globalFretNumber === 12 || globalFretNumber === 24) {
        ctx.beginPath(); ctx.arc(centerX - 5, centerY, 4, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(centerX + 5, centerY, 4, 0, 2 * Math.PI); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI); ctx.fill();
      }
    }
  }

  // Draw vertical fret lines
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#999";
  for (let f = 0; f < fretPositions.length; f++) {
    const x = fretPositions[f];
    ctx.beginPath(); ctx.moveTo(x, 17); ctx.lineTo(x, tuning.length * STRING_SPACING + 3); ctx.stroke();

    // Label the fret number
    ctx.fillStyle = "black";
    const globalFretNumber = f + minFretToShow - 1;
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(globalFretNumber, x, tuning.length * STRING_SPACING + 12);
  }

  // Draw strings and markers
  ctx.lineWidth = 2;
  for (let s = 0; s < tuning.length; s++) {
    const y = 20 + s * STRING_SPACING;
    ctx.beginPath();
    ctx.moveTo(fretPositions[0], y);
    ctx.lineTo(fretPositions[fretPositions.length - 1], y);
    ctx.stroke();

    const openNote = tuning[s];

    for (let f = 0; f < fretPositions.length; f++) {
      const globalFretNumber = f + minFretToShow;
      const x = (fretPositions[f] + (fretPositions[f + 1] || fretPositions[f])) / 2;
      const pressedFret = pressedFrets[s];

      if (pressedFret === globalFretNumber && pressedFret != 0) {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fillStyle = "#4a90e2"; ctx.fill(); ctx.fillStyle = "black";
      }

      if (f === fretPositions.length - 1 && pressedFret === 0) {
        ctx.font = "10px Arial"; ctx.textAlign = "center"; ctx.fillText("O", x + 8, y + 3);
      } else if (f === fretPositions.length - 1 && (pressedFret === null || pressedFret === undefined)) {
        ctx.font = "10px Arial"; ctx.textAlign = "center"; ctx.fillText("X", x + 8, y + 3);
      }
    }

    ctx.font = "10px Arial"; ctx.textAlign = "start"; ctx.fillText(openNote, fretPositions[0] - 12, y + 3);
  }

  ctx.font = "10px Arial"; ctx.textAlign = "center"; ctx.fillText(chordName, calculatedWidth / 2, CANVAS_HEIGHT - 5);
}