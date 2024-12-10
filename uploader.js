const uploadAreaResize = document.getElementById("upload-area-resize");
const uploadAreaCompress = document.getElementById("upload-area-compress");
const fileInputResize = document.getElementById("file-input-resize");
const fileInputCompress = document.getElementById("file-input-compress");
const fileLinksContainer = document.getElementById("file-links");

const apiKey = "JeMYhB2GQvn7QBfILeZwk3rHs2fquCoX";
const apiUrl = "https://api.fivemanage.com/api/image";

// Event listeners for drag-and-drop and file input
uploadAreaResize.addEventListener("click", () => fileInputResize.click());
uploadAreaCompress.addEventListener("click", () => fileInputCompress.click());

uploadAreaResize.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadAreaResize.style.borderColor = "#00f";
});
uploadAreaResize.addEventListener("dragleave", () => {
    uploadAreaResize.style.borderColor = "#ccc";
});
uploadAreaResize.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadAreaResize.style.borderColor = "#ccc";
    handleFiles(e.dataTransfer.files, "resize");
});

uploadAreaCompress.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadAreaCompress.style.borderColor = "#00f";
});
uploadAreaCompress.addEventListener("dragleave", () => {
    uploadAreaCompress.style.borderColor = "#ccc";
});
uploadAreaCompress.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadAreaCompress.style.borderColor = "#ccc";
    handleFiles(e.dataTransfer.files, "compress");
});

fileInputResize.addEventListener("change", (e) => handleFiles(e.target.files, "resize"));
fileInputCompress.addEventListener("change", (e) => handleFiles(e.target.files, "compress"));

function handleFiles(files, type) {
    Array.from(files).forEach((file) => uploadFile(file, type));
}

function uploadFile(file, type) {
    const listItem = document.createElement("div");
    listItem.className = "file-link uploading";

    const imagePreview = document.createElement("img");
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.alt = "画像プレビュー";
    imagePreview.style.maxWidth = "50px";
    imagePreview.style.maxHeight = "50px";
    imagePreview.style.marginRight = "10px";

    const previewContainer = document.createElement("div");
    previewContainer.style.display = "flex";
    previewContainer.style.alignItems = "center";

    previewContainer.appendChild(imagePreview);

    const linkText = document.createElement("span");
    linkText.textContent = `${file.name} - アップロード中...`;

    previewContainer.appendChild(linkText);
    listItem.appendChild(previewContainer);

    fileLinksContainer.appendChild(listItem);

    let processingFunction = type === "resize" ? resizeImage : compressImage;

    processingFunction(file).then((processedFile) => {
        if (processedFile.size > 1024 * 1024) {
            // If the file exceeds 1MB, compress it to be under 1MB
            return compressTo1MB(processedFile);
        }
        return processedFile;
    }).then((finalFile) => {
        const formData = new FormData();
        formData.append("file", finalFile);
        formData.append(
            "metadata",
            JSON.stringify({
                name: file.name,
                description: "File Uploaderを使ってアップロードしました",
            })
        );

        fetch(apiUrl, {
            method: "POST",
            headers: {
                Authorization: apiKey,
            },
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.url) {
                    linkText.textContent = data.url;
                    listItem.className = "file-link success";
                    listItem.onclick = () => window.open(data.url, "_blank");
                } else {
                    throw new Error("アップロードに失敗しました");
                }
            })
            .catch((err) => {
                linkText.textContent = `${file.name}のアップロードエラー`;
                listItem.className = "file-link error";
                console.error(err);
            });
    });
}

function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const maxHeight = 300;
            let width = img.width;
            let height = img.height;

            if (height > maxHeight) {
                const aspectRatio = width / height;
                height = maxHeight;
                width = maxHeight * aspectRatio;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("画像のリサイズに失敗しました"));
                    }
                },
                "image/jpeg"
            );
        };

        img.onerror = function () {
            reject(new Error("画像の読み込みに失敗しました"));
        };

        img.src = URL.createObjectURL(file);
    });
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const width = img.width;
            const height = img.height;

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("画像の圧縮に失敗しました"));
                    }
                },
                "image/jpeg",
                0.7
            );
        };

        img.onerror = function () {
            reject(new Error("画像の読み込みに失敗しました"));
        };

        img.src = URL.createObjectURL(file);
    });
}

function compressTo1MB(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function () {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const width = img.width;
                const height = img.height;

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size <= 1024 * 1024) {
                            resolve(blob);
                        } else if (blob) {
                            const quality = Math.max(0.1, 0.7 * (1024 * 1024 / blob.size));
                            canvas.toBlob(
                                (compressedBlob) => {
                                    resolve(compressedBlob);
                                },
                                "image/jpeg",
                                quality
                            );
                        } else {
                            reject(new Error("圧縮に失敗しました"));
                        }
                    },
                    "image/jpeg",
                    0.7
                );
            };
            img.onerror = function () {
                reject(new Error("画像の読み込みに失敗しました"));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
