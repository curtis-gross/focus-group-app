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
from central_config import styling, region, load_config_file, keyload, styling_prompt, great_ad_example

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
    model_name = config["model"]
else:
    st.write("error loading config file")

#this loads the vidoes from the config file, displaying the name but pulling the URL for gemini
if config:
    ad_data = config.get("ad_urls", [])
    if not ad_data:
        st.warning("No ad URLs found in the config file.")
    else:
        ad_names = [ad['name'] for ad in ad_data]
        ad_url_map = {ad['name']: ad['url'] for ad in ad_data}


st.markdown(f"""{styling}""",unsafe_allow_html=True)

PROJECT_ID = project_id  # @param {type:"string"}
REGION = region # @param {type:"string"}

gen_client = genai.Client(vertexai=True, project=PROJECT_ID, location="us-central1")

def genai_client_youtube_html (prompt,vid_url):
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
        model=model_name,
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
            <h1>Video Analysis w/Vertex AI</h1> 
            </br>
        </div>
        """,
        unsafe_allow_html=True
    )

row1_0, row1_1, row1_2, row1_3 = st.columns((1,12,12,1))
with row1_1:
    
    video_select = st.selectbox(
        "Video to Analyze",
        ad_names,  # Pass the list of youtube urls
        index=0,  # Set default selection
        key="video_select_box"  # Important: Unique key for the selectbox
    )

    # --- 4. Use the selected name to find the URL and display the video ---
    if video_select:
        # Look up the URL in our map using the selected name
        video_url = ad_url_map[video_select]
        print(video_url)
        selected_video_url = video_url

    if "video_analysis" in st.session_state and st.session_state.video_analysis:
        del st.session_state.video_analysis

with row1_2:
    if video_select:
        video_id = selected_video_url.split("v=")[1]
        youtube_embed_url = f"https://www.youtube.com/embed/{video_id}"
        html_code = f"""
            <iframe width="100%" height="390" src="{youtube_embed_url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        """
        st.components.v1.html(html_code, height=400) 

with row1_1:
        # Get the timestamp as a numeric value (seconds since epoch)
  
    main_prompt = st.text_area("prompt",
    f"""You are an expert ad analyst and brand compliance manager. Your task is to meticulously analyze the provided video and generate a comprehensive report as a single, well-structured HTML document. The entire output should be only the HTML code, ready to be rendered.
Here is your styling to adhere to:
{styling_prompt}
Here is a great example of styling and structure:
{great_ad_example}

HTML Report Structure:
 
1. Main Title:
Start with an <h1> tag containing the title "Ad Compliance & Performance Report".

2. Brand Compliance Overview:
Create a section with an <h2> titled "High-Level Brand Compliance Analysis".
Below this, provide a high-level overview of the advertisement with positive, neutral, and negative observations. Each observation should be in its own bullet point using a <ul> and <li> structure.

3. Time On Screen Tracking Pie Chart (column left):
Create a Chart.js Pie Chart with a max height of 500px.
You will use key items identified in the video and break them down on their time on screen start and time on screen end.
The Chart will then display the total time, divided up by all the key items identified in the video and their total time on screen.
a key item might be the products, people, brands, or other.

4. Brand Visibility Percentage Pie Chart (column right):
Create another Chart.js chart with a max height of 500px.
The Chart hould have the following data represented: 'Brand', 'Total Time On Screen (s)', 'Total Video Length (s)', and 'Percentage of Video Time'.
Your goal is to represent how much time the main brand is visible vs time it is not.
For each unique brand, calculate and display the total time it was visible and what percentage of the total video duration that represents.

5. Chart representing interesting data found from the video, full column width.
- Identify key scenes in the video.  Name the scenes based on what is happening in the scene.
- Create an interesting chart to represent this data across the entire video.
- Be Creative and generate a chart, using chart.js to represent something interesting you discovered from this advertising video.

5. Video Score
- Calculate a score from 0 to 10 on the overall adherence of the video to the ABCD framework from Youtube.
- Provide the score, presented in a beautiful way.
- Provide a quick series of positive, negative and neutral feedback.
- Provide 3 actionable ways to improve the score.
- Provide a comma separated list of keywords that could be purchased on Google Search to promote this ad.

6. YouTube ABCD Framework Analysis Table:
Create a section with an <h2> titled "YouTube ABCD Framework Analysis".
Generate an HTML table with three columns: 'Guideline', 'Analysis', and 'Recommendations'.
Populate the table with rows for each of the following questions, organized under their respective categories. The category titles ('Attention:', 'Branding:', 'Connection:', 'Direction:') must be enclosed in <strong> tags within the first column.

Attention:

Is there a hook and sustained immersive story?

Does the Ad jump right into the action?

Is there augmentation from audio and supers?

Are the visuals bright and contrasted?

Is there a human voice within the ad?

Is there 'see' and 'say' duplication and reinforcement?

Is the sound and music immersive?

Branding:

How well does the brand show up early and often?

Is the brand showing reinforced with audio?

Does the brand get introduced frequently?

Connection:

Is the story 'humanized' properly?

Is the message focused?

Is the story engaging at an emotional level?

Are people the core of the story? Do faces become known?

Are there any famous faces?

Are the people representative of the target audience?

Is the message and story different, yet also simple?

Direction:

Is there a clear call to action?

6. Additional Metadata Table:
Create a final section with an <h2> titled "Detailed Advertisement Metadata".
Generate a two-column HTML table with 'Question' and 'Answer' as the headers.
Populate this table with answers to the following questions:

Give an overview of what the ad is about.

What improvements could be made to the ad?

Who is the ad for?

What age range is the ad for?

What is the overall style of the ad?

What is the setting for the ad?

What is the music style of the ad?

What is the color palette of the ad?

Who are the main characters?

Is the story front-loaded to reduce skips?

Are there familiar faces the target market can connect with?

How long does it take for a person to appear on screen?

Does the music match the video's pacing and style?

Does the creative style match the target audience?

Is the brand integrated naturally in the first 5 seconds?

Is the brand name mentioned in the audio?

What is the average time between scene cuts?

Does the video feature humor or suspense? Rank them on a scale of 1-10.

What is the main message the advertisement is trying to convey?

What emotions does the advertisement evoke?

What are the primary visual elements used?

Does the advertisement effectively grab your attention? Why or why not?

Are there any specific symbols or imagery used? What do they represent?

What is the language and tone of voice used?

Is the message clear and easy to understand?

How does the ad differentiate itself from competitors?

Does the ad have a specific call to action?

What values or lifestyle does the advertisement promote?

Do you think the advertisement is ethical and responsible? Why or why not?

Does the advertisement create a memorable impression? Why or why not?

Is the advertisement persuasive?

What cultural references or stereotypes are present?

Overall, would you consider this advertisement to be successful? Why or why not?

Final Instructions:

Ensure all timestamps are as accurate as possible and are represented in seconds.
If information for any item is missing or cannot be determined, use "N/A" in the corresponding table cell.
The output must be a single, clean block of HTML code. Do not include any explanatory text before or after the code.
     """)
    go_button = st.button("Analyze Video")

    
################ Output

if go_button:
    if video_select and "youtube.com" in selected_video_url:
        with st.spinner(text="Analyzing Video..."):
            with st.container(border=False):
                #################send video and prompt data to gemini to analyze the video
                if demo_mode == False:
                    st.warning("Demo_Mode=True")
                    if "video_analysis" not in st.session_state:
                        video_analysis = genai_client_youtube_html(main_prompt, selected_video_url)
                        st.session_state.video_analysis = video_analysis
                    else:
                        video_analysis = st.session_state.video_analysis
                    
                    # Save the HTML output
                    if not os.path.exists("data"):
                        os.makedirs("data")
                    
                    # Sanitize the video URL to create a valid filename
                    sanitized_filename = "".join(c if c.isalnum() else '_' for c in selected_video_url)
                    output_filename = f"data/ad_analysis{sanitized_filename}.html"
                    
                    with open(output_filename, "w") as f:
                        f.write(video_analysis)
                    st.success(f"Saved analysis to {output_filename}")
                    
                    # Strip markdown code block delimiters        
                    if video_analysis.startswith("```html") and video_analysis.endswith("```"):    
                        video_analysis = video_analysis[len("```html\n"):-len("```")].strip()  


                    data = video_analysis

                #Static results for consistency
                else:
                    time.sleep(sleep_time)
                    
                    # Sanitize the video URL to create a valid filename
                    sanitized_filename = "".join(c if c.isalnum() else '_' for c in selected_video_url)
                    output_filename = f"data/ad_analysis{sanitized_filename}.html"
                    
                    if os.path.exists(output_filename):
                        with open(output_filename, "r") as f:
                            data = f.read()
                            if data.startswith("```html") and data.endswith("```"):    
                                data = data[len("```html\n"):-len("```")].strip()  
                    else:
                        st.info("Demo file not found for this video.")
                        data = "<b>Demo file not found. Please run in non-demo mode first to generate the file.</b>"


            # Display the HTML content
            st.components.v1.html(data, height=7000, scrolling=True)
    else:
        st.info("Please enter a valid YouTube URL to begin analysis.")