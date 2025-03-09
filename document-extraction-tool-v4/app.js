document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('drop-area');
    const fileElem = document.getElementById('fileElem');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileType = document.getElementById('file-type');
    const fileSize = document.getElementById('file-size');
    const extractBtn = document.getElementById('extract-btn');
    const clearBtn = document.getElementById('clear-btn');
    const printBtn = document.getElementById('print-btn');
    const saveBtn = document.getElementById('save-btn');
    const emptyState = document.getElementById('empty-state');
    const loadingIndicator = document.getElementById('loading-indicator');
    const dataTableContainer = document.getElementById('data-table-container');
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');

    // Global state
    let currentFile = null;

    // Event Listeners for file drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFiles(files[0]);
        }
    }

    // Handle file selection
    fileElem.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFiles(this.files[0]);
        }
    });

    // Process the selected file
    function handleFiles(file) {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('File is too large. Maximum file size is 10MB.');
            return;
        }

        // Check file type
        const acceptedTypes = [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
            'application/rtf',
            'text/rtf'
        ];

        if (!acceptedTypes.includes(file.type)) {
            alert('Unsupported file type. Please upload PDF, Word document, or text file.');
            return;
        }

        // Display file information
        currentFile = file;
        fileName.textContent = file.name;
        fileType.textContent = getFileTypeDisplay(file.type);
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.remove('hidden');
        
        // Enable action buttons
        extractBtn.disabled = false;
        clearBtn.disabled = false;
    }

    // Helper functions for file display
    function getFileTypeDisplay(mimeType) {
        const types = {
            'application/pdf': 'PDF',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (DOCX)',
            'application/msword': 'Word (DOC)',
            'text/plain': 'Text',
            'application/rtf': 'Rich Text Format',
            'text/rtf': 'Rich Text Format'
        };
        
        return types[mimeType] || mimeType;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    // Extract data from the file
    extractBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        
        // Show loading indicator
        emptyState.classList.add('hidden');
        dataTableContainer.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        
        // Prepare file for upload
        const formData = new FormData();
        formData.append('file', currentFile);
        
        try {
            // Call extraction API
            const response = await fetch('/.netlify/functions/extract', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to extract data');
            }
            
            const data = await response.json();
            displayData(data);
        } catch (error) {
            console.error('Error:', error);
            alert('Error extracting data from document. Please try again.');
            
            // Show empty state again
            loadingIndicator.classList.add('hidden');
            emptyState.classList.remove('hidden');
        }
    });

    // Display extracted data in table
    function displayData(data) {
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
        
        // Clear existing table
        tableHeader.innerHTML = '';
        tableBody.innerHTML = '';
        
        if (!data || !data.headers || !data.rows || data.rows.length === 0) {
            // No data extracted
            emptyState.classList.remove('hidden');
            emptyState.innerHTML = '<p>No data could be extracted from this document</p>';
            return;
        }
        
        // Create table header
        const headerRow = document.createElement('tr');
        data.headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        tableHeader.appendChild(headerRow);
        
        // Create table rows
        data.rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                td.contentEditable = true;
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
        
        // Show the table
        dataTableContainer.classList.remove('hidden');
    }

    // Clear all data and reset the form
    clearBtn.addEventListener('click', () => {
        // Reset file selection
        fileElem.value = '';
        currentFile = null;
        
        // Hide file info
        fileInfo.classList.add('hidden');
        
        // Disable buttons
        extractBtn.disabled = true;
        clearBtn.disabled = true;
        
        // Reset table view
        dataTableContainer.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = '<p>Upload a document and click "Extract Data" to view results here</p>';
    });

    // Print functionality
    printBtn.addEventListener('click', () => {
        window.print();
    });

    // Save as PDF
    saveBtn.addEventListener('click', () => {
        // Create a hidden link to trigger download
        const link = document.createElement('a');
        
        // Get current date for filename
        const date = new Date().toISOString().slice(0, 10);
        link.download = `extracted-data-${date}.pdf`;
        
        // Use browser print to PDF functionality
        window.print();
        
        // Note: This doesn't actually create a PDF download
        // In a real application, you would use a library like jsPDF or
        // a server-side PDF generator through an API call
        alert('To save as PDF, use your browser\'s "Print" dialog and select "Save as PDF" as the destination.');
    });
});
