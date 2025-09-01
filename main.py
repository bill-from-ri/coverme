from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from pypdf import PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from langchain_google_genai import ChatGoogleGenerativeAI
from textwrap import wrap

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

# Initialize LangChain Google Generative AI (Gemini) via ChatGoogleGenerativeAI
llm = None
try:
    # Prefer GOOGLE_API_KEY, fallback to GEMINI_API_KEY for convenience
    google_key = os.getenv("GOOGLE_API_KEY")
    if not google_key:
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            os.environ["GOOGLE_API_KEY"] = gemini_key
            google_key = gemini_key
    if not google_key:
        raise RuntimeError("Missing GOOGLE_API_KEY (or GEMINI_API_KEY as fallback)")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.5,
    )
except Exception as e:
    print(f"Warning: Failed to initialize ChatGoogleGenerativeAI: {e}")
    llm = None

class CoverLetterRequest(BaseModel):
    job_description: str
    additional_context: Optional[str] = None
    # Optional: allow a specific template PDF name in templates/ to guide style
    template_name: Optional[str] = None

class PromptRequest(BaseModel):
    prompt: str
    additional_context: Optional[str] = None
    # Optional: pick a specific saved cover letter (by filename without extension)
    cover_letter_name: Optional[str] = None


# ---------- Helpers ----------
DATA_DIR = "data"
COVER_LETTER_DIR = os.path.join(DATA_DIR, "cover_letters")
TEMPLATES_DIR = "templates"

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(COVER_LETTER_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)


def read_pdf_text(path: str) -> str:
    try:
        reader = PdfReader(path)
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF '{path}': {e}")


def save_text_as_pdf(text: str, out_path: str, title: Optional[str] = None):
    try:
        c = canvas.Canvas(out_path, pagesize=letter)
        width, height = letter
        x = 1 * inch
        y = height - 1 * inch
        if title:
            c.setFont("Helvetica-Bold", 14)
            c.drawString(x, y, title)
            y -= 0.3 * inch
        c.setFont("Times-Roman", 11)
        for line in text.splitlines():
            sublines = wrap(line, width=95) or [""]
            for subline in sublines:
                if y < 1 * inch:
                    c.showPage()
                    y = height - 1 * inch
                    c.setFont("Times-Roman", 11)
                c.drawString(x, y, subline)
                y -= 14
        c.save()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save PDF: {e}")

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
    if not llm:
        raise HTTPException(status_code=500, detail="Gemini API not properly configured")
    
    try:
        # Read the cover letter template - prefer PDF; fallback to text file; allow picking by name
        template_text = ""
        template_pdf_path = None
        if request.template_name:
            # sanitize basename
            base = os.path.basename(request.template_name)
            cand_pdf = os.path.join(TEMPLATES_DIR, base if base.lower().endswith('.pdf') else base + '.pdf')
            if os.path.exists(cand_pdf):
                template_pdf_path = cand_pdf
        # default paths
        default_pdf = os.path.join(TEMPLATES_DIR, 'cover_letter_template.pdf')
        default_txt = os.path.join(TEMPLATES_DIR, 'cover_letter_template.txt')
        if not template_pdf_path and os.path.exists(default_pdf):
            template_pdf_path = default_pdf
        if template_pdf_path and os.path.exists(template_pdf_path):
            template_text = read_pdf_text(template_pdf_path)
        elif os.path.exists(default_txt):
            with open(default_txt, 'r') as f:
                template_text = f.read()
        else:
            template_text = (
                "[Your Name]\n[Your Address]\n[Email Address]\n[Phone Number]\n[Date]\n\n"
                "[Hiring Manager's Name]\n[Company Name]\n[Company Address]\n\n"
                "Dear [Hiring Manager's Name],\n\n"
                "I am excited to apply for the [Job Title] position at [Company Name]. [Generated content will go here]\n\n"
                "Sincerely,\n[Your Name]"
            )
        
        # Create prompt for Gemini
        prompt = f"""
        Based on the following job description and additional context, generate a professional cover letter.
        
        Job Description:
        {request.job_description}
        
        Additional Context:
        {request.additional_context or 'None provided'}
        
        Use this template format as a base for your letter. Retain the general structure and formatting, but replace placeholders and irrelevant content with relevant information:
        {template_text}
        """
        
        # Generate response via LangChain
        response = llm.invoke(prompt)
        text = getattr(response, "content", None) or str(response)
        return {"cover_letter": text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating cover letter: {str(e)}")

@app.post("/api/respond-to-prompt")
async def respond_to_prompt(request: PromptRequest):
    if not llm:
        raise HTTPException(status_code=500, detail="Gemini API not properly configured")
    
    try:
        # Read resume and cover letter (prefer PDFs)
        resume_text = ""
        cover_letter_text = ""

        resume_pdf = os.path.join(DATA_DIR, 'resume.pdf')
        resume_txt = os.path.join(DATA_DIR, 'resume.txt')
        if os.path.exists(resume_pdf):
            resume_text = read_pdf_text(resume_pdf)
        elif os.path.exists(resume_txt):
            with open(resume_txt, 'r') as f:
                resume_text = f.read()

        # Determine cover letter source
        if request.cover_letter_name:
            base = os.path.basename(request.cover_letter_name)
            cl_pdf = os.path.join(COVER_LETTER_DIR, base if base.lower().endswith('.pdf') else base + '.pdf')
            cl_txt = os.path.join(COVER_LETTER_DIR, base if base.lower().endswith('.txt') else base + '.txt')
        else:
            cl_pdf = os.path.join(DATA_DIR, 'cover_letter.pdf')
            cl_txt = os.path.join(DATA_DIR, 'cover_letter.txt')

        if os.path.exists(cl_pdf):
            cover_letter_text = read_pdf_text(cl_pdf)
        elif os.path.exists(cl_txt):
            with open(cl_txt, 'r') as f:
                cover_letter_text = f.read()
        
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
        
        # Generate response via LangChain
        response = llm.invoke(prompt)
        text = getattr(response, "content", None) or str(response)
        return {"response": text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")


# ---------- Upload & Management Endpoints ----------

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for resume")
    out_path = os.path.join(DATA_DIR, 'resume.pdf')
    content = await file.read()
    with open(out_path, 'wb') as f:
        f.write(content)
    return {"message": "Resume uploaded", "path": "data/resume.pdf"}


@app.post("/api/upload-template")
async def upload_template(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for templates")
    out_path = os.path.join(TEMPLATES_DIR, 'cover_letter_template.pdf')
    content = await file.read()
    with open(out_path, 'wb') as f:
        f.write(content)
    return {"message": "Template uploaded", "path": "templates/cover_letter_template.pdf"}


@app.get("/api/list-cover-letters")
async def list_cover_letters():
    files = []
    if os.path.isdir(COVER_LETTER_DIR):
        for name in os.listdir(COVER_LETTER_DIR):
            if name.lower().endswith(('.pdf')):
                files.append({
                    "name": os.path.splitext(name)[0],
                    "filename": name,
                    "path": f"data/cover_letters/{name}",
                })
    return {"items": sorted(files, key=lambda x: x["name"].lower())}


@app.post("/api/upload-cover-letter")
async def upload_cover_letter(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Only PDF or TXT files supported for cover letters")
    safe_name = os.path.basename(file.filename)
    out_path = os.path.join(COVER_LETTER_DIR, safe_name)
    content = await file.read()
    with open(out_path, 'wb') as f:
        f.write(content)
    return {"message": "Cover letter uploaded", "filename": safe_name}


class SaveCoverLetterRequest(BaseModel):
    name: str
    content: str


@app.post("/api/save-cover-letter")
async def save_cover_letter(req: SaveCoverLetterRequest):
    if not req.name:
        raise HTTPException(status_code=400, detail="Name is required")
    base = os.path.splitext(os.path.basename(req.name))[0]
    pdf_path = os.path.join(COVER_LETTER_DIR, base + '.pdf')
    save_text_as_pdf(req.content, pdf_path, title=base)
    # Also save as .txt for quick diff/search
    txt_path = os.path.join(COVER_LETTER_DIR, base + '.txt')
    with open(txt_path, 'w') as f:
        f.write(req.content)
    return {"message": "Cover letter saved", "filename": os.path.basename(pdf_path)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
