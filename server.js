const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory
fs.ensureDirSync('./uploads');

// Multer config for large files (500MB limit)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only XLSX, XLS, CSV files allowed'), false);
    }
  }
});

// Upload and process endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');

    const { parts = 10 } = req.body;
    const numParts = parseInt(parts);
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Calculate rows per part
    const rowsPerPart = Math.ceil(jsonData.length / numParts);
    
    // Create split files
    const splitFiles = [];
    for (let i = 0; i < numParts; i++) {
      const startRow = i * rowsPerPart;
      const endRow = Math.min(startRow + rowsPerPart, jsonData.length);
      const partData = jsonData.slice(startRow, endRow);

      if (partData.length === 0) break;

      // Create new worksheet
      const newWs = XLSX.utils.aoa_to_sheet(partData);
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, newWs, `Part_${i + 1}`);

      // Save split file
      const splitFilename = `split_${req.file.filename}_part_${i + 1}.xlsx`;
      const splitPath = path.join('uploads', splitFilename);
      XLSX.writeFile(newWb, splitPath);

      splitFiles.push({
        name: splitFilename,
        rows: partData.length,
        size: (await fs.stat(splitPath)).size,
        downloadUrl: `/uploads/${splitFilename}`
      });
    }

    // Cleanup original file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      originalRows: jsonData.length,
      parts: numParts,
      files: splitFiles
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get upload status/files
app.get('/files', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) return res.json([]);
    const xlsxFiles = files.filter(f => f.endsWith('.xlsx'));
    res.json(xlsxFiles);
  });
});

// Clear all files
app.delete('/clear', (req, res) => {
  fs.emptyDirSync('uploads');
  res.json({ success: true, message: 'All files cleared' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
