# Job Application Assistant

A browser-based tool that helps you quickly generate cover letters and respond to job application prompts using AI.

## Features

- **Cover Letter Generator**: Create personalized cover letters from job descriptions
- **Prompt Responder**: Get AI-generated responses to application questions
- **Easy to Use**: Simple browser bookmarklet interface
- **Privacy-Focused**: All processing happens on your local machine (backend required)

## Setup

1. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Up Environment Variables**:
   Create a `.env` file in the project root with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Create Template Files**:
   - Create a `templates` directory and add a `cover_letter_template.txt` file with your preferred template
   - Create a `data` directory and add your `resume.txt` and `cover_letter.txt` files

4. **Start the Backend Server**:
   ```bash
   python main.py
   ```
   The server will start at `http://localhost:8000`

## Install the Bookmarklet

1. Copy the entire contents of `bookmarklet.js`
2. Create a new bookmark in your browser
3. Edit the bookmark and paste the code as the URL (make sure to include the `javascript:` prefix)
4. Save the bookmark

## Usage

1. Navigate to a job posting
2. Click the bookmarklet to open the Job Application Assistant
3. Select text on the page to automatically capture it as a job description
4. Choose between generating a cover letter or responding to a prompt
5. Click the respective button to generate content
6. Review and copy the generated content

## Customization

- Edit `templates/cover_letter_template.txt` to customize the cover letter format
- Modify the prompt in `main.py` to change how the AI generates responses
- Adjust the styling in `bookmarklet.js` to match your preferences

## Requirements

- Python 3.7+
- Modern web browser
- Gemini API key
