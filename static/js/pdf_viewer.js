let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');
let currentDocumentId = null;

document.getElementById('pdf-viewer').appendChild(canvas);

function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(function(page) {
        let viewport = page.getViewport({scale: scale});
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        let renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        let renderTask = page.render(renderContext);

        renderTask.promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
            loadAnnotations();
        });
    });

    document.getElementById('page-num').textContent = num;
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
}

async function loadPDF(documentId, filename) {
    currentDocumentId = documentId;
    const loadingTask = pdfjsLib.getDocument(`/uploads/${encodeURIComponent(filename)}`);
    try {
        pdfDoc = await loadingTask.promise;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        renderPage(pageNum);
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('An error occurred while loading the PDF. Please try again.');
    }
}

async function loadAnnotations() {
    try {
        const response = await fetch(`/annotations/${currentDocumentId}`);
        const annotations = await response.json();
        displayAnnotations(annotations);
    } catch (error) {
        console.error('Error loading annotations:', error);
    }
}

function displayAnnotations(annotations) {
    const pdfViewer = document.getElementById('pdf-viewer');
    const annotationsList = document.getElementById('annotations-list');
    annotationsList.innerHTML = '';

    // Remove existing annotations
    document.querySelectorAll('.annotation-highlight, .annotation-note').forEach(el => el.remove());

    annotations.forEach(ann => {
        if (ann.page === pageNum) {
            if (ann.type === 'highlight' && ann.highlight_rects) {
                ann.highlight_rects.forEach(rect => {
                    const highlightElement = document.createElement('div');
                    highlightElement.className = 'annotation-highlight';
                    highlightElement.style.position = 'absolute';
                    highlightElement.style.left = `${rect.x}px`;
                    highlightElement.style.top = `${rect.y}px`;
                    highlightElement.style.width = `${rect.width}px`;
                    highlightElement.style.height = `${rect.height}px`;
                    highlightElement.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                    highlightElement.style.pointerEvents = 'none';
                    highlightElement.title = ann.content;
                    pdfViewer.appendChild(highlightElement);
                });
            } else if (ann.type === 'note') {
                const noteElement = document.createElement('div');
                noteElement.className = 'annotation-note';
                noteElement.style.position = 'absolute';
                noteElement.style.left = `${ann.position_x}px`;
                noteElement.style.top = `${ann.position_y}px`;
                noteElement.textContent = 'Note';
                noteElement.title = ann.content;
                pdfViewer.appendChild(noteElement);
            }
        }

        const listItem = document.createElement('div');
        listItem.className = 'mb-2';
        listItem.innerHTML = `
            <strong>${ann.type === 'highlight' ? 'Highlight' : 'Note'}</strong> (Page ${ann.page}):
            <p>${ann.content}</p>
        `;
        annotationsList.appendChild(listItem);
    });
}

document.getElementById('highlight-btn').addEventListener('click', function() {
    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('mouseup', addHighlight);
});

document.getElementById('note-btn').addEventListener('click', function() {
    canvas.style.cursor = 'text';
    canvas.addEventListener('click', addNote);
});

async function addHighlight(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const page = await pdfDoc.getPage(pageNum);
    const scale = canvas.width / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale: scale });

    const textContent = await page.getTextContent();
    const textItems = textContent.items;

    const highlightRects = [];
    const selectedText = [];

    for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i];
        const itemRect = viewport.convertToViewportRectangle(item.transform);

        if (
            y >= itemRect[1] &&
            y <= itemRect[3] &&
            x >= itemRect[0] &&
            x <= itemRect[2]
        ) {
            highlightRects.push({
                x: itemRect[0],
                y: itemRect[1],
                width: itemRect[2] - itemRect[0],
                height: itemRect[3] - itemRect[1]
            });
            selectedText.push(item.str);
        }
    }

    if (highlightRects.length > 0) {
        const content = selectedText.join(' ');
        await saveAnnotation('highlight', content, x, y, highlightRects);
        loadAnnotations();
    }

    canvas.style.cursor = 'default';
    canvas.removeEventListener('mouseup', addHighlight);
}

async function addNote(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const content = prompt('Enter your note:');
    if (content) {
        await saveAnnotation('note', content, x, y);
        loadAnnotations();
    }

    canvas.style.cursor = 'default';
    canvas.removeEventListener('click', addNote);
}

async function saveAnnotation(type, content, x, y, highlightRects = null) {
    try {
        const response = await fetch('/annotations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                document_id: currentDocumentId,
                type: type,
                content: content,
                page: pageNum,
                position_x: x,
                position_y: y,
                highlight_rects: highlightRects
            }),
        });
        const result = await response.json();
        if (!result.success) {
            throw new Error('Failed to save annotation');
        }
    } catch (error) {
        console.error('Error saving annotation:', error);
        alert('An error occurred while saving the annotation.');
    }
}

document.getElementById('prev-page').addEventListener('click', onPrevPage);
document.getElementById('next-page').addEventListener('click', onNextPage);
