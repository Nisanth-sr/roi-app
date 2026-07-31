export type UploadProgressCallback = (percent: number) => void;

export type UploadWithProgressResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

/**
 * POST FormData via XHR so upload byte progress is available.
 * Calls onProgress with 0–100 while bytes are sent; callers should treat
 * the gap between 100% and resolve as server processing.
 */
export function uploadWithProgress<T = unknown>(
  url: string,
  formData: FormData,
  onProgress: UploadProgressCallback,
  signal?: AbortSignal
): Promise<UploadWithProgressResult<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    const onAbort = () => {
      xhr.abort();
    };

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Upload aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const percent = Math.min(
        100,
        Math.round((event.loaded / event.total) * 100)
      );
      onProgress(percent);
    };

    xhr.upload.onload = () => {
      onProgress(100);
    };

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      let data: T;
      try {
        data = JSON.parse(xhr.responseText) as T;
      } catch {
        reject(new Error("Invalid JSON response from upload"));
        return;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      });
    };

    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("Network error during upload"));
    };

    xhr.onabort = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    onProgress(0);
    xhr.send(formData);
  });
}
