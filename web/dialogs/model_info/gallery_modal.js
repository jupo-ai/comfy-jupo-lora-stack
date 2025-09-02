import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";

import { BaseDialog } from "../base/base_dialog.js";

loadCSS("dialogs/model_info/css/gallery_modal.css");

// ==============================================
// Gallery Modal
// ==============================================
export class GalleryModal extends BaseDialog {
    constructor() {
        super();

        this.media = null;
        this.createUI();
    }

    // ------------------------------------------
    // UIを作成
    // ------------------------------------------
    createUI() {
        this.container.classList.add("jupo-gallery-modal-container");

        this.mediaContainer = $el("div.jupo-gallery-modal-media-container");
        this.infoContainer = $el("div.jupo-gallery-modal-info-container");

        this.container.append(this.mediaContainer, this.infoContainer);
    }


    // ------------------------------------------
    // メディアを作成
    // ------------------------------------------
    createMedia(image, index, isVideo) {
        if (isVideo) {
            this.media = $el("video.jupo-gallery-modal-media", {
                src: image.url, 
                muted: true, 
                loop: true, 
                controls: true, 
                autoplay: true,
                preload: "metadata"
            });
        } else {
            this.media = $el('img.jupo-gallery-modal-media', {
                src: image.url, 
                alt: image.meta?.prompt || `Gallery image ${index + 1}`, 
                loading: "lazy"
            })
        }

        this.mediaContainer.append(this.media);
    }

    // ------------------------------------------
    // 情報を作成
    // ------------------------------------------
    createInfo(image) {
        // Link
        const link = $el("a.jupo-info-dialog-link", {
            href: image.url, 
            textContent: "Link", 
            target: "_blank"
        });
        this.addInfoItem("Link", link);

        // プロンプト
        this.addInfoItem("ポジティブ", image?.meta?.prompt);
        this.addInfoItem("ネガティブ", image?.meta?.negativePrompt);

        // モデル
        this.addInfoItem("モデル", image?.meta?.Model);
    }

    addInfoItem(label, value) {
        const displayValue = (value == null || value === "") ? "" : value;

        const valueElement = typeof displayValue === "string"
            ? $el("span.jupo-gallery-modal-info-value", { textContent: displayValue })
            : displayValue;
        
        const labelElement = $el("div.jupo-gallery-modal-info-label", { textContent: label });

        const item = $el("div.jupo-gallery-modal-info-item", [
            labelElement, valueElement
        ]);

        this.infoContainer.append(item);
    }

    // ------------------------------------------
    // 開く
    // ------------------------------------------
    show(image, index, isVideo) {
        this.clear();

        this.createMedia(image, index, isVideo);
        this.createInfo(image);

        super.show();
    }


    // ------------------------------------------
    // クリア
    // ------------------------------------------
    clear() {
        if (this.media && this.media.tagName === "VIDEO") {
            this.media.pause();
            this.media.currentTime = 0;
        }

        this.mediaContainer.replaceChildren();
        this.infoContainer.replaceChildren();
    }
}