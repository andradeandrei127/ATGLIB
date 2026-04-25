import { GoogleGenAI } from "@google/genai";
import { Book, User } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAi() {
  if (!aiInstance) {
    const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. AI features will be disabled.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function getLibraryRecommendations(user: User, availableBooks: Book[]) {
  const ai = getAi();
  if (!ai) return "Recomendações não disponíveis sem chave de IA.";
  
  const model = "gemini-3-flash-preview";
  
  const booksList = availableBooks
    .filter(b => b.status === "available")
    .map(b => `- ${b.title} (${b.author}) - Gênero: ${b.genre || 'Geral'}`)
    .join("\n");

  const prompt = `
    Você é o AtgLib AI, um bibliotecário inteligente e amigável.
    O usuário atual é: ${user.name}, um ${user.role === 'student' ? 'estudante' : 'gestor'}.
    Aqui está a lista de livros disponíveis na biblioteca:
    ${booksList}

    Com base nos livros disponíveis, sugira 3 livros que possam interessar a esse usuário.
    Explique brevemente por que cada sugestão é interessante para ele.
    Mantenha um tom encorajador e culto.
    Use Markdown para formatar a resposta.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Não consegui gerar recomendações no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, tive um problema ao acessar meu repositório de conhecimento.";
  }
}

export async function getBookInsight(book: Book) {
  const ai = getAi();
  if (!ai) return null;
  
  const model = "gemini-3-flash-preview";
  const prompt = `Fale brevemente (em 3 frases) sobre a importância e os temas principais do livro "${book.title}" de ${book.author}.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return null;
  }
}
