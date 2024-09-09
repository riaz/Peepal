document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const documentList = document.getElementById('document-list');
    const messageContainer = document.createElement('div');
    messageContainer.className = 'alert mt-3';
    messageContainer.style.display = 'none';
    uploadForm.after(messageContainer);

    function showMessage(message, isError = false) {
        messageContainer.textContent = message;
        messageContainer.className = `alert mt-3 ${isError ? 'alert-danger' : 'alert-success'}`;
        messageContainer.style.display = 'block';
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('pdf-file');
        const formData = new FormData();
        if (fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]);
        } else {
            showMessage('Please select a file to upload', true);
            return;
        }
        
        console.log('FormData:', formData); // Add this line for debugging

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            console.log('Response:', response); // Add this line for debugging
            const result = await response.json();
            if (result.success) {
                showMessage('File uploaded successfully!');
                loadDocuments();
            } else {
                showMessage(`Error uploading file: ${result.error}`, true);
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(`An error occurred while uploading the file: ${error.message}`, true);
        }
    });

    async function loadDocuments() {
        try {
            const response = await fetch('/documents');
            const documents = await response.json();
            documentList.innerHTML = '';
            documents.forEach(doc => {
                const docElement = document.createElement('a');
                docElement.href = '#';
                docElement.className = 'list-group-item list-group-item-action';
                docElement.textContent = doc.filename;
                docElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadPDF(doc.id, doc.filename);
                });
                documentList.appendChild(docElement);
            });
        } catch (error) {
            console.error('Error loading documents:', error);
            showMessage('Error loading documents. Please try again.', true);
        }
    }

    loadDocuments();
});
