export interface TaskProposal {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  subtasks: string[];
}

export interface MilestoneProposal {
  title: string;
  description?: string;
  targetDays?: number;
  tasks: TaskProposal[];
}

export interface ProjectBreakdownResponse {
  summary: string;
  milestones: MilestoneProposal[];
}

export interface ProjectChatResponse {
  reply: string;
  suggestedAction?: 'update_breakdown' | 'none';
  updatedBreakdown?: ProjectBreakdownResponse;
}

export interface ProjectContext {
  id: number;
  title: string;
  description?: string | null;
  clientName?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  budget?: string | null;
  existingMilestones?: Array<{ title: string; status?: string | null }>;
  existingTasks?: Array<{ title: string; status?: string | null }>;
  teamMembers?: Array<{ name: string; email?: string }>;
}

const SYSTEM_INSTRUCTION = `You are an Elite Agency Technical Project Manager and Agile Lead Architect at a world-class creative and digital engineering agency (Shatter DAMS).
Your job is to break down project scopes, briefs, and client requirements into structured, realistic, highly actionable delivery phases (milestones) and granular tasks.

Guidelines for breakdown:
1. Divide work logically into 2 to 5 milestones/phases (e.g. Phase 1: Discovery & Architecture, Phase 2: Design & Prototyping, Phase 3: Core Implementation, Phase 4: QA & Launch).
2. For each milestone, provide 3 to 8 actionable, concrete tasks.
3. For each task:
   - Provide a clear, actionable title (e.g. "Configure PostgreSQL & Run Schema Migrations").
   - Provide a concise description detailing the deliverable and acceptance criteria.
   - Assign a realistic priority: 'low', 'medium', 'high', or 'urgent'.
   - Assign an estimated duration in hours ('estimatedHours' as a number, e.g. 3, 6, 8, 12).
   - Provide 2 to 4 checklist subtasks ('subtasks' as an array of short strings) defining clear completion steps.
4. Output MUST adhere strictly to the JSON schema requested.`;

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

async function callGeminiWithRetry(endpoint: string, payload: any, maxRetries = 2): Promise<any> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.status === 503 || response.status === 429) {
        if (attempt < maxRetries) {
          attempt++;
          console.warn(`Gemini returned HTTP ${response.status}, retrying attempt ${attempt}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, attempt * 1200));
          continue;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', response.status, errorText);
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (err: any) {
      if (attempt < maxRetries && (err.message.includes('503') || err.message.includes('429'))) {
        attempt++;
        await new Promise(r => setTimeout(r, attempt * 1200));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Generate a complete structured project breakdown using Gemini 3 Flash.
 */
export async function generateProjectBreakdown(
  apiKey: string,
  context: ProjectContext,
  customInstructions?: string
): Promise<ProjectBreakdownResponse> {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const prompt = `Please generate an agency-grade milestone and task breakdown for the following project:

Project Details:
- Title: ${context.title}
- Description / Scope: ${context.description || 'Not provided'}
- Client: ${context.clientName || 'Internal / Direct'}
- Timeline: Start: ${context.startDate || 'Immediate'}, Deadline: ${context.deadline || 'Flexible'}
- Budget: ${context.budget ? context.budget : 'Standard'}
${context.teamMembers && context.teamMembers.length > 0 ? `- Available Team Members: ${context.teamMembers.map(m => m.name).join(', ')}` : ''}
${context.existingMilestones && context.existingMilestones.length > 0 ? `- Existing Milestones: ${context.existingMilestones.map(m => m.title).join(', ')}` : ''}
${context.existingTasks && context.existingTasks.length > 0 ? `- Existing Tasks: ${context.existingTasks.map(t => t.title).join(', ')}` : ''}
${customInstructions ? `\nUser Special Instructions: ${customInstructions}` : ''}

Respond in strict JSON format conforming to this structure:
{
  "summary": "Executive summary of the project delivery strategy (2-3 sentences)",
  "milestones": [
    {
      "title": "Phase 1: Discovery & Architecture",
      "description": "Milestone description",
      "targetDays": 7,
      "tasks": [
        {
          "title": "Task name",
          "description": "Task description and deliverables",
          "priority": "high",
          "estimatedHours": 8,
          "subtasks": [
            "Checklist step 1",
            "Checklist step 2",
            "Checklist step 3"
          ]
        }
      ]
    }
  ]
}`;

  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.4
    }
  };

  const result: any = await callGeminiWithRetry(endpoint, payload);
  const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidate) {
    throw new Error('Gemini returned an empty response');
  }

  try {
    const parsed = JSON.parse(cleanJsonText(candidate));
    // Sanitize and validate fields
    const sanitizedMilestones = (parsed.milestones || []).map((m: any) => ({
      title: String(m.title || 'Untitled Phase'),
      description: m.description ? String(m.description) : '',
      targetDays: typeof m.targetDays === 'number' ? m.targetDays : undefined,
      tasks: (m.tasks || []).map((t: any) => ({
        title: String(t.title || 'Untitled Task'),
        description: t.description ? String(t.description) : '',
        priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority?.toLowerCase())
          ? (t.priority.toLowerCase() as any)
          : 'medium',
        estimatedHours: typeof t.estimatedHours === 'number' ? t.estimatedHours : 4,
        subtasks: Array.isArray(t.subtasks)
          ? t.subtasks.map((s: any) => (typeof s === 'string' ? s : s.title || String(s))).filter(Boolean)
          : []
      }))
    }));

    return {
      summary: String(parsed.summary || 'Project breakdown generated successfully.'),
      milestones: sanitizedMilestones
    };
  } catch (err: any) {
    console.error('Failed to parse Gemini JSON output:', candidate);
    throw new Error(`Failed to parse AI breakdown: ${err.message}`);
  }
}

/**
 * Multi-turn conversational chat with the Project AI Assistant.
 */
export async function chatWithProjectAssistant(
  apiKey: string,
  context: ProjectContext,
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentBreakdown?: ProjectBreakdownResponse | null
): Promise<ProjectChatResponse> {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  // Map history to Gemini format (user -> user, assistant -> model)
  const contents: any[] = [];

  // Provide initial contextual message
  let introPrompt = `Project Context:
- Title: ${context.title}
- Description: ${context.description || 'N/A'}
- Client: ${context.clientName || 'N/A'}
- Timeline: ${context.startDate || 'Now'} to ${context.deadline || 'TBD'}`;

  if (currentBreakdown) {
    introPrompt += `\n\nCurrent Proposed Breakdown:
${JSON.stringify(currentBreakdown, null, 2)}`;
  }

  contents.push({
    role: 'user',
    parts: [{ text: introPrompt }]
  });

  contents.push({
    role: 'model',
    parts: [{
      text: JSON.stringify({
        reply: `Understood! I have full context on project "${context.title}". How would you like to refine the milestones, tasks, estimates, or checklists?`,
        suggestedAction: 'none'
      })
    }]
  });

  // Append history
  for (const h of history) {
    contents.push({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    });
  }

  // Append latest user message with instructions
  contents.push({
    role: 'user',
    parts: [{
      text: `${message}

Respond in strict JSON with:
{
  "reply": "Clear, professional response explaining your reasoning, answer, or modifications.",
  "suggestedAction": "update_breakdown" OR "none",
  "updatedBreakdown": {
    "summary": "...",
    "milestones": [ ... ]
  } (ONLY include if suggestedAction is "update_breakdown" where you modified milestones/tasks)
}`
    }]
  });

  const payload = {
    system_instruction: {
      parts: [{
        text: `${SYSTEM_INSTRUCTION}
You are currently in an interactive sidepanel conversation with the project manager.
If they ask to add, modify, delete, prioritize, or estimate any tasks or phases, provide the answer AND update the breakdown structure in 'updatedBreakdown' with 'suggestedAction': 'update_breakdown'.
If they ask a general question, advice, or question without modifying the tasks, respond with 'suggestedAction': 'none'.`
      }]
    },
    contents,
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.5
    }
  };

  const result: any = await callGeminiWithRetry(endpoint, payload);
  const candidate = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidate) {
    throw new Error('Gemini returned an empty response');
  }

  try {
    const parsed = JSON.parse(cleanJsonText(candidate));
    let updatedBreakdown: ProjectBreakdownResponse | undefined = undefined;

    if (parsed.updatedBreakdown && parsed.updatedBreakdown.milestones) {
      updatedBreakdown = {
        summary: String(parsed.updatedBreakdown.summary || 'Updated breakdown'),
        milestones: (parsed.updatedBreakdown.milestones || []).map((m: any) => ({
          title: String(m.title || 'Untitled Phase'),
          description: m.description ? String(m.description) : '',
          targetDays: typeof m.targetDays === 'number' ? m.targetDays : undefined,
          tasks: (m.tasks || []).map((t: any) => ({
            title: String(t.title || 'Untitled Task'),
            description: t.description ? String(t.description) : '',
            priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority?.toLowerCase())
              ? (t.priority.toLowerCase() as any)
              : 'medium',
            estimatedHours: typeof t.estimatedHours === 'number' ? t.estimatedHours : 4,
            subtasks: Array.isArray(t.subtasks)
              ? t.subtasks.map((s: any) => (typeof s === 'string' ? s : s.title || String(s))).filter(Boolean)
              : []
          }))
        }))
      };
    }

    return {
      reply: String(parsed.reply || 'Request processed.'),
      suggestedAction: parsed.suggestedAction === 'update_breakdown' ? 'update_breakdown' : 'none',
      updatedBreakdown
    };
  } catch (err: any) {
    console.error('Failed to parse Gemini Chat JSON:', candidate);
    return {
      reply: candidate,
      suggestedAction: 'none'
    };
  }
}
