// pages/index.js
import { useState, useEffect } from "react";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export default function Home() {
  const [content, setContent] = useState("");
  const [titles, setTitles] = useState("");
  const [filenames, setFilenames] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState([]);
  const [zipUrl, setZipUrl] = useState("");

  useEffect(() => {
    return () => { if (zipUrl) URL.revokeObjectURL(zipUrl); };
  }, [zipUrl]);

  const slugify = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file";

  const wrapText = (text, maxWidth, fontSize, font) => {
    if (!text) return [""];
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      const wpx = font.widthOfTextAtSize(test, fontSize);
      if (wpx > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const generatePDF = async (title, content) => {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([612, 792]); // US Letter
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const margin = 40;
    const titleFontSize = 24;
    const contentFontSize = 12;
    const lineGap = 18;

    let { width, height } = page.getSize();
    const titleWidth = font.widthOfTextAtSize(title, titleFontSize);
    const titleX = (width - titleWidth) / 2;
    let cursorY = height - margin - 10;

    // Title centered
    page.drawText(title, { x: titleX, y: cursorY, size: titleFontSize, font, color: rgb(0,0,0) });
    cursorY -= 30;

    const drawLine = (txt) => {
      ({ width, height } = page.getSize());
      const maxWidth = width - margin * 2;
      const lines = wrapText(txt, maxWidth, contentFontSize, font);
      for (const ln of lines) {
        if (cursorY < margin + lineGap) {
          page = pdfDoc.addPage([612, 792]);
          ({ width, height } = page.getSize());
          cursorY = height - margin - 10;
        }
        page.drawText(ln, { x: margin, y: cursorY, size: contentFontSize, font, color: rgb(0,0,0) });
        cursorY -= lineGap;
      }
    };

    (content || "").split(/\r?\n/).forEach(drawLine);

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: "application/pdf" });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setStatus("Starting...");
    setResults([]);
    if (zipUrl) { URL.revokeObjectURL(zipUrl); setZipUrl(""); }

    const titleList = titles.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
    const fileListRaw = filenames.split(/\r?\n/).map(f => f.trim()).filter(Boolean);

    if (!content || !titleList.length) {
      alert("Please add content and at least one title.");
      setLoading(false);
      return;
    }

    const fileList = titleList.map((t, i) => fileListRaw[i] || slugify(t));

    const out = [];
    const zip = new JSZip();
    const folder = zip.folder("pdfs");

    for (let i = 0; i < titleList.length; i++) {
      setStatus(`Generating ${i + 1} of ${titleList.length}...`);
      const title = titleList[i];
      const fileName = fileList[i];
      const pdfBlob = await generatePDF(title, content);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      out.push({ title, fileName, pdfUrl });
      const buffer = await pdfBlob.arrayBuffer();
      folder.file(`${fileName}.pdf`, buffer);
      // yield to UI
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 0));
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    setZipUrl(url);
    setResults(out);
    setStatus("✅ Completed!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-blue-700">📄 Title to PDF Generator (v3)</h1>

      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow space-y-4">
        <label className="block font-medium text-gray-700">Content (shared for all PDFs)</label>
        <textarea rows="6" value={content} onChange={(e)=>setContent(e.target.value)} className="w-full p-3 border rounded" placeholder="Type or paste your content here..." />

        <label className="block font-medium text-gray-700">Titles (one per line)</label>
        <textarea rows="5" value={titles} onChange={(e)=>setTitles(e.target.value)} className="w-full p-3 border rounded" placeholder={"Coinbase Customer Service\nRobinhood Support"} />

        <label className="block font-medium text-gray-700">File Names (one per line — optional; defaults to a slug of the title)</label>
        <textarea rows="5" value={filenames} onChange={(e)=>setFilenames(e.target.value)} className="w-full p-3 border rounded" placeholder={"coinbase-customer-service\nrobinhood-support"} />

        {status && <p className="text-center text-sm font-semibold text-gray-600">{status}</p>}

        <button disabled={loading} onClick={handleGenerate} className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Generating..." : "Generate"}
        </button>

        {zipUrl && (
          <a href={zipUrl} download="all_pdfs.zip" className="block w-full text-center bg-emerald-600 text-white py-3 rounded font-semibold hover:bg-emerald-700">
            Download All (ZIP)
          </a>
        )}
      </div>

      {results.length > 0 && (
        <div className="max-w-3xl mx-auto mt-8 space-y-4">
          <h2 className="text-xl font-semibold mb-3">Generated PDFs:</h2>
          {results.map((r, i) => (
            <div key={i} className="border p-4 rounded bg-white shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-gray-500">{r.fileName}.pdf</p>
                </div>
                <a href={r.pdfUrl} download={`${r.fileName}.pdf`} className="text-blue-600 underline">Download</a>
              </div>
              <iframe src={r.pdfUrl} className="w-full h-[480px] border rounded" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
