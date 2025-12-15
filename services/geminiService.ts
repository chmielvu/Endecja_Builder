import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Ensure process.env is typed
declare const process: {
  env: {
    API_KEY?: string;
  }
};

const GEMINI_MODEL = 'gemini-flash-lite-latest';

// Singleton instance holder
let aiInstance: GoogleGenAI | null = null;

// Helper to get or initialize the client safely
function getAiClient(): GoogleGenAI {
  if (aiInstance) return aiInstance;

  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    const errorMessage = "Gemini API Key is missing. Please configure process.env.API_KEY.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface EntityExtraction {
  nodes: Array<{
    id: string;
    label: string;
    type: 'person' | 'organization' | 'event' | 'publication';
    description: string;
    dates?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relationship: string;
  }>;
  reasoning: string;
}

const DMOWSKI_SYSTEM_INSTRUCTION = `
Jesteś Roman Dmowski (1864-1939), założyciel Narodowej Demokracji (Endecji).

KONTEKST:
- Twoja rola: Edukować o faktycznej historii Endecji bez sowieckich mitów
- Styl: Formalny ale przystępny, używaj polskiego języka
- Zawsze cytuj konkretne źródła historyczne

ZADANIA:
1. Odpowiadaj na pytania o historię Endecji (1893-1939)
2. Koryguj mity sowieckie o Endecji
3. Analizuj dokumenty historyczne
4. Sugeruj połączenia w grafie wiedzy

Pamiętaj: Jesteś duchem Dmowskiego pomagającym zrozumieć historię. Bądź uczciwy o błędach ruchu, ale stanowczy w obronie faktów.
`;

export async function chatWithDmowski(
  messages: ChatMessage[],
  graphContext?: { nodes: string[], edges: string[] }
): Promise<string> {
  const ai = getAiClient(); // Lazy init
  let systemPrompt = DMOWSKI_SYSTEM_INSTRUCTION;

  if (graphContext) {
    systemPrompt += `\n\nKONTEKST GRAFU WIEDZY:\nWęzły: ${graphContext.nodes.join(', ')}\nPołączenia: ${graphContext.edges.join(', ')}`;
  }

  try {
    const history = messages.slice(0, -1).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    const lastMessage = messages[messages.length - 1].text;

    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      history: history,
      config: {
        systemInstruction: systemPrompt
      }
    });

    const result: GenerateContentResponse = await chat.sendMessage({ message: lastMessage });
    return result.text || "Przepraszam, nie mogę teraz odpowiedzieć.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Wystąpił błąd podczas komunikacji z modelem.";
  }
}

export async function extractEntitiesFromText(
  text: string,
  existingNodeIds: string[]
): Promise<EntityExtraction> {
  const ai = getAiClient(); // Lazy init
  const prompt = `
Przeanalizuj ten tekst historyczny o Endecji i wyodrębnij encje:

TEKST:
${text}

ISTNIEJĄCE WĘZŁY (nie duplikuj):
${existingNodeIds.join(', ')}

Zwróć TYLKO poprawny JSON:
{
  "nodes": [
    {
      "id": "unique_lowercase_id",
      "label": "Pełne Imię/Nazwa",
      "type": "person|organization|event|publication",
      "description": "Krótki opis historyczny",
      "dates": "1900-1920"
    }
  ],
  "edges": [
    {
      "source": "node_id",
      "target": "other_node_id",
      "relationship": "założył|współpracował|rywalizował"
    }
  ],
  "reasoning": "Twoje uzasadnienie jako Roman Dmowski"
}

Wyciągaj tylko encje BEZPOŚREDNIO wymienione w tekście.
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: DMOWSKI_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error("Empty response from Gemini for entity extraction.");
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Entity Extraction Error:", error);
    throw new Error('Failed to parse entity extraction');
  }
}

export async function suggestGraphExpansion(
  nodeId: string,
  nodeLabel: string,
  nodeDescription: string,
  connectedNodes: string[],
  existingNodeIds: string[]
): Promise<EntityExtraction> {
  const ai = getAiClient(); // Lazy init
  const prompt = `
Jako historyk Endecji, zaproponuj rozszerzenie grafu wokół "${nodeLabel}".

KONTEKST:
- Opis: ${nodeDescription}
- Obecne połączenia: ${connectedNodes.join(', ')}
- Istniejące węzły: ${existingNodeIds.join(', ')}

Zaproponuj 3-5 nowych węzłów (osoby, wydarzenia, publikacje, organizacje) historycznie powiązanych z "${nodeLabel}".

Zwróć TYLKO poprawny JSON w formacie z poprzedniego przykładu.
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: DMOWSKI_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.7,
        topP: 0.9
      }
    });

    let jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error("Empty response from Gemini for graph expansion.");
    }
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    throw new Error('Failed to parse expansion suggestions');
  }
}

export async function summarizeGraphContent(
  nodes: { label: string, type: string }[],
  edges: { source: string, target: string, type: string }[]
): Promise<string> {
  const ai = getAiClient(); // Lazy init
  const nodeSummary = nodes.map(n => `${n.label} (${n.type})`).join(', ');
  const edgeSummary = edges.map(e => `${e.source} --[${e.type}]--> ${e.target}`).join('; ');

  const prompt = `
Analyze this historical social graph of the Polish National Democracy (Endecja).
Nodes: ${nodeSummary}
Edges: ${edgeSummary}
Summary (max 300 words):
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert historian analyzing a social graph.",
      }
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Summary generation failed", error);
    throw new Error("Summary generation failed");
  }
}