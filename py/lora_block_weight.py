import folder_paths
import comfy.utils
import comfy.lora
import comfy.lora_convert

class LBWLoRALoader:
    def __init__(self):
        self.loaded_lora = None
    
    # --- LoRA 読込 ---    
    def load_lora(self, model, clip, lora_name, strength_model, strenght_clip, lbw):
        if strength_model == 0 and strenght_clip == 0:
            return (model, clip)
        
        lora_path = folder_paths.get_full_path_or_raise("loras", lora_name)
        lora = None
        if self.loaded_lora is not None:
            if self.loaded_lora[0] == lora_path:
                lora = self.loaded_lora[1]
            else:
                self.loaded_lora = None
        
        if lora is None:
            lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
            self.loaded_lora = (lora_path, lora)
        
        model, clip = self.apply_lbw(model, clip, lora, strength_model, strenght_clip, lbw)
    
        return (model, clip)
    
    
    # --- LBW 適用 ---
    def apply_lbw(self, model, clip, lora, strength_model, strength_clip, lbw={}):
        model_key_map = {}
        clip_key_map = {}
        
        model_block_info = lbw.get("model", {})
        clip_block_info = lbw.get("clip", {})

        if model is not None:
            model_key_map = comfy.lora.model_lora_keys_unet(model.model)
            model_block_info = self.normalize_block_info(model_block_info, model_key_map)
        
        if clip is not None:
            clip_key_map = comfy.lora.model_lora_keys_clip(clip.cond_stage_model)
            clip_block_info = self.normalize_block_info(clip_block_info, clip_key_map)
    
        key_map = model_key_map | clip_key_map
        lora = comfy.lora_convert.convert_lora(lora)
        loaded = comfy.lora.load_lora(lora, key_map)
        
        new_modelpatcher = None
        new_clip = None
        
        if model is not None:
            new_modelpatcher = model.clone()
            
            for key, value in loaded.items():
                patch = {key: value}
                patch_strength = strength_model * model_block_info.get(key, 1)
                new_modelpatcher.add_patches(patch, patch_strength)
        
        if clip is not None:
            new_clip = clip.clone()

            for key, value in loaded.items():
                patch = {key: value}
                patch_strength = strength_clip * clip_block_info.get(key, 1)
                new_clip.add_patches(patch, patch_strength)
        
        return (new_modelpatcher, new_clip)
    
    
    # --- キー名正規化 ---
    def normalize_block_info(self, block_info, lora_key_map):
        normalized = {}

        internal_keys = list(lora_key_map.values())

        for search_key, weight in block_info.items():
            for internal_key in internal_keys:
                if search_key in internal_key:
                    normalized[internal_key] = weight
        
        return normalized

