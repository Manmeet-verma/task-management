export function openAttachment(dataUrl: string, filename?: string) {
  if (!dataUrl) return;
  if (dataUrl.startsWith("data:")) {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: mime });
    const url = URL.createObjectURL(blob);

    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf";

    if (isImage || isPdf) {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`
          <!DOCTYPE html>
          <html>
          <head><title>${filename || "Attachment"}</title>
          <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#1a1a2e;font-family:sans-serif;}
          img,pdf{max-width:95vw;max-height:85vh;}
          .btns{position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:99;}
          .btns a,.btns button{padding:8px 16px;border-radius:6px;border:none;cursor:pointer;font-size:14px;font-weight:500;}
          .dl{background:#6366f1;color:white;text-decoration:none;display:inline-block;}
          .cl{background:#374151;color:white;}</style></head>
          <body>
          <div class="btns">
            <a class="dl" href="${url}" download="${filename || "attachment"}">Download</a>
            <button class="cl" onclick="window.close()">Close</button>
          </div>
          ${isImage ? `<img src="${url}" alt="attachment"/>` : `<embed src="${url}" type="${mime}" width="95vw" height="85vh"/>`}
          </body></html>
        `);
        w.document.close();
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `attachment.${mime.split("/")[1] || "bin"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `attachment.${mime.split("/")[1] || "bin"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    window.open(dataUrl, "_blank");
  }
}

export function downloadAttachment(dataUrl: string, filename?: string) {
  if (!dataUrl) return;
  if (dataUrl.startsWith("data:")) {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    const blob = new Blob([u8arr], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `attachment.${mime.split("/")[1] || "bin"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename || "attachment";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
