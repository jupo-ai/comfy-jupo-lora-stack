import { BlockWeightDialog } from "./block_weight/block_dialog.js";

// ==============================================
// LoRA Block Weight ダイアログ
// ==============================================
export class LoRABlockWeightDialog extends BlockWeightDialog {
    constructor(widget) {
        super(widget);

        this.modelPath = widget?.value?.lora;
    }
}