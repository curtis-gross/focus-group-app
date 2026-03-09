# Copyright 2024 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import streamlit as st
from google import genai
from google.genai import types as genai_types
import os
import time
import random
import glob
from concurrent.futures import ThreadPoolExecutor, as_completed
from central_config import load_config_file

# --- Configuration ---
st.set_page_config(layout="wide", page_title="Shoe Image Generator")

# --- Load Config File ---
config = load_config_file("config/config.json")
if config:
    demo_mode = config["demo_mode"]
    sleep_time = config["sleep_time"]
else:
    st.write("error loading config file")
    demo_mode = False
    sleep_time = 2

# --- Model & Project Configuration ---
PROJECT_ID = "bb-test-404418"  # <--- YOUR GOOGLE CLOUD PROJECT ID
REGION = "us-central1"         # <--- Your default region
GLOBAL_REGION = "global"       # For the image editing model
EDIT_MODEL_NAME = "gemini-2.5-flash-image-preview" # Using a stable, recent model

# --- File Path Configuration ---
OUTPUT_DIR = "data/shoe_pipeline"
DEFAULT_IMAGE_PATH = "data/media_pipeline/default.jpg"

# Create the asset directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Initialize Vertex AI Clients ---
try:
    if 'global_client' not in st.session_state:
        st.session_state.global_client = genai.Client(vertexai=True, project=PROJECT_ID, location=GLOBAL_REGION)
except Exception as e:
    st.error(f"Vertex AI client initialization failed: {e}")
    st.stop()

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

        # Search through all parts to find the image (text might be returned alongside image)
        image_part = None
        parts = response.candidates[0].content.parts

        for part in parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                # Found an image part
                if part.inline_data.mime_type == "image/png":
                    image_part = part
                    break
                else:
                    print(f"DEBUG: Found inline_data but unexpected mime type: {part.inline_data.mime_type}")

        if not image_part:
            # Log all parts for debugging
            part_info = []
            for i, part in enumerate(parts):
                if hasattr(part, 'text'):
                    part_info.append(f"Part {i}: text='{part.text[:100]}...'")
                elif hasattr(part, 'inline_data'):
                    part_info.append(f"Part {i}: inline_data with mime_type={part.inline_data.mime_type}")
                else:
                    part_info.append(f"Part {i}: unknown type")

            error_msg = f"The model did not return an image for prompt: '{_prompt}'. Parts: {'; '.join(part_info)}"
            print(f"--- ERROR in run_simple_edit (No Image): {error_msg} ---")
            return None

        return image_part.inline_data.data

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

# --- Streamlit UI ---
st.title("Shoe Background Generator")
st.markdown("This app takes a default shoe image and generates 9 new versions in different scenic locations.")
st.markdown("---")

# Check for and display the default image
if not os.path.exists(DEFAULT_IMAGE_PATH):
    st.error(f"Default image not found! Please place your image at: `{DEFAULT_IMAGE_PATH}`")
    st.stop()

# --- ✨ NEW: Separated Prompt Template and Scenic Locations ---
col1a, col1a,col2a, col2b, col3a = st.columns([1, 6,6,6, 1])
with col1a:
    st.image(DEFAULT_IMAGE_PATH, caption="Default Shoe Image")
with col2a:
    st.markdown("1. Prompt Template")
    #st.markdown("Edit the main prompt below. Use `{location}` as a placeholder where you want the location name to be inserted.")
    prompt_template_input = st.text_area(
        "Prompt Template:",
        height=150,
        value="Place this shoe in {location}. The shoe should be the focal point, not being worn, just positioned naturally in the scene. " \
        "Photo taken on a full frame high quality Canon camera set to 50mm with f/2.0 aperture for beautiful depth of field and bokeh. Change nothing about the shoe.",
        label_visibility="collapsed"
    )
with col2b:
    st.markdown("2. Scenic Locations")
    #st.markdown("Enter each scenic location on a new line. One image will be generated for each location.")
    themes_input = st.text_area(
        "Locations:",
        value="a misty mountain peak at sunrise\na serene beach with waves rolling in\na vibrant urban street with graffiti walls\na lush forest floor covered in moss\na desert landscape with sand dunes\na rocky cliff overlooking the ocean\na cherry blossom garden in full bloom\nan industrial rooftop at sunset\na snowy alpine meadow",
        height=150,
        label_visibility="collapsed"
    )

# Main Generation Button
if st.button("Generate Variations", type="primary"):
    st.cache_data.clear()

    locations = [line.strip() for line in themes_input.split('\n') if line.strip()]

    if not locations:
        st.warning("Please enter at least one location.")
        st.stop()
    if '{location}' not in prompt_template_input:
        st.error("The Prompt Template must include the `{location}` placeholder.")
        st.stop()

    st.markdown("---")
    st.header("Generated Shoe Images")
    red = "yes"
    #if demo_mode:
    # --- Demo Mode: Load Pre-generated Images ---
    if red == "no":
        # Load pre-generated images from the shoe_pipeline directory
        image_files = glob.glob(f"{OUTPUT_DIR}/generated_shoe_*.png")
        image_files.sort()

        if not image_files:
            st.warning(f"No pre-generated images found in `{OUTPUT_DIR}` directory. Please generate images first or add sample images.")
            st.stop()

        # Limit to 9 images if there are more
        image_files = image_files[:9]

        # Create grid layout
        cols_per_row = 3
        grid_cols = st.columns(cols_per_row)

        # Display images with random sleep times
        for i, img_path in enumerate(image_files):
            # Random sleep time between 1-5 seconds before showing each image
            sleep_duration = random.uniform(1, 2)
            time.sleep(sleep_duration)

            with grid_cols[i % cols_per_row]:
                # Extract location name from filename
                filename = os.path.basename(img_path)
                location_name = filename.replace("generated_shoe_", "").replace(".png", "").replace("_", " ").title()
                st.image(img_path, caption=location_name)

        st.success(f"Generated {len(image_files)} shoe variations")

    # --- Live Generation Mode ---
    else:
        style_prompts = [prompt_template_input.format(location=location) for location in locations]
        prompt_to_location_map = {prompt: location for prompt, location in zip(style_prompts, locations)}

        try:
            with open(DEFAULT_IMAGE_PATH, "rb") as f:
                original_image_bytes = f.read()
        except Exception as e:
            st.error(f"Could not read the default image file: {e}")
            st.stop()

        # --- Create placeholders and map locations to them ---
        num_prompts = len(locations)
        cols_per_row = 3
        grid_cols = st.columns(cols_per_row)
        placeholders = [grid_cols[i % cols_per_row].empty() for i in range(num_prompts)]
        location_to_placeholder_map = {location: p for location, p in zip(locations, placeholders)}

        global_client = st.session_state.global_client
        with st.spinner(f"Generating {num_prompts} shoe variations... (Images will appear below as they complete)"):
            with ThreadPoolExecutor(max_workers=num_prompts) as executor:
                future_to_prompt = {
                    executor.submit(run_simple_edit_with_retry, global_client, original_image_bytes, "image/jpeg", prompt): prompt
                    for prompt in style_prompts
                }

                # Process and display results as they complete
                for future in as_completed(future_to_prompt):
                    prompt = future_to_prompt[future]
                    location_name = prompt_to_location_map.get(prompt, "unknown")
                    placeholder = location_to_placeholder_map.get(location_name)

                    if not placeholder:
                        continue # Safety check

                    try:
                        image_bytes = future.result()
                        if image_bytes:
                            # Save the image file
                            short_name = location_name.lower().replace(" ", "_")
                            save_path = os.path.join(OUTPUT_DIR, f"generated_shoe_{short_name}.png")
                            with open(save_path, "wb") as f:
                                f.write(image_bytes)

                            # Display the image in its designated placeholder
                            placeholder.image(image_bytes, caption=location_name)
                        else:
                            placeholder.warning(f"Failed for: {location_name}")

                    except Exception as exc:
                        print(f"'{prompt}' generated an exception in the thread: {exc}")
                        placeholder.error(f"Error for: {location_name}")

        st.success(f"Generation complete! All images saved to the `{OUTPUT_DIR}` folder. ✅")