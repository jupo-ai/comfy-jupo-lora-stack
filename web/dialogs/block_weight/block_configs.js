

function create_slider_info(key_prefix, name_prefix, start, end, type) {
    let result = [];

    if (start <= end) {
        for (let i = start; i <= end; i++) {
            let key = `${key_prefix}.${i}.`;
            let name = `${name_prefix}.${String(i).padStart(2, "0")}`;
            result.push([key, name, type]);
        }
    } else {
        for (let i = start; i >= end; i--) {
            let key = `${key_prefix}.${i}.`;
            let name = `${name_prefix}.${String(i).padStart(2, "0")}`;
            result.push([key, name, type]);
        }
    }

    return result;
}


export const BlockConfigs = {
    SD: {
        upper: [
            ["transformer.text_model.encoder.", "BASE", "clip"]
        ], 
        bottom: [
            ["middle_block.", "MIDDLE", "model"]
        ], 
        left: create_slider_info("input_blocks", "INPUT", 0, 11, "model"), 
        right: create_slider_info("output_blocks", "OUTPUT", 0, 11, "model"), 
    }, 

    FLUX: {
        upper: [
            ["clip_", "CLIP", "clip"], 
            ["t5xxl", "T5", "clip"], 
        ], 
        left: [
            ["_in", "IN", "model"], 
            ...create_slider_info("double_blocks", "DOUBLE", 0, 18, "model")
        ], 
        right: [
            ...create_slider_info("single_blocks", "SINGLE", 0, 37, "model"), 
            ["final_layer", "OUT", "model"], 
        ], 
    }, 

    WAN: {
        left: create_slider_info("blocks", "BLOCK", 0, 19, "model"), 
        right: create_slider_info("blocks", "BLOCK", 20, 39, "model"), 
    }
}