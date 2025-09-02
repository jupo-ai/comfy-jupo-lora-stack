import { $el } from "../../../../scripts/ui.js";
import { loadCSS, mk_endpoint } from "../../utils.js";

loadCSS("dialogs/model_info/css/preview_section.css");

// ==============================================
// Preview Section
// ==============================================
export class PreviewSection {
    constructor({ onUpload, onDelete }) {
        // UI要素
        this.element = null; // 全体コンテナ
        this.media = null;
        this.onUpload = onUpload;
        this.onDelete = onDelete;

        this.createUI();
    }

    // ------------------------------------------
    // UIを作成
    // ------------------------------------------
    createUI() {
        this.element = $el("div.jupo-preview-section");
        this.mediaContainer = $el("div.jupo-preview-section-media-container");

        this.uploadButton = $el("button.jupo-preview-section-upload-button", {
            textContent: "Upload", 
            onclick: () => this.fileInput.click()
        });

        this.fileInput = $el("input", {
            type: "file", 
            accept: "image/*, video/*, audio/*", 
            style: { display: "none" }, 
            onchange: (e) => this.handleFileUpload(e)
        });

        this.deleteButton = $el("button.jupo-preview-section-delete-button", {
            textContent: "Delete", 
            onclick: () => this.handleFileDelete()
        });

        const actionContainer = $el("div.jupo-preview-section-actions", [
            this.uploadButton, 
            this.fileInput, 
            this.deleteButton
        ]);

        this.element.append(this.mediaContainer, actionContainer);
    }

    
    // ------------------------------------------
    // ファイルが選ばれた時の処理
    // ------------------------------------------
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.onUpload) {
            return;
        }

        // Base64に
        const reader = new FileReader();
        reader.onload = (e) => {
            const filePayload = {
                name: file.name, 
                data: e.target.result
            };
            this.onUpload(filePayload);
        };
        reader.onerror = (error) => {
            console.error("ファイルの読み込みに失敗しました: ", error);
        }
        reader.readAsDataURL(file);

        event.target.value = "";
    }

    // ------------------------------------------
    // ファイル削除の時の処理
    // ------------------------------------------
    handleFileDelete() {
        if (!this.onDelete || !this.media) return;

        if (confirm("プレビューを削除しますか？")) {
            this.onDelete();
        }
    }


    // ------------------------------------------
    // メディアを表示
    // ------------------------------------------
    display(mediaData) {
        this.clear();

        if (!mediaData?.token) {
            this.showEmpty();
            return;
        }

        const { token, cate } = mediaData;
        const url = mk_endpoint(`media/${token}`);

        try {
            this.media = this.createMedia(cate, url);
            if (this.media) {
                this.mediaContainer.append(this.media);
            }
        
        } catch (error) {
            console.warn("プレビューの表示に失敗: ", error);
            this.showEmpty();
        }
    }


    // ------------------------------------------
    // メディア要素を作成
    // ------------------------------------------
    createMedia(type, url) {
        const commonProps = {
            className: `jupo-preview-section-media jupo-preview-section-media--${type}`, 
            src: url,
            onerror: () => this.showEmpty()
        };

        switch (type) {
            case "image":
                return $el("img", {
                    ...commonProps, 
                    crossOrigin: "anonymous"
                });
            
            case "video":
                return $el("video", {
                    ...commonProps, 
                    controls: true, 
                    muted: true, 
                    autoplay: true, 
                    loop: true,
                    preload: "metadata"
                });
            
            case "audio":
                return $el("audio", {
                    ...commonProps, 
                    controls: true, 
                    preload: "metadata"
                });
            
            default:
                return null;
        }
    } 

    
    // ------------------------------------------
    // プレビューなし
    // ------------------------------------------
    showEmpty() {
        this.clear();
        const noPreviewElement = $el("div.jupo-preview-section-empty", [
            $el("div", { textContent: "Empty" })
        ]);
        this.mediaContainer.append(noPreviewElement);
    }


    // ------------------------------------------
    // クリア
    // ------------------------------------------
    clear() {
        if (this.media) {
            this.stopMedia();
        }
        this.mediaContainer.replaceChildren();
        this.media = null;
    }

    // ------------------------------------------
    // メディア再生停止
    // ------------------------------------------
    stopMedia() {
        if (!this.media) return;

        const tagName = this.media.tagName;
        if ((tagName === "VIDEO" || tagName === "AUDIO")) {
            this.media.pause();
            this.media.currentTime = 0;
        }
    }
}
