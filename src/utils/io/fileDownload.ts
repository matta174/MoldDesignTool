/**
 * Triggers a browser file download from an ArrayBuffer or string.
 */
export function downloadFile(
  data: ArrayBuffer | string,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  let blob: Blob;

  if (data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: mimeType });
  } else {
    blob = new Blob([data], { type: 'text/plain' });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
