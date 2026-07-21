export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('studio-toast', { detail: message }));
}
