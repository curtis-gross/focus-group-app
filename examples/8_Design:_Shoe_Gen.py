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
st.set_page_config(layout="wide", page_title="Nike Shoe Design Generator")

# --- Load Config File ---
config = load_config_file("config/config.json")
if config:
    demo_mode = config["demo_mode"]
    sleep_time = config["sleep_time"]
else:
    st.write("error loading config file")
    demo_mode = False
    sleep_time = 2

demo_mode = False
# --- Model & Project Configuration ---
PROJECT_ID = "bb-test-404418"  # <--- YOUR GOOGLE CLOUD PROJECT ID
REGION = "us-central1"         # <--- Your default region
GLOBAL_REGION = "global"       # For the image editing model
EDIT_MODEL_NAME = "gemini-2.5-flash-image-preview" # Using a stable, recent model

# --- File Path Configuration ---
OUTPUT_DIR = "data/shoe_gen"
DEFAULT_IMAGE_PATH = "data/shoe_gen/sketch.png"

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
st.title("Nike Running Shoe Design Generator")
st.markdown("**Stage 1:** Transform a shoe sketch into 9 photorealistic color and texture variations.")
st.markdown("**Stage 2:** Generate 9 lifestyle images showing different people wearing the shoes in action.")
st.markdown("---")

# Check for and display the default image
if not os.path.exists(DEFAULT_IMAGE_PATH):
    st.error(f"Sketch image not found! Please place your sketch at: `{DEFAULT_IMAGE_PATH}`")
    st.stop()

# --- ✨ NEW: Separated Prompt Template and Color/Texture Variations ---
col1a, col1a,col2a, col2b, col3a = st.columns([1, 6,6,6, 1])
with col1a:
    st.image(DEFAULT_IMAGE_PATH, caption="Shoe Sketch")
with col2a:
    st.markdown("1. Prompt Template")
    prompt_template_input = st.text_area(
        "Prompt Template:",
        height=150,
        value="Transform this shoe sketch into a photorealistic Nike running shoe with {variation}. " \
        "Maintain the exact shoe design and silhouette from the sketch. " \
        "High quality product photography style, clean white background, professional lighting. " \
        "Keep the Nike swoosh logo prominent. The shoe should look like a premium athletic running shoe.",
        label_visibility="collapsed"
    )
with col2b:
    st.markdown("2. Color & Texture Variations")
    themes_input = st.text_area(
        "Variations:",
        value="matte black upper with neon green accents and mesh texture\nall white leather with subtle grey swoosh and premium finish\nbright red knit upper with white midsole and carbon fiber details\nelectric blue gradient with metallic silver accents\nocean teal with coral orange highlights and breathable mesh\nsunset orange to purple ombre with reflective elements\nstealth grey with black carbon fiber and metallic details\nvolt yellow with black accents and engineered knit upper\nmidnight navy with rose gold swoosh and premium suede",
        height=150,
        label_visibility="collapsed"
    )

# Main Generation Button
if st.button("Generate Variations", type="primary"):
    st.cache_data.clear()

    variations = [line.strip() for line in themes_input.split('\n') if line.strip()]

    if not variations:
        st.warning("Please enter at least one color/texture variation.")
        st.stop()
    if '{variation}' not in prompt_template_input:
        st.error("The Prompt Template must include the `{variation}` placeholder.")
        st.stop()

    st.markdown("---")
    st.header("Generated Nike Shoe Designs")

    # --- Demo Mode: Load Pre-generated Images ---
    if demo_mode:
        # Load pre-generated images from the shoe_gen directory
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
            sleep_duration = random.uniform(1, 5)
            time.sleep(sleep_duration)

            with grid_cols[i % cols_per_row]:
                # Extract variation name from filename
                filename = os.path.basename(img_path)
                variation_name = filename.replace("generated_shoe_", "").replace(".png", "").replace("_", " ").title()
                st.image(img_path, caption=variation_name)

        st.success(f"Generated {len(image_files)} Nike shoe design variations")

        # --- Stage 2 Demo Mode: Load Pre-generated Lifestyle Images ---
        st.markdown("---")
        st.header("Stage 2: People Wearing the Shoes")

        lifestyle_files = glob.glob(f"{OUTPUT_DIR}/lifestyle_*.png")
        lifestyle_files.sort()

        if lifestyle_files:
            lifestyle_files = lifestyle_files[:9]
            lifestyle_cols = st.columns(3)

            for i, img_path in enumerate(lifestyle_files):
                sleep_duration = random.uniform(1, 5)
                time.sleep(sleep_duration)

                with lifestyle_cols[i % 3]:
                    filename = os.path.basename(img_path)
                    st.image(img_path, caption=f"Lifestyle {i+1}")

            st.success(f"Loaded {len(lifestyle_files)} lifestyle images")
        else:
            st.info("No lifestyle images found in demo assets.")

    # --- Live Generation Mode ---
    else:
        style_prompts = [prompt_template_input.format(variation=variation) for variation in variations]
        prompt_to_variation_map = {prompt: variation for prompt, variation in zip(style_prompts, variations)}

        try:
            with open(DEFAULT_IMAGE_PATH, "rb") as f:
                original_image_bytes = f.read()
        except Exception as e:
            st.error(f"Could not read the sketch image file: {e}")
            st.stop()

        # --- Create placeholders and map variations to them ---
        num_prompts = len(variations)
        cols_per_row = 3
        grid_cols = st.columns(cols_per_row)
        placeholders = [grid_cols[i % cols_per_row].empty() for i in range(num_prompts)]
        variation_to_placeholder_map = {variation: p for variation, p in zip(variations, placeholders)}

        # Store generated shoe images for stage 2
        generated_shoe_images = {}

        global_client = st.session_state.global_client
        with st.spinner(f"Generating {num_prompts} Nike shoe variations... (Images will appear below as they complete)"):
            with ThreadPoolExecutor(max_workers=num_prompts) as executor:
                future_to_prompt = {
                    executor.submit(run_simple_edit_with_retry, global_client, original_image_bytes, "image/png", prompt): prompt
                    for prompt in style_prompts
                }

                # Process and display results as they complete
                for future in as_completed(future_to_prompt):
                    prompt = future_to_prompt[future]
                    variation_name = prompt_to_variation_map.get(prompt, "unknown")
                    placeholder = variation_to_placeholder_map.get(variation_name)

                    if not placeholder:
                        continue # Safety check

                    try:
                        image_bytes = future.result()
                        if image_bytes:
                            # Save the image file
                            short_name = variation_name.lower().replace(" ", "_")[:50]  # Limit filename length
                            save_path = os.path.join(OUTPUT_DIR, f"generated_shoe_{short_name}.png")
                            with open(save_path, "wb") as f:
                                f.write(image_bytes)

                            # Store for stage 2
                            generated_shoe_images[variation_name] = image_bytes

                            # Display the image in its designated placeholder
                            placeholder.image(image_bytes, caption=variation_name)
                        else:
                            placeholder.warning(f"Failed for: {variation_name}")

                    except Exception as exc:
                        print(f"'{prompt}' generated an exception in the thread: {exc}")
                        placeholder.error(f"Error for: {variation_name}")

        st.success(f"Stage 1 complete! {len(generated_shoe_images)} shoe designs generated. ✅")

        # --- STAGE 2: Generate People Wearing Shoes ---
        if generated_shoe_images:
            st.markdown("---")
            st.header("Stage 2: People Wearing the Shoes")

            # Define 9 different people and scenarios
            wearing_scenarios = [
                "a professional athlete running on a track during golden hour",
                "a young woman jogging through a city park in the morning",
                "a fitness enthusiast working out in a modern gym",
                "a runner training on a mountain trail at sunrise",
                "an urban athlete running across a city bridge at sunset",
                "a person doing sprints on a beach during summer",
                "a marathon runner in action on a city street",
                "an athlete doing agility drills in a training facility",
                "a trail runner navigating through a forest path"
            ]

            # Take the first 9 shoes (or however many were generated)
            shoe_list = list(generated_shoe_images.items())[:9]

            st.markdown(f"Generating {len(shoe_list)} lifestyle images...")

            # Create grid for lifestyle images
            lifestyle_cols = st.columns(3)
            lifestyle_placeholders = [lifestyle_cols[i % 3].empty() for i in range(len(shoe_list))]

            with st.spinner(f"Generating {len(shoe_list)} lifestyle images... (Images will appear as they complete)"):
                with ThreadPoolExecutor(max_workers=len(shoe_list)) as executor:
                    # Create futures mapping
                    future_to_info = {}

                    for idx, ((variation_name, shoe_image_bytes), scenario) in enumerate(zip(shoe_list, wearing_scenarios)):
                        # Create prompt for person wearing the shoe
                        lifestyle_prompt = f"Transform this product image into a lifestyle photo showing {scenario}. " \
                                         f"The person should be wearing these exact Nike running shoes prominently visible. " \
                                         f"Professional photography, natural lighting, dynamic action shot, photorealistic. " \
                                         f"Focus on the shoes being worn in action."

                        future = executor.submit(
                            run_simple_edit_with_retry,
                            global_client,
                            shoe_image_bytes,
                            "image/png",
                            lifestyle_prompt
                        )
                        future_to_info[future] = (variation_name, scenario, idx)

                    # Process results as they complete
                    for future in as_completed(future_to_info):
                        variation_name, scenario, idx = future_to_info[future]
                        placeholder = lifestyle_placeholders[idx]

                        try:
                            lifestyle_image_bytes = future.result()
                            if lifestyle_image_bytes:
                                # Save the lifestyle image
                                short_name = variation_name.lower().replace(" ", "_")[:30]
                                lifestyle_save_path = os.path.join(OUTPUT_DIR, f"lifestyle_{idx}_{short_name}.png")
                                with open(lifestyle_save_path, "wb") as f:
                                    f.write(lifestyle_image_bytes)

                                # Display the image
                                scenario_short = scenario.split(" in ")[-1] if " in " in scenario else scenario[:40]
                                placeholder.image(lifestyle_image_bytes, caption=f"{variation_name[:30]}... - {scenario_short}")
                            else:
                                placeholder.warning(f"Failed to generate lifestyle image")

                        except Exception as exc:
                            print(f"Lifestyle image generation exception: {exc}")
                            placeholder.error(f"Error generating lifestyle image")

            st.success(f"Complete! All images saved to the `{OUTPUT_DIR}` folder. ✅")
