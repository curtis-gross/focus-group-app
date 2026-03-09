# Copyright 2024 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You mayP' a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import streamlit as st

# --- SDK IMPORTS ---
from google import genai
from google.genai import types as genai_types

# --- Standard Library & 3rd-Party Imports ---
import base64
import io
import json
import os
import time
import httpx  # For making REST API calls to Imagen & Veo
import google.auth
import google.auth.transport.requests
from PIL import Image as PILImage
from concurrent.futures import ThreadPoolExecutor, as_completed
import glob
from central_config import load_config_file

config = load_config_file("config/config.json")
if config:
    demo_mode = config["demo_mode"]
    sleep_time = config["sleep_time"]
    logo_path = config["logo_path"]
    logo_width = config["logo_width"]
    company = config["company"]
    region = config["region"]
    imagen_version = config["imagen_version"]
    model_pro = config["model_pro"]
    model_flash = config["model_flash"]
    model_flash_lite = config["model_flash_lite"]
else:
    st.write("error loading config file")

# --- Configuration ---
# --- Configuration ---
# --- Configuration ---
# --- Configuration ---

st.set_page_config(layout="wide", page_title="Automated Image-to-Video Pipeline")
pipeline_name = "media_pipeline"
default_image_name = "default"

image_prompt = "a person is using the item in a context appropriate way, facing towards the camera"
ad_prompt = f"""a person is using the product in a context appropriate way. 
End with text on the screen and call to action 'BUY NOW AT {company}.COM' styled in their brand.
Advertisement style, no sound effects, 
upbeat music and voiceover. Max 8 seconds. 
Keep all products and characters consistent.
The product is from {company}."""

# --- Configuration ---
# --- Configuration ---
# --- Configuration ---
# --- Configuration ---
# --- Configuration ---
# --- Configuration ---
# --- Configuration ---

# Create the asset directory if it doesn't exist
if not os.path.exists(f"data/{pipeline_name}"):
    os.makedirs(f"data/{pipeline_name}")


# --- Model & Project Configuration ---
# !!! --- UPDATE THESE VALUES --- !!!
PROJECT_ID = "bb-test-404418"  # <--- YOUR GOOGLE CLOUD PROJECT ID
REGION = "us-central1"     # <--- Your default region
# !!! --- END OF UPDATE SECTION --- !!!

    

GLOBAL_REGION = "global"

# Model names from your Flask app
EDIT_MODEL_NAME = "gemini-2.5-flash-image-preview"
OUTPAINT_MODEL_NAME = "imagen-3.0-capability-001"
AUDIT_MODEL_NAME = "gemini-2.5-flash-lite"
VIDEO_MODEL_NAME = "veo-3.1-generate-preview"
config = load_config_file("config/config.json")
if config:
    demo_mode = config["demo_mode"]
else:
    st.write("error loading config file")

# --- Initialize Vertex AI Clients (Multi-Region) ---
try:
    if "PROJECT_ID" not in locals():
        st.error("PROJECT_ID is not set. Please update the script.")
        st.stop()
    
    # Initialize and store the clients in session state
    if 'regional_client' not in st.session_state:
        st.session_state.regional_client = genai.Client(vertexai=True, project=PROJECT_ID, location=REGION)
    
    if 'global_client' not in st.session_state:
        st.session_state.global_client = genai.Client(vertexai=True, project=PROJECT_ID, location=GLOBAL_REGION)
    
    #st.success("Vertex AI clients initialized.")

except Exception as e:
    st.error(f"Vertex AI client initialization failed: {e}")
    st.stop()


# --- Helper Functions (Ported from Flask Logic) ---

def get_auth_token():
    """Gets a fresh authentication token using the Flask app's logic."""
    try:
        creds, _ = google.auth.default()
        auth_req = google.auth.transport.requests.Request()
        scoped_credentials = creds.with_scopes(
            ['https://www.googleapis.com/auth/cloud-platform']
        )
        scoped_credentials.refresh(auth_req)
        if not scoped_credentials.token:
            raise ValueError("Scoped credentials refresh returned no access token.")
            
        return scoped_credentials.token
        
    except Exception as e:
        error_message = str(e)
        if "No access token in response" in error_message and "id_token" in error_message:
            st.error("FATAL: AUTHENTICATION FAILED (IAM Permission Missing)")
            st.markdown(f"""
            This is an **IAM (permission) error**. The service account **does not have permission** to create *Access Tokens*.
            **How to Fix:** Grant the **"Service Account Token Creator"** role (`roles/iam.serviceAccountTokenCreator`) to your service account.
            Run this command in gcloud:
            ```bash
            gcloud projects add-iam-policy-binding {PROJECT_ID} \
                --member="serviceAccount:vertexserviceai@{PROJECT_ID}.iam.gserviceaccount.com" \
                --role="roles/iam.serviceAccountTokenCreator"
            ```
            Then wait 60 seconds and **restart this Streamlit app**.
            """)
            print(f"DEBUG (IAM Error): {e}")
            return None
        else:
            st.error(f"Failed to get auth token (unexpected error): {e}")
            print(f"DEBUG (Unexpected Auth Error): {e}")
            return None


def run_simple_edit(client, _original_image_bytes, _mime_type, _prompt):
    """1. Runs the simple image edit using Gemini (via global client)."""
    try:
        image_part = genai_types.Part(
            inline_data=genai_types.Blob(
                mime_type=_mime_type,
                data=_original_image_bytes
            )
        )
        print("----------------received images and such")
        prompt_part = genai_types.Part(text=_prompt)

        user_content = genai_types.Content(
            role="user",
            parts=[prompt_part, image_part]
        )

        generation_config = genai_types.GenerateContentConfig(
            temperature=1, top_p=0.95, max_output_tokens=8192, response_modalities=["TEXT", "IMAGE"],
            safety_settings=[genai_types.SafetySetting(category=c, threshold="OFF") for c in genai_types.HarmCategory]
        )

        print(f"DEBUG: Calling Gemini for simple edit with prompt: '{_prompt}'")
        response = client.models.generate_content(
            model=EDIT_MODEL_NAME,
            contents=[user_content],
            config=generation_config
        )

        if not response.candidates or not response.candidates[0].content or not response.candidates[0].content.parts:
            error_msg = f"Model returned no content for prompt: '{_prompt}'. Full response: {response}"
            print(f"--- ERROR in run_simple_edit (No Content): {error_msg} ---")
            return None
        
        first_part = response.candidates[0].content.parts[0]

        #print(response)

        if not hasattr(first_part, 'inline_data') or not first_part.inline_data:
            error_text = first_part.text if hasattr(first_part, 'text') else "No image data found."
            error_msg = f"The model did not return an image for prompt: '{_prompt}'. Response: {error_text}"
            print(f"--- ERROR in run_simple_edit (No Image): {error_msg} ---")
            return None

        if first_part.inline_data.mime_type != "image/png":
            error_msg = f"Model returned unexpected mime type: {first_part.inline_data.mime_type}"
            print(f"--- ERROR in run_simple_edit (Wrong Mime Type): {error_msg} ---")
            return None

        return first_part.inline_data.data

    except Exception as e:
        error_msg = f"Exception during Simple Edit for prompt '{_prompt}': {e}"
        print(f"--- EXCEPTION in run_simple_edit: {error_msg} ---")
        return None


def run_simple_edit_with_retry(client, _original_image_bytes, _mime_type, _prompt, retries=3, delay=2):
    """Wrapper for run_simple_edit to add retry logic."""
    for i in range(retries):
        image_bytes = run_simple_edit(client, _original_image_bytes, _mime_type, _prompt)
        if image_bytes:
            return image_bytes
        # Log retry attempt to console
        print(f"Attempt {i+1}/{retries} failed for prompt '{_prompt[:50]}...'. Retrying in {delay}s...")
        time.sleep(delay)
    
    print(f"--- ERROR: All {retries} attempts failed for prompt '{_prompt[:50]}...' ---")
    return None


@st.cache_data
def run_pdp_metadata_generation(_edited_image_bytes):
    """2. Generates PDP metadata for the edited image."""
    try:
        prompt = f"""
        You are a creative e-commerce copywriter. Based on the provided product image, generate compelling Product Detail Page (PDP) metadata.
        product is from {company}
        Your output should be in Markdown format and include the following sections:
        - **Product Title:** A short, catchy, and SEO-friendly title.
        - **Product Description:** An engaging paragraph (3-5 sentences) highlighting the key features and benefits.
        - **Key Features:** A bulleted list of 3-5 key selling points.
        - **SEO Keywords:** A comma-separated list of relevant keywords for search engines.
        - * IMPORTANT: If the product does not have a specific name, do not invent one, just stick to factual information about the product.
        """
        
        image_part = genai_types.Part(
            inline_data=genai_types.Blob(
                mime_type="image/png", 
                data=_edited_image_bytes
            )
        )
        prompt_part = genai_types.Part(text=prompt)

        user_content = genai_types.Content(
            role="user",
            parts=[prompt_part, image_part]
        )
        
        response = st.session_state.regional_client.models.generate_content(
            model=AUDIT_MODEL_NAME, 
            contents=[user_content]
        )
        
        return response.text

    except Exception as e:
        st.error(f"Error during PDP Metadata Generation: {e}")
        return None


def _run_outpainting(_image_bytes, _new_canvas_width, _new_canvas_height):
    """Internal common function for making the outpaint REST call."""
    MAX_RETRIES = 5
    RETRY_DELAY = 5

    for attempt in range(MAX_RETRIES):
        try:
            token = get_auth_token()
            if not token:
                st.error("Outpainting failed because authentication failed.")
                return None

            original_image = PILImage.open(io.BytesIO(_image_bytes)).convert("RGB")
            owidth, oheight = original_image.size

            new_canvas_width = (_new_canvas_width // 8) * 8
            new_canvas_height = (_new_canvas_height // 8) * 8

            offset = ((new_canvas_width - owidth) // 2, (new_canvas_height - oheight) // 2)
            input_image_canvas = PILImage.new('RGB', (new_canvas_width, new_canvas_height), 'black')
            input_image_canvas.paste(original_image, offset)

            mask_canvas = PILImage.new('RGB', (new_canvas_width, new_canvas_height), 'white')
            mask_canvas.paste(PILImage.new('RGB', (owidth, oheight), 'black'), offset)

            with io.BytesIO() as b:
                input_image_canvas.save(b, "PNG")
                image_b64_payload = base64.b64encode(b.getvalue()).decode('utf-8')
            with io.BytesIO() as b:
                mask_canvas.save(b, "PNG")
                mask_b64 = base64.b64encode(b.getvalue()).decode('utf-8')

            url = f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/google/models/{OUTPAINT_MODEL_NAME}:predict"
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            
            payload = {
                "instances": [{
                    "prompt": "expand the background seamlessly",
                    "referenceImages": [
                        {"referenceType": "REFERENCE_TYPE_RAW", "referenceId": 1, "referenceImage": {"bytesBase64Encoded": image_b64_payload}},
                        {"referenceType": "REFERENCE_TYPE_MASK", "referenceId": 2, "referenceImage": {"bytesBase64Encoded": mask_b64}, "maskImageConfig": {"maskMode": "MASK_MODE_USER_PROVIDED", "dilation": 0.05}}
                    ]
                }],
                "parameters": {
                    "editConfig": {"baseSteps": 45},
                    "editMode": "EDIT_MODE_OUTPAINT",
                    "sampleCount": 1
                }
            }

            with httpx.Client(timeout=300.0) as http_client:
                response = http_client.post(url, headers=headers, json=payload)
                response.raise_for_status() 
                prediction = response.json()

            if not prediction.get("predictions"):
                raise ValueError("Outpainting API did not return a prediction.")
            
            return base64.b64decode(prediction["predictions"][0]["bytesBase64Encoded"])

        except httpx.HTTPStatusError as e:
            if e.response.status_code in [401, 403] and attempt < MAX_RETRIES - 1:
                st.warning(f"Outpainting auth error (Attempt {attempt + 1}/{MAX_RETRIES}). Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
            else:
                raise e
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                st.warning(f"Outpainting error (Attempt {attempt + 1}/{MAX_RETRIES}): {e}. Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
            else:
                raise e
    return None

@st.cache_data
def run_outpainting_16x9(_image_bytes):
    """Generates a 16:9 outpainted image."""
    try:
        original_image = PILImage.open(io.BytesIO(_image_bytes))
        _, oheight = original_image.size
        target_ratio_num = 16/9
        new_canvas_width = int(oheight * target_ratio_num)
        new_canvas_height = oheight
        return _run_outpainting(_image_bytes, new_canvas_width, new_canvas_height)
    except Exception as e:
        st.error(f"Error during 16:9 Outpainting: {e}")
        return None

@st.cache_data
def run_outpainting_9x16(_image_bytes):
    """Generates a 9:16 outpainted image."""
    try:
        original_image = PILImage.open(io.BytesIO(_image_bytes))
        owidth, _ = original_image.size
        target_ratio_num = 16/9
        new_canvas_width = owidth
        new_canvas_height = int(owidth * target_ratio_num)
        return _run_outpainting(_image_bytes, new_canvas_width, new_canvas_height)
    except Exception as e:
        st.error(f"Error during 9:16 Outpainting: {e}")
        return None


@st.cache_data
def run_audit(_original_image_bytes, _generated_image_bytes, _expected_aspect_ratio):
    """3. Audits the outpainted image using Gemini (via regional client)."""
    try:
        gen_img = PILImage.open(io.BytesIO(_generated_image_bytes))
        width, height = gen_img.size
        actual_ratio = width / height
        expected_num_ratio = 16/9 if _expected_aspect_ratio == "16:9" else 9/16
        is_ratio_ok = abs(actual_ratio - expected_num_ratio) < 0.02

        prompt = f"""
        You are an expert image quality assurance agent for a marketing agency. Your task is to compare two images: an original and a generated "outpainted" version. The generated image should contain the original image perfectly in its center, with the background seamlessly extended. The generated image is expected to have an aspect ratio of {_expected_aspect_ratio} and be of high quality suitable for an advertisement.

        Analyze the two images provided and answer ONLY with a valid JSON object with the following boolean keys and a "reason" string: "subject_preserved", "quality_ok", "seamless_extension", "people_natural", and "advertisement_ready".
        1.  `subject_preserved`: Is the content of the original image present, unchanged, and centered?
        2.  `quality_ok`: Is the overall quality of the generated image high, without artifacts, distortions, or blurriness?
        3.  `seamless_extension`: Does the new, outpainted area blend naturally with the original?
        4.  `people_natural`: If people are present in the generated image, do they look realistic and natural? Are their proportions, faces, and hands correct? If no people are present, this should be true.
        5.  `advertisement_ready`: Is the final image of high enough quality and aesthetically pleasing to be used in a professional advertisement?
        """
        
        original_part = genai_types.Part(
            inline_data=genai_types.Blob(mime_type="image/png", data=_original_image_bytes)
        )
        generated_part = genai_types.Part(
            inline_data=genai_types.Blob(mime_type="image/png", data=_generated_image_bytes)
        )
        prompt_part = genai_types.Part(text=prompt)

        user_content = genai_types.Content(
            role="user",
            parts=[original_part, generated_part, prompt_part]
        )
        
        config = genai_types.GenerateContentConfig(response_mime_type="application/json")
        
        response = st.session_state.regional_client.models.generate_content(
            model=AUDIT_MODEL_NAME,
            contents=[user_content], 
            config=config 
        )
        
        audit_result_raw = json.loads(response.text)
        
        if isinstance(audit_result_raw, list) and audit_result_raw:
            audit_data = audit_result_raw[0]
        elif isinstance(audit_result_raw, dict):
            audit_data = audit_result_raw
        else:
            raise ValueError(f"Model returned unexpected JSON format: {type(audit_result_raw)}")

        people_natural = audit_data.get("people_natural", False)
        advertisement_ready = audit_data.get("advertisement_ready", False)

        final_result = {
            "subject_preserved": audit_data.get("subject_preserved", False),
            "quality_ok": (
                audit_data.get("quality_ok", False) and 
                audit_data.get("seamless_extension", False) and
                people_natural and
                advertisement_ready
            ),
            "aspect_ratio_ok": is_ratio_ok,
            "people_natural": people_natural,
            "advertisement_ready": advertisement_ready,
            "reason": audit_data.get("reason", "No reason from LLM.")
        }

        if not is_ratio_ok:
            final_result["reason"] += f" Aspect ratio check failed. Expected ~{expected_num_ratio:.2f}, got {actual_ratio:.2f}."
        
        return final_result
    except Exception as e:
        return {"reason": f"Audit function failed: {e}", "subject_preserved": False, "quality_ok": False, "aspect_ratio_ok": False}



@st.cache_data
def run_video_generation_request(_image_bytes, _prompt):
    """4. Runs the video generation request using the Veo 3 REST API."""
    token = get_auth_token()
    if not token:
        st.error("Video generation failed because authentication failed.")
        return None

    try:
        image_b64 = base64.b64encode(_image_bytes).decode('utf-8')
        
        api_endpoint = f"{REGION}-aiplatform.googleapis.com"
        predict_long_running_url = f"https://{api_endpoint}/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/google/models/{VIDEO_MODEL_NAME}:predictLongRunning"
        fetch_predict_operation_url = f"https://{api_endpoint}/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/google/models/{VIDEO_MODEL_NAME}:fetchPredictOperation"
        
        payload = {
            "instances": [{"prompt": _prompt, "image": {"bytesBase64Encoded": image_b64, "mimeType": "image/png"}}],
            "parameters": {
                "aspectRatio": "16:9",
                "durationSeconds": "8",
                "personGeneration": "allow_all",
                "addWatermark": True,
                "includeRaiReason": True,
                "generateAudio": True,
                "resolution": "720p"},
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        with httpx.Client(timeout=600.0) as http_client:
            post_response = http_client.post(predict_long_running_url, headers=headers, json=payload)
            post_response.raise_for_status()
            full_operation_name = post_response.json()["name"]
            st.info(f"Video job submitted. Operation name: {full_operation_name}")
            
            with st.spinner("Generating video... This can take several minutes. Please wait."):
                while True:
                    time.sleep(10) 
                    polling_payload = {"operationName": full_operation_name}
                    get_response = http_client.post(fetch_predict_operation_url, headers=headers, json=polling_payload)
                    op_data = get_response.json()

                    if get_response.status_code != 200:
                        get_response.raise_for_status()

                    if op_data.get("done"):
                        if "error" in op_data:
                            raise Exception(f"Video generation failed: {op_data.get('error')}")
                        
                        if videos := op_data.get("response", {}).get("videos", []):
                            if b64_data := videos[0].get("bytesBase64Encoded"):
                                return base64.b64decode(b64_data)
                        
                        raise Exception("Operation completed but no video data found.")
                        
    except Exception as e:
        st.error(f"Error during Video Generation: {e}")
        if isinstance(e, httpx.HTTPStatusError):
            st.error(f"API Error details: {e.response.text}")
        return None

# --- NEW FUNCTION: ABCD Video Audit ---
@st.cache_data
def run_video_abcd_audit(_image_16x9_bytes, _video_prompt):
    """6. Audits the video CONCEPT against YouTube's ABCD framework."""
    try:
        # Define the prompt for the ABCD audit
        abcd_prompt = f"""
        You are an expert YouTube advertising strategist, specializing in Google's "ABCD" framework for effective video ads.
        
        The ABCD framework stands for:
        - **Attention:** Hook the viewer within the first 2-3 seconds.
        - **Branding:** Integrate the brand naturally and early.
        - **Connection:** Make the viewer think or feel something (emotion, humor, intrigue).
        - **Direction:** Give a clear and simple call-to-action.

        I have the following inputs that were used to generate an 8-second video ad:
        1.  **The Starting Image:** (See attached image) This image was outpainted to 16:9 and used as the basis for the video.
        2.  **The Video Prompt:** "{_video_prompt}"

        Your task is to analyze these two inputs and critique how well the *resulting concept* adheres to the ABCD framework for a compelling 8-second ad. 

        Please provide your analysis in Markdown format with the following structure:
        
        ---
        ### **YouTube ABCD Audit Score: [Your Score]/10**
        
        **A (Attention):** [Your critique of the concept's ability to hook a viewer based on the prompt and image.]
        
        **B (Branding):** [Your critique on how well the prompt and image integrate branding. Note if the prompt doesn't mention it.]
        
        **C (Connection):** [Your critique on the emotional or intellectual connection the concept would create.]
        
        **D (Direction):** [Your critique on the call-to-action. Note if the prompt's CTA is weak or strong.]
        
        ---
        ### **Prompt Improvement Suggestions:**
        
        Based on your audit, provide a bulleted list of actionable suggestions for how the *text prompt* could be improved to create a more effective ad that scores higher on the ABCD framework.
        """
        
        # Create the parts for the multimodal call
        image_part = genai_types.Part(
            inline_data=genai_types.Blob(
                mime_type="image/png", 
                data=_image_16x9_bytes
            )
        )
        prompt_part = genai_types.Part(text=abcd_prompt)

        user_content = genai_types.Content(
            role="user",
            parts=[image_part, prompt_part]  # Send both image and text prompt
        )
        
        # Call the same regional audit model
        response = st.session_state.regional_client.models.generate_content(
            model=AUDIT_MODEL_NAME, 
            contents=[user_content]
        )
        
        return response.text

    except Exception as e:
        st.error(f"Error during Video ABCD Audit: {e}")
        return "Could not generate ABCD audit report."
# --- END OF NEW FUNCTION ---



# --- Streamlit UI ---

st.title("Automated Image-to-Video Asset Pipeline 🚀")
col1a, col2a = st.columns([6, 6])
st.markdown(f"""
This app uses:
- **Edit:** `{EDIT_MODEL_NAME}` (Location: **{GLOBAL_REGION}**)
- **Audit:** `{AUDIT_MODEL_NAME}` (Location: **{REGION}**)
- **Outpaint:** `{OUTPAINT_MODEL_NAME}` (Location: **{REGION}**)
- **Video:** `{VIDEO_MODEL_NAME}` (Location: **{REGION}**)
""")

# uploaded_file = st.file_uploader("Choose a product image...", type=["jpg", "jpeg", "png"])
st.markdown("---")
col1, col2, col3 = st.columns([1, 6, 1])
with col2:
    st.image(f"data/{pipeline_name}/{default_image_name}.jpg", caption="Default Image", width=400)



# if uploaded_file:
if True: # Always run with the default image
    with open(f"data/{pipeline_name}/{default_image_name}.jpg", "rb") as f:
        original_image_bytes = f.read()
    
    edit_prompt = st.text_input("1. Simple Edit Prompt:", f"{image_prompt}")
    video_prompt = st.text_input("2. Simple Video Prompt:", f"{ad_prompt}")

    col1, col2 = st.columns(2)
    if demo_mode == True:
        load_button = st.button("Generate Assets", use_container_width=True)
    else:
        with col1:
            generate_button = st.button("Generate Asset Pipeline", type="primary", use_container_width=True)
        with col2:
            load_button = st.button("Load Most Recent Assets", use_container_width=True)

        if generate_button:
            st.cache_data.clear()
            _, col2, _ = st.columns([1, 6, 1])
            with col2:
                st.markdown("---")
                
                # Create a fixed directory for the latest run, overwriting previous assets
                asset_dir = f"data/{pipeline_name}/latest"
                os.makedirs(asset_dir, exist_ok=True)

                # --- Step 1: Edit - Generating 6 Variations (Multithreaded with Retry) ---
                st.header("Step 1: Edit")
                st.subheader("Generating 6 image variations of the product in different locations around the world...")

                locations = ["a picturesque street in Paris, France with the Eiffel Tower in the background",
                            "a bustling street in Tokyo, Japan with neon signs",
                            "Times Square in New York City, USA",
                            "a charming street in London, UK with a red phone booth",
                            "in front of the Sydney Opera House in Sydney, Australia",
                            "a historic square in Rome, Italy with ancient ruins"]
                edited_images = []

                # Create 2 rows of 3 columns for the image grid
                row1_cols = st.columns(3)
                row2_cols = st.columns(3)
                all_cols = row1_cols + row2_cols
                
                # Use a ThreadPoolExecutor to generate images in parallel
                global_client = st.session_state.global_client
                with ThreadPoolExecutor(max_workers=6) as executor:
                    with st.spinner("Generating all 6 image variations in parallel (with retries)..."):
                        # Submit tasks
                        future_to_location = {
                            executor.submit(run_simple_edit_with_retry, global_client, original_image_bytes, "image/png", f"{edit_prompt}, in {location}"): location
                            for location in locations
                        }
                        
                        # Store results as they complete
                        results = {}
                        for future in as_completed(future_to_location):
                            location = future_to_location[future]
                            try:
                                results[location] = future.result()
                            except Exception as exc:
                                print(f"'{location}' generated an exception in the thread: {exc}")
                                results[location] = None

                # Display the results in the original order
                for i, location in enumerate(locations):
                    with all_cols[i]:
                        image_bytes = results.get(location)
                        short_location = location.split(',')[0].split(' in ')[-1]
                        if image_bytes:
                            edited_images.append(image_bytes)
                            # Save each generated image with a unique name
                            with open(f"{asset_dir}/edited_image_{i}_{short_location.replace(' ', '_')}.png", "wb") as f:
                                f.write(image_bytes)
                            st.image(image_bytes, caption=short_location)
                        else:
                            st.warning(f"Failed for {short_location}.")

                if not edited_images:
                    st.error("Image generation failed for all locations. Pipeline stopped.")
                    st.stop()

                # The rest of the pipeline will use the first successfully generated image
                edited_image_bytes = edited_images[0]

                # Save the selected (first) edited image with a standard name for the rest of the pipeline
                with open(f"{asset_dir}/edited_image.png", "wb") as f:
                    f.write(edited_image_bytes)

                st.success("Image variations generated. Continuing pipeline with the first image.")
                st.markdown("---")
                
                # --- Step 2: PDP Metadata Generation ---
                st.header("Step 2: PDP Metadata Generation")
                with st.spinner("Step 2/6: Generating PDP metadata..."):
                    pdp_metadata = run_pdp_metadata_generation(edited_image_bytes)
                
                if pdp_metadata:
                    # Save the PDP metadata
                    with open(f"{asset_dir}/pdp_metadata.md", "w") as f:
                        f.write(pdp_metadata)
                    st.markdown(pdp_metadata)
                    st.success("PDP metadata generation complete.")
                else:
                    st.warning("PDP metadata generation failed, but continuing pipeline.")
                st.markdown("---")

                # --- REFACTORED: Step 3 (Sequential) ---
                st.header("Step 3: 16:9 Outpaint & Audit")
                image_16x9_bytes = None
                audit_16x9_result = None
                
                with st.spinner("Step 3a/6: Generating 16:9 outpaint..."):
                    image_16x9_bytes = run_outpainting_16x9(edited_image_bytes)
                
                if image_16x9_bytes:
                    # Save the 16:9 outpainted image
                    with open(f"{asset_dir}/outpainted_16x9.png", "wb") as f:
                        f.write(image_16x9_bytes)

                    b64_image = base64.b64encode(image_16x9_bytes).decode()
                    st.markdown(f'<img src="data:image/png;base64,{b64_image}" style="max-height: 500px; width: auto; display: block; margin-left: auto; margin-right: auto;" alt="16:9 Outpainted Image">', unsafe_allow_html=True)
                    st.caption("Step 3a: 16:9 Outpainted Image")
                    with st.spinner("Step 3b/6: Auditing 16:9 image..."):
                        audit_16x9_result = run_audit(edited_image_bytes, image_16x9_bytes, "16:9")
                    st.write("16:9 Audit Result:")
                    st.json(audit_16x9_result)
                else:
                    st.error("16:9 Outpainting failed. Pipeline cannot continue.")
                    st.stop()
                
                st.markdown("---")

                # --- REFACTORED: Step 4 (Sequential) ---
                st.header("Step 4: 9:16 Outpaint & Audit")
                image_9x16_bytes = None
                audit_9x16_result = None

                with st.spinner("Step 4a/6: Generating 9:16 outpaint..."):
                    image_9x16_bytes = run_outpainting_9x16(edited_image_bytes)
                
                if image_9x16_bytes:
                    # Save the 9:16 outpainted image
                    with open(f"{asset_dir}/outpainted_9x16.png", "wb") as f:
                        f.write(image_9x16_bytes)

                    b64_image = base64.b64encode(image_9x16_bytes).decode()
                    st.markdown(f'<img src="data:image/png;base64,{b64_image}" style="max-height: 600px; width: auto; display: block; margin-left: auto; margin-right: auto;" alt="9:16 Outpainted Image">', unsafe_allow_html=True)
                    st.caption("Step 4a: 9:16 Outpainted Image")
                    with st.spinner("Step 4b/6: Auditing 9:16 image..."):
                        audit_9x16_result = run_audit(edited_image_bytes, image_9x16_bytes, "9:16")
                    st.write("9:16 Audit Result:")
                    st.json(audit_9x16_result)
                else:
                    st.error("9:16 Outpainting failed.")
                
                st.markdown("---")

                # --- REFACTORED: Step 5 (Video Gen) ---
                st.header("Step 5: Video Generation")
                if audit_16x9_result and audit_16x9_result.get("quality_ok") and audit_16x9_result.get("subject_preserved"):
                    st.info("The 16:9 image passed the quality audit. Generating video...")
                    
                    # Remove the extra button click, just run the video gen
                    video_bytes = None
                    with st.spinner("Generating video... This can take several minutes. Please wait."):
                        video_bytes = run_video_generation_request(image_16x9_bytes, video_prompt)
                    
                    if video_bytes:
                        # Save the video
                        with open(f"{asset_dir}/final_video.mp4", "wb") as f:
                            f.write(video_bytes)

                        st.video(video_bytes)
                        st.success("Video generation complete!")
                        st.markdown("---")

                        # --- NEW STEP 6: ABCD AUDIT ---
                        st.header("Step 6: YouTube ABCD Audit")
                        abcd_report = None
                        with st.spinner("Step 6/6: Auditing video concept against YouTube ABCD framework..."):
                            abcd_report = run_video_abcd_audit(image_16x9_bytes, video_prompt)
                        
                        if abcd_report:
                            # Save the ABCD audit report
                            with open(f"{asset_dir}/abcd_audit.md", "w") as f:
                                f.write(abcd_report)
                            st.markdown(abcd_report)
                        else:
                            st.warning("Could not generate ABCD audit report.")
                        
                        st.success("Pipeline Fully Complete! ✅") # Final success message

                    else:
                        st.error("Video generation failed. See error details above.")
                else:
                    st.warning("Video generation skipped because the 16:9 image failed the quality audit.")

    if load_button:
        _, col2, _ = st.columns([1, 6, 1])
        with col2:
            st.markdown("---")
            st.header("Assets")

            latest_run_dir = f"data/{pipeline_name}/latest"
            if not os.path.exists(latest_run_dir):
                st.warning("No assets found. Please generate assets first.")
                st.stop()

            st.subheader("Edited Image Variations")
            image_files = glob.glob(f"{latest_run_dir}/edited_image_*_*.png")
            image_files.sort()

            if image_files:
                cols = st.columns(3)
                for i, img_path in enumerate(image_files):
                    with cols[i % 3]:
                        st.image(img_path)
                        time.sleep(1.5)
            else:
                # Fallback to single image if variations not found
                st.subheader("Edited Image")
                single_image_path = f"{latest_run_dir}/edited_image.png"
                if os.path.exists(single_image_path):
                    st.image(single_image_path)
                else:
                    st.warning("No edited images found for this run.")
            time.sleep(2)
            st.subheader("16:9 Outpainted Image")
            st.image(f"{latest_run_dir}/outpainted_16x9.png")
            time.sleep(2)
            st.subheader("9:16 Outpainted Image")
            st.image(f"{latest_run_dir}/outpainted_9x16.png", width=500)
            time.sleep(2)
            st.subheader("Final Video")
            st.video(f"{latest_run_dir}/final_video.mp4")
            time.sleep(1)
            st.subheader("PDP Metadata")
            if os.path.exists(f"{latest_run_dir}/pdp_metadata.md"):
                with open(f"{latest_run_dir}/pdp_metadata.md", "r") as f:
                    st.markdown(f.read())
            else:
                st.warning("PDP metadata not found for this run.")

            st.subheader("ABCD Audit")
            if os.path.exists(f"{latest_run_dir}/abcd_audit.md"):
                with open(f"{latest_run_dir}/abcd_audit.md", "r") as f:
                    st.markdown(f.read())
            else:
                st.warning("ABCD audit not found for this run.")




