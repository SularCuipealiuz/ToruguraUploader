const uploadArea = document.getElementById("upload-area");
const fileInput = document.getElementById("file-input");
const fileLinksContainer = document.getElementById("file-links");

const apiKey = "JeMYhB2GQvn7QBfILeZwk3rHs2fquCoX";
const apiUrl = "https://api.fivemanage.com/api/image";

uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "#00f";
});
uploadArea.addEventListener("dragleave", () => {
    uploadArea.style.borderColor = "#ccc";
});
uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "#ccc";
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

function handleFiles(files) {
    Array.from(files).forEach((file) => uploadFile(file));
}

function uploadFile(file) {
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

    compressImage(file).then((compressedFile) => {
        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append(
            "metadata",
            JSON.stringify({
                name: file.name,
                description: "登録用アップローダーを使ってアップロードしました",
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

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const maxWidth = 800;
            const maxHeight = 800;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const aspectRatio = width / height;
                if (width > height) {
                    width = maxWidth;
                    height = maxWidth / aspectRatio;
                } else {
                    height = maxHeight;
                    width = maxHeight * aspectRatio;
                }
            }

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
