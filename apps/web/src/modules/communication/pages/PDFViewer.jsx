import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import { useParams } from 'react-router-dom';
// Setting worker for PDF rendering
// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
const PDFViewer = () => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);

  const { filename } = useParams();
  useEffect(() => {
    const fetchPDF = async () => {
    //   try {
    //     const response = await fetch(`http://192.168.177.162:4000/upload/${filename}`); // Replace with your backend URL
    //     const blob = await response.blob();
    //     const pdfBlobUrl = URL.createObjectURL(blob); // Convert blob to URL
    //     setPdfUrl(pdfBlobUrl);
    //   } catch (error) {
    //     console.error('Error fetching PDF:', error);
      }
    //  };

    fetchPDF();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <div className='bg-slate-200'>
      {!pdfUrl ? (
        <Document file={ `${import.meta.env.VITE_PORT}/uploads/${filename}`} onLoadSuccess={onDocumentLoadSuccess} className="grid justify-center ">
          {Array.from(new Array(numPages), (el, index) => (
            <Page key={`page_${index + 1}`} pageNumber={index + 1} renderTextLayer={false} className="mb-6" scale={1.2}/>
          ))}
        </Document>
      ) : (
        <p>Loading PDF...</p>
      )}
    </div>
  );
};

export default PDFViewer;
