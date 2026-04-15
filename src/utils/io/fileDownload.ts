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

  // Cleanup after the browser has had time to initiate the download.
  // requestAnimationFrame ensures we wait at least one frame, then a short
  // timeout gives the browser time to start the download before we revoke.
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  });
}
