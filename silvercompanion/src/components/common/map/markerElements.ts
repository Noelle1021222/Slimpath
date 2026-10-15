import { monogram } from '@/lib/format'

/**
 * Plain DOM markers shared by the MapLibre and Google implementations, so the
 * companion looks identical whichever map draws it.
 */
export function companionMarkerElement(name: string, avatarUrl?: string | null) {
  const root = document.createElement('div')
  root.className = 'sc-companion-marker'
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', `${name} 的目前位置`)
  root.innerHTML = `
    <span class="sc-cone"></span>
    <span class="sc-pulse"></span>
    <span class="sc-face">${avatarUrl ? `<img src="${avatarUrl}" alt="" />` : `<b>${monogram(name)}</b>`}</span>
  `
  return root
}

export function destinationMarkerElement(label: string) {
  const root = document.createElement('div')
  root.className = 'sc-home-marker'
  root.setAttribute('role', 'img')
  root.setAttribute('aria-label', label)
  root.innerHTML = `
    <span class="sc-home-ring"></span>
    <span class="sc-home-pin">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/></svg>
    </span>
  `
  return root
}

export function setMarkerHeading(el: HTMLElement, heading: number | null) {
  const cone = el.querySelector<HTMLElement>('.sc-cone')
  if (!cone) return
  cone.style.opacity = heading == null ? '0' : '1'
  if (heading != null) cone.style.transform = `translate(-50%, -50%) rotate(${heading}deg)`
}

/** ease-in-out for marker gliding */
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
