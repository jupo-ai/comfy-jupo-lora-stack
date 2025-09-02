import { $el } from "../../../../scripts/ui.js";
import { loadCSS } from "../../utils.js";
import { BaseDialog } from "../base/base_dialog.js";

loadCSS("dialogs/simple/css/simple_dialog.css");

// ==============================================
// シンプルなコンテンツ表示用ダイアログ
// ==============================================
export class SimpleDialog extends BaseDialog {

    constructor() {
        super();

        this.container.classList.add("jupo-simple-dialog-container");

        this.contentWrapper = $el("div.jupo-simple-dialog-wrapper");
        this.container.append(this.contentWrapper);
    }

    // ------------------------------------------
    // 開く
    // ------------------------------------------
    show(data = {}) {
        // 以前のデータをクリア
        this.contentWrapper.replaceChildren();

        const content = $el("div.jupo-simple-dialog-content", {
            textContent: JSON.stringify(data, null, 4), 
        });
        this.contentWrapper.append(content);
        
        super.show();
    }
}