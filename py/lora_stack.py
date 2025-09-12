from comfy.comfy_types import IO
from .utils import Field
from .lora_block_weight import LBWLoRALoader
from nodes import LoraLoader

import folder_paths
from comfy.model_patcher import ModelPatcher
from comfy.sd import CLIP
import comfy.hooks
import os
from pathlib import Path
import json


def get_available_loras(stack: list[dict]) -> list[dict]:
    available_loras = []
    exist_loras = folder_paths.get_filename_list("loras")

    for value in stack:
        file = value.get("lora")
        
        if file in exist_loras:
            available_loras.append(value)
        else:
            if not file == "None":
                print(f"{file} is not Found. skipped.")
    
    return available_loras


def get_stack(unique_id=None, extra_pnginfo=None, lora_list_str="") -> tuple[list[dict], dict]:

    lora_list = []
    try:
        nodes = extra_pnginfo.get("workflow").get("nodes")
        for node in nodes:
            if (str(node.get("id")) == str(unique_id)):
                lora_list = node.get("lora_list")
    except Exception as e:
        print(f"Failed to load LoRA-List from extra_pnginfo: {e}")
    
    # extra_pnginfoから取得したlora_listが空の場合、JSON形式のlora_listから取得を試みる
    if not lora_list:
        try:
            lora_list = json.loads(lora_list_str)
        except Exception as e:
            print(f"Failed to load LoRA-List from JSON string: {e}")
    
    # lora_list = [lora for lora in lora_list if lora.get("enabled")]
    for lora in lora_list:
        lora["lora"] = str(Path(lora.get("lora"))) # パス形式を統一
    
    stack = []
    trigger = ""
    if lora_list:
        stack = lora_list
        
        for lora in lora_list:
            enabled = lora.get("enabled", False)
            enable_trigger = lora.get("enabled_trigger", False)
            trigger_value = lora.get("trigger", "")
            if enabled and enable_trigger and trigger_value.strip():
                trigger += trigger_value
    
    return (stack, trigger)


def apply_stack(stack, model: ModelPatcher, clip: CLIP):
    available_loras = get_available_loras(stack)
    prev_hooks = None
    
    model = model.clone()
    clip = clip.clone()
        
    for value in available_loras:
        enabled = value.get("enabled", False)
        file = value.get("lora", "")
        strength_model = value.get("strength_model", 1)
        strength_clip = value.get("strength_clip", 1)
        clip_mode = value.get("clip_mode", False)
        
        enabled_lbw = value.get("enabled_block", False)
        lbw = value.get("block", {})
        
        start = max(0, value.get("start", 0))
        end = min(value.get("end", 1), 1)
        
        if not enabled: continue
        if not file or file == "None": continue
        
        if not clip_mode:
            strength_clip = strength_model
        
        if clip is None:
            strength_clip = 0
        
        if not enabled_lbw:
            lbw = {}
        
        
        if start > 0 or end < 1:
            prev_hooks = LBWLoRALoader().load_lora_with_hook(
                model, 
                clip, 
                file, 
                strength_model, 
                strength_clip, 
                lbw, 
                start, 
                end, 
                prev_hooks
            )
        elif enabled_lbw:
            model, clip = LBWLoRALoader().load_lora(
                model, 
                clip, 
                file, 
                strength_model, 
                strength_clip, 
                lbw, 
            )
        else:
            model, clip = LoraLoader().load_lora(
                model, 
                clip, 
                file, 
                strength_model, 
                strength_clip
            )
    
    # Hookを適用
    hooks = prev_hooks
    if hooks is not None:
        clip.apply_hooks_to_conds = hooks
        clip.patcher.forced_hooks = hooks.clone()
        clip.use_clip_schedule = True
        clip.patcher.register_all_hook_patches(hooks, comfy.hooks.create_target_dict(comfy.hooks.EnumWeightTarget.Clip))

    return (model, clip)



# ===============================================
# LoRA Stack
# ===============================================
class JupoLoRAStack:
    @classmethod
    def INPUT_TYPES(cls): 
        return {
            "required": {}, 
            "optional": {
                "prev_stack": ("LORASTACK", {}),
                "prev_trigger": Field.string(forceInput=True), 
                "lora_list": Field.string(multiline=True), 
            }, 
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }
    
    RETURN_TYPES = ("LORASTACK", IO.STRING)
    RETURN_NAMES = ("stack", "trigger")
    FUNCTION = "execute"
    
    def execute(self, prev_stack=[], prev_trigger="", unique_id=None, extra_pnginfo=None, lora_list=""):
        stack, trigger = get_stack(unique_id, extra_pnginfo, lora_list)

        stack = prev_stack + stack
        trigger = prev_trigger + trigger
        
        return (stack, trigger)


# ===============================================
# LoRA Loader
# ===============================================
class JupoLoRALoader:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": Field.model(), 
                "clip": Field.clip(), 
            }, 
            "optional": {
                "prev_stack": ("LORASTACK", {}), 
                "prev_trigger": Field.string(forceInput=True), 
                "lora_list": Field.string(multiline=True), 
            }, 
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }
    
    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.STRING)
    RETURN_NAMES = ("MODEL", "CLIP", "trigger")
    FUNCTION = "execute"
    
    def execute(self, model, clip=None, prev_stack=[], prev_trigger="", unique_id=None, extra_pnginfo=None, lora_list=""):
        stack, trigger = get_stack(unique_id, extra_pnginfo, lora_list)
        stack = prev_stack + stack
        trigger = prev_trigger + trigger
        
        model, clip = apply_stack(stack, model, clip)

        return (model, clip, trigger)
        


# ===============================================
# Apply LoRA Stack
# ===============================================
class ApplyLoRAStack:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": Field.model(), 
                "clip": Field.clip(), 
            }, 
            "optional": {
                "stack": ("LORASTACK", {})
            }
        }
    
    RETURN_TYPES = (IO.MODEL, IO.CLIP)
    FUNCTION = "execute"

    def execute(self, model, clip=None, stack=[]):
        model, clip = apply_stack(stack, model, clip)

        return (model, clip)



# ===============================================
# Stack to WanVideo Wrapper
# ===============================================
class StackToWanWrapper:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "stack": ("LORASTACK", {}), 
            }, 
            "optional": {
                "low_mem_load": Field.boolean(default=False), 
                "merge_loras": Field.boolean(default=True), 
            }
        }
    
    RETURN_TYPES = ("WANVIDLORA", )
    FUNCTION = "execute"

    def execute(self, stack: list, low_mem_load=False, merge_loras=True):
        loras_list = []
        available_loras = get_available_loras(stack)

        for value in available_loras:
            enabled = value.get("enabled", False)
            file = value.get("lora", "")
            strength_model = value.get("strength_model", 1)
            enabled_block = value.get("enabled_block", False)
            model_type = value.get("model_type", None)
            block_info = value.get("block", {}).get("model", {})

            if not enabled: continue
            if not file or file == "None": continue
            if strength_model == 0: continue
            
            if enabled:
                wrapper_lora = {
                    "path": folder_paths.get_full_path("loras", file), 
                    "strength": strength_model, 
                    "name": os.path.splitext(file)[0], 
                    "blocks": {}, 
                    "layer_filter": "", 
                    "low_mem_load": low_mem_load, 
                    "merge_loras": merge_loras
                }
                if enabled_block and model_type == "WAN" and block_info:
                    wrapper_lora["blocks"] = block_info

                loras_list.append(wrapper_lora)
        
        return (loras_list, )



