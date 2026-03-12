const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const partsInput = document.getElementById('partsInput');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const results = document.getElementById('results');
const filesList = document.getElementById('filesList');
const currentFiles = document.getElementById('currentFiles');

// Drag & drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    fileInput.files = e.dataTransfer.files;
});

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) uploadFile();
});

async function uploadFile() {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('parts', partsInput.value);

    try {
        progress.style.display = 'block';
        results.style.display = 'none';
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            displayResults(data);
            loadCurrentFiles();
            progress.style.display = 'none';
            results.style.display = 'block';
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
        progress.style.display = 'none';
    }
}

function displayResults(data) {
    filesList.innerHTML = `
        <p><strong>Original: ${data.originalRows.toLocaleString()} rows</strong></p>
        <p><strong>Split into ${data.parts} parts</strong></p>
        ${data.files.map(file => `
            <div class="file-item success">
                <div>
                    <strong>${file.name}</strong><br>
                    <small>${file.rows.toLocaleString()} rows • ${(file.size / 1024 / 1024).toFixed(1)} MB</small>
                </div>
                <a href="${file.downloadUrl}" download>⬇️ Download</a>
            </div>
        `).join('')}
    `;
}

async function loadCurrentFiles() {
    const response = await fetch('/files');
    const files = await response.json();
    currentFiles.innerHTML = files.length ? files.map(f => `
        <div class="file-item">
            <span>${f}</span>
            <div>
                <a href="/uploads/${f}" download>⬇️ Download</a>
                <button class="delete-btn" onclick="deleteFile('${f}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('') : '<p>No files available</p>';
}

async function clearFiles() {
    await fetch('/clear', { method: 'DELETE' });
    loadCurrentFiles();
    results.style.display = 'none';
}

async function deleteFile(filename) {
    // Simple delete by renaming/moving - or implement proper delete endpoint
    loadCurrentFiles();
}

// Load current files on start
loadCurrentFiles();
