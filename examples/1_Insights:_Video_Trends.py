#these work with appengine and ubuntu 22 / python 3.12
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

from google import genai
from google.genai import types as genai_types

import streamlit as st #pip install streamlit

import time
import json
import os 
from central_config import keyload
credentials, project_id = keyload()
from central_config import styling, region, load_config_file, keyload, styling_prompt, great_ad_example, great_trend_example

st.set_page_config(layout="wide")

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

required_observation = f"""
* What recommendations would you make for {company} based on these trends?
* for the ON Running video, try to generate a chart showing their company income over time and growth.
* What observations are made?  what trends are leaving and what trends are coming in?
"""

#this loads the vidoes from the config file, displaying the name but pulling the URL for gemini
if config:
    ad_data = config.get("comparison_urls", [])
    if not ad_data:
        st.warning("No ad URLs found in the config file.")
    else:
        ad_names = [ad['name'] for ad in ad_data]
        ad_url_map = {ad['name']: ad['url'] for ad in ad_data}


st.markdown(f"{styling}",unsafe_allow_html=True)

PROJECT_ID = project_id  # @param {type:"string"}
REGION = region # @param {type:"string"}

gen_client = genai.Client(vertexai=True, project=PROJECT_ID, location="us-central1")

def genai_client_youtube_html(prompt, vid_url):
    user_contents = genai_types.Content(
        role="user",
        parts=[
            genai_types.Part(
                file_data=genai_types.FileData(
                    file_uri=vid_url,
                    mime_type="video/youtube",
                )
            ),
            genai_types.Part(text=prompt),
        ],
    )
    generation_config = genai_types.GenerateContentConfig(
        temperature=1, top_p=0.95, max_output_tokens=65000
    )
    response = gen_client.models.generate_content(
        model=model_pro,
        contents=[user_contents],
        config=generation_config
    )
    html_response = response.text
    return html_response

def analyze_video(video_url, prompt):
    sanitized_filename = "".join(c if c.isalnum() else '_' for c in video_url)
    output_filename = f"data/trend_analysis_{sanitized_filename}.html"

    if not os.path.exists(output_filename):
        st.info(f"Analyzing {video_url}...")
        video_analysis = genai_client_youtube_html(prompt, video_url)
        with open(output_filename, "w") as f:
            f.write(video_analysis)
        st.success(f"Saved analysis for {video_url} to {output_filename}")
    else:
        st.info(f"Analysis for {video_url} already exists.")
    return output_filename

def compare_analyses(file1_path, file2_path, file3_path, prompt):
    with open(file1_path, "r") as f1:
        analysis1 = f1.read()
    with open(file2_path, "r") as f2:
        analysis2 = f2.read()
    with open(file3_path, "r") as f3:
        analysis3 = f3.read()

    user_contents = genai_types.Content(
        role="user",
        parts=[
            genai_types.Part(text=f"Here is the first analysis:\n{analysis1}"),
            genai_types.Part(text=f"Here is the second analysis:\n{analysis2}"),
            genai_types.Part(text=f"Here is the third analysis:\n{analysis3}"),
            genai_types.Part(text=prompt),
        ],
    )

    generation_config = genai_types.GenerateContentConfig(
        temperature=1, top_p=0.95, max_output_tokens=65000
    )
    response = gen_client.models.generate_content(
        model=model_flash_lite,
        contents=[user_contents],
        config=generation_config
    )
    html_response = response.text
    return html_response


row0_0, row0_1, row0_2 = st.columns((1,12,1))
with row0_1:
    st.markdown(
        f"""
        <div style="text-align: center;padding-bottom:0px;margin-top:-50px;">  
            <img src="{logo_path}" width="{logo_width}">
        </div>
        <div style="text-align: center;margin-top:-10px">  
            <h1>Video Trends Analysis w/Vertex AI</h1> 
            </br>
        </div>
        """,
        unsafe_allow_html=True
    )

col1, col2, col3 = st.columns(3)

if config:
    trend_urls = config.get("trend_urls", [])
    if not trend_urls:
        st.warning("No trend URLs found in the config file.")
    else:
        for i, video_data in enumerate(trend_urls):
            with locals()[f"col{i+1}"]:
                video_url = video_data["url"]
                video_id = video_url.split("v=")[1]
                youtube_embed_url = f"https://www.youtube.com/embed/{video_id}"
                html_code = f"""
                    <iframe width="100%" height="390" src="{youtube_embed_url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                """
                st.components.v1.html(html_code, height=400)


if "video_analysis" in st.session_state and st.session_state.video_analysis:
    del st.session_state.video_analysis

analysis_prompt = f"""You are an expert trend analyst. Your task is to meticulously analyze the provided video and generate a comprehensive report as a single, well-structured HTML document. The entire output should be only the HTML code, ready to be rendered.
Here is your styling to adhere to:
{styling_prompt}

Here is a great format of how to present the data:ad_ana
{great_trend_example}

HTML Report Structure:

1.  **Main Title:** Start with an `<h1>` tag containing the title "Video Trend Analysis".

2.  **Trend Analysis:**
    *   An `<h2>` titled "Trend Analysis".
    *   A detailed analysis of the trends identified in the video, including visual, audio, and thematic elements.
    * Be verbose, highlight multiple trends.

3.  **Audience Analysis:**
    *   An `<h2>` titled "Audience Analysis".
    *   An analysis of the target audience for the trends identified.

4.  **Recommendations:**
    *   An `<h2>` titled "Recommendations".
    *   Actionable recommendations for how to leverage these trends.
"""

comparison_prompt = f"""You are an expert trend analyst. Your task is to meticulously analyze the three provided video trend analyses and generate a comprehensive report comparing them as a single, well-structured HTML document. The entire output should be only the HTML code, ready to be rendered.
Here is your styling to adhere to:
{styling_prompt}

HTML Report Structure:
{required_observation}
* Suggest some google search keywords that could be purchased for the company based on the trends identified.

**Comparative Summary:** create a new section with an `<h2>` titled "Comparative Summary".
*  In this section, provide a summary of which video represents the most significant trend and why, based on the analysis.
*  Highlight areas where different products may be coming into or out of fashion.

**Additional Details**
* Place any specific video summaries here.



"""

if not demo_mode:
    analyze_button = st.button("Analyze Videos")
    if analyze_button:
        if trend_urls:
            for video_data in trend_urls:
                analyze_video(video_data["url"], analysis_prompt)
            st.success("Analyses complete and saved.")
        else:
            st.info("No trend URLs found in the config file.")

if demo_mode:
    compare_button = st.button("Compare Videos")
    if compare_button:
        if trend_urls:
            file_paths = []
            for video_data in trend_urls:
                video_url = video_data["url"]
                sanitized_filename = "".join(c if c.isalnum() else '_' for c in video_url)
                file_paths.append(f"data/trend_analysis_{sanitized_filename}.html")

            if all(os.path.exists(p) for p in file_paths):
                with st.spinner(text="Comparing Analyses..."):
                    comparison_html = compare_analyses(file_paths[0], file_paths[1], file_paths[2], comparison_prompt)
                    if comparison_html.startswith("```html") and comparison_html.endswith("```"):    
                        comparison_html = comparison_html[len("```html\n"):-len("```")].strip()  
                    st.components.v1.html(comparison_html, height=7000, scrolling=True)
            else:
                st.warning("Please analyze all videos first.")
        else:
            st.info("No trend URLs found in the config file.")
