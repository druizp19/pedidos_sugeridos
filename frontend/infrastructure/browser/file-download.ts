import type { FileDownload } from '@/application/ports/report-gateway';
export const browserFileDownload: FileDownload = {
  save(file, filename) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
