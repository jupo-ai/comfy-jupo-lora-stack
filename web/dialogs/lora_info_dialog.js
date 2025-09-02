import { ModelInfoDialog } from "./model_info/model_info_dialog.js";


// ==============================================
// LoRA情報表示ダイアログ
// ==============================================
export class LoRAInfoDialog extends ModelInfoDialog {
    /**
     * @param {Object} widget LoRAウィジェットオブジェクト
     */
    constructor(widget) {
        super(widget);
        this.modelPath = widget?.value?.lora;
        this.modelDir = "loras";
    }
}