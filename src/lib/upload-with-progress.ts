export type UploadProgressEvent = {
  phase: "uploading" | "processing";
  /** Overall 0–100 estimate for the full request (transfer + server work). */
  percent: number;
};

export type UploadProgressCallback = (event: UploadProgressEvent) => void;

export type UploadWithProgressResult<T> = {
  ok: boolean;
  status: number;
  data: T;
};

const TRANSFER_SHARE = 80; // bytes map into 0–80%; processing covers 80–100%
const PROCESSING_CAP = 95;

/**
 * POST FormData via XHR with an overall percent that stays visible for the
 * whole request. Small files often finish the network send in one tick, so
 * transfer is capped at 80% and processing creeps toward 95% until the
 * response arrives, then jumps to 100%.
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

    let phase: UploadProgressEvent["phase"] = "uploading";
    let percent = 0;
    let uploadRampTimer: ReturnType<typeof setInterval> | null = null;
    let processingTimer: ReturnType<typeof setInterval> | null = null;
    const uploadStartedAt = Date.now();

    const report = () => {
      onProgress({
        phase,
        percent: Math.min(100, Math.round(percent)),
      });
    };

    const clearTimers = () => {
      if (uploadRampTimer) {
        clearInterval(uploadRampTimer);
        uploadRampTimer = null;
      }
      if (processingTimer) {
        clearInterval(processingTimer);
        processingTimer = null;
      }
    };

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

    // Soft ramp so tiny files still show movement before the first progress event.
    uploadRampTimer = setInterval(() => {
      if (phase !== "uploading") return;
      const soft = Math.min(35, (Date.now() - uploadStartedAt) / 40);
      if (soft > percent) {
        percent = soft;
        report();
      }
    }, 50);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const mapped = (event.loaded / event.total) * TRANSFER_SHARE;
      if (mapped > percent) {
        percent = mapped;
        report();
      }
    };

    xhr.upload.onload = () => {
      if (uploadRampTimer) {
        clearInterval(uploadRampTimer);
        uploadRampTimer = null;
      }
      percent = Math.max(percent, TRANSFER_SHARE);
      phase = "processing";
      report();

      const processingStartedAt = Date.now();
      processingTimer = setInterval(() => {
        const elapsed = Date.now() - processingStartedAt;
        // Asymptote toward PROCESSING_CAP so we never hit 100% before the response.
        const creep =
          (PROCESSING_CAP - TRANSFER_SHARE) * (1 - Math.exp(-elapsed / 2500));
        percent = TRANSFER_SHARE + creep;
        report();
      }, 100);
    };

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      clearTimers();
      percent = 100;
      phase = "processing";
      report();

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
      clearTimers();
      reject(new Error("Network error during upload"));
    };

    xhr.onabort = () => {
      signal?.removeEventListener("abort", onAbort);
      clearTimers();
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    percent = 0;
    report();
    xhr.send(formData);
  });
}
