// Pixel Clock — a tiny dependency-free retro clock widget.
// Updates every second and remembers the chosen theme.

const pad = (n) => String(n).padStart(2, '0')

function render() {
  const now = new Date()
  document.getElementById('time').textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  document.getElementById('date').textContent = now.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

const THEME_KEY = 'pixel-clock-theme'

function applyTheme(theme) {
  document.body.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* storage may be unavailable — ignore */
  }
}

document.getElementById('theme').addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light')
})

applyTheme((() => {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark'
  } catch {
    return 'dark'
  }
})())

render()
setInterval(render, 1000)
