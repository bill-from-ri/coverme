from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Job Application Assistant")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini API
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-pro')
except Exception as e:
    print(f"Warning: Failed to initialize Gemini API: {e}")
    model = None

class CoverLetterRequest(BaseModel):
    job_description: str
    additional_context: Optional[str] = None

class PromptRequest(BaseModel):
    prompt: str
    additional_context: Optional[str] = None

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return """
    <html>
        <head>
            <title>Job Application Assistant API</title>
        </head>
        <body>
            <h1>Job Application Assistant API</h1>
            <p>API is running. Use the frontend to interact with the service.</p>
        </body>
    </html>
    """

@app.post("/api/generate-cover-letter")
async def generate_cover_letter(request: CoverLetterRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API not properly configured")
    
    try:
        # Read the cover letter template
        try:
            with open('templates/cover_letter_template.txt', 'r') as file:
                template = file.read()
        except FileNotFoundError:
            template = """
            [Your Name]
            [Your Address]
            [Email Address]
            [Phone Number]
            [Date]

            [Hiring Manager's Name]
            [Company Name]
            [Company Address]

            Dear [Hiring Manager's Name],

            I am excited to apply for the [Job Title] position at [Company Name]. [Generated content will go here]

            Sincerely,
            [Your Name]
            """
        
        # Create prompt for Gemini
        prompt = f"""
        Based on the following job description and additional context, generate a professional cover letter.
        
        Job Description:
        {request.job_description}
        
        Additional Context:
        {request.additional_context or 'None provided'}
        
        Use this template format, but replace the content with relevant information:
        {template}
        """
        
        # Generate response
        response = model.generate_content(prompt)
        
        return {"cover_letter": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating cover letter: {str(e)}")

@app.post("/api/respond-to-prompt")
async def respond_to_prompt(request: PromptRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API not properly configured")
    
    try:
        # Read resume and cover letter
        resume_text = ""
        cover_letter_text = ""
        
        try:
            with open('data/resume.txt', 'r') as file:
                resume_text = file.read()
        except FileNotFoundError:
            pass
            
        try:
            with open('data/cover_letter.txt', 'r') as file:
                cover_letter_text = file.read()
        except FileNotFoundError:
            pass
        
        # Create prompt for Gemini
        prompt = f"""
        Based on the following resume, cover letter, and additional context, respond to the prompt below.
        
        Resume:
        {resume_text}
        
        Cover Letter:
        {cover_letter_text}
        
        Additional Context:
        {request.additional_context or 'None provided'}
        
        Prompt to respond to:
        {request.prompt}
        
        Please provide a professional and well-structured response.
        """
        
        # Generate response
        response = model.generate_content(prompt)
        
        return {"response": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
