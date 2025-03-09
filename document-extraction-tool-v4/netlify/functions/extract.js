const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { PDFExtract } = require('pdf.js-extract');
const mammoth = require('mammoth');
const pdfExtract = new PDFExtract();

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Parse form data including file
  const { fields, files } = await parseFormData(event);
  
  if (!files.file) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No file uploaded' })
    };
  }

  const file = files.file;
  
  try {
    // Extract data based on file type
    let extractedData;
    const fileType = getFileType(file.originalFilename);
    
    switch (fileType) {
      case 'pdf':
        extractedData = await extractFromPDF(file.filepath);
        break;
      case 'docx':
      case 'doc':
        extractedData = await extractFromWord(file.filepath);
        break;
      case 'txt':
      case 'rtf':
        extractedData = await extractFromText(file.filepath);
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Unsupported file type' })
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(extractedData)
    };
  } catch (error) {
    console.error('Error processing file:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process file' })
    };
  } finally {
    // Clean up - remove temp file
    try {
      fs.unlinkSync(file.filepath);
    } catch (error) {
      console.error('Error removing temp file:', error);
    }
  }
};

// Helper function to parse the multipart form data
function parseFormData(event) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    
    form.parse(event, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

// Determine file type from extension
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return 'pdf';
    case '.docx':
      return 'docx';
    case '.doc':
      return 'doc';
    case '.txt':
      return 'txt';
    case '.rtf':
      return 'rtf';
    default:
      return 'unknown';
  }
}

// Extract data from PDF file
async function extractFromPDF(filePath) {
  try {
    const result = await pdfExtract.extract(filePath, {});
    
    // Process the extracted content
    const textContent = result.pages
      .map(page => page.content.map(item => item.str).join(' '))
      .join('\n');
    
    // Simple table extraction (this is a basic implementation)
    const lines = textContent.split('\n').filter(line => line.trim().length > 0);
    
    // Try to identify table-like structures in the PDF
    // This is a simplified approach - production code would need more robust parsing
    const tableLines = identifyTableLines(lines);
    
    // Attempt to extract a table structure
    if (tableLines.length > 0) {
      const headers = parseTableHeaders(tableLines[0]);
      const rows = tableLines.slice(1).map(line => parseTableRow(line, headers.length));
      
      return {
        headers,
        rows
      };
    }
    
    // Fallback for documents without table structure
    return createGenericTable(textContent);
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract data from PDF');
  }
}

// Extract data from Word document
async function extractFromWord(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const textContent = result.value;
    
    // Process similar to PDF text
    const lines = textContent.split('\n').filter(line => line.trim().length > 0);
    const tableLines = identifyTableLines(lines);
    
    if (tableLines.length > 0) {
      const headers = parseTableHeaders(tableLines[0]);
      const rows = tableLines.slice(1).map(line => parseTableRow(line, headers.length));
      
      return {
        headers,
        rows
      };
    }
    
    return createGenericTable(textContent);
  } catch (error) {
    console.error('Word extraction error:', error);
    throw new Error('Failed to extract data from Word document');
  }
}

// Extract data from plain text or RTF file
async function extractFromText(filePath) {
  try {
    const textContent = fs.readFileSync(filePath, 'utf8');
    const lines = textContent.split('\n').filter(line => line.trim().length > 0);
    
    // Similar processing as the other formats
    const tableLines = identifyTableLines(lines);
    
    if (tableLines.length > 0) {
      const headers = parseTableHeaders(tableLines[0]);
      const rows = tableLines.slice(1).map(line => parseTableRow(line, headers.length));
      
      return {
        headers,
        rows
      };
    }
    
    return createGenericTable(textContent);
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error('Failed to extract data from text file');
  }
}

// Helper functions for table extraction

// Identify potential table lines based on common delimiters
function identifyTableLines(lines) {
  // Look for lines with tabular structure (tabs, multiple spaces, commas, etc.)
  const tableLines = lines.filter(line => {
    // Check for common table delimiters
    return (
      line.includes('\t') || 
      line.split(/\s{3,}/).length > 1 ||
      line.split(',').length > 2 ||
      line.split('|').length > 2
    );
  });
  
  // If we have at least a few lines, consider it a table
  if (tableLines.length >= 3) {
    return tableLines;
  }
  
  // Otherwise, try to use the first few lines
  if (lines.length >= 3) {
    return lines.slice(0, Math.min(10, lines.length));
  }
  
  return tableLines;
}

// Parse the table headers from the first line
function parseTableHeaders(headerLine) {
  // Try to split by common delimiters
  if (headerLine.includes('\t')) {
    return headerLine.split('\t').map(h => h.trim()).filter(h => h.length > 0);
  }
  
  if (headerLine.includes('|')) {
    return headerLine.split('|').map(h => h.trim()).filter(h => h.length > 0);
  }
  
  if (headerLine.includes(',')) {
    return headerLine.split(',').map(h => h.trim()).filter(h => h.length > 0);
  }
  
  // Try multiple spaces as delimiter
  const spaceDelimited = headerLine.split(/\s{2,}/).map(h => h.trim()).filter(h => h.length > 0);
  if (spaceDelimited.length > 1) {
    return spaceDelimited;
  }
  
  // Fallback - just use word boundaries
  const words = headerLine.trim().split(/\s+/);
  if (words.length <= 4) {
    // If we have just a few words, use them as column headers
    return words;
  }
  
  // Last resort - generic columns
  return ['Column 1', 'Column 2', 'Column 3'];
}

// Parse a table row using the same logic as headers
function parseTableRow(rowLine, expectedColumns) {
  let cells = [];
  
  // Try to split by common delimiters
  if (rowLine.includes('\t')) {
    cells = rowLine.split('\t').map(c => c.trim());
  } else if (rowLine.includes('|')) {
    cells = rowLine.split('|').map(c => c.trim());
  } else if (rowLine.includes(',')) {
    cells = rowLine.split(',').map(c => c.trim());
  } else {
    // Try multiple spaces as delimiter
    cells = rowLine.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
    
    // If that didn't work well, just use simple word splitting
    if (cells.length < 2) {
      const words = rowLine.trim().split(/\s+/);
      
      // If we have the exact number of expected columns, use that
      if (words.length === expectedColumns) {
        cells = words;
      } else if (words.length > expectedColumns) {
        // If we have more words than columns, try to distribute them
        cells = [];
        const wordsPerColumn = Math.floor(words.length / expectedColumns);
        
        for (let i = 0; i < expectedColumns; i++) {
          const start = i * wordsPerColumn;
          const end = (i === expectedColumns - 1) ? words.length : (i + 1) * wordsPerColumn;
          cells.push(words.slice(start, end).join(' '));
        }
      } else {
        // Not enough words, just use what we have and pad the rest
        cells = words;
      }
    }
  }
  
  // Ensure we have the right number of cells
  while (cells.length < expectedColumns) {
    cells.push('');
  }
  
  // If we have too many cells, combine the extras into the last cell
  if (cells.length > expectedColumns && expectedColumns > 0) {
    const extra = cells.slice(expectedColumns - 1).join(' ');
    cells = cells.slice(0, expectedColumns - 1);
    cells.push(extra);
  }
  
  return cells;
}

// Create a generic table when a proper table structure can't be identified
function createGenericTable(textContent) {
  // Extract key phrases that might be important
  const lines = textContent.split('\n').filter(line => line.trim().length > 0);
  const keyPhrases = lines
    .filter(line => line.length < 100) // Skip very long lines
    .filter(line => /[A-Z]/.test(line.charAt(0))) // Start with capital letter
    .slice(0, 10); // Take at most 10 lines
  
  // Create a generic "Key - Value" table
  return {
    headers: ['Key', 'Value'],
    rows: keyPhrases.map(phrase => {
      // Try to split by common separators
      if (phrase.includes(':')) {
        const [key, ...valueParts] = phrase.split(':');
        return [key.trim(), valueParts.join(':').trim()];
      }
      
      if (phrase.includes('=')) {
        const [key, ...valueParts] = phrase.split('=');
        return [key.trim(), valueParts.join('=').trim()];
      }
      
      if (phrase.includes('-') && !phrase.startsWith('-')) {
        const [key, ...valueParts] = phrase.split('-');
        return [key.trim(), valueParts.join('-').trim()];
      }
      
      // If no separator, just use the phrase as a key
      if (phrase.length < 30) {
        return [phrase, ''];
      }
      
      // For longer phrases, try to split intelligently
      const words = phrase.split(' ');
      const midpoint = Math.floor(words.length / 2);
      
      return [
        words.slice(0, midpoint).join(' '),
        words.slice(midpoint).join(' ')
      ];
    })
  };
}
