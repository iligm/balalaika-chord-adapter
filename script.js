let originalChordsText = "";
const noteOrder = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const chordRegex = /([A-H][b#]?)(m?(?:add|sus|dim|aj|aug|#|°|\+|\-)?\d*\-?\d*)?(\n?\W)/g;
const chordRegexWithNC = /((?:[Nn]\.[Cc]\.))|([A-H][b#]?)(m?(?:add|sus|dim|aj|aug|#|°|\+|\-)?\d*\-?\d*)?(\n?\W)/g;
let scrollInterval = null;
let currentFontSize = 16;
let transposeOffset = 0;

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