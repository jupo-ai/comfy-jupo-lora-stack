import { ModelInfoDialog } from "./model_info/model_info_dialog.js";


// ==============================================
// Checkpoint情報表示ダイアログ
// ==============================================
export class CheckpointInfoDialog extends ModelInfoDialog {
    constructor(widget) {
        super(widget);
        this.modelPath = widget?.value;
        this.modelDir = "checkpoints";
        this.forceDisableTrigger = true;
    }
}