# Document Data Extraction Tool

A lightweight internal web application that enables users to extract specific data from various document types, including PDFs, Word documents, text files, and more.

## Features

- Simple two-panel interface: document upload and data display
- Support for multiple file formats (PDF, DOCX, DOC, TXT, RTF)
- Extracted data displayed in an editable table
- Export functionality (print and save as PDF)
- Drag-and-drop file upload

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Netlify Functions (Node.js)
- **Deployment:** Netlify

## Setup Instructions

### Local Development

1. Clone this repository
   ```bash
   git clone https://github.com/your-username/document-extraction-tool.git
   cd document-extraction-tool
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Install Netlify CLI (if you don't have it)
   ```bash
   npm install -g netlify-cli
   ```

4. Run locally
   ```bash
   netlify dev
   ```

### Deployment

1. Connect to Netlify using one of these methods:

   **Option 1: Netlify UI**
   - Fork/push this repository to GitHub
   - Log in to Netlify
   - Click "New site from Git"
   - Choose your repository
   - Use the following build settings:
     - Build command: leave blank
     - Publish directory: `.`

   **Option 2: Netlify CLI**
   - Run `netlify deploy` and follow the prompts
   - When ready, run `netlify deploy --prod`

## Usage

1. Open the web application
2. Upload a document by dragging and dropping or using the file browser
3. Click "Extract Data" to process the document
4. View and edit the extracted data in the table
5. Use the buttons to clear, print, or save the data as needed

## Future Enhancements

- Integration with Python backend for advanced document processing
- Support for more document formats
- Custom extraction rules for specific document types
- User authentication for secure access
- Persistent storage options for extracted data

## License

Internal use only
