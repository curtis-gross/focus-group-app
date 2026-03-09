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
import base64
import vertexai
from vertexai.generative_models import GenerativeModel, Part, FinishReason
import vertexai.preview.generative_models as generative_models
import streamlit as st #pip install streamlit
import vertexai # pip install vertexai
import io
import google.auth
from google.auth import transport
from google.cloud import storage
from streamlit.runtime.scriptrunner import get_script_run_ctx #for multi-threading in streamlit
from streamlit.runtime.scriptrunner import add_script_run_ctx #for multi-threading in streamlit
from vertexai.language_models import TextGenerationModel
from vertexai.preview.vision_models import Image, ImageGenerationModel
from vertexai.preview.generative_models import GenerativeModel, Part
import vertexai.preview.generative_models as generative_models
import tempfile
import pandas as pd
import time
import random
import locale
import plotly
import plotly.express as px
import os
import altair as alt
import json
import re
import threading
from central_config import logo_width, styling, region, load_config_file, gs_folder, bucket_name
from central_config import keyload

# --- Initial Setup ---
credentials, project_id = keyload()

st.set_page_config(layout="wide")

# Load configuration initially
config = load_config_file("config/config.json")
if config:
    demo_mode = config.get("demo_mode", False)
    sleep_time = config.get("sleep_time", 1)
    logo_path = config.get("logo_path", "")
    logo_width = config.get("logo_width", 100)
    company = config.get("company", "Cymbal")
    brand_names = config.get("brand_names", [])
    region = config.get("region", "us-central1")
    imagen_version = config.get("imagen_version", "001")
    model_name = config.get("model", "gemini-1.5-flash-001") # Renamed 'model' to 'model_name' to avoid conflict with GenerativeModel class
    customer_tags = config.get("customer_tags", [])
    p41 = config.get("p41", "")
    p42 = config.get("p42", "")
    p43 = config.get("p43", "")
    contentUrls = config.get("contentUrls", [])
    focus_products = config.get("focus_products", [])
else:
    st.error("Error loading config file. Please ensure config/config.json exists and is valid.")
    st.stop() # Stop execution if config cannot be loaded

st.markdown(f"""{styling}""", unsafe_allow_html=True)

PROJECT_ID = project_id
REGION = region

if demo_mode:
    st.info("Demo Mode : TRUE")
else:
    st.success("Demo Mode : FALSE")

# --- Original Configuration Editor (kept below for full control) ---
st.header("🔧 Manual Configuration Editor")
# Convert the config dictionary to a JSON string for display in the text area
# Use the *current* state of the config, which might include AI changes if applied
config_json_str = json.dumps(config, indent=4)

# Create the text area for manual editing
edited_config_json_str = st.text_area("Edit Configuration (JSON)", value=config_json_str, height=500, key="manual_config_editor")

# Save button for manual edits
if st.button("Save Manual Changes", key="save_manual_changes_btn"):
    try:
        # Try to parse the edited JSON
        edited_config = json.loads(edited_config_json_str)

        # Write the edited config back to the file
        with open("config/config.json", "w") as f:
            json.dump(edited_config, f, indent=4)
        st.success("Manual configuration saved successfully!")

        # Reload config and rerun to reflect changes
        config = load_config_file("config/config.json")
        time.sleep(1)
        st.rerun()
    except json.JSONDecodeError as e:
        st.error(f"Invalid JSON format. Please check your input. Error: {e}")

st.markdown("---")