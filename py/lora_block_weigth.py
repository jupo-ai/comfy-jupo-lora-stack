import folder_paths
import comfy.utils


class LoRALoader:
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
        
    
        return (model, clip)
    
    
    # --- LBW 適用 ---
    def apply_lbw(self, model, clip, lora, strength_model, strength_clip, lbw):
        pass