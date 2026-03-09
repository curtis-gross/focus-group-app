#Copyright 2024 Google LLC
#Licensed under the Apache License, Version 2.0 (the "License");
#you may not use this file except in compliance with the License.
#You may obtain a copy of the License at
#    https://www.apache.org/licenses/LICENSE-2.0
#Unless required by applicable law or agreed to in writing, software
#distributed under the License is distributed on an "AS IS" BASIS,
#WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and
#limitations under the License.

import streamlit as st
import vertexai
import os
import io
import time
import base64
import json
import pandas as pd
import concurrent.futures
from PIL import Image, ImageDraw
from vertexai.preview.generative_models import GenerativeModel, GenerationConfig
import vertexai.preview.generative_models as generative_models
from central_config import sampledata, df, vertex_text_strict, vertex_image, save_this_data, load_this_data, resize_and_overwrite
import google.auth
from google import genai
from google.genai import types as genai_types


# --- Basic Configuration ---
st.set_page_config(layout="wide")

# --- Function to load config ---
def load_config_file(c):
    config_file_path = c
    try:
        with open(config_file_path, "r") as f:
            config_data = json.load(f)
            return config_data
    except (FileNotFoundError, KeyError, json.JSONDecodeError) as e:
        print(f"Error loading config: {e}")
        st.error(f"Error loading config file: {e}. Please ensure config/config.json exists and is valid.")
        return None
    
def keyload(): #keyloader allows local dev with a key.json file, but falls back to google auth for deployments.
    print("centralconfig keyload")
    try:
        print("try keyload from file")
        credentials, project_id = google.auth.load_credentials_from_file('../keys/key.json')
        print("file loaded")
        return credentials, project_id
    except:
        print("command line auth?")
        credentials, project_id = google.auth.default()
        return credentials, project_id
credentials, project_id = keyload()
# --- Load Configuration and Initialize Models ---
# Create dummy config and directories if they don't exist for seamless execution

# --- Configurable Gemini Models ---
# Define specific models for each Gemini call - update these as needed
MODEL_AUDIENCE_ANALYSIS = "gemini-2.5-flash"     # Step 1: Audience segmentation
MODEL_PRODUCT_RECOMMENDATIONS = "gemini-2.5-flash" # Step 3.1: Product recommendations
MODEL_TRANSLATION = "gemini-2.5-flash-lite"             # Step 3.2: Spanish translation
MODEL_HEADLINES = "gemini-2.5-flash"               # Step 3.3: Headline generation
MODEL_IMAGE_GENERATION = "gemini-2.5-flash-image-preview" # Step 3.4: Image generation

# --- Project Configuration ---
PROJECT_ID = "bb-test-404418"
GLOBAL_REGION = "global"

config = load_config_file("config/config.json")
if config:
    try:
        # Initialize Vertex AI - replace with your project details if not using gcloud auth
        # To run locally, ensure you have authenticated with gcloud: `gcloud auth application-default login`
        company = config.get("company", "StyleSphere")
        logo_path = config.get("logo_path", "https://storage.googleapis.com/genai-assets-external/logo-black-trans.png")
    except Exception as e:
        st.error(f"Failed to initialize Vertex AI models from config: {e}")
        st.stop()
else:
    st.error("Could not load config.json. App cannot proceed.")
    st.stop()

# --- Initialize Gemini Client for Image Generation ---
try:
    if 'global_client' not in st.session_state:
        st.session_state.global_client = genai.Client(vertexai=True, project=PROJECT_ID, location=GLOBAL_REGION)
except Exception as e:
    st.error(f"Gemini client initialization failed: {e}")
    st.stop()

 
# --- Sample Data ---
sample_data = {
    'user_id': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'name': ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy'],
    'location': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'London', 'Paris', 'Tokyo', 'Sydney', 'Berlin'],
    'recent_purchases': [
        'running shoes, protein powder', 'designer handbag, silk scarf',
        'noise-cancelling headphones, smart watch', 'gardening tools, organic seeds',
        'crypto book, VR headset', 'gourmet coffee, french press',
        'yoga mat, water bottle', 'hiking boots, backpack',
        'video game, gaming mouse', 'art supplies, canvas'
    ],
    'Browse_history': [
        'athletic wear, fitness trackers', 'luxury brands, fashion blogs',
        'latest gadgets, tech reviews', 'home improvement, DIY projects',
        'blockchain news, virtual reality worlds', 'artisanal foods, coffee brewing techniques',
        'mindfulness apps, meditation guides', 'outdoor gear, travel destinations',
        'esports tournaments, new game releases', 'online art galleries, painting tutorials'
    ],
    'preferred_language': ['English', 'English', 'English', 'English', 'English', 'English', 'French', 'Japanese', 'English', 'German'],
    'weather':['sunny','cloudy','snow','rain','sunny','cloudy','rain','sunny','cloudy','rain']
}


#df = pd.DataFrame(data)

# --- Company & Branding ---
company_background = f"You are a marketing assistant for {company}"
logo_url = logo_path

# --- Initialize Session State ---
if 'step' not in st.session_state:
    st.session_state.step = 1
if 'audience_data' not in st.session_state:
    st.session_state.audience_data = None
if 'selected_user_id' not in st.session_state:
    st.session_state.selected_user_id = None
if 'generated_html' not in st.session_state:
    st.session_state.generated_html = None
if 'error_message' not in st.session_state:
    st.session_state.error_message = None
if 'step1_time' not in st.session_state:
    st.session_state.step1_time = None
if 'step3_time' not in st.session_state:
    st.session_state.step3_time = None


# --- Live AI Functions ---
def call_gemini_text(textprompt: str) -> str:
    """Sends a text prompt to the Vertex AI Generative Model for text/html output."""
    try:
        response = model.generate_content(
            textprompt,
            generation_config={"max_output_tokens": 8192, "temperature": 0.4, "top_p": 1},
            safety_settings={
                generative_models.HarmCategory.HARM_CATEGORY_HATE_SPEECH: generative_models.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                generative_models.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: generative_models.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                generative_models.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: generative_models.HarmBlockThreshold.BLOCK_ONLY_HIGH,
                generative_models.HarmCategory.HARM_CATEGORY_HARASSMENT: generative_models.HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            stream=False,
        )
        return response.text
    except Exception as e:
        st.error(f"Error calling Gemini for text: {e}")
        return ""


def call_gemini_json(textprompt, json_structure, model_name):
    """Sends a prompt to Gemini and expects a JSON response conforming to a schema."""
    model = GenerativeModel(model_name)
    print("starting analysis")
    print("generating results")
    print(f"model being used: {model_name}")
    generation_config=GenerationConfig(
        temperature=1.0,
        max_output_tokens=8192,
        top_p=.95,
        response_mime_type="application/json",
        response_schema=json_structure
    )
    safety_settings={
        generative_models.HarmCategory.HARM_CATEGORY_HATE_SPEECH: generative_models.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        generative_models.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: generative_models.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        generative_models.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: generative_models.HarmBlockThreshold.BLOCK_ONLY_HIGH,
        generative_models.HarmCategory.HARM_CATEGORY_HARASSMENT: generative_models.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    }
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content([textprompt], generation_config=generation_config, safety_settings=safety_settings, stream=False)
            out = response.text
            if not out or out.strip() == "" or out.strip() == "{}":
                print(f"Attempt {attempt + 1}: Received empty or invalid JSON. Retrying...")
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                else:
                    raise ValueError("Failed to get valid JSON after multiple retries.")
            json.loads(out)
            return out

        except (ValueError, json.JSONDecodeError) as e:
            print(f"Attempt {attempt + 1}: JSON Error: {e}. Retrying...")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise

def generate_image_with_gemini(client, prompt: str) -> bytes:
    """Generates an image using Gemini image model and returns the image bytes."""
    try:
        # Create a text-only prompt for image generation
        prompt_part = genai_types.Part(text=prompt)

        user_content = genai_types.Content(
            role="user",
            parts=[prompt_part]
        )

        generation_config = genai_types.GenerateContentConfig(
            temperature=1,
            top_p=0.95,
            max_output_tokens=8192,
            response_modalities=["IMAGE"],
            safety_settings=[genai_types.SafetySetting(category=c, threshold="OFF") for c in genai_types.HarmCategory]
        )

        print(f"DEBUG: Calling Gemini for image generation with prompt: '{prompt[:80]}...'")
        response = client.models.generate_content(
            model=MODEL_IMAGE_GENERATION,
            contents=[user_content],
            config=generation_config
        )

        if not response.candidates or not response.candidates[0].content or not response.candidates[0].content.parts:
            error_msg = f"Model returned no content for image prompt"
            print(f"--- ERROR in generate_image_with_gemini: {error_msg} ---")
            return None

        # Search through all parts to find the image (text might be returned alongside image)
        image_part = None
        parts = response.candidates[0].content.parts

        for part in parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                if part.inline_data.mime_type == "image/png":
                    image_part = part
                    break

        if not image_part:
            print(f"--- ERROR: No image found in response ---")
            return None

        return image_part.inline_data.data

    except Exception as e:
        print(f"--- EXCEPTION in generate_image_with_gemini: {e} ---")
        return None


def call_imagen_and_get_b64(client, prompt: str, image_name: str) -> str:
    """Generates an image using Gemini, saves it, and returns it as a Base64 string."""
    try:
        image_dir = "imgs/landing_pages"
        os.makedirs(image_dir, exist_ok=True)
        image_path = os.path.join(image_dir, f"{image_name}.png")

        # Generate image using Gemini
        image_bytes = generate_image_with_gemini(client, prompt)

        if image_bytes:
            # Save the image file
            with open(image_path, "wb") as f:
                f.write(image_bytes)

            # Return base64 encoded
            return base64.b64encode(image_bytes).decode("utf-8")
        else:
            raise Exception("Failed to generate image")

    except Exception as e:
        st.error(f"Error during image generation or encoding for '{image_name}': {e}")
        # Return a placeholder B64 image on failure
        return "iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAYAAABkW7XSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAANQSURBVHhe7dNBQQAwDAPBtP/ec4iAIAL+6wAwQBYgC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFyAIkC5AFSA78BJ8h1fK9VpB8AAAAASUVORK5CYII="

# --- Main App UI and Logic ---
st.markdown(f"""
    <div style="text-align: center; margin-bottom: 2rem;">
        <img src="{logo_url}" width="200" style="margin-bottom: 1rem;">
        <h1>Personalized Landing Page Generator</h1>
        <p style="font-size: 1.2rem; color: #555;">Use Gemini to analyze customer data and generate a tailored webpage for individual users.</p>
    </div>
    """, unsafe_allow_html=True)

if st.session_state.error_message:
    st.error(st.session_state.error_message)

# --- STEP 1: Audience Analysis ---
if st.session_state.step == 1:
    with st.container(border=True):
        st.subheader("Step 1: Analyze Customer Data")
        st.write("First, we'll send the raw customer data to Gemini to identify key audience segments.")
        st.dataframe(df, hide_index=True)

        if st.button("Analyze Audiences", type="primary"):
            start_time_step1 = time.time()
            with st.spinner("Gemini is analyzing data to create audiences..."):
                audience_schema = {
                    "type": "object", "properties": {"audiences": {"type": "array", "items": {
                    "type": "object", "properties": {
                        "audience_name": {"type": "string"}, "description": {"type": "string"},
                        "user_ids": {"type": "array", "items": {"type": "integer"}}},
                    "required": ["audience_name", "description", "user_ids"]}}},
                    "required": ["audiences"]}
                audience_prompt = f"""
                Company Background: {company_background}
                Task: Create 3 Audience Segments for the company based on the provided data. For each audience, provide a name, a brief description, and a list of user_ids that belong to it.
                All users must be in a single audience. Return ONLY the raw JSON object that conforms to the provided schema.
                Data: {df.to_json(orient='records')}
                """
                response_str = call_gemini_json(audience_prompt, audience_schema, MODEL_AUDIENCE_ANALYSIS)
                print(response_str)
                try:
                    st.session_state.audience_data = json.loads(response_str)
                    st.session_state.step = 2
                    st.session_state.error_message = None
                    st.session_state.step1_time = time.time() - start_time_step1
                    st.rerun()
                except (json.JSONDecodeError, TypeError):
                    st.session_state.error_message = f"Failed to decode JSON from Gemini's audience analysis. Response: {response_str}"
                    st.rerun()

# --- STEP 2: User Selection ---
if st.session_state.step >= 2:
    with st.container(border=True):
        st.subheader("Step 2: Select a User to Target")

        if st.session_state.step1_time:
            st.success(f"Audience analysis completed in {st.session_state.step1_time:.2f} seconds.")
            st.session_state.step1_time = None # Clear after displaying

        st.write("Analysis complete! Gemini has identified the following audiences:")
        if st.session_state.audience_data:
            id_to_name = df.set_index('user_id')['name'].to_dict()
            audiences = st.session_state.audience_data.get('audiences', [])
            cols = st.columns(len(audiences) if audiences else 1)
            for i, audience in enumerate(audiences):
                with cols[i]:
                    st.markdown(f"<h5>{audience['audience_name']}</h5>", unsafe_allow_html=True)
                    st.caption(f"{audience['description']}")
                    user_ids = audience.get('user_ids', [])
                    user_names = [id_to_name.get(uid, "Unknown") for uid in user_ids]
                    st.markdown("**Users in this segment:**")
                    for name in user_names:
                        st.markdown(f"- {name}")
  
        st.info("Now, pick a user from the list below to generate their personalized landing page.")
        user_options = {row['name']: row['user_id'] for index, row in df.iterrows()}
        selected_name = st.selectbox("Choose a user:", options=user_options.keys(), index=0, label_visibility="collapsed")
        st.session_state.selected_user_id = user_options[selected_name]

        if st.button(f"Generate Page for {selected_name}", type="primary", disabled=(st.session_state.step > 2)):
            st.session_state.step = 3
            st.session_state.error_message = None
            st.rerun()

# --- STEP 3: Generation Logic ---
if st.session_state.step == 3:
    start_time_step3 = time.time()
    try:
        selected_user = df[df['user_id'] == st.session_state.selected_user_id].iloc[0]
        with st.spinner(f"Creating a personalized experience for {selected_user['name']}..."):
            status = st.empty()

            # --- 1. Get English Product Recommendations ---
            status.write("1/5: Asking Gemini for tailored product recommendations...")
            products_schema = {
                "type": "object", "properties": {"products": {"type": "array", "items": {
                "type": "object", "properties": {
                    "name": {"type": "string"}, "sku": {"type": "string"}, "short_description": {"type": "string"},
                    "cost": {"type": "string"}, "reason": {"type": "string"}, "image_prompt": {"type": "string"}},
                "required": ["name", "sku", "short_description", "cost", "reason", "image_prompt"]}}},
                "required": ["products"]}
            products_prompt = f"""
            Task: Generate 6 personalized product recommendations for the user based on their data.
            The products should be from the following company: '{company}'.
            For each product, provide: name, sku, short_description, cost, a reason for the recommendation, and a detailed prompt for an image generation model to create a visually appealing product photo.

            IMPORTANT for image_prompt: The image will be displayed on a BLACK WEBSITE with a Nike-style dark theme.
            Each image_prompt MUST specify:
            - Dark background (black, charcoal, dark grey, or dramatic dark gradient)
            - Professional product photography with dramatic lighting
            - Nike athletic aesthetic - bold, dynamic, sporty
            - High contrast lighting that makes the product pop against the dark background
            - Moody, premium atmosphere

            Return ONLY the raw JSON object that conforms to the provided schema. User Data: {selected_user.to_json()}
            """
            products_str = call_gemini_json(products_prompt, products_schema, MODEL_PRODUCT_RECOMMENDATIONS)
            products_data = json.loads(products_str)

            # --- 2. Translate Recommendations to Spanish ---
            status.write("2/5: Translating recommendations to Spanish...")
            translation_prompt = f"""
            Task: Translate the 'name', 'short_description', and 'reason' fields for each product in the following JSON from English to Spanish.
            Do not translate 'sku', 'cost', or 'image_prompt'. Keep the exact same JSON structure.
            Return ONLY the raw JSON object that conforms to the provided schema.
            JSON to translate: {products_str}
            """
            products_es_str = call_gemini_json(translation_prompt, products_schema, MODEL_TRANSLATION)
            products_data_es = json.loads(products_es_str)

            # --- 3. Write Personalized Headlines ---
            status.write("3/5: Writing personalized headlines...")
            headline_schema = {
                "type": "object", "properties": {
                "en": {"type": "object", "properties": {"headline": {"type": "string"}, "subheadline": {"type": "string"}}, "required": ["headline", "subheadline"]},
                "es": {"type": "object", "properties": {"headline": {"type": "string"}, "subheadline": {"type": "string"}}, "required": ["headline", "subheadline"]}},
                "required": ["en", "es"]}
            headline_prompt = f"""
            Task: Based on the user's data, write a short, catchy headline and a slightly more detailed subheadline for their personalized landing page.

            Style Guidelines for {company}:
            - Use bold, inspirational, athletic tone (Nike-style)
            - Short, powerful phrases that motivate action
            - Headlines should feel empowering and personal
            - Focus on achievement, performance, and the user's goals

            For the subheadline use some details about them to help them realize this page is personalized to them, create a full paragraph of text for the subheadline.
            Provide the text in both English and Spanish. Return ONLY the raw JSON object that conforms to the provided schema.
            User Data: {selected_user.to_json()}
            """
            headlines_str = call_gemini_json(headline_prompt, headline_schema, MODEL_HEADLINES)
            headlines_data = json.loads(headlines_str)

            # --- 4. Generate Product Images (Multi-threaded) ---
            status.write("4/5: Generating product images with Gemini...")

            # Get the client from session state before entering the executor
            global_client = st.session_state.global_client

            # Prepare arguments for parallel execution
            prompts = [p['image_prompt'] for p in products_data['products']]
            image_names = [f"{selected_user['name']}_product_{i}" for i in range(len(products_data['products']))]

            # Use ThreadPoolExecutor to generate images in parallel
            image_b64_list = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
                # Submit all tasks with client passed as first parameter
                futures = []
                for prompt, image_name in zip(prompts, image_names):
                    future = executor.submit(call_imagen_and_get_b64, global_client, prompt, image_name)
                    futures.append(future)

                # Collect results in order
                for future in futures:
                    image_b64_list.append(future.result())


            # --- 5. Assemble the Final HTML Page ---
            status.write("5/5: Assembling the final page...")
            product_cards_html = ""
            products_en = products_data['products']
            products_es = products_data_es['products']

            for i in range(len(products_en)):
                product_cards_html += f"""
                <div class="product-card">
                    <img src="data:image/jpeg;base64,{image_b64_list[i]}" alt="{products_en[i]['name']}">
                    <div class="product-info">
                        <h3>
                            <span class="lang-en">{products_en[i]['name']}</span>
                            <span class="lang-es">{products_es[i]['name']}</span>
                        </h3>
                        <p class="description">
                            <span class="lang-en">{products_en[i]['short_description']}</span>
                            <span class="lang-es">{products_es[i]['short_description']}</span>
                        </p>
                        <p class="price">{products_en[i]['cost']}</p>
                    </div>
                    <div class="reason-overlay">
                        <p>
                            <span class="lang-en">{products_en[i]['reason']}</span>
                            <span class="lang-es">{products_es[i]['reason']}</span>
                        </p>
                    </div>
                </div>
                """
 
            final_html = f"""
            <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>A Special Selection for {selected_user['name']}</title>
            <style>
                body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; background-color: #000; color: #fff; }}
                .lang-es {{ display: none; }}
                .header {{ background-color: #111; padding: 30px 40px; text-align: center; border-bottom: 1px solid #222; }}
                .header img {{ max-width: 180px; margin-bottom: 15px; filter: brightness(0) invert(1); }}
                .header h1 {{ margin: 0; font-size: 2.8em; font-weight: 700; letter-spacing: -0.5px; color: #fff; }}
                .header p {{ margin: 15px 0 0; font-size: 1.2em; color: #b3b3b3; line-height: 1.6; max-width: 800px; margin-left: auto; margin-right: auto; }}
                .lang-toggle {{ padding: 15px; text-align: center; background: #0a0a0a; border-bottom: 1px solid #222;}}
                .lang-toggle button {{ background-color: #1a1a1a; border: 1px solid #333; padding: 10px 20px; margin: 0 8px; border-radius: 25px; cursor: pointer; font-size: 14px; transition: all 0.3s ease; color: #fff; font-weight: 500; }}
                .lang-toggle button:hover {{ background-color: #2a2a2a; border-color: #fff; }}
                .lang-toggle button.active {{ background-color: #fff; color: #000; border-color: #fff; font-weight: 700; }}
                .container {{ max-width: 1400px; margin: 50px auto; padding: 0 30px; }}
                .products-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 30px; }}
                .product-card {{ background-color: #0a0a0a; border-radius: 8px; box-shadow: 0 4px 20px rgba(255,255,255,0.05); overflow: hidden; position: relative; transition: transform 0.3s ease, box-shadow 0.3s ease; border: 1px solid #1a1a1a; }}
                .product-card:hover {{ transform: translateY(-8px); box-shadow: 0 12px 30px rgba(255,255,255,0.1); border-color: #333; }}
                .product-card img {{ width: 100%; height: 380px; object-fit: cover; display: block; }}
                .product-info {{ padding: 25px; }}
                .product-info h3 {{ margin: 0 0 8px; font-size: 1.5em; font-weight: 700; color: #fff; letter-spacing: -0.3px; }}
                .product-info .description {{ font-size: 0.95em; color: #999; margin-bottom: 15px; height: 45px; overflow: hidden; line-height: 1.5; }}
                .product-info .price {{ font-weight: 700; color: #fff; font-size: 1.3em; margin-top: 12px; }}
                .reason-overlay {{ position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.92); backdrop-filter: blur(8px); color: white; display: flex; align-items: center; justify-content: center; text-align: center; padding: 30px; opacity: 0; transition: opacity 0.3s ease; font-size: 1.05em; line-height: 1.6; }}
                .product-card:hover .reason-overlay {{ opacity: 1; }}
            </style>
            </head><body>
            <div class="header">
                <img src="{logo_url}" alt="{company} Logo">
                <h1><span class="lang-en">{headlines_data['en']['headline']}</span><span class="lang-es">{headlines_data['es']['headline']}</span></h1>
                <p><span class="lang-en">{headlines_data['en']['subheadline']}</span><span class="lang-es">{headlines_data['es']['subheadline']}</span></p>
            </div>
            <div class="lang-toggle">
                <button id="btn-en" class="active" onclick="toggleLanguage('en')">English</button>
                <button id="btn-es" onclick="toggleLanguage('es')">Espanol</button>
            </div>
            <div class="container"><div class="products-grid">{product_cards_html}</div></div>
            <script>
                const btnEn = document.getElementById('btn-en');
                const btnEs = document.getElementById('btn-es');
                function toggleLanguage(lang) {{
                    const elementsEn = document.querySelectorAll('.lang-en');
                    const elementsEs = document.querySelectorAll('.lang-es');
                    if (lang === 'es') {{
                        elementsEn.forEach(el => el.style.display = 'none');
                        elementsEs.forEach(el => el.style.display = 'inline');
                        btnEs.classList.add('active');
                        btnEn.classList.remove('active');
                    }} else {{
                        elementsEs.forEach(el => el.style.display = 'none');
                        elementsEn.forEach(el => el.style.display = 'inline');
                        btnEn.classList.add('active');
                        btnEs.classList.remove('active');
                    }}
                }}
            </script>
            </body></html>
            """
            st.session_state.generated_html = final_html
            st.session_state.step = 4
            st.session_state.error_message = None
            st.session_state.step3_time = time.time() - start_time_step3

    except Exception as e:
        st.session_state.error_message = f"An error occurred during page generation: {e}"
        st.session_state.step = 2 # Go back to user selection on error

    st.rerun()

# --- STEP 4: Display Final Page ---
if st.session_state.step == 4:
    with st.container(border=True):
        selected_user = df[df['user_id'] == st.session_state.selected_user_id].iloc[0]
        st.subheader(f"Personalized Page for {selected_user['name']}")

        if st.session_state.step3_time:
            st.success(f"Page generation completed in {st.session_state.step3_time:.2f} seconds.")
            st.session_state.step3_time = None # Clear after displaying

        # --- Save the file and clean up old ones ---
        output_dir = "output"
        os.makedirs(output_dir, exist_ok=True)

        # Delete old HTML files before saving the new one
        for filename in os.listdir(output_dir):
            if filename.endswith(".html"):
                try:
                    os.remove(os.path.join(output_dir, filename))
                except OSError as e:
                    st.warning(f"Could not delete old file {filename}: {e}")

        file_path = os.path.join(output_dir, f"page_for_{selected_user['name']}.html")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(st.session_state.generated_html)

        st.success(f"Page saved to `{file_path}`")
        st.info("To view the full personalized page, click 'Download HTML File' and open the downloaded file in your browser.")

        # --- Provide only the Download option ---
        st.download_button(
            label="Download HTML File",
            data=st.session_state.generated_html,
            file_name=f"page_for_{selected_user['name']}.html",
            mime="text/html",
            use_container_width=True
        )

        # --- Display preview in iframe ---
        st.write("---") # Separator for clarity
        st.markdown("### Page Preview")
        st.components.v1.html(st.session_state.generated_html, height=1500, scrolling=True)

if st.button("Start Over"):
    # Clear all session state keys to reset the app
    for key in list(st.session_state.keys()):
        del st.session_state[key]
    st.rerun()