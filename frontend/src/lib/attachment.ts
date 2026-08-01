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
          <style>*{margin:0;padding:0;box-sizing:border-box;}
          html,body{width:100%;height:100%;overflow:hidden;background:#000;font-family:sans-serif;}
          .wrap{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
          img{max-width:100%;max-height:100%;object-fit:contain;}
          embed{width:100%;height:100%;border:none;}
          .btns{position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:99;}
          .btns a,.btns button{padding:10px 18px;border-radius:6px;border:none;cursor:pointer;font-size:14px;font-weight:500;opacity:0.85;transition:opacity 0.2s;}
          .btns a:hover,.btns button:hover{opacity:1;}
          .dl{background:#6366f1;color:white;text-decoration:none;display:inline-block;}
          .cl{background:#374151;color:white;}</style></head>
          <body>
          <div class="btns">
            <a class="dl" href="${url}" download="${filename || "attachment"}">Download</a>
            <button class="cl" onclick="window.close()">Close</button>
          </div>
          <div class="wrap">
            ${isImage ? `<img src="${url}" alt="attachment"/>` : `<embed src="${url}" type="${mime}"/>`}
          </div>
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
      const w = window.open("", "_blank");
      if (w) {
        const ext = (mime.split("/")[1] || "file").toUpperCase();
        w.document.write(`
          <!DOCTYPE html>
          <html>
          <head><title>${filename || "Attachment"}</title>
          <style>*{margin:0;padding:0;box-sizing:border-box;}
          html,body{width:100%;height:100%;overflow:hidden;background:#1a1a2e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;}
          .card{background:#fff;border-radius:12px;padding:48px 64px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.4);}
          .icon{font-size:64px;margin-bottom:16px;}
          .name{font-size:18px;font-weight:600;color:#1f2937;margin-bottom:8px;word-break:break-all;}
          .type{font-size:14px;color:#6b7280;margin-bottom:24px;}
          .btns{display:flex;gap:12px;justify-content:center;}
          .btns a,.btns button{padding:12px 24px;border-radius:8px;border:none;cursor:pointer;font-size:15px;font-weight:500;text-decoration:none;display:inline-block;}
          .dl{background:#6366f1;color:white;}
          .dl:hover{background:#4f46e5;}
          .cl{background:#374151;color:white;}
          .cl:hover{background:#1f2937;}</style></head>
          <body>
          <div class="card">
            <div class="icon">&#128196;</div>
            <div class="name">${filename || "Attachment"}</div>
            <div class="type">${ext} File</div>
            <div class="btns">
              <a class="dl" href="${url}" download="${filename || "attachment"}">Download & Open</a>
              <button class="cl" onclick="window.close()">Close</button>
            </div>
          </div>
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
