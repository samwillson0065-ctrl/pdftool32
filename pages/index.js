import { useState } from "react";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export default function Home() {
  const [content, setContent] = useState("");
  const [titles, setTitles] = useState("");
  const [filenames, setFilenames] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const generatePDF = async (title, fileName, content) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const { width, height } = page.getSize();
    const titleFontSize = 22;
    const contentFontSize = 12;
    const titleWidth = timesRomanFont.widthOfTextAtSize(title, titleFontSize);
    const titleX = (width - titleWidth) / 2;
    let cursorY = height - 80;
    page.drawText(title, { x: titleX, y: cursorY, size: titleFontSize, font: timesRomanFont, color: rgb(0,0,0) });
    cursorY -= 30;

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const wrapped = wrapText(line, 550, contentFontSize, timesRomanFont);
      for (const w of wrapped) {
        if (cursorY < 50) {
          cursorY = height - 80;
          pdfDoc.addPage([612, 792]);
        }
        page.drawText(w, { x: 40, y: cursorY, size: contentFontSize, font: timesRomanFont, color: rgb(0,0,0) });
        cursorY -= 18;
      }
    }
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: "application/pdf" });
  };

  function wrapText(text, maxWidth, fontSize, font) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  const handleGenerate = async () => {
    setLoading(true);
    const titleList = titles.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
    const fileList = filenames.split(/\r?\n/).map(f => f.trim()).filter(Boolean);
    if (!content || !titleList.length || !fileList.length) {
      alert("Please fill all boxes with matching lines.");
      setLoading(false);
      return;
    }

    const results = [];
    const zip = new JSZip();
    const folder = zip.folder("pdfs");

    for (let i = 0; i < titleList.length; i++) {
      const title = titleList[i];
      const fileName = fileList[i] || `file_${i+1}`;
      const pdfBlob = await generatePDF(title, fileName, content);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      results.push({ title, fileName, pdfUrl });
      const arrayBuffer = await pdfBlob.arrayBuffer();
      folder.file(`${fileName}.pdf`, arrayBuffer);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const zipUrl = URL.createObjectURL(blob);
    setResults(results);
    setLoading(false);

    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = "all_pdfs.zip";
    a.click();
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-blue-700">📄 Title to PDF Generator (with Preview)</h1>
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow space-y-4">
        <label className="block font-medium text-gray-700">Content (shared for all PDFs)</label>
        <textarea rows="6" value={content} onChange={(e)=>setContent(e.target.value)} className="w-full p-3 border rounded" placeholder="Type or paste your content here..." />

        <label className="block font-medium text-gray-700">Titles (one per line)</label>
        <textarea rows="5" value={titles} onChange={(e)=>setTitles(e.target.value)} className="w-full p-3 border rounded" placeholder="Coinbase Customer Service\nRobinhood Support" />

        <label className="block font-medium text-gray-700">File Names (one per line)</label>
        <textarea rows="5" value={filenames} onChange={(e)=>setFilenames(e.target.value)} className="w-full p-3 border rounded" placeholder="coinbase-customer-service\nrobinhood-support" />

        <button disabled={loading} onClick={handleGenerate} className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Generating..." : "Generate PDFs & Download ZIP"}
        </button>
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
