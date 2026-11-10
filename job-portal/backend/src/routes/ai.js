const express = require('express');
const path = require('path');
const { auth } = require('../middleware/auth');
const { generate, parseJSON, hasRealKey, getModel } = require('../services/geminiService');
const { extractPdfText } = require('../utils/pdfExtract');
const { prepare } = require('../config/database');
const { safeParseJSON } = require('../utils/mappers');

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────
const mode = () => (hasRealKey() ? 'gemini' : 'mock');

// ── GET /api/ai/status ────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    mode: mode(),
    provider: hasRealKey() ? 'google-gemini-3.5-flash-lite' : 'local-heuristic',
    message: hasRealKey()
      ? 'AI is running with Gemini 3.5 Flash Lite.'
      : 'AI is in demo mode. Add GEMINI_API_KEY to .env for live inference.',
    features: [
      'analyze-resume', 'generate-job-description', 'cover-letter-help', 'resume-tips',
      'match-explanation', 'chat', 'interview-questions', 'learning-path', 'rewrite-experience',
      'employer-message', 'salary-estimate', 'fake-job-check', 'copilot', 'career-plan',
      'interview-kit', 'job-quality', 'candidate-fit'
    ],
    version: '2.0.0'
  });
});

// ── POST /api/ai/analyze-resume ───────────────────────────────────────────────
// Body: { skills, experience, education, jobSkills, fullName }
// Also reads actual resume PDF from DB if candidate is authenticated
router.post('/analyze-resume', auth, async (req, res) => {
  try {
    const {
      skills = [], experience = [], education = [],
      jobSkills = [], fullName = 'Candidate'
    } = req.body;

    // Try to get resume text from uploaded PDF
    let resumeText = '';
    try {
      const profile = prepare('SELECT resume_path FROM candidate_profiles WHERE user_id = ?').get(req.user.id);
      if (profile && profile.resume_path) {
        const absPath = path.join(__dirname, '../../', profile.resume_path);
        resumeText = await extractPdfText(absPath);
      }
    } catch (_) {}

    const skillList = Array.isArray(skills) ? skills : [];
    const hasResume = resumeText.length > 50;

    const prompt = `You are an expert ATS resume reviewer and career coach.

Candidate name: ${fullName}
Skills listed: ${skillList.join(', ') || 'none provided'}
Experience entries: ${JSON.stringify(experience).slice(0, 500)}
Education: ${JSON.stringify(education).slice(0, 300)}
Target job skills required: ${(Array.isArray(jobSkills) ? jobSkills : []).join(', ') || 'not specified'}
${hasResume ? `\nActual resume text (first 2000 chars):\n${resumeText.slice(0, 2000)}` : ''}

Analyze this resume and return a JSON object with these exact fields:
{
  "overallScore": <number 0-100>,
  "grade": <"A"|"B"|"C"|"D">,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "improvements": ["<improvement1>", "<improvement2>", "<improvement3>"],
  "keywords": {
    "found": ["<keyword1>"],
    "missing": ["<keyword1>"]
  },
  "atsChecklist": [
    {"item": "Contact info present", "pass": true},
    {"item": "Skills section detected", "pass": true},
    {"item": "Experience with dates", "pass": true},
    {"item": "Education listed", "pass": true},
    {"item": "Quantified achievements", "pass": true},
    {"item": "Action verbs used", "pass": true},
    {"item": "No tables/images blocking ATS", "pass": true}
  ]
}

Return only valid JSON, no explanation outside the JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', ...parsed, analyzedAt: new Date().toISOString() });
    }

    // Fallback
    const score = Math.min(96, 62 + skillList.length * 4 + (Array.isArray(education) && education.length ? 6 : 0));
    res.json({
      mode: 'mock',
      overallScore: score,
      grade: score >= 85 ? 'A' : score >= 70 ? 'B' : 'C',
      summary: `Profile looks ${score >= 80 ? 'strong' : 'promising'} with ${skillList.length} skill(s) detected.`,
      strengths: [
        skillList.length ? `Strong foundation in ${skillList.slice(0, 3).join(', ')}` : 'Clear career objective',
        'Good keyword coverage for ATS parsing',
        'Well-structured profile'
      ],
      improvements: [
        'Add 2-3 quantified achievements (e.g. "improved API latency by 35%")',
        'Add missing keywords: Docker, CI/CD, Testing',
        'Keep resume to 1-2 pages and use action verbs'
      ],
      keywords: { found: skillList.slice(0, 6), missing: ['Docker', 'CI/CD', 'Testing'] },
      atsChecklist: [
        { item: 'Contact info present', pass: true },
        { item: 'Skills section detected', pass: skillList.length > 0 },
        { item: 'Experience with dates', pass: Array.isArray(experience) && experience.length > 0 },
        { item: 'Education listed', pass: Array.isArray(education) && education.length > 0 },
        { item: 'No tables/images blocking ATS', pass: true }
      ],
      analyzedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('analyze-resume error:', err);
    res.status(500).json({ message: 'AI analysis failed', error: err.message });
  }
});

// ── POST /api/ai/generate-job-description ─────────────────────────────────────
router.post('/generate-job-description', auth, async (req, res) => {
  try {
    const {
      title = 'Software Engineer', skills = [], location = 'Remote',
      jobType = 'full-time', companyName = 'Our Company', industry = ''
    } = req.body;
    const skillStr = (Array.isArray(skills) && skills.length ? skills : ['JavaScript', 'React', 'Node.js']).join(', ');

    const prompt = `You are an expert technical recruiter writing a compelling, inclusive job description.

Role: ${title}
Company: ${companyName}
Industry: ${industry || 'Technology'}
Job Type: ${jobType}
Location: ${location}
Required Skills: ${skillStr}

Write a complete job description JSON with these exact fields:
{
  "title": "${title}",
  "description": "<full job description, well formatted with sections: About the role, Responsibilities (5 bullets), Requirements (5 bullets), Nice to have (3 bullets), Benefits (3 bullets). Use \\n for line breaks. Keep it inclusive and DEI-friendly.>",
  "responsibilities": ["<item1>","<item2>","<item3>","<item4>","<item5>"],
  "requirements": ["<item1>","<item2>","<item3>","<item4>","<item5>"],
  "niceToHave": ["<item1>","<item2>","<item3>"],
  "benefits": ["<item1>","<item2>","<item3>"],
  "seoTitle": "<SEO-optimized job title variant>"
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', ...parsed, generatedAt: new Date().toISOString() });
    }

    // Fallback
    res.json({
      mode: 'mock',
      title,
      description: `About ${companyName}\n${companyName} is hiring a ${title} (${jobType}, ${location}).\n\nResponsibilities:\n- Design and build features\n- Write clean, tested code\n- Collaborate with cross-functional teams\n\nRequirements:\n- Experience with: ${skillStr}\n- Strong problem-solving skills\n\n(Mock output — connect GEMINI_API_KEY for real generation.)`,
      responsibilities: ['Design, build, and maintain features', 'Write clean, tested, well-reviewed code', 'Collaborate in agile sprints'],
      requirements: (Array.isArray(skills) && skills.length ? skills : ['JavaScript', 'React', 'Node.js']).map(s => `Experience with ${s}`),
      niceToHave: ['Docker', 'CI/CD', 'Open-source contributions'],
      benefits: ['Competitive salary', 'Flexible hours', 'Learning budget'],
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'JD generation failed', error: err.message });
  }
});

// ── POST /api/ai/cover-letter-help ───────────────────────────────────────────
// tone: 'formal' | 'conversational' | 'creative'
router.post('/cover-letter-help', auth, async (req, res) => {
  try {
    const {
      jobTitle = 'the role', companyName = 'your company', skills = [],
      candidateName = 'Applicant', jobDescription = '', tone = 'formal'
    } = req.body;
    const skillStr = (Array.isArray(skills) && skills.length ? skills.slice(0, 5).join(', ') : 'relevant skills');

    const prompt = `You are a professional career writer. Write a ${tone} cover letter for a job application.

Applicant: ${candidateName}
Role: ${jobTitle} at ${companyName}
Key skills: ${skillStr}
${jobDescription ? `Job description excerpt: ${jobDescription.slice(0, 500)}` : ''}
Tone: ${tone} (formal=professional/structured, conversational=warm/natural, creative=energetic/distinctive)

Return JSON:
{
  "draft": "<full cover letter text with \\n line breaks, 200-280 words, personalized and compelling>",
  "tips": ["<tip1>", "<tip2>", "<tip3>"],
  "wordCount": <number>,
  "toneNote": "<one sentence explaining the tone choice>"
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', tone, ...parsed, generatedAt: new Date().toISOString() });
    }

    res.json({
      mode: 'mock',
      tone,
      draft: `Dear Hiring Manager at ${companyName},\n\nI am excited to apply for the ${jobTitle} position. With experience in ${skillStr}, I enjoy building reliable, user-focused software.\n\nThank you for your consideration.\n\nSincerely,\n${candidateName}\n\n(Mock draft — add GEMINI_API_KEY for personalized generation.)`,
      tips: ['Mention one quantified achievement', 'Mirror keywords from the job post', 'Keep it under 250 words'],
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Cover letter generation failed', error: err.message });
  }
});

// ── POST /api/ai/resume-tips ──────────────────────────────────────────────────
router.post('/resume-tips', auth, async (req, res) => {
  try {
    const { skills = [], targetRole = '', experienceLevel = 'mid' } = req.body;

    const prompt = `You are a resume coach. Give actionable, specific resume tips.

Target role: ${targetRole || 'general software/tech roles'}
Skills: ${Array.isArray(skills) && skills.length ? skills.join(', ') : 'not specified'}
Experience level: ${experienceLevel}

Return JSON:
{
  "tips": ["<specific tip 1>","<tip 2>","<tip 3>","<tip 4>","<tip 5>","<tip 6>"],
  "sampleBullets": ["<before: weak bullet>|<after: strong bullet>","<before>|<after>","<before>|<after>"],
  "sectionPriority": ["<most important section>","<2nd>","<3rd>","<4th>"],
  "keywordSuggestions": ["<keyword1>","<keyword2>","<keyword3>","<keyword4>","<keyword5>"]
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', ...parsed, generatedAt: new Date().toISOString() });
    }

    res.json({
      mode: 'mock',
      tips: [
        'Start each bullet with a strong action verb (Built, Led, Improved, Shipped).',
        'Quantify impact: numbers, %, time saved, users reached.',
        'Mirror keywords from the job description for ATS.',
        'Keep formatting simple: single column, standard fonts.',
        'Add links: GitHub, portfolio, LinkedIn.',
        'Proofread — typos are the #1 auto-reject signal.'
      ],
      sampleBullets: [
        'Worked on API|Built a REST API serving 10k+ daily requests, cutting response time by 35%.',
        'Helped with CI/CD|Led migration to CI/CD, reducing release time from 2 days to 2 hours.'
      ],
      sectionPriority: ['Skills', 'Experience', 'Projects', 'Education'],
      keywordSuggestions: ['Docker', 'CI/CD', 'REST API', 'Agile', 'TypeScript'],
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Resume tips generation failed', error: err.message });
  }
});

// ── POST /api/ai/match-explanation ───────────────────────────────────────────
router.post('/match-explanation', auth, async (req, res) => {
  try {
    const {
      candidateSkills = [], jobSkills = [], experienceYears = 0,
      requiredExperience = 0, candidateName = 'Candidate', jobTitle = 'this role'
    } = req.body;
    const c = candidateSkills.map(s => String(s).toLowerCase());
    const matched = jobSkills.filter(j => c.some(x => x.includes(String(j).toLowerCase()) || String(j).toLowerCase().includes(x)));
    const missing = jobSkills.filter(j => !matched.includes(j));
    const matchPct = jobSkills.length ? Math.round((matched.length / jobSkills.length) * 100) : 0;

    const prompt = `You are a talent recruiter explaining a candidate's fit for a job in natural language.

Candidate: ${candidateName}
Role: ${jobTitle}
Matched skills: ${matched.join(', ') || 'none'}
Missing skills: ${missing.join(', ') || 'none'}
Candidate experience: ${experienceYears} years
Required experience: ${requiredExperience} years
Skill match: ${matchPct}%

Write a natural, honest explanation (3-4 sentences) of this candidate's fit. Be specific, not generic.
Mention matched skills by name, acknowledge gaps constructively.

Return JSON:
{
  "explanation": "<3-4 sentence natural language explanation>",
  "verdict": "<Strong Match|Good Match|Partial Match|Low Match>",
  "matched": ${JSON.stringify(matched)},
  "missing": ${JSON.stringify(missing)},
  "matchPct": ${matchPct},
  "highlights": ["<key positive point 1>", "<key positive point 2>"],
  "gaps": ["<actionable gap 1>", "<actionable gap 2>"]
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', ...parsed, generatedAt: new Date().toISOString() });
    }

    res.json({
      mode: 'mock', matched, missing, matchPct,
      verdict: matchPct >= 70 ? 'Strong Match' : matchPct >= 40 ? 'Partial Match' : 'Low Match',
      explanation: matched.length
        ? `Strong overlap on ${matched.slice(0, 3).join(', ')}.${missing.length ? ` Consider adding: ${missing.slice(0, 3).join(', ')}.` : ''}`
        : 'Low keyword overlap. Add more job-specific skills to improve ranking.',
      highlights: matched.slice(0, 2).map(s => `Has ${s}`),
      gaps: missing.slice(0, 2).map(s => `Missing ${s}`),
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Match explanation failed', error: err.message });
  }
});

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
// Career chatbot — multi-turn conversation
router.post('/chat', auth, async (req, res) => {
  try {
    const { messages = [], userContext = {} } = req.body;
    // messages: [{ role: 'user'|'model', content: string }]

    const systemContext = `You are an expert career advisor AI for a job portal. You help ${
      userContext.role === 'employer'
        ? 'employers with hiring, job descriptions, and candidate evaluation'
        : 'job seekers with career planning, resume improvement, interview prep, and job search strategy'
    }.
${userContext.skills && userContext.skills.length ? `User skills: ${userContext.skills.join(', ')}` : ''}
${userContext.targetRole ? `User's target role: ${userContext.targetRole}` : ''}
Be specific, practical, and encouraging. Keep responses concise (under 250 words). Use bullet points when listing items.`;

    if (!hasRealKey()) {
      const lastMsg = messages[messages.length - 1] ? messages[messages.length - 1].content : '';
      return res.json({
        mode: 'mock',
        answer: `I'd love to help with: "${String(lastMsg).slice(0, 60)}..." — Add a GEMINI_API_KEY to get real AI-powered career advice. Here's a demo response:\n\n• Focus on building projects that showcase your skills\n• Tailor each application to the specific job description\n• Network actively on LinkedIn and GitHub\n• Practice common interview questions in your field`,
        suggestions: ['Tell me about your target role', 'How can I improve my resume?', 'What skills should I learn next?']
      });
    }

    // Build conversation for Gemini
    const model = getModel();
    const chat = model.startChat({
      history: messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })),
      systemInstruction: systemContext
    });

    const lastMessage = messages.length ? messages[messages.length - 1].content : '';
    const result = await chat.sendMessage(lastMessage);
    const answer = result.response.text();

    res.json({
      mode: 'gemini',
      answer,
      suggestions: ['Tell me more', 'Give me an example', 'What should I do next?']
    });
  } catch (err) {
    console.error('chat error:', err);
    res.status(500).json({ message: 'Chat failed', error: err.message });
  }
});

// ── POST /api/ai/interview-questions ─────────────────────────────────────────
router.post('/interview-questions', auth, async (req, res) => {
  try {
    const {
      jobId, candidateId, jobTitle = '', requiredSkills = [],
      candidateSkills = [], missingSkills = [], experienceYears = 0
    } = req.body;

    // Try to fetch from DB if IDs provided
    let jobData = { title: jobTitle, requiredSkills };
    let candidateData = { skills: candidateSkills, missingSkills, experienceYears };

    if (jobId) {
      try {
        const job = prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
        if (job) {
          jobData.title = job.title;
          jobData.requiredSkills = safeParseJSON(job.required_skills) || [];
          jobData.description = job.description;
        }
      } catch (_) {}
    }

    if (candidateId) {
      try {
        const prof = prepare('SELECT * FROM candidate_profiles WHERE user_id = ?').get(candidateId);
        if (prof) {
          candidateData.skills = safeParseJSON(prof.skills) || [];
          candidateData.name = prof.full_name;
        }
      } catch (_) {}
    }

    const prompt = `You are a senior technical interviewer. Generate a targeted interview question set.

Role: ${jobData.title}
Required skills: ${(jobData.requiredSkills || []).join(', ')}
Candidate skills: ${(candidateData.skills || []).join(', ')}
Skill gaps (focus questions here): ${(candidateData.missingSkills || missingSkills || []).join(', ')}
Candidate experience: ${candidateData.experienceYears || experienceYears} years
${jobData.description ? `Job context: ${jobData.description.slice(0, 300)}` : ''}

Generate interview questions. Return JSON:
{
  "technical": [
    {"question": "<technical question>", "type": "Technical", "difficulty": "Medium", "rubric": "<what good answer includes>"},
    {"question": "<technical question>", "type": "Technical", "difficulty": "Hard", "rubric": "<what good answer includes>"},
    {"question": "<technical question targeting a skill gap>", "type": "Technical", "difficulty": "Medium", "rubric": "<what good answer includes>"}
  ],
  "behavioral": [
    {"question": "<behavioral question>", "type": "Behavioral", "rubric": "<STAR method: what to look for>"},
    {"question": "<behavioral question>", "type": "Behavioral", "rubric": "<STAR method: what to look for>"}
  ],
  "situational": [
    {"question": "<situational/scenario question>", "type": "Situational", "rubric": "<what good answer includes>"},
    {"question": "<situational question>", "type": "Situational", "rubric": "<what good answer includes>"}
  ],
  "culturefit": [
    {"question": "<culture/values question>", "type": "Culture Fit", "rubric": "<what good answer includes>"}
  ],
  "totalQuestions": 9,
  "focusArea": "<one sentence about what to probe most based on the gaps>"
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', jobTitle: jobData.title, ...parsed, generatedAt: new Date().toISOString() });
    }

    // Fallback
    const allSkills = jobData.requiredSkills || [];
    res.json({
      mode: 'mock',
      jobTitle: jobData.title,
      technical: [
        { question: `Explain how you would design a scalable ${allSkills[0] || 'REST API'} system.`, type: 'Technical', difficulty: 'Hard', rubric: 'Look for: system design thinking, scalability, trade-offs' },
        { question: `What is the difference between ${allSkills[0] || 'synchronous'} and ${allSkills[1] || 'asynchronous'} patterns?`, type: 'Technical', difficulty: 'Medium', rubric: 'Look for: clear explanation, practical examples' }
      ],
      behavioral: [
        { question: 'Tell me about a time you had to debug a critical production issue under pressure.', type: 'Behavioral', rubric: 'STAR: Situation, action taken, result. Look for calm under pressure.' },
        { question: 'Describe a time you disagreed with a team member. How did you resolve it?', type: 'Behavioral', rubric: 'Look for: communication, empathy, outcome focus.' }
      ],
      situational: [
        { question: 'If you discovered a security vulnerability the day before a major release, what would you do?', type: 'Situational', rubric: 'Look for: prioritization, stakeholder communication, thoroughness.' }
      ],
      culturefit: [
        { question: 'How do you stay current with new technologies in your field?', type: 'Culture Fit', rubric: 'Look for: genuine curiosity, specific resources, continuous learning mindset.' }
      ],
      totalQuestions: 6,
      focusArea: 'Focus on practical experience with required skills and problem-solving approach.',
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Interview question generation failed', error: err.message });
  }
});

// ── POST /api/ai/learning-path ────────────────────────────────────────────────
router.post('/learning-path', auth, async (req, res) => {
  try {
    const {
      missingSkills = [], targetRole = '', currentSkills = [],
      timeAvailable = '8 weeks', experienceLevel = 'mid'
    } = req.body;

    if (!missingSkills.length && !targetRole) {
      return res.status(400).json({ message: 'Provide missingSkills or targetRole' });
    }

    const prompt = `You are a personalized learning coach and curriculum designer.

Target role: ${targetRole || 'Software Developer'}
Current skills: ${currentSkills.join(', ') || 'beginner'}
Skills to learn: ${missingSkills.join(', ')}
Available time: ${timeAvailable}
Experience level: ${experienceLevel}

Design a realistic, week-by-week learning roadmap. Return JSON:
{
  "summary": "<2-sentence overview of the plan>",
  "totalWeeks": <number>,
  "milestones": [
    {
      "title": "<milestone name>",
      "weeks": "<e.g. Week 1-2>",
      "skills": ["<skill covered>"],
      "actions": ["<specific action 1>", "<specific action 2>", "<specific action 3>"],
      "resources": ["<free resource with URL or description>", "<another resource>"],
      "project": "<a small hands-on project to reinforce learning>"
    }
  ],
  "tips": ["<study tip 1>", "<study tip 2>", "<study tip 3>"],
  "estimatedJobReadiness": "<e.g. After 8 weeks you should be ready to apply for junior roles>"
}

Return only valid JSON. Use real, free resources (freeCodeCamp, MDN, official docs, YouTube channels, etc.).`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', targetRole, missingSkills, ...parsed, generatedAt: new Date().toISOString() });
    }

    // Fallback
    const skills = missingSkills.slice(0, 3);
    res.json({
      mode: 'mock',
      targetRole,
      missingSkills,
      summary: `A ${timeAvailable} plan to learn ${skills.join(', ')} for ${targetRole || 'your target role'}.`,
      totalWeeks: 8,
      milestones: skills.map((skill, i) => ({
        title: `Learn ${skill}`,
        weeks: `Week ${i * 2 + 1}-${i * 2 + 2}`,
        skills: [skill],
        actions: [`Complete official ${skill} tutorial`, `Build a small project using ${skill}`, 'Read documentation thoroughly'],
        resources: [`${skill} official documentation`, `freeCodeCamp ${skill} course`, `YouTube: ${skill} crash course`],
        project: `Build a demo app using ${skill}`
      })),
      tips: ['Study consistently 1-2 hours daily', 'Build projects as you learn', 'Join communities on Discord/Reddit'],
      estimatedJobReadiness: `After ${timeAvailable} you should have enough to show in portfolio projects.`,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Learning path generation failed', error: err.message });
  }
});

// ── POST /api/ai/rewrite-experience ──────────────────────────────────────────
router.post('/rewrite-experience', auth, async (req, res) => {
  try {
    const { text = '', targetRole = '', context = '' } = req.body;
    if (!text.trim()) return res.status(400).json({ message: 'Provide experience text to rewrite' });

    const prompt = `You are a professional resume writer. Rewrite this experience bullet/description to be impactful, quantified, and ATS-friendly.

Original text: "${text}"
Target role: ${targetRole || 'software/tech role'}
Additional context: ${context || 'none'}

Rules:
- Start with a strong action verb
- Add or suggest quantifiable metrics (use approximate/example numbers if unknown, marked with *)
- Be specific, not generic
- Keep under 2 sentences or 30 words per bullet
- Make it ATS-keyword rich

Return JSON:
{
  "rewritten": "<single best rewritten version>",
  "alternatives": ["<alternative version 1>", "<alternative version 2>"],
  "improvements": ["<what was improved and why>"],
  "actionVerb": "<the action verb used>",
  "note": "<any note about assumed metrics or context>"
}

Return only valid JSON.`;

    const result = await generate(prompt, () => null);
    const parsed = result ? parseJSON(result) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', original: text, ...parsed, generatedAt: new Date().toISOString() });
    }

    res.json({
      mode: 'mock',
      original: text,
      rewritten: `Engineered and delivered ${text.slice(0, 40)}..., improving team efficiency by ~20%*.`,
      alternatives: [
        `Built and maintained ${text.slice(0, 30)}... used by 1,000+ users*.`,
        `Led development of ${text.slice(0, 30)}... reducing manual effort by 30%*.`
      ],
      improvements: ['Added action verb', 'Added quantified impact', 'Made more specific'],
      actionVerb: 'Engineered',
      note: 'Numbers marked with * are examples — replace with actual metrics.',
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Experience rewrite failed', error: err.message });
  }
});

// ── POST /api/ai/employer-message ─────────────────────────────────────────────
router.post('/employer-message', auth, async (req, res) => {
  try {
    const {
      candidateName = 'Candidate', jobTitle = 'the position',
      companyName = 'Our Company', status = 'shortlisted',
      feedback = '', interviewDate = ''
    } = req.body;

    const emailType = status === 'shortlisted' ? 'interview invite'
      : status === 'hired' ? 'offer' : 'rejection';

    const prompt = `You are writing a professional ${emailType} email.

Company: ${companyName}
Candidate: ${candidateName}
Role: ${jobTitle}
Status: ${status}
${feedback ? `Feedback context: ${feedback}` : ''}
${interviewDate ? `Proposed interview: ${interviewDate}` : ''}

Write a ${status === 'rejected' ? 'kind, constructive rejection that preserves employer brand' : status === 'shortlisted' ? 'warm, professional interview invite' : 'congratulatory offer email'}.

Return JSON:
{
  "subject": "<email subject line>",
  "body": "<full email body with \\n line breaks, professional and warm, 100-200 words>",
  "tone": "${status === 'rejected' ? 'empathetic' : 'enthusiastic'}",
  "tips": ["<tip for personalizing this further>"]
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', status, candidateName, ...parsed, generatedAt: new Date().toISOString() });
    }

    const subjects = {
      shortlisted: `Interview Invitation — ${jobTitle} at ${companyName}`,
      rejected: `Your Application for ${jobTitle} at ${companyName}`,
      hired: `Job Offer — ${jobTitle} at ${companyName}`
    };
    const bodies = {
      shortlisted: `Dear ${candidateName},\n\nThank you for applying to ${jobTitle} at ${companyName}. We were impressed by your profile and would like to invite you for an interview.\n\nPlease reply to confirm your availability.\n\nBest regards,\n${companyName} Hiring Team`,
      rejected: `Dear ${candidateName},\n\nThank you for your interest in the ${jobTitle} role at ${companyName}. After careful consideration, we've decided to move forward with other candidates.\n\nWe encourage you to apply for future openings.\n\nBest regards,\n${companyName} Hiring Team`,
      hired: `Dear ${candidateName},\n\nWe are delighted to offer you the ${jobTitle} position at ${companyName}. We believe you'll be a great addition to our team.\n\nPlease review the attached offer and respond at your earliest convenience.\n\nBest regards,\n${companyName} Hiring Team`
    };
    res.json({
      mode: 'mock', status, candidateName,
      subject: subjects[status] || subjects.shortlisted,
      body: bodies[status] || bodies.shortlisted,
      tone: status === 'rejected' ? 'empathetic' : 'enthusiastic',
      tips: ['Personalize with specific interview details', 'Add a direct contact name'],
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Message generation failed', error: err.message });
  }
});

// ── POST /api/ai/salary-estimate ──────────────────────────────────────────────
router.post('/salary-estimate', auth, async (req, res) => {
  try {
    const {
      role = '', skills = [], experienceYears = 0,
      location = 'India', jobType = 'full-time'
    } = req.body;

    const prompt = `You are a compensation specialist with up-to-date knowledge of tech salaries in India and globally.

Role: ${role}
Key skills: ${Array.isArray(skills) ? skills.join(', ') : skills}
Experience: ${experienceYears} years
Location: ${location}
Job type: ${jobType}

Provide a realistic salary estimate. Return JSON:
{
  "currency": "INR",
  "minLPA": <number in lakhs per annum>,
  "maxLPA": <number in lakhs per annum>,
  "medianLPA": <number>,
  "range": "<e.g. ₹8L - ₹14L per annum>",
  "breakdown": {
    "fresher": "<0-1 yr range>",
    "junior": "<1-3 yr range>",
    "mid": "<3-5 yr range>",
    "senior": "<5+ yr range>"
  },
  "factors": ["<factor affecting salary 1>","<factor 2>","<factor 3>"],
  "negotiationTips": ["<tip 1>","<tip 2>","<tip 3>"],
  "topPayingCompanies": ["<company1>","<company2>","<company3>"],
  "disclaimer": "Estimates based on market data. Actual offers vary by company and negotiation."
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', role, location, experienceYears, ...parsed, generatedAt: new Date().toISOString() });
    }

    const baseMin = 4 + (experienceYears * 1.5);
    const baseMax = baseMin * 1.8;
    res.json({
      mode: 'mock', role, location, experienceYears,
      currency: 'INR',
      minLPA: Math.round(baseMin * 10) / 10,
      maxLPA: Math.round(baseMax * 10) / 10,
      medianLPA: Math.round(((baseMin + baseMax) / 2) * 10) / 10,
      range: `₹${Math.round(baseMin)}L - ₹${Math.round(baseMax)}L per annum`,
      breakdown: { fresher: '₹3L - ₹6L', junior: '₹6L - ₹12L', mid: '₹12L - ₹20L', senior: '₹20L - ₹35L+' },
      factors: ['Company size and funding stage', 'Location (metro vs tier-2)', 'Specific tech stack demand'],
      negotiationTips: ['Research market rates before negotiating', 'Highlight unique skills', 'Consider total compensation including equity and benefits'],
      topPayingCompanies: ['Google', 'Microsoft', 'Amazon', 'Flipkart', 'Razorpay'],
      disclaimer: 'Mock estimate. Add GEMINI_API_KEY for real market data.',
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Salary estimation failed', error: err.message });
  }
});

// ── POST /api/ai/fake-job-check ───────────────────────────────────────────────
router.post('/fake-job-check', auth, async (req, res) => {
  try {
    const { title = '', description = '', requirements = [], companyName = '', salaryMin, salaryMax } = req.body;

    const prompt = `You are a job listing fraud detection specialist. Analyze this job posting for red flags.

Title: ${title}
Company: ${companyName}
Description: ${description.slice(0, 1000)}
Requirements: ${Array.isArray(requirements) ? requirements.join(', ') : requirements}
${salaryMin ? `Salary: ₹${salaryMin} - ₹${salaryMax || 'not specified'}` : ''}

Analyze for: unrealistic salary, vague descriptions, requests for personal info/money, grammar issues, too-good-to-be-true claims, missing company details.

Return JSON:
{
  "isSuspicious": <true|false>,
  "riskLevel": "<Low|Medium|High>",
  "riskScore": <0-100>,
  "flags": ["<specific red flag 1>"],
  "positives": ["<legitimate signal 1>"],
  "recommendation": "<Clear recommendation for job seekers>",
  "summary": "<2-sentence assessment>"
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', ...parsed, checkedAt: new Date().toISOString() });
    }

    // Simple heuristic fallback
    const flags = [];
    if (description.length < 100) flags.push('Very short job description');
    if (!companyName) flags.push('No company name provided');
    const isSuspicious = flags.length > 1;
    res.json({
      mode: 'mock', isSuspicious,
      riskLevel: isSuspicious ? 'Medium' : 'Low',
      riskScore: isSuspicious ? 45 : 15,
      flags: flags.length ? flags : [],
      positives: ['Salary range provided', 'Detailed requirements listed'],
      recommendation: isSuspicious ? 'Research the company thoroughly before applying.' : 'Listing appears legitimate.',
      summary: `Job listing ${isSuspicious ? 'has some red flags worth investigating' : 'appears legitimate'}.`,
      checkedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Fake job check failed', error: err.message });
  }
});

// ── POST /api/ai/copilot ──────────────────────────────────────────────────────
router.post('/copilot', auth, async (req, res) => {
  try {
    const { message = '', context = {} } = req.body;

    const prompt = `You are an expert career and hiring advisor AI on a job portal.
Role context: ${context.role === 'employer' ? 'You are advising an employer/recruiter.' : 'You are advising a job seeker/candidate.'}
${context.skills && context.skills.length ? `User skills: ${context.skills.join(', ')}` : ''}

User question: "${message}"

Give a helpful, specific, actionable response. Return JSON:
{
  "answer": "<detailed, practical response — use \\n for line breaks, 150-250 words>",
  "suggestions": ["<follow-up question 1>", "<follow-up question 2>", "<follow-up question 3>"]
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', ...parsed });
    }

    res.json({
      mode: 'mock',
      answer: `Great question! For "${String(message).slice(0, 50)}..." — here's practical advice:\n\n• Tailor your approach to the specific context\n• Research thoroughly before making decisions\n• Build on your existing strengths\n• Seek feedback from peers and mentors\n\n(Add GEMINI_API_KEY for real AI-powered advice)`,
      suggestions: ['How do I improve my profile?', 'What skills are in demand?', 'How do I prepare for interviews?']
    });
  } catch (err) {
    res.status(500).json({ message: 'Copilot failed', error: err.message });
  }
});

// ── POST /api/ai/career-plan ──────────────────────────────────────────────────
router.post('/career-plan', auth, async (req, res) => {
  try {
    const {
      targetRole = '', currentSkills = [],
      experienceLevel = 'early career', timeframe = '6 months'
    } = req.body;

    const prompt = `You are a career development strategist. Create a detailed career development plan.

Target role: ${targetRole}
Current skills: ${currentSkills.join(', ') || 'beginner'}
Experience level: ${experienceLevel}
Timeframe: ${timeframe}

Return JSON:
{
  "summary": "<overview of the path>",
  "currentLevel": "<assessment of where they are now>",
  "targetLevel": "<what they need to achieve>",
  "milestones": [
    {
      "title": "<milestone title>",
      "weeks": "<timeframe>",
      "actions": ["<action 1>","<action 2>","<action 3>"],
      "skills": ["<skill to develop>"],
      "project": "<project idea to demonstrate skill>"
    }
  ],
  "score": <estimated current fit % for target role 0-100>,
  "keySkillsToLearn": ["<skill1>","<skill2>","<skill3>"],
  "suggestions": ["<next step 1>","<next step 2>","<next step 3>"]
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', targetRole, ...parsed });
    }

    res.json({
      mode: 'mock', targetRole,
      summary: `Path from ${experienceLevel} to ${targetRole} in ${timeframe}.`,
      currentLevel: `${experienceLevel} with ${currentSkills.length} relevant skills`,
      targetLevel: `${targetRole} with strong portfolio and in-demand skills`,
      milestones: [
        { title: 'Build Foundation', weeks: 'Month 1-2', actions: ['Complete core skill courses', 'Build 2 projects', 'Start portfolio'], skills: currentSkills.slice(0, 2), project: 'Portfolio website' },
        { title: 'Gain Experience', weeks: 'Month 3-4', actions: ['Contribute to open source', 'Solve LeetCode problems', 'Network actively'], skills: ['Problem solving'], project: 'Full-stack app' },
        { title: 'Job Ready', weeks: 'Month 5-6', actions: ['Apply to 10+ jobs weekly', 'Mock interviews', 'Refine resume'], skills: ['Interview skills'], project: 'Capstone project' }
      ],
      score: 45 + currentSkills.length * 5,
      keySkillsToLearn: ['System design', 'Testing', 'DevOps basics'],
      suggestions: ['Build 3 strong portfolio projects', 'Get a mentor in your target field', 'Join relevant communities']
    });
  } catch (err) {
    res.status(500).json({ message: 'Career plan failed', error: err.message });
  }
});

// ── POST /api/ai/interview-kit ────────────────────────────────────────────────
router.post('/interview-kit', auth, async (req, res) => {
  try {
    const { jobTitle = '', jobDescription = '', difficulty = 'balanced' } = req.body;

    const prompt = `You are a senior interviewer. Create a comprehensive interview question kit.

Role: ${jobTitle}
${jobDescription ? `Job description: ${jobDescription.slice(0, 500)}` : ''}
Difficulty: ${difficulty}

Return JSON:
{
  "questions": [
    {"type": "Technical", "question": "<question>", "rubric": "<what to look for>"},
    {"type": "Technical", "question": "<question>", "rubric": "<what to look for>"},
    {"type": "Technical", "question": "<question>", "rubric": "<what to look for>"},
    {"type": "Behavioral", "question": "<question>", "rubric": "<STAR: what to look for>"},
    {"type": "Behavioral", "question": "<question>", "rubric": "<STAR: what to look for>"},
    {"type": "Situational", "question": "<question>", "rubric": "<what to look for>"},
    {"type": "Culture Fit", "question": "<question>", "rubric": "<what to look for>"}
  ],
  "summary": "<brief note on interview strategy for this role>",
  "suggestions": ["<next step suggestion 1>","<suggestion 2>"]
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', jobTitle, ...parsed });
    }

    res.json({
      mode: 'mock', jobTitle,
      questions: [
        { type: 'Technical', question: `Explain the key technical challenges in building a ${jobTitle} system.`, rubric: 'Look for: depth of knowledge, real examples' },
        { type: 'Behavioral', question: 'Describe a time you had to learn a new technology quickly.', rubric: 'STAR: Learning agility, resourcefulness' },
        { type: 'Situational', question: 'How would you handle a critical bug discovered an hour before launch?', rubric: 'Look for: calm decision-making, communication' },
        { type: 'Culture Fit', question: 'How do you prefer to receive feedback on your work?', rubric: 'Look for: growth mindset, self-awareness' }
      ],
      summary: `Focus on ${jobTitle} specific technical depth and problem-solving approach.`,
      suggestions: ['Customize questions based on candidate resume', 'Allow candidate to ask questions at the end']
    });
  } catch (err) {
    res.status(500).json({ message: 'Interview kit generation failed', error: err.message });
  }
});

// ── POST /api/ai/job-quality ──────────────────────────────────────────────────
router.post('/job-quality', auth, async (req, res) => {
  try {
    const { title = '', description = '', requirements = [] } = req.body;

    const prompt = `You are a job listing quality auditor focused on clarity, inclusiveness, and candidate experience.

Job title: ${title}
Description: ${description.slice(0, 1000)}
Requirements: ${Array.isArray(requirements) ? requirements.join(', ') : requirements}

Audit this job listing. Return JSON:
{
  "qualityScore": <0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "explanation": "<detailed breakdown of quality>",
  "findings": [
    {"message": "<specific issue found>", "severity": "high|medium|low"},
    {"message": "<another issue>", "severity": "high|medium|low"}
  ],
  "inclusiveSuggestions": ["<DEI improvement 1>","<DEI improvement 2>","<improvement 3>"],
  "matched": ["<quality signal 1>","<quality signal 2>"],
  "missing": ["<missing element 1>","<missing element 2>"],
  "suggestions": ["<what to do next 1>","<suggestion 2>"]
}

Return only valid JSON.`;

    const text = await generate(prompt, () => null);
    const parsed = text ? parseJSON(text) : null;

    if (parsed) {
      return res.json({ mode: 'gemini', ...parsed });
    }

    const descLen = description.length;
    const score = Math.min(90, 50 + (descLen > 200 ? 20 : 0) + (title.length > 10 ? 10 : 0) + (requirements.length > 2 ? 10 : 0));
    const findings = [];
    if (!title.trim()) findings.push({ severity: 'high', message: 'Add a specific job title so candidates can find and understand the role.' });
    if (descLen < 120) findings.push({ severity: 'medium', message: 'Add context about outcomes, team, and day-to-day responsibilities.' });
    if (!description.toLowerCase().includes('salary') && !description.toLowerCase().includes('compensation')) findings.push({ severity: 'medium', message: 'Consider publishing a salary range to improve transparency.' });
    if (Array.isArray(requirements) && requirements.length > 8) findings.push({ severity: 'low', message: 'Separate essential requirements from nice-to-have skills.' });
    res.json({
      mode: 'mock',
      qualityScore: score,
      summary: `Job listing quality: ${score >= 70 ? 'Good' : 'Needs improvement'}. ${descLen < 200 ? 'Description is too short.' : 'Description has decent length.'}`,
      explanation: 'Quality evaluated on description clarity, requirement specificity, and inclusivity.',
      findings,
      inclusiveSuggestions: ['Use outcome-focused language', 'Avoid unnecessary years-of-experience requirements', 'Explain how candidates will be evaluated'],
      matched: ['Title provided', descLen > 100 ? 'Description present' : null].filter(Boolean),
      missing: descLen < 200 ? ['Detailed description', 'Salary information'] : ['Salary information'],
      suggestions: ['Add salary range', 'Add benefits section', 'Use inclusive language']
    });
  } catch (err) {
    res.status(500).json({ message: 'Job quality check failed', error: err.message });
  }
});

// ── POST /api/ai/candidate-fit ────────────────────────────────────────────────
router.post('/candidate-fit', auth, async (req, res) => {
  try {
    const {
      candidateSkills = [], jobSkills = [],
      experienceYears = 0, requiredExperience = 0
    } = req.body;
    const candidate = Array.isArray(candidateSkills) ? candidateSkills.map(s => String(s).toLowerCase()) : [];
    const required = Array.isArray(jobSkills) ? jobSkills : [];
    const matched = required.filter(skill => candidate.some(item => item.includes(String(skill).toLowerCase()) || String(skill).toLowerCase().includes(item)));
    const missing = required.filter(skill => !matched.includes(skill));
    const skillScore = required.length ? Math.round((matched.length / required.length) * 100) : 100;
    const experienceScore = requiredExperience ? Math.min(100, Math.round((Number(experienceYears) / Number(requiredExperience)) * 100)) : 100;

    if (hasRealKey()) {
      const prompt = `You are an evidence-based hiring assistant. Explain this candidate's fit without inventing facts.
Candidate skills: ${candidateSkills.join(', ') || 'none provided'}
Required skills: ${required.join(', ') || 'none provided'}
Candidate experience: ${experienceYears} years
Required experience: ${requiredExperience} years
Keyword matches: ${matched.join(', ') || 'none'}
Keyword gaps: ${missing.join(', ') || 'none'}

Return only JSON with this shape:
{"score": 0, "matched": [], "missing": [], "experienceScore": 0, "explanation": "3-4 specific balanced sentences", "strengths": [], "risks": [], "nextSteps": []}`;
      const text = await generate(prompt, () => null);
      const parsed = text ? parseJSON(text) : null;
      if (parsed) return res.json({ mode: 'gemini', ...parsed, generatedAt: new Date().toISOString() });
    }

    res.json({
      mode: mode(),
      score: Math.round(skillScore * 0.7 + experienceScore * 0.3),
      matched, missing, experienceScore,
      explanation: missing.length
        ? `Good foundation with ${matched.length} matching skill(s). Address ${missing.slice(0, 3).join(', ')} before applying.`
        : 'Strong alignment with the listed skills and experience.',
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: 'Candidate fit check failed', error: err.message });
  }
});

module.exports = router;
