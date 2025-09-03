from comfy.comfy_types import IO
from .utils import Field, Endpoint

from nodes import LoraLoader
import folder_paths
import os

import aiohttp
from aiohttp import web
import aiofiles
import json
import hashlib
import os
import time
import mimetypes
import uuid
from urllib.parse import urlparse, unquote
import glob
from tqdm.asyncio import tqdm
import base64
from pathlib import Path


def get_available_loras(stack: list):
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


def get_stack(unique_id=None, extra_pnginfo=None):
    if not (unique_id and extra_pnginfo):
        print("unique_id, extra_pnginfo are None")
        return ([], "")
    
    lora_list = []
    nodes = extra_pnginfo.get("workflow", {}).get("nodes", [])
    for node in nodes:
        if str(node.get("id")) == str(unique_id):
            lora_list = node.get("lora_list", [])
            lora_list = [lora for lora in lora_list if lora.get("enabled")]
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


def apply_stack(stack, model, clip=None):
    available_loras = get_available_loras(stack)
        
    for value in available_loras:
        enabled = value.get("enabled", False)
        file = value.get("lora", "")
        strength_model = value.get("strength_model", 1)
        strength_clip = value.get("strength_clip", 1)
        clip_mode = value.get("clip_mode", False)
        
        if not enabled: continue
        if not file or file == "None": continue
        
        if not clip_mode:
            strength_clip = strength_model
        
        if clip is None:
            strength_clip = 0
        
        model, clip = LoraLoader().load_lora(model, clip, file, strength_model, strength_clip)

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
                "prev_trigger": Field.string(forceInput=True)
            }, 
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }
    
    RETURN_TYPES = ("LORASTACK", IO.STRING)
    RETURN_NAMES = ("stack", "trigger")
    FUNCTION = "execute"
    
    def execute(self, prev_stack=[], prev_trigger="", unique_id=None, extra_pnginfo=None):
        stack, trigger = get_stack(unique_id, extra_pnginfo)

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
                "model": Field.model()
            }, 
            "optional": {
                "clip": Field.clip(), 
                "prev_stack": ("LORASTACK", {}), 
                "prev_trigger": Field.string(forceInput=True)
            }, 
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }
    
    RETURN_TYPES = (IO.MODEL, IO.CLIP, IO.STRING)
    RETURN_NAMES = ("MODEL", "CLIP", "trigger")
    FUNCTION = "execute"
    
    def execute(self, model, clip=None, prev_stack=[], prev_trigger="", unique_id=None, extra_pnginfo=None):
        stack, trigger = get_stack(unique_id, extra_pnginfo)
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
            }, 
            "optional": {
                "clip": Field.clip(), 
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
                "blocks": ("SELECTEDBLOCKS", {}), 
                "low_mem_load": Field.boolean(default=False), 
                "merge_loras": Field.boolean(default=True), 
            }
        }
    
    RETURN_TYPES = ("WANVIDLORA", )
    FUNCTION = "execute"

    def execute(self, stack: list, blocks={}, low_mem_load=False, merge_loras=True):
        loras_list = []
        available_loras = get_available_loras(stack)

        for value in available_loras:
            enabled = value.get("enabled", False)
            file = value.get("lora", "")
            strength_model = value.get("strength_model", 1)

            if not enabled: continue
            if not file or file == "None": continue
            if strength_model == 0: continue
            
            if enabled:
                wrapper_lora = {
                    "path": folder_paths.get_full_path("loras", file), 
                    "strength": strength_model, 
                    "name": os.path.splitext(file)[0], 
                    "blocks": blocks.get("selected_blocks", {}), 
                    "layer_filter": blocks.get("layer_filter", ""), 
                    "low_mem_load": low_mem_load, 
                    "merge_loras": merge_loras
                }

                loras_list.append(wrapper_lora)
        
        return (loras_list, )




# ===============================================
# エンドポイント
# ===============================================
# --- ファイルのリストを取得
@Endpoint.get("files/{dir}")
async def get_lora_files(req: web.Request):
    directory = req.match_info["dir"]
    filename_list = folder_paths.get_filename_list(directory)
    
    return web.json_response(filename_list)


# --- モデルのフルパスを取得
def get_fullpath(name: str):
    pos = name.index("/")
    folder, name = name[:pos], name[pos+1:]

    full_path = folder_paths.get_full_path(folder, name)
    return full_path


# --- モデルのmetadataを取得
@Endpoint.get("metadata/{name}")
async def load_metadata(req: web.Request):
    name = req.match_info["name"]
    file_path = get_fullpath(name)

    if not file_path:
        return web.json_response({})
    
    try:
        metadata = get_metadata(file_path)
    except:
        metadata = {}
    
    return web.json_response(metadata)


def get_metadata(filepath):
    with open(filepath, "rb") as file:
        # https://github.com/huggingface/safetensors#format
        # 8 bytes: N, an unsigned little-endian 64-bit integer, containing the size of the header
        header_size = int.from_bytes(file.read(8), "little", signed=False)

        if header_size <= 0:
            raise BufferError("Invalid header size")

        header = file.read(header_size)
        if header_size <= 0:
            raise BufferError("Invalid header")

        header_json = json.loads(header)
        return header_json["__metadata__"] if "__metadata__" in header_json else None


# --- Civitaiから情報を取得
@Endpoint.get("civitai/{name}")
async def load_civitai_info(req: web.Request):
    name = req.match_info["name"]
    file_path = get_fullpath(name)

    if not file_path:
        return web.json_response({})
    
    # infoファイルの確認
    info = {}
    file_no_ext = os.path.splitext(file_path)[0]
    info_file = file_no_ext + ".civitai.json"

    if os.path.isfile(info_file):
        with open(info_file, mode="r", encoding="utf-8") as file:
            info = json.load(file)
    
    else:
        # civitai API から取得
        with open(file_path, mode="rb") as file:
            file_hash = hashlib.sha256(file.read()).hexdigest()
        
        url = f"https://civitai.com/api/v1/model-versions/by-hash/{file_hash}"

        # 非同期でAPIリクエスト
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    info = await response.json()
        
        # infoファイルを保存
        with open(info_file, mode="w", encoding="utf-8") as file:
            json.dump(info, file, ensure_ascii=False, indent=4)
        
    
    return web.json_response(info)

        
# --- 同フォルダからプレビューメディアを取得
# --- メディア用トークンを返す
media_cache = {}
TOKEN_EXPIRE_TIME = 3600

def cleanup_expired_tokens():
    """期限切れトークンをクリーンアップ"""
    current_time = time.time()
    expired_tokens = [
        token for token, data in media_cache.items()
        if current_time - data.get("created_at", 0) > TOKEN_EXPIRE_TIME
    ]
    
    for token in expired_tokens:
        del media_cache[token]
    
    return len(expired_tokens)

@Endpoint.get("preview/{name}")
async def get_preview_media(req: web.Request):
    res = {"path": None, "cate": None, "token": None}
    
    try:
        name = req.match_info["name"]
        file_path = get_fullpath(name)
        
        if not file_path:
            return web.json_response(res)

        # メディア候補
        SUPPORTED_EXTENSIONS = {
        "image": ["jpg", "jpeg", "bmp", "png", "webp", "gif"],
        "video": ["mp4", "webm"],
        "audio": ["mp3", "ogg", "wav"]
        }
        file_no_ext = os.path.splitext(file_path)[0]

        for cate, exts in SUPPORTED_EXTENSIONS.items():
            for ext in exts:
                if os.path.isfile(f"{file_no_ext}.{ext}"):
                    full_path = f"{file_no_ext}.{ext}"
                    
                    token = str(uuid.uuid4())
                    media_cache[token] = {
                        "path": full_path, 
                        "cate": cate, 
                        "created_at": time.time()
                    }
                    
                    res["path"] = full_path
                    res["cate"] = cate
                    res["token"] = token
                    return web.json_response(res)
        
        return web.json_response(res)
    
    except Exception as e:
        print(f"Error processing media token request: {e}")
        return web.json_response(res)


@Endpoint.get("media/{token}")
async def serve_media(req: web.Request):
    """トークン経由でメディアファイルを配信"""
    try:
        token = req.match_info["token"]
        if not token:
            return web.Response(status=400, text="Token required")
        
        media_data = media_cache.get(token)
        if not media_data:
            return web.Response(status=404, text="Token not found or expired")
        
        file_path = media_data.get("path")
        if not file_path:
            return web.Response(status=404, text="File path not found")
        
        if not os.path.isfile(file_path):
            # ファイルが存在しない場合、キャッシュからも削除
            del media_cache[token]
            return web.Response(status=404, text="File not found")
        
        # MIMEタイプ指定
        mime_type, encoding = mimetypes.guess_type(file_path)
        if not mime_type:
            # デフォルトのMIMEタイプを指定
            cate = media_data.get("cate", "")
            if cate == "image":
                mime_type = "image/jpeg"
            elif cate == "video":
                mime_type = "video/mp4"
            elif cate == "audio":
                mime_type = "audio/mpeg"
            else:
                mime_type = "application/octet-stream"
        
        headers = {"Content-Type": mime_type}
        if encoding:
            headers["Content-Encoding"] = encoding
        
        return web.FileResponse(file_path, headers=headers)
    
    except Exception as e:
        print(f"Error serving media: {e}")
        return web.Response(status=500, text="Internal server error")


# --- プレビューとして保存

async def _download_media_with_progress(save_path, url):
    print(f"Downloading preview from: {url}")
    CHUNK_SIZE = 8192
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            total_size = int(response.headers.get("content-length") or 0)
            
            pbar = tqdm(total=total_size, unit="B", unit_scale=True, desc="Downloading")
            
            async with aiofiles.open(save_path, "wb") as f:
                with pbar:
                    async for chunk in response.content.iter_chunked(CHUNK_SIZE):
                        await f.write(chunk)
                        pbar.update(len(chunk))
    print(f"Preview saved to: {save_path}")

def _remove_old_previews(model_path_no_ext, current_full_path):
    existing_previews = glob.glob(f"{model_path_no_ext}.*")
    for old_preview in existing_previews:
        if old_preview != current_full_path:
            print(f"Remove old preview: {old_preview}")
            os.remove(old_preview)

async def _save_uploaded_file(save_path, file_payload):
    print(f"Saving uploaded preview to: {save_path}")
    file_data_base64 = file_payload.get("data")
    _header, encoded_data = file_data_base64.split(",", 1)
    decoded_data = base64.b64decode(encoded_data)
    
    async with aiofiles.open(save_path, "wb") as f:
        await f.write(decoded_data)
    print("Save complete.")


@Endpoint.post("save_as_preview")
async def save_as_preview(req: web.Request):
    try:
        data = await req.json()
        apiName = data.get("apiName")
        url = data.get("url")
        file_payload = data.get("file")
        
        if not apiName or not (url or file_payload):
            return web.json_response({"status": "error", "message": "apiName and (url or file) are required."}, status=400)
        
        apiName = unquote(apiName).replace("\\", "/")
        
        full_path = get_fullpath(apiName)
        if not full_path or not os.path.exists(full_path):
            return web.json_response({"status": "error", "message": f"Model file not found: {apiName}"}, status=404)
        
        file_no_ext = os.path.splitext(full_path)[0]
        ext = ""

        if url:
            ext = os.path.splitext(urlparse(url).path)[1]
        elif file_payload and file_payload.get("name"):
            ext = os.path.splitext(file_payload["name"])[1]

        if not ext:
            return web.json_response({"status": "error", "message": "Could not determine file extension."}, status=400)
        
        save_path = f"{file_no_ext}{ext}"


        _remove_old_previews(file_no_ext, full_path)
        
        if url:
            await _download_media_with_progress(save_path, url)
        else:
            await _save_uploaded_file(save_path, file_payload)
            
        return web.json_response({"status": "success"})

    except Exception as e:
        print(f"An unexpected error occurred in save_as_preview: {e}")
        return web.json_response({"status": "error", "message": "An internal server error occurred."}, status=500)



# --- プレビューを削除
@Endpoint.post("delete_preview")
async def delete_preview(req: web.Request):
    try:
        data = await req.json()
        apiName = data.get("apiName")
        apiName = unquote(apiName).replace("\\", "/")
        full_path = get_fullpath(apiName)
        file_no_ext = os.path.splitext(full_path)[0]

        _remove_old_previews(file_no_ext, full_path)
        
        return web.json_response({"status": "success"})
        
    
    except Exception as e:
        print(f"An unexpected error occurred in delete_preview: {e}")
        return web.json_response({"status": "error", "message": "An internal server error occurred."}, status=500)